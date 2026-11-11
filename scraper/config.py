"""Configuraciones globales para el pipeline de scraping multinúcleo."""
import os
from pathlib import Path

# Rutas base
BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
DATA_DIR = ROOT_DIR / "data"
CSV_PATH = DATA_DIR / "games_seed.csv"
KEY_PATH = BASE_DIR / "serviceAccountKey.json"

# Firestore
COLLECTION_GAMES = "games"
COLLECTION_PRICES = "prices"

# Concurrencia y paralelismo por defecto
DEFAULT_MAX_WORKERS_L1 = min(16, (os.cpu_count() or 4))
TIMEOUT_TOTAL_GAME = 45  # Segundos máximos para procesar un juego completo
