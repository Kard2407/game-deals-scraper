"""Acceso al repositorio de datos (Firestore y fallback local CSV/JSON)."""
import csv
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1.client import Client

from config import COLLECTION_GAMES, CSV_PATH, KEY_PATH

logger = logging.getLogger(__name__)

_firestore_client: Optional[Client] = None


def get_db() -> Optional[Client]:
    """Inicializa Firebase de manera idempotente por proceso."""
    global _firestore_client
    if _firestore_client is not None:
        return _firestore_client

    if not KEY_PATH.exists():
        logger.warning(f"No existe {KEY_PATH}. Modo sin Firestore activo.")
        return None

    try:
        app_name = f"scraper_app_{id(KEY_PATH)}"
        try:
            app = firebase_admin.get_app(app_name)
        except ValueError:
            cred = credentials.Certificate(str(KEY_PATH))
            app = firebase_admin.initialize_app(cred, name=app_name)
        _firestore_client = firestore.client(app=app)
        return _firestore_client
    except Exception as e:
        logger.error(f"Error inicializando Firestore: {e}")
        return None


def load_repo_games() -> List[Dict]:
    """Carga la lista de juegos desde CSV o Firestore."""
    games = []
    if CSV_PATH.exists():
        with open(CSV_PATH, encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f):
                name = row["name"].strip()
                platforms = [p.strip() for p in row["platforms"].split("|") if p.strip()]
                try:
                    msrp = float(row["msrp"])
                except (ValueError, KeyError):
                    msrp = 59.99
                games.append({
                    "name": name,
                    "platforms": platforms,
                    "release_date": row.get("release_date", "").strip(),
                    "msrp": msrp,
                })
    return games


def save_game_results(game_name: str, payload: Dict):
    """Guarda resultados consolidados en Firestore o localmente."""
    db = get_db()
    now_iso = datetime.now(timezone.utc).isoformat()
    payload["updated_at"] = now_iso

    if db:
        try:
            # Documento con ID seguro basado en nombre
            doc_id = payload.get("id") or "".join(c if c.isalnum() else "_" for c in game_name.lower())
            doc_ref = db.collection(COLLECTION_GAMES).document(doc_id)
            doc_ref.set(payload, merge=True)
            return True
        except Exception as e:
            logger.error(f"Error guardando {game_name} en Firestore: {e}")
            return False
    return False
