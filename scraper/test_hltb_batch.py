import csv
import sys
import time
from pathlib import Path

from sources.hltb import fetch_hltb

root = Path(__file__).resolve().parent.parent
rows = list(csv.DictReader(open(root / "data" / "games_seed.csv", encoding="utf-8")))
start, end = int(sys.argv[1]), int(sys.argv[2])
print(f"{len(rows)} juegos en el REPO; probando {start}-{end}")

ok = 0
for r in rows[start:end]:
    res = fetch_hltb(r["name"], r["release_date"])
    ok += res["ok"]
    if res["ok"]:
        print("OK ", r["name"], "->", res["hltb_name"],
              f'| main {res["main"]} | +extra {res["main_extra"]} | 100% {res["completionist"]}'
              f' | sim {res["similarity"]}')
    else:
        print("-- ", r["name"], "->", res.get("error"), "|", res.get("hltb_name"),
              "| sim", res.get("similarity"))
    time.sleep(2)
print(f"\n{ok}/{end - start} con tiempos")