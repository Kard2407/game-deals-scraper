import time
from howlongtobeatpy import HowLongToBeat

for name in ["Elden Ring", "Hades", "God of War", "Celeste", "Halo 5: Guardians"]:
    try:
        res = HowLongToBeat().search(name)
    except Exception as e:
        print(name, "-> ERROR", type(e).__name__, e)
        continue
    if not res:
        print(name, "-> sin resultados")
    else:
        best = max(res, key=lambda x: x.similarity)
        print(name, "->", best.game_name, "| main:", best.main_story,
              "| main+extra:", best.main_extra, "| 100%:", best.completionist,
              "| sim:", round(best.similarity, 2))
    time.sleep(3)