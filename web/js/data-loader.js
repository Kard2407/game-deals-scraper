/**
 * Data Loader Module - Manejo de datos y sincronización con REPO
 * IC3101 Arquitectura de Computadoras - III Proyecto: Web Scraping Multinúcleo
 * Bloque 2: Frontend & Performance - Adrián Sánchez
 */

const DataLoader = (() => {
  let gamesDataset = [];
  let isLoaded = false;
  let lastSyncTime = null;

  // Fallback seguro de juegos si se abre directamente por file:/// sin servidor local
  const FALLBACK_GAMES = [
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
      "metacritic": { "score": 93, "user_score": 9.1, "url": "https://www.metacritic.com/game/the-witcher-3-wild-hunt/" },
      "howlongtobeat": { "main_story_hours": 51.5, "main_extra_hours": 103, "completionist_hours": 173 },
      "platforms": ["PC", "PlayStation 5", "Xbox Series X/S", "Nintendo Switch"],
      "genres": ["RPG", "Acción", "Mundo Abierto"],
      "description": "Eres Geralt de Rivia, cazador de monstruos. En un continente devastado por la guerra e infestado de monstruos, tienes el contrato de tu vida: encontrar a Ciri, la Niña de la Profecía.",
      "stores": [
        { "store_name": "Steam", "format": "Digital", "platform": "PC", "regular_price": 49.99, "current_price": 12.49, "discount_percent": 75, "url": "https://store.steampowered.com/app/292030/", "in_stock": true },
        { "store_name": "Epic Games Store", "format": "Digital", "platform": "PC", "regular_price": 49.99, "current_price": 14.99, "discount_percent": 70, "url": "https://store.epicgames.com/", "in_stock": true },
        { "store_name": "PlayStation Store", "format": "Digital", "platform": "PlayStation 5", "regular_price": 49.99, "current_price": 19.99, "discount_percent": 60, "url": "https://store.playstation.com/", "in_stock": true }
      ],
      "best_deal": { "store_name": "Steam", "price": 12.49, "regular_price": 49.99, "discount_percent": 75, "format": "Digital", "platform": "PC", "savings": 37.50, "url": "https://store.steampowered.com/app/292030/" },
      "scraped_at": new Date().toISOString()
    },
    {
      "id": "game-002",
      "title": "Cyberpunk 2077: Ultimate Edition",
      "slug": "cyberpunk-2077",
      "cover_image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1091500/header.jpg",
      "backdrop_image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1091500/page_bg_generated_v6b.jpg",
      "release_date": "2020-12-10",
      "publisher": "CD PROJEKT RED",
      "developer": "CD PROJEKT RED",
      "suggested_price": 59.99,
      "metacritic": { "score": 86, "user_score": 7.8, "url": "https://www.metacritic.com/game/cyberpunk-2077/" },
      "howlongtobeat": { "main_story_hours": 25.0, "main_extra_hours": 60, "completionist_hours": 104 },
      "platforms": ["PC", "PlayStation 5", "Xbox Series X/S"],
      "genres": ["RPG", "Ciencia Ficción", "Acción"],
      "description": "Cyberpunk 2077 es una historia de acción y aventura en mundo abierto ambientada en Night City, una megalópolis obsesionada con el poder, el glamour y las modificaciones corporales.",
      "stores": [
        { "store_name": "Steam", "format": "Digital", "platform": "PC", "regular_price": 59.99, "current_price": 29.99, "discount_percent": 50, "url": "https://store.steampowered.com/app/1091500/", "in_stock": true },
        { "store_name": "GOG", "format": "Digital", "platform": "PC", "regular_price": 59.99, "current_price": 29.99, "discount_percent": 50, "url": "https://www.gog.com/", "in_stock": true }
      ],
      "best_deal": { "store_name": "Steam", "price": 29.99, "regular_price": 59.99, "discount_percent": 50, "format": "Digital", "platform": "PC", "savings": 30.00, "url": "https://store.steampowered.com/app/1091500/" },
      "scraped_at": new Date().toISOString()
    },
    {
      "id": "game-003",
      "title": "Elden Ring",
      "slug": "elden-ring",
      "cover_image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1245620/header.jpg",
      "backdrop_image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1245620/page_bg_generated_v6b.jpg",
      "release_date": "2022-02-25",
      "publisher": "FromSoftware",
      "developer": "FromSoftware",
      "suggested_price": 59.99,
      "metacritic": { "score": 96, "user_score": 8.2, "url": "https://www.metacritic.com/game/elden-ring/" },
      "howlongtobeat": { "main_story_hours": 58.5, "main_extra_hours": 100, "completionist_hours": 134 },
      "platforms": ["PC", "PlayStation 5", "PlayStation 4", "Xbox Series X/S", "Xbox One"],
      "genres": ["Souls-like", "Acción", "Fantasía Oscura"],
      "description": "Álzate, Sinluz, y déjate guiar por la gracia para esgrimir el poder del Círculo de Elden y convertirte en el Señor del Círculo en las Tierras Intermedias.",
      "stores": [
        { "store_name": "Steam", "format": "Digital", "platform": "PC", "regular_price": 59.99, "current_price": 35.99, "discount_percent": 40, "url": "https://store.steampowered.com/app/1245620/", "in_stock": true },
        { "store_name": "PlayStation Store", "format": "Digital", "platform": "PlayStation 5", "regular_price": 59.99, "current_price": 41.99, "discount_percent": 30, "url": "https://store.playstation.com/", "in_stock": true }
      ],
      "best_deal": { "store_name": "Steam", "price": 35.99, "regular_price": 59.99, "discount_percent": 40, "format": "Digital", "platform": "PC", "savings": 24.00, "url": "https://store.steampowered.com/app/1245620/" },
      "scraped_at": new Date().toISOString()
    }
  ];

  /**
   * Carga el archivo games.json con tolerancia a fallos
   */
  async function loadData() {
    try {
      const response = await fetch('data/games.json?t=' + Date.now());
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        gamesDataset = data;
        isLoaded = true;
        lastSyncTime = new Date();
        console.log(`[DataLoader] Cargados con éxito ${gamesDataset.length} juegos desde games.json`);
        return gamesDataset;
      }
      throw new Error('Formato de dataset no válido');
    } catch (err) {
      console.warn('[DataLoader] No se pudo cargar data/games.json por fetch (posible protocolo file:/// o ruta relativa). Usando dataset embebido o fallback.', err);
      if (gamesDataset.length === 0) {
        gamesDataset = FALLBACK_GAMES;
        isLoaded = true;
        lastSyncTime = new Date();
      }
      return gamesDataset;
    }
  }

  /**
   * Carga manual de dataset a través de input de archivo o Drag & Drop (Integración con Kevin)
   */
  function importFromJSONString(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!Array.isArray(data)) {
        throw new Error("El archivo JSON debe contener un arreglo de juegos.");
      }
      gamesDataset = data;
      isLoaded = true;
      lastSyncTime = new Date();
      return { success: true, count: gamesDataset.length };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  function getGames() {
    return gamesDataset;
  }

  function getGameById(id) {
    return gamesDataset.find(g => g.id === id);
  }

  function getSummaryStats() {
    if (!gamesDataset.length) return null;

    let totalDeals = 0;
    let maxDiscount = 0;
    let totalScore = 0;
    let gamesWithScore = 0;

    gamesDataset.forEach(g => {
      const disc = g.best_deal ? g.best_deal.discount_percent : 0;
      if (disc > 0) totalDeals++;
      if (disc > maxDiscount) maxDiscount = disc;
      if (g.metacritic && g.metacritic.score) {
        totalScore += g.metacritic.score;
        gamesWithScore++;
      }
    });

    return {
      totalGames: gamesDataset.length,
      activeDeals: totalDeals,
      maxDiscount: maxDiscount,
      avgMetacritic: gamesWithScore ? Math.round(totalScore / gamesWithScore) : 0,
      lastSync: lastSyncTime
    };
  }

  return {
    loadData,
    importFromJSONString,
    getGames,
    getGameById,
    getSummaryStats
  };
})();
