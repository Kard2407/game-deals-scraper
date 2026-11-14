"""Punto de entrada principal para el scraper multinúcleo y benchmark de rendimiento."""
import argparse
import json
import logging
import time
from datetime import datetime

from config import DEFAULT_MAX_WORKERS_L1
from level1_games import run_level1_parallel, run_sequential
from repo import load_repo_games

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("main")


def main():
    parser = argparse.ArgumentParser(description="Pipeline de Scraping Multinúcleo")
    parser.add_argument("--workers", type=int, default=DEFAULT_MAX_WORKERS_L1,
                        help="Número de procesos trabajadores en Nivel 1")
    parser.add_argument("--limit", type=int, default=None,
                        help="Limitar cantidad de juegos a procesar (para pruebas)")
    parser.add_argument("--sequential", action="store_true",
                        help="Ejecutar en modo secuencial puro para mediciones de Speedup")
    parser.add_argument("--benchmark", action="store_true",
                        help="Ejecuta comparativa de rendimiento secuencial vs paralelo")
    args = parser.parse_args()

    games = load_repo_games()
    if not games:
        logger.error("No se encontraron juegos en el REPO.")
        return

    if args.limit:
        games = games[:args.limit]

    logger.info(f"Cargados {len(games)} juegos para procesamiento.")

    if args.benchmark:
        logger.info("=== Iniciando Benchmark de Rendimiento ===")
        # Modo secuencial
        t0 = time.time()
        logger.info("Ejecutando versión Secuencial...")
        run_sequential(games)
        t_seq = time.time() - t0
        logger.info(f"Tiempo Secuencial: {t_seq:.2f} s")

        # Modos paralelos con diferentes trabajadores (1, 2, 4)
        for w in [2, 4, args.workers]:
            t0 = time.time()
            logger.info(f"Ejecutando versión Paralela con {w} workers...")
            run_level1_parallel(games, max_workers=w)
            t_par = time.time() - t0
            speedup = t_seq / t_par if t_par > 0 else 0
            efficiency = speedup / w if w > 0 else 0
            logger.info(f"Workers: {w} | Tiempo: {t_par:.2f} s | Speedup: {speedup:.2f}x | Eficiencia: {efficiency:.2%}")
        return

    t_start = time.time()
    if args.sequential:
        logger.info("Iniciando ejecución SECUENCIAL...")
        results = run_sequential(games)
    else:
        logger.info(f"Iniciando ejecución PARALELA en 3 niveles con {args.workers} workers en L1...")
        results = run_level1_parallel(games, max_workers=args.workers)

    elapsed = time.time() - t_start
    ok_count = sum(1 for r in results if r.get("best_price") is not None or r.get("metascore") is not None)
    logger.info(f"Procesamiento finalizado en {elapsed:.2f} s. Juegos con datos: {ok_count}/{len(games)}")


if __name__ == "__main__":
    main()
