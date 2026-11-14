"""Scraper de How Long To Beat (vía la librería howlongtobeatpy). Una consulta = un juego."""
import json
import re
import time
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

from howlongtobeatpy import HowLongToBeat

RETRIES = 3
MIN_SIMILARITY = 0.85
OVERRIDES_PATH = Path(__file__).resolve().parents[2] / "data" / "hltb_overrides.json"


def _load_overrides() -> dict:
    try:
        return json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


OVERRIDES = _load_overrides()


def _clean(name: str) -> str:
    """Quita '(2016)' y similares: HLTB no los usa en sus títulos."""
    return re.sub(r"\(.*?\)", "", name).strip()


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def _search(term: str):
    """Búsqueda con reintentos y espera creciente ante fallos de red."""
    last = None
    for attempt in range(RETRIES):
        try:
            return HowLongToBeat().search(term) or []
        except Exception as e:  # la librería no define excepciones propias estables
            last = e
            if attempt < RETRIES - 1:
                time.sleep(3 * (attempt + 1))
    raise last


def _hours(v):
    """HLTB devuelve 0 o None cuando no hay datos de esa categoría."""
    try:
        v = float(v)
    except (TypeError, ValueError):
        return None
    return round(v, 1) if v > 0 else None


def fetch_hltb(game_name: str, release_date: str = None, search_term: str = None) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    result = {"source": "HowLongToBeat", "ok": False, "fetched_at": now}
    try:
        term = search_term or OVERRIDES.get(game_name) or _clean(game_name)
        trusted = bool(search_term or OVERRIDES.get(game_name))
        results = _search(term)
        if not results:
            result["error"] = "no_results"
            return result

        year = int(release_date[:4]) if release_date else None

        def key(e):
            # mayor similitud primero; a igualdad, año de lanzamiento más cercano
            y = getattr(e, "release_world", None)
            dist = abs(y - year) if (year and isinstance(y, int)) else 99
            return (-(e.similarity or 0), dist)

        best = sorted(results, key=key)[0]
        result["hltb_name"] = best.game_name
        result["hltb_id"] = getattr(best, "game_id", None)
        result["url"] = getattr(best, "game_web_link", None)

        if not trusted and (best.similarity or 0) < MIN_SIMILARITY:
            result["error"] = "low_similarity"
            result["similarity"] = round(best.similarity or 0, 2)
            return result

        main = _hours(best.main_story)
        extra = _hours(best.main_extra)
        full = _hours(best.completionist)
        if main is None and extra is None and full is None:
            result["error"] = "no_times"
            return result

        result["main"], result["main_extra"], result["completionist"] = main, extra, full
        result["similarity"] = round(best.similarity or 0, 2)
        result["ok"] = True
    except Exception as e:
        result["error"] = f"{type(e).__name__}: {e}"
    return result