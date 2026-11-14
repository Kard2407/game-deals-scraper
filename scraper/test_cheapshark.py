"""Tests unitarios de sources/cheapshark.py.

Uso (desde scraper/):
    python -m pytest test_cheapshark.py -v
    # o sin pytest:
    python test_cheapshark.py
"""

import json
import sys
import time
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sources.cheapshark import fetch_cheapshark

# ---------------------------------------------------------------------------
# Juegos de prueba: mix de PC que tienen registro en CheapShark
# ---------------------------------------------------------------------------
PC_GAMES = [
    # (nombre_en_csv, appid_steam_opcional)
    ("Elden Ring",         1245620),
    ("Hades",              1145360),
    ("Cyberpunk 2077",     1091500),
    ("Stardew Valley",     413150),
    ("Hollow Knight",      367520),
    ("Portal 2",           620),
    ("Celeste",            504230),
    ("Disco Elysium",      632470),
    ("Baldur's Gate 3",    1086940),
    ("Terraria",           105600),
]

# Juego que sólo tiene Steam (Halo 5 es exclusivo de Xbox, no aparece en CS)
XBOX_EXCLUSIVE = ("Halo 5: Guardians", None)


class TestCheapSharkBasic(unittest.TestCase):

    def test_known_games_ok(self):
        """Al menos 7 de 10 juegos PC conocidos deben resolverse con ok=True."""
        ok_count = 0
        for name, appid in PC_GAMES:
            result = fetch_cheapshark(name, steam_appid=appid)
            if result["ok"]:
                ok_count += 1
                # Validar campos obligatorios
                self.assertIn("store", result, f"{name}: falta 'store'")
                self.assertIn("current_price", result, f"{name}: falta 'current_price'")
                self.assertIn("regular_price", result, f"{name}: falta 'regular_price'")
                self.assertIn("discount_pct", result, f"{name}: falta 'discount_pct'")
                self.assertIn("url", result, f"{name}: falta 'url'")
                self.assertIsInstance(result["current_price"], float,
                                     f"{name}: current_price no es float")
                self.assertGreater(result["current_price"], 0,
                                   f"{name}: precio <= 0")
                self.assertGreaterEqual(result["discount_pct"], 0,
                                        f"{name}: descuento negativo")
            time.sleep(1.0)   # Rate-limit educado

        self.assertGreaterEqual(ok_count, 7,
                                f"Sólo {ok_count}/10 juegos resueltos")

    def test_no_steam_in_store_field(self):
        """El campo 'store' nunca debe ser 'Steam' (ya cubierto por steam.py)."""
        for name, appid in PC_GAMES[:3]:
            result = fetch_cheapshark(name, steam_appid=appid)
            if result["ok"]:
                self.assertNotEqual(result["store"], "Steam",
                                    f"{name}: store='Steam' no debería aparecer")
            time.sleep(1.0)

    def test_price_consistency(self):
        """current_price <= regular_price en todos los resultados válidos."""
        for name, appid in PC_GAMES[:5]:
            result = fetch_cheapshark(name, steam_appid=appid)
            if result["ok"]:
                self.assertLessEqual(
                    result["current_price"], result["regular_price"] + 0.01,
                    f"{name}: current > regular ({result['current_price']} > {result['regular_price']})"
                )
            time.sleep(1.0)

    def test_no_match_returns_error(self):
        """Un título inventado no debe levantar excepción, debe devolver ok=False."""
        result = fetch_cheapshark("ZZZJuegoInventado_XYZ_99999")
        self.assertFalse(result["ok"])
        self.assertIn("error", result)

    def test_fetched_at_present(self):
        """El campo fetched_at debe estar presente."""
        result = fetch_cheapshark("Hades", steam_appid=1145360)
        self.assertIn("fetched_at", result)
        time.sleep(1.0)


class TestCheapSharkOutput(unittest.TestCase):

    def test_print_sample(self):
        """Imprime un resultado completo para inspección manual."""
        result = fetch_cheapshark("Elden Ring", steam_appid=1245620)
        print("\n--- CheapShark sample (Elden Ring) ---")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        # El test pasa siempre; es sólo para inspección
        self.assertIn("ok", result)

    def test_other_deals_field(self):
        """Si hay varias tiendas, 'other_deals' debe ser una lista."""
        result = fetch_cheapshark("Cyberpunk 2077", steam_appid=1091500)
        if result["ok"] and "other_deals" in result:
            self.assertIsInstance(result["other_deals"], list)
            for d in result["other_deals"]:
                self.assertIn("store", d)
                self.assertIn("price", d)
                self.assertIn("url", d)
        time.sleep(1.0)


# ---------------------------------------------------------------------------
# Ejecución directa (sin pytest)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    unittest.main(verbosity=2)
