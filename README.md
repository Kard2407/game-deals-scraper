# GameScraper Deals — III Proyecto: Web Scraping Multinúcleo
**IC3101 Arquitectura de Computadoras | Tecnológico de Costa Rica (Campus San Carlos)**

* **Kevin Rodríguez** — Backend y Scraping Multinúcleo (Bloque 1)
* **Adrián Sánchez Orozco** — Frontend, Benchmarks y Documentación (Bloque 2)

---

## Descripción

Aplicación web y motor de extracción concurrente en 3 niveles para rastrear y comparar ofertas de videojuegos (*Hottest Deals*). El sistema consulta más de 200 títulos en paralelo a través de tiendas digitales y físicas (Steam, Epic Games Store, PlayStation Store, Xbox Store, Nintendo eShop, Amazon, GOG), además de obtener puntuaciones de Metacritic y tiempos estimados de juego desde HowLongToBeat.

Los datos recopilados se almacenan en Cloud Firestore y se consumen directamente desde una interfaz web pública desplegada en Firebase Hosting, acompañados de un módulo de pruebas experimentales para evaluar el rendimiento multinúcleo y la Ley de Amdahl.

**URL Pública:** https://game-deals-scraperdb.web.app
---

## Ejecución Local

1. **Levantar la interfaz web:**
   Ejecuta el archivo `serve.bat` en la raíz del repositorio o inicia un servidor HTTP local desde la terminal:
   ```powershell
   python -m http.server 8000 --directory web