"""Nivel 2 de paralelismo: extracción concurrente de múltiples fuentes para un mismo juego."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Optional

from level3_stores import fetch_stores_parallel
from ratelimit import limiter
from sources.hltb import fetch_hltb
from sources.metacritic import fetch_metacritic


def _run_metacritic(game_name: str, platforms: List[str], release_date: Optional[str]) -> dict:
    limiter.wait("metacritic.com")
    return fetch_metacritic(game_name, platforms=platforms, release_date=release_date)


def _run_hltb(game_name: str, release_date: Optional[str]) -> dict:
    limiter.wait("howlongtobeat.com")
    return fetch_hltb(game_name, release_date=release_date)


def fetch_sources_parallel(game_name: str, platforms: List[str], release_date: Optional[str] = None) -> Dict:
    """Paraleliza las fuentes (Tiendas vía Nivel 3, Metacritic y HLTB) para un juego dado.
    Cumple con el Nivel 2 de paralelismo del enunciado."""
    consolidated = {
        "name": game_name,
        "stores": [],
        "metacritic": None,
        "hltb": None,
    }

    with ThreadPoolExecutor(max_workers=3, thread_name_prefix=f"L2-{game_name[:10]}") as executor:
        f_stores = executor.submit(fetch_stores_parallel, game_name)
        f_metacritic = executor.submit(_run_metacritic, game_name, platforms, release_date)
        f_hltb = executor.submit(_run_hltb, game_name, release_date)

        tasks = {
            f_stores: "stores",
            f_metacritic: "metacritic",
            f_hltb: "hltb",
        }

        for future in as_completed(tasks):
            key = tasks[future]
            try:
                data = future.result()
                consolidated[key] = data
            except Exception as e:
                consolidated[key] = {"error": f"{type(e).__name__}: {e}", "ok": False}

    return consolidated
