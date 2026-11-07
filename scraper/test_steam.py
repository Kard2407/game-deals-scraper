import json
from sources.steam import fetch_steam

for name in ["Elden Ring", "Hades", "Cyberpunk 2077", "DOOM (2016)", "Halo 5: Guardians"]:
    print(name)
    print(json.dumps(fetch_steam(name), indent=2, ensure_ascii=False))