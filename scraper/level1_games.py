"""Nivel 1 de paralelismo: procesamiento paralelo de los juegos del REPO."""
from concurrent.futures import ProcessPoolExecutor, as_completed
import logging
import unicodedata
import re
from typing import Dict, List, Optional

from level2_sources import fetch_sources_parallel
from repo import save_game_results

logger = logging.getLogger(__name__)


def slugify(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-zA-Z0-9]+", "-", s.lower()).strip("-")


def process_single_game(game: Dict) -> Dict:
    """Función de trabajo que ejecuta un proceso independiente para un único juego."""
    name = game["name"]
    platforms = game.get("platforms", [])
    release_date = game.get("release_date")
    msrp = game.get("msrp", 59.99)

    # 1. Ejecutar Nivel 2 (y Nivel 3 anidado)
    scraped = fetch_sources_parallel(name, platforms, release_date)

    # 2. Calcular mejor precio, indicador de oferta y consolidar tarjeta
    stores_data = [s for s in (scraped.get("stores") or []) if isinstance(s, dict)]
    valid_prices = [s for s in stores_data if s.get("ok") and s.get("current_price") is not None]

    best_deal = None
    if valid_prices:
        best_deal = min(valid_prices, key=lambda s: s["current_price"])

    current_price = best_deal["current_price"] if best_deal else None
    regular_price = (best_deal.get("regular_price") if best_deal else None) or msrp

    discount_pct = 0
    if current_price is not None and regular_price > 0 and current_price < regular_price:
        discount_pct = round(((regular_price - current_price) / regular_price) * 100)

    # Extraer imagen principal de Steam si existe
    image_url = None
    for s in stores_data:
        if s.get("image_url"):
            image_url = s["image_url"]
            break

    # Metacritic score
    meta = scraped.get("metacritic") if isinstance(scraped.get("metacritic"), dict) else {}
    metascore = meta.get("score_best") or meta.get("default_score")

    # How Long To Beat
    hltb = scraped.get("hltb") if isinstance(scraped.get("hltb"), dict) else {}

    game_id = slugify(name)
    payload = {
        "id": game_id,
        "name": name,
        "platforms": platforms,
        "release_date": release_date,
        "msrp": msrp,
        "image_url": image_url,
        "best_price": current_price,
        "regular_price": regular_price,
        "discount_pct": discount_pct,
        "metascore": metascore,
        "hltb": {
            "main": hltb.get("main"),
            "extra": hltb.get("main_extra"),
            "completionist": hltb.get("completionist")
        } if hltb.get("ok") else None,
        "stores": stores_data,
    }

    # Guardar en repositorio (Firestore o local)
    save_game_results(name, payload)
    return payload


def run_level1_parallel(games: List[Dict], max_workers: int = 4) -> List[Dict]:
    """Distribuye los juegos del REPO entre múltiples procesos CPU independientes.
    Cumple con el Nivel 1 de paralelismo del enunciado."""
    results = []
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(process_single_game, g): g["name"] for g in games}
        for future in as_completed(futures):
            g_name = futures[future]
            try:
                res = future.result()
                results.append(res)
            except Exception as e:
                logger.error(f"Error procesando juego '{g_name}': {e}")
                results.append({"name": g_name, "error": str(e), "ok": False})
    return results


def run_sequential(games: List[Dict]) -> List[Dict]:
    """Versión secuencial pura para mediciones de rendimiento (Speedup y Amdahl)."""
    return [process_single_game(g) for g in games]
