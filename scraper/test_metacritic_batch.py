import csv
import sys
import time
from pathlib import Path
from sources.metacritic import fetch_metacritic

root = Path(__file__).resolve().parent.parent
rows = list(csv.DictReader(open(root / "data" / "games_seed.csv", encoding="utf-8")))
start, end = int(sys.argv[1]), int(sys.argv[2])
print(f"{len(rows)} juegos en el REPO; probando {start}-{end}")

ok = 0
for r in rows[start:end]:
    plats = r["platforms"].split("|")
    res = fetch_metacritic(r["name"], plats, r["release_date"])
    ok += res["ok"]
    if res["ok"]:
        print("OK ", r["name"], "->", res.get("metacritic_name"), res["scores"],
              "default:", res["default_score"], "best:", res["score_best"], f'({res["score_source"]})')
    else:
        print("-- ", r["name"], "->", res.get("error"), res.get("metacritic_name"), res.get("slug"))
    time.sleep(3)
print(f"\n{ok}/{end - start} con score")