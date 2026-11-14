"""Script de prueba rápida de CheapShark (sin unittest).

Uso (desde scraper/):
    python test_cheapshark_batch.py 0 20

Itera sobre los primeros N juegos de PC del CSV y muestra
precio actual y tienda elegida por CheapShark.
"""
import csv
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sources.cheapshark import fetch_cheapshark
from sources.steam import fetch_steam   # para pasar appid cuando esté disponible

root = Path(__file__).resolve().parent.parent
rows = list(csv.DictReader(open(root / "data" / "games_seed.csv", encoding="utf-8")))
pc = [r for r in rows if "PC" in r["platforms"].split("|")]

start = int(sys.argv[1]) if len(sys.argv) > 1 else 0
end   = int(sys.argv[2]) if len(sys.argv) > 2 else min(start + 10, len(pc))
subset = pc[start:end]

print(f"{len(pc)} juegos PC en total; probando [{start}:{end}]")
print("-" * 72)

ok = 0
for r in subset:
    res = fetch_cheapshark(r["name"])
    if res["ok"]:
        ok += 1
        disc = f"-{res['discount_pct']}%" if res["discount_pct"] > 0 else "sin descuento"
        print(f"OK  {r['name'][:45]:<45} | {res['store'][:20]:<20} | "
              f"${res['current_price']:.2f} ({disc})")
    else:
        print(f"--  {r['name'][:45]:<45} | {res.get('error', '?')}")
    time.sleep(1.5)

print("-" * 72)
print(f"{ok}/{len(subset)} con precio en CheapShark")
