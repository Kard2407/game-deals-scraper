import csv
import sys
import time
from pathlib import Path
from sources.steam import fetch_steam

root = Path(__file__).resolve().parent.parent
rows = list(csv.DictReader(open(root / "data" / "games_seed.csv", encoding="utf-8")))
pc = [r for r in rows if "PC" in r["platforms"].split("|")]
start, end = int(sys.argv[1]), int(sys.argv[2])
subset = pc[start:end]
print(f"{len(pc)} juegos de PC en total; probando {start}-{end}")

report = root / "scraper" / "steam_report.csv"
new_file = not report.exists()
ok = 0
with open(report, "a", encoding="utf-8", newline="") as f:
    w = csv.writer(f)
    if new_file:
        w.writerow(["name", "steam_name", "appid", "current", "regular", "discount", "status"])
    for r in subset:
        res = fetch_steam(r["name"])
        ok += res["ok"]
        w.writerow([r["name"], res.get("steam_name"), res.get("steam_appid"),
                    res.get("current_price"), res.get("regular_price"),
                    res.get("discount_pct"), "ok" if res["ok"] else res.get("error")])
        mark = "OK " if res["ok"] else "-- "
        print(mark, r["name"], "->", res.get("steam_name"), res.get("current_price"),
              f'(-{res.get("discount_pct")}%)' if res["ok"] else res.get("error"))
        time.sleep(1.5)
print(f"\n{ok}/{len(subset)} con precio")