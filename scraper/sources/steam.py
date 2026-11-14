"""Scraper de Steam (tienda de PC). Una consulta = un juego."""
import json
import re
import time
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path

import requests

SEARCH_URL = "https://store.steampowered.com/api/storesearch/"
DETAILS_URL = "https://store.steampowered.com/api/appdetails"
HEADERS = {"User-Agent": "Mozilla/5.0 (proyecto academico ITCR IC3101)"}
TIMEOUT = 10
RETRIES = 3
FUZZY_MIN = 0.90
MAX_CANDIDATES = 3
OVERRIDES_PATH = Path(__file__).resolve().parents[2] / "data" / "steam_overrides.json"

ROMAN = {"i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x",
         "xi", "xii", "xiii", "xiv", "xv", "xvi", "xvii", "xviii", "xix", "xx"}
# Palabras extra aceptadas en el título de Steam (ediciones, no otros juegos)
ALLOWED_EXTRA = {"the", "of", "edition", "remastered", "remaster", "definitive",
                 "complete", "goty", "game", "year", "director", "s", "cut",
                 "deluxe", "ultimate", "enhanced", "anniversary", "special",
                 "intergrade", "standard", "gold", "premium", "final",
                 "sid", "meier"}


def _load_overrides() -> dict:
    try:
        return json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


OVERRIDES = _load_overrides()


def _get(url: str, params: dict):
    """GET con reintentos y espera creciente (2 s, 4 s) ante fallos transitorios."""
    last = None
    for attempt in range(RETRIES):
        try:
            r = requests.get(url, params=params, headers=HEADERS, timeout=TIMEOUT)
            if r.status_code in (429, 500, 502, 503, 504):
                raise requests.HTTPError(f"HTTP {r.status_code}")
            r.raise_for_status()
            return r
        except (requests.Timeout, requests.ConnectionError, requests.HTTPError) as e:
            last = e
            if attempt < RETRIES - 1:
                time.sleep(2 * (attempt + 1))
    raise last


def _tokens(s: str, strip_parens: bool = False) -> list:
    if strip_parens:                      # solo en la búsqueda, nunca en el candidato
        s = re.sub(r"\(.*?\)", "", s)
    s = re.sub(r"[^a-z0-9]+", " ", s.lower())
    return s.split()


def _is_year(t: str) -> bool:
    return bool(re.fullmatch(r"(19|20)\d\d", t))


def _is_ordinal(t: str) -> bool:
    return bool(re.fullmatch(r"\d+(st|nd|rd|th)", t))


def _is_seq(t: str) -> bool:
    return (t.isdigit() and not _is_year(t)) or t in ROMAN


def _extras_ok(q: list, c: list) -> bool:
    for i, t in enumerate(c):
        if t in q or t in ALLOWED_EXTRA or _is_ordinal(t):
            continue
        # un año solo vale si es "2026 Edition", no "Flight Simulator 2024"
        if _is_year(t) and i + 1 < len(c) and c[i + 1] == "edition":
            continue
        return False
    return True


def _score(query: str, cand: str) -> float:
    q, c = _tokens(query, strip_parens=True), _tokens(cand)
    if {t for t in q if _is_seq(t)} != {t for t in c if _is_seq(t)}:
        return 0.0
    if q == c:
        return 1.0
    if set(q) <= set(c):
        if not _extras_ok(q, c):
            return 0.0
        return 0.95 - 0.01 * len([t for t in c if t not in q])
    ratio = SequenceMatcher(None, " ".join(q), " ".join(c)).ratio()
    return ratio if ratio >= FUZZY_MIN else 0.0


def _candidates(name: str) -> list:
    term = re.sub(r"\(.*?\)", "", name).strip()
    items = _get(SEARCH_URL, {"term": term, "cc": "us", "l": "en"}).json().get("items", [])
    scored = [(_score(name, it["name"]), it["id"], it["name"]) for it in items]
    scored = [s for s in scored if s[0] > 0]
    scored.sort(reverse=True)
    return scored[:MAX_CANDIDATES]


def _details(appid):
    entry = _get(DETAILS_URL, {"appids": appid, "cc": "us", "l": "en"}).json()[str(appid)]
    return entry["data"] if entry.get("success") else None


def fetch_steam(game_name: str, appid=None) -> dict:
    """Formato de games/{id}/prices/{store_format}.
    Si hay appid (argumento o data/steam_overrides.json) no busca por nombre."""
    now = datetime.now(timezone.utc).isoformat()
    result = {"store": "Steam", "platform": "PC", "format": "digital",
              "fetched_at": now, "ok": False}
    try:
        appid = appid or OVERRIDES.get(game_name)
        cands = [(1.0, int(appid), None)] if appid else _candidates(game_name)
        if not cands:
            result["error"] = "no_match"
            return result

        data, chosen = None, None
        for _, cid, cname in cands:
            d = _details(cid)
            if d and d.get("type") == "game":
                data, chosen = d, (cid, cname)
                break
        if not data:
            result["error"] = "not_a_game"
            return result

        cid, cname = chosen
        result["steam_name"] = cname or data.get("name")
        result["steam_appid"] = cid
        result["url"] = f"https://store.steampowered.com/app/{cid}"
        result["image_url"] = data.get("header_image")

        po = data.get("price_overview")
        if po is None:
            result["error"] = "free" if data.get("is_free") else "no_price"
            return result

        result["current_price"] = po["final"] / 100
        result["regular_price"] = po["initial"] / 100
        result["discount_pct"] = po["discount_percent"]
        result["ok"] = True
    except (requests.RequestException, KeyError, ValueError) as e:
        result["error"] = f"{type(e).__name__}: {e}"
    return result