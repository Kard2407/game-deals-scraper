"""Nivel 3 de paralelismo: extracción concurrente en al menos dos tiendas para un juego."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Optional

from ratelimit import limiter
from sources.steam import fetch_steam
from sources.cheapshark import fetch_cheapshark


def _run_steam(game_name: str) -> dict:
    limiter.wait("store.steampowered.com")
    return fetch_steam(game_name)


def _run_cheapshark(game_name: str, steam_appid: Optional[int] = None) -> dict:
    limiter.wait("cheapshark.com")
    return fetch_cheapshark(game_name, steam_appid=steam_appid)


def fetch_stores_parallel(game_name: str, steam_appid: Optional[int] = None) -> List[dict]:
    """Ejecuta las consultas a Steam y CheapShark en paralelo mediante hilos (ThreadPoolExecutor).
    Cumple con el Nivel 3 de paralelismo del enunciado."""
    results = []
    with ThreadPoolExecutor(max_workers=2, thread_name_prefix=f"L3-{game_name[:10]}") as executor:
        f_steam = executor.submit(_run_steam, game_name)
        f_cheapshark = executor.submit(_run_cheapshark, game_name, steam_appid)

        for future in as_completed([f_steam, f_cheapshark]):
            try:
                res = future.result()
                if res:
                    results.append(res)
            except Exception as e:
                results.append({"error": f"{type(e).__name__}: {e}", "ok": False})

    return results
