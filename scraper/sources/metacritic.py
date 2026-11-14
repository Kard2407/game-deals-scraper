"""Scraper de Metacritic: score de críticos por plataforma. Una consulta = un juego."""
import json
import re
import time
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

import requests

PAGE_URL = "https://www.metacritic.com/game/{slug}/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
}
TIMEOUT = 15
RETRIES = 3
YEAR_TOLERANCE = 1
OVERRIDES_PATH = Path(__file__).resolve().parents[2] / "data" / "metacritic_overrides.json"

# Nombre de plataforma del REPO -> identificador de Metacritic
PLATFORM_SLUGS = {
    "PC": "pc",
    "PS4": "playstation-4",
    "PS5": "playstation-5",
    "Xbox One": "xbox-one",
    "Xbox Series": "xbox-series-x",
    "Switch": "nintendo-switch",
    "Switch 2": "nintendo-switch-2",
}
NUXT_TAGS = {"Reactive", "ShallowReactive", "Ref", "ShallowRef", "EmptyRef", "EmptyShallowRef"}


def _load_overrides() -> dict:
    try:
        return json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


OVERRIDES = _load_overrides()


def make_slug(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"\(.*?\)", "", s)
    s = s.replace("+", " plus ")
    s = re.sub(r"['`]", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def _get(url: str):
    """GET con reintentos y espera creciente. 404 se devuelve tal cual."""
    last = None
    for attempt in range(RETRIES):
        try:
            r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
            if r.status_code in (429, 500, 502, 503, 504):
                raise requests.HTTPError(f"HTTP {r.status_code}")
            return r
        except (requests.Timeout, requests.ConnectionError, requests.HTTPError) as e:
            last = e
            if attempt < RETRIES - 1:
                time.sleep(3 * (attempt + 1))
    raise last


def _decode(data):
    """Resuelve el formato indexado de Nuxt (__NUXT_DATA__)."""
    memo = {}

    def res(i):
        if not isinstance(i, int) or i < 0:
            return None
        if i in memo:
            return memo[i]
        v = data[i]
        if isinstance(v, list):
            if v and isinstance(v[0], str) and v[0] in NUXT_TAGS:
                memo[i] = None
                memo[i] = res(v[1])
                return memo[i]
            out = []
            memo[i] = out
            out.extend(res(x) for x in v)
            return out
        if isinstance(v, dict):
            out = {}
            memo[i] = out
            for k, x in v.items():
                out[k] = res(x)
            return out
        memo[i] = v
        return v

    return res(0)


def _nuxt_data(html: str):
    m = re.search(r'<script[^>]*id="__NUXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    return _decode(json.loads(m.group(1))) if m else None


def _jsonld(html: str):
    for raw in re.findall(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', html, re.S):
        try:
            data = json.loads(raw)
        except ValueError:
            continue
        blocks = data if isinstance(data, list) else [data]
        for b in blocks:
            if not isinstance(b, dict) or not b.get("name"):
                continue
            if b.get("@type") == "VideoGame" or "aggregateRating" in b:
                return b
    return None


def _platform_scores(data, slug: str) -> dict:
    """{'default': {...}, 'pc': {...}, ...} solo con objetos de ESTE juego."""
    prefix = f"/game/{slug}/critic-reviews/"
    out, seen, stack = {}, set(), [data]
    while stack:
        o = stack.pop()
        if id(o) in seen:
            continue
        seen.add(id(o))
        if isinstance(o, dict):
            u = o.get("url")
            if (isinstance(u, str) and u.startswith(prefix) and "reviewCount" in o
                    and isinstance(o.get("score"), (int, float))):
                m = re.search(r"platform=([a-z0-9-]+)", u)
                out.setdefault(m.group(1) if m else "default",
                               {"score": int(o["score"]), "reviews": o.get("reviewCount")})
            stack.extend(o.values())
        elif isinstance(o, list):
            stack.extend(o)
    return out


def _toks(s: str) -> list:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"\(.*?\)", "", s)
    return re.sub(r"[^a-z0-9]+", " ", s).split()


def _same_game(query: str, meta_name: str, query_year, meta_date) -> bool:
    q, m = set(_toks(query)), set(_toks(meta_name))
    if not (q <= m or m <= q):
        return False
    if query_year and meta_date:
        try:
            if abs(int(str(meta_date)[:4]) - int(query_year)) > YEAR_TOLERANCE:
                return False
        except ValueError:
            pass
    return True


def fetch_metacritic(game_name: str, platforms: list, release_date: str = None, slug: str = None) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    result = {"source": "Metacritic", "ok": False, "fetched_at": now}
    try:
        # Un slug dado a mano (argumento u override) se considera verificado
        trusted = bool(slug or OVERRIDES.get(game_name))
        slug = slug or OVERRIDES.get(game_name) or make_slug(game_name)
        url = PAGE_URL.format(slug=slug)
        result["slug"], result["url"] = slug, url

        r = _get(url)
        if r.status_code == 404:
            result["error"] = "not_found"
            return result
        if r.status_code != 200:
            result["error"] = f"http_{r.status_code}"
            return result

        meta = _jsonld(r.text)
        if not meta:
            result["error"] = "no_jsonld"
            return result
        result["metacritic_name"] = meta.get("name")
        year = release_date[:4] if release_date else None
        if not trusted and not _same_game(game_name, meta["name"], year, meta.get("datePublished")):
            result["error"] = "wrong_game"
            return result

        data = _nuxt_data(r.text)
        found = _platform_scores(data, slug) if data else {}
        default = found.get("default", {}).get("score")
        if default is None:                       # plan B: JSON-LD
            rv = (meta.get("aggregateRating") or {}).get("ratingValue")
            default = int(rv) if rv is not None else None

        scores = {}
        for p in platforms:
            ps = found.get(PLATFORM_SLUGS.get(p, ""))
            if ps:
                scores[p] = ps["score"]
        result["scores"] = scores
        result["default_score"] = default

        if scores:
            result["score_best"], result["score_source"] = max(scores.values()), "platform"
        elif default is not None:
            result["score_best"], result["score_source"] = default, "default"
        else:
            result["error"] = "no_score"
            return result
        result["ok"] = True
    except (requests.RequestException, ValueError, KeyError, TypeError) as e:
        result["error"] = f"{type(e).__name__}: {e}"
    return result