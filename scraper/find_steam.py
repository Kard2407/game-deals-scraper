import sys
import requests

term = " ".join(sys.argv[1:])
r = requests.get("https://store.steampowered.com/api/storesearch/",
                 params={"term": term, "cc": "us", "l": "en"},
                 headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
for it in r.json().get("items", []):
    print(it["id"], "|", it["name"], "|", it.get("type"), "|", it.get("price", {}).get("final"))