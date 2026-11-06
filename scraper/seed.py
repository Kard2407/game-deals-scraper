"""Carga el REPO de juegos (data/games_seed.csv) a Firestore.

Uso (desde la raíz del repo):
    python scraper/seed.py            # carga/actualiza los juegos
    python scraper/seed.py --dry-run  # solo valida el CSV, no escribe

Es idempotente: usa merge, así que se puede correr varias veces sin duplicar
y sin borrar los campos que llene el scraper (precios, scores, etc.).
"""
import argparse
import csv
import re
import sys
import unicodedata
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore

BASE = Path(__file__).resolve().parent
CSV_PATH = BASE.parent / "data" / "games_seed.csv"
KEY_PATH = BASE / "serviceAccountKey.json"


def slugify(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s.lower()).strip("-")
    return s


def load_games():
    games, seen = [], set()
    with open(CSV_PATH, encoding="utf-8", newline="") as f:
        for i, row in enumerate(csv.DictReader(f), start=2):
            name = row["name"].strip()
            gid = slugify(name)
            if not name or not gid:
                print(f"Fila {i}: nombre vacío, se omite")
                continue
            if gid in seen:
                print(f"Fila {i}: id duplicado '{gid}', se omite")
                continue
            seen.add(gid)
            try:
                msrp = float(row["msrp"])
            except ValueError:
                print(f"Fila {i}: msrp inválido en '{name}', se omite")
                continue
            games.append({
                "id": gid,
                "name": name,
                "platforms": [p.strip() for p in row["platforms"].split("|") if p.strip()],
                "release_date": row["release_date"].strip(),
                "msrp": msrp,
            })
    return games


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    games = load_games()
    print(f"{len(games)} juegos válidos en el CSV")
    if args.dry_run:
        return

    if not KEY_PATH.exists():
        sys.exit(f"No se encontró {KEY_PATH}")
    firebase_admin.initialize_app(credentials.Certificate(str(KEY_PATH)))
    db = firestore.client()

    # Firestore permite máx. 500 operaciones por batch
    for start in range(0, len(games), 400):
        batch = db.batch()
        for g in games[start:start + 400]:
            ref = db.collection("games").document(g["id"])
            batch.set(ref, g, merge=True)
        batch.commit()
    print("Carga completa en la colección 'games'")


if __name__ == "__main__":
    main()
