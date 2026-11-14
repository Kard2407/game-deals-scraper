# Contrato de Interfaz y Estructura de Datos (Integración Continua)
## IC3101 Arquitectura de Computadoras — III Proyecto: Web Scraping Multinúcleo
**Coordinación Bloque 1 (Kevin) & Bloque 2 (Adrián)**

---

## 1. Propósito

Para cumplir con la directriz de **Responsabilidades Conjuntas** (*"Integración continua de la base de datos con la interfaz web pública"*), este documento formaliza el contrato de datos JSON que el scraper multinúcleo de Kevin (Bloque 1) debe generar o almacenar en la base de datos para que la aplicación web pública de Adrián (Bloque 2) consuma sin discrepancias.

---

## 2. Esquema JSON de Entrada (`games.json`)

El archivo debe contener una lista (array) de objetos JSON. Cada juego debe seguir la siguiente especificación:

```json
[
  {
    "id": "game-001",
    "title": "The Witcher 3: Wild Hunt - Complete Edition",
    "slug": "the-witcher-3-wild-hunt",
    "cover_image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/292030/header.jpg",
    "backdrop_image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/292030/page_bg_generated_v6b.jpg",
    "release_date": "2015-05-18",
    "publisher": "CD PROJEKT RED",
    "developer": "CD PROJEKT RED",
    "suggested_price": 49.99,
    "metacritic": {
      "score": 93,
      "user_score": 9.1,
      "url": "https://www.metacritic.com/game/the-witcher-3-wild-hunt/"
    },
    "howlongtobeat": {
      "main_story_hours": 51.5,
      "main_extra_hours": 103.0,
      "completionist_hours": 173.0,
      "url": "https://howlongtobeat.com/?q=the-witcher-3"
    },
    "platforms": ["PC", "PlayStation 5", "Xbox Series X/S", "Nintendo Switch"],
    "genres": ["RPG", "Acción", "Mundo Abierto"],
    "description": "Sinopsis oficial del título...",
    "stores": [
      {
        "store_name": "Steam",
        "format": "Digital",
        "platform": "PC",
        "regular_price": 49.99,
        "current_price": 12.49,
        "discount_percent": 75,
        "url": "https://store.steampowered.com/app/292030/",
        "in_stock": true
      },
      {
        "store_name": "PlayStation Store",
        "format": "Digital",
        "platform": "PlayStation 5",
        "regular_price": 49.99,
        "current_price": 19.99,
        "discount_percent": 60,
        "url": "https://store.playstation.com/",
        "in_stock": true
      }
    ],
    "best_deal": {
      "store_name": "Steam",
      "price": 12.49,
      "regular_price": 49.99,
      "discount_percent": 75,
      "format": "Digital",
      "platform": "PC",
      "savings": 37.50,
      "url": "https://store.steampowered.com/app/292030/"
    },
    "scraped_at": "2026-11-13T20:30:00Z"
  }
]
```

---

## 3. Diccionario de Campos Obligatorios

| Campo | Tipo | Descripción | Origen / Nivel |
| :--- | :--- | :--- | :--- |
| `id` | `String` | Identificador único del juego (`game-001`, `game-002`, etc.). | REPO inicial |
| `title` | `String` | Nombre completo oficial del videojuego. | REPO inicial |
| `cover_image` | `String (URL)` | Imagen de carátula o portada horizontal (aspecto 16:9 o 4:3). | Scraping Nivel 2/3 |
| `metacritic.score` | `Integer` | Metascore crítico (0 a 100). | Scraping Nivel 2 (Metacritic) |
| `howlongtobeat.main_story_hours`| `Float/Int` | Horas promedio para completar la campaña principal. | Scraping Nivel 2 (HLTB) |
| `platforms` | `Array[String]`| Lista de consolas soportadas (`PC`, `PlayStation 5`, `Xbox Series X/S`, `Nintendo Switch`). | REPO inicial / Tiendas |
| `stores` | `Array[Object]`| Al menos 2 tiendas por juego con precios actual y regular. | Scraping Nivel 3 (Tiendas) |
| `stores[].discount_percent` | `Integer` | Porcentaje de descuento calculado: `(1 - cur / reg) * 100`. | Lógica & Robustez |
| `best_deal` | `Object` | Objeto que referencia a la tienda con el mejor precio disponible. | Lógica de Agregación |
| `scraped_at` | `String (ISO)`| Marca de tiempo UTC de la última ejecución exitosa del scraper. | Módulo de Actualización |

---

## 4. Opciones de Integración Disponibles en el Frontend

1. **Archivo estático:** Guardar el resultado del scraper de Kevin directamente en `web/data/games.json`.
2. **Subida Manual en Vivo:** En la pestaña **"Sincronización REPO"** de la página web, arrastrar el archivo `games.json` generado para actualizar el catálogo de inmediato sin recargar el navegador.
3. **Endpoint REST / Firebase:** Si Kevin opta por persistir en Firebase Firestore o una API REST (FastAPI / Flask / Node), la función `loadData()` de `data-loader.js` puede recibir la URL del endpoint simplemente cambiando la constante de conexión.
