"""CheapShark – mejor oferta de PC entre todas las tiendas indexadas.

API pública, sin clave, sin scraping de HTML:
  https://www.cheapshark.com/api/1.0/

Flujo por juego:
  1.  Búsqueda por título  → gameID
      - Si el juego tiene appid de Steam, se usa steamAppID (más preciso).
  2.  Detalle del gameID   → lista de deals activos (precio actual y precio regular
      por tienda).
  3.  Elegir el deal con mayor descuento entre las tiendas habilitadas.

Tiendas devueltas por /stores (sólo las activas y de PC, 2026):
  1=Steam  2=GamersGate  3=GreenManGaming  7=GOG  8=Origin/EA
  11=Humble  13=ImperialGames  15=Fanatical  21=WinGameStore
  23=GameBillet  24=Voidu  25=Epic  27=Games Planet  28=GamersGate AU
  29=Itch.io  31=IndieGala  34=DLGamer  35=Games Rocket  36=GameStop
  ...

El módulo sólo carga las tiendas habilitadas (ENABLED_STORES) la primera vez
que se importa, y las cachea en memoria durante la sesión.
"""

import time
from datetime import datetime, timezone

import requests

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------
BASE = "https://www.cheapshark.com/api/1.0"
HEADERS = {"User-Agent": "Mozilla/5.0 (proyecto academico ITCR IC3101)"}
TIMEOUT = 12
RETRIES = 3

# Tiendas que nos interesan (sin Steam, que ya tiene scraper propio).
# Se filtra por storeID; None = usar todas las disponibles.
EXCLUDED_STORE_IDS = {"1"}   # Steam (ya cubierta)

# Umbral mínimo de similitud de título (0-1)
FUZZY_MIN = 0.60


# ---------------------------------------------------------------------------
# HTTP helper
# ---------------------------------------------------------------------------
def _get(path: str, params: dict = None):
    """GET con reintentos y back-off exponencial."""
    url = f"{BASE}/{path}"
    last = None
    for attempt in range(RETRIES):
        try:
            r = requests.get(url, params=params or {},
                             headers=HEADERS, timeout=TIMEOUT)
            if r.status_code in (429, 500, 502, 503, 504):
                raise requests.HTTPError(f"HTTP {r.status_code}")
            r.raise_for_status()
            return r
        except (requests.Timeout, requests.ConnectionError, requests.HTTPError) as e:
            last = e
            if attempt < RETRIES - 1:
                time.sleep(2 ** attempt)   # 1 s, 2 s
    raise last


# ---------------------------------------------------------------------------
# Catálogo de tiendas (caché de sesión)
# ---------------------------------------------------------------------------
_STORE_NAMES: dict[str, str] = {}  # storeID -> storeName


def _load_stores() -> dict[str, str]:
    """Descarga /stores y retorna {storeID: storeName} sólo para las activas."""
    global _STORE_NAMES
    if _STORE_NAMES:
        return _STORE_NAMES
    try:
        stores = _get("stores").json()
        _STORE_NAMES = {
            s["storeID"]: s["storeName"]
            for s in stores
            if s.get("isActive") and s["storeID"] not in EXCLUDED_STORE_IDS
        }
    except Exception:
        _STORE_NAMES = {}
    return _STORE_NAMES


# ---------------------------------------------------------------------------
# Búsqueda de juego
# ---------------------------------------------------------------------------
def _find_game(game_name: str, steam_appid=None) -> dict | None:
    """Devuelve el primer resultado de CheapShark que coincida."""
    # Opción A: buscar por appid de Steam (más exacto)
    if steam_appid:
        try:
            results = _get("games", {"steamAppID": int(steam_appid)}).json()
            if results:
                return results[0]
        except Exception:
            pass   # cae al plan B

    # Opción B: buscar por título
    try:
        results = _get("games", {"title": game_name, "limit": 5}).json()
    except Exception:
        return None

    if not results:
        return None

    # Elegir el resultado cuyo nombre sea más parecido al buscado
    q = _norm(game_name)
    best, best_score = None, 0.0
    for g in results:
        score = _similarity(q, _norm(g.get("external", "")))
        if score > best_score:
            best, best_score = g, score

    if best_score < FUZZY_MIN:
        return None
    return best


# ---------------------------------------------------------------------------
# Normalización y similitud de cadenas
# ---------------------------------------------------------------------------
def _norm(s: str) -> str:
    import re, unicodedata
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def _similarity(a: str, b: str) -> float:
    from difflib import SequenceMatcher
    return SequenceMatcher(None, a, b).ratio()


# ---------------------------------------------------------------------------
# Función principal
# ---------------------------------------------------------------------------
def fetch_cheapshark(game_name: str, steam_appid=None) -> dict:
    """Devuelve el mejor deal de CheapShark (precio más bajo entre tiendas).

    Formato compatible con games/{id}/prices/{store} en Firestore.
    """
    now = datetime.now(timezone.utc).isoformat()
    result = {
        "store": "CheapShark",
        "platform": "PC",
        "format": "digital",
        "fetched_at": now,
        "ok": False,
    }

    try:
        stores = _load_stores()

        # 1. Encontrar gameID
        game = _find_game(game_name, steam_appid)
        if not game:
            result["error"] = "no_match"
            return result

        game_id = game["gameID"]
        result["cheapshark_id"] = game_id
        result["cheapshark_name"] = game.get("external")

        # 2. Obtener detalle con todos los deals activos
        detail = _get("games", {"id": game_id}).json()
        deals = detail.get("deals", [])
        if not deals:
            result["error"] = "no_deals"
            return result

        # 3. Filtrar tiendas excluidas y elegir el deal más barato
        valid = [d for d in deals if d.get("storeID") not in EXCLUDED_STORE_IDS]
        if not valid:
            result["error"] = "only_steam"
            return result

        # Ordenar por precio actual ascendente
        valid.sort(key=lambda d: float(d.get("price", 9999)))
        best = valid[0]

        store_id = best.get("storeID")
        store_name = stores.get(store_id, f"Store#{store_id}")

        current = float(best["price"])
        regular = float(best["retailPrice"])
        discount = round((1 - current / regular) * 100) if regular > 0 else 0

        result["store"] = store_name
        result["store_id"] = store_id
        result["current_price"] = round(current, 2)
        result["regular_price"] = round(regular, 2)
        result["discount_pct"] = discount
        result["url"] = f"https://www.cheapshark.com/redirect?dealID={best['dealID']}"
        result["deal_id"] = best["dealID"]

        # Resumen de otras tiendas disponibles (sin Steam)
        other_deals = []
        for d in valid[1:5]:   # máx. 4 alternativas
            sid = d.get("storeID")
            other_deals.append({
                "store": stores.get(sid, f"Store#{sid}"),
                "store_id": sid,
                "price": round(float(d["price"]), 2),
                "retail": round(float(d["retailPrice"]), 2),
                "url": f"https://www.cheapshark.com/redirect?dealID={d['dealID']}",
            })
        if other_deals:
            result["other_deals"] = other_deals

        result["ok"] = True

    except (requests.RequestException, KeyError, ValueError, TypeError) as e:
        result["error"] = f"{type(e).__name__}: {e}"

    return result
