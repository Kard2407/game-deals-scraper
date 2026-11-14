"""Paquete de fuentes de scraping para el proyecto de ofertas de videojuegos.

Expone directamente las funciones principales de cada fuente para facilitar
las importaciones limpias desde otros módulos del scraper.
"""
from .steam import fetch_steam
from .cheapshark import fetch_cheapshark
from .metacritic import fetch_metacritic
from .hltb import fetch_hltb

__all__ = [
    "fetch_steam",
    "fetch_cheapshark",
    "fetch_metacritic",
    "fetch_hltb",
]
