# Estructura de Datos (Schema) del Repositorio Firestore

Colección principal: `games`  
Document ID: `id` del juego (ejemplo: `elden-ring`, `mario-kart-8-deluxe`).

## Campos del Documento

```json
{
  "id": "elden-ring",
  "name": "Elden Ring",
  "platforms": ["PC", "PS4", "PS5", "Xbox One", "Xbox Series"],
  "release_date": "2022-02-25",
  "msrp": 59.99,
  "image_url": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/header.jpg",
  "best_price": 52.69,
  "regular_price": 59.99,
  "discount_pct": 12,
  "metascore": 96,
  "hltb": {
    "main": 58.5,
    "extra": 102.0,
    "completionist": 133.0
  },
  "updated_at": "2026-11-11T17:07:39.799794+00:00",
  "stores": [
    {
      "store": "Steam",
      "platform": "PC",
      "format": "digital",
      "current_price": 59.99,
      "regular_price": 59.99,
      "discount_pct": 0,
      "url": "https://store.steampowered.com/app/1245620",
      "ok": true
    },
    {
      "store": "GameBillet",
      "platform": "PC",
      "format": "digital",
      "current_price": 52.69,
      "regular_price": 59.99,
      "discount_pct": 12,
      "url": "https://www.cheapshark.com/redirect?dealID=0yH...",
      "ok": true
    }
  ]
}
```
