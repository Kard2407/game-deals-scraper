/**
 * Data Loader Module - Manejo de datos y sincronización con Firestore / REPO
 * IC3101 Arquitectura de Computadoras - III Proyecto: Web Scraping Multinúcleo
 * Bloque 2: Frontend & Performance - Adrián Sánchez
 */

const DataLoader = (() => {
  let gamesDataset = [];
  let isLoaded = false;
  let lastSyncTime = null;

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
    }
  ];

  /**
   * Normaliza cada documento de Firestore al esquema esperado por el Frontend
   */
  function normalizeGameDoc(docId, raw) {
    const title = raw.title || raw.name || "Juego sin título";
    const slug = raw.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const stores = Array.isArray(raw.stores) ? raw.stores : [];

    let bestDeal = raw.best_deal || null;
    if (!bestDeal && stores.length > 0) {
      const sorted = [...stores].sort((a, b) => (a.current_price ?? 999) - (b.current_price ?? 999));
      const best = sorted[0];
      const reg = best.regular_price || raw.msrp || raw.suggested_price || best.current_price || 0;
      const cur = best.current_price ?? reg;
      bestDeal = {
        store_name: best.store_name || "Tienda",
        price: cur,
        regular_price: reg,
        discount_percent: best.discount_percent ?? (reg > 0 ? Math.round((1 - cur / reg) * 100) : 0),
        format: best.format || "Digital",
        platform: best.platform || (Array.isArray(raw.platforms) && raw.platforms[0]) || "PC",
        savings: +(reg - cur).toFixed(2),
        url: best.url || "#"
      };
    }

    return {
      id: raw.id || docId,
      title,
      slug,
      cover_image: raw.cover_image || "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/292030/header.jpg",
      backdrop_image: raw.backdrop_image || raw.cover_image || "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/292030/page_bg_generated_v6b.jpg",
      release_date: raw.release_date || "2024-01-01",
      publisher: raw.publisher || "Desconocido",
      developer: raw.developer || raw.publisher || "Desconocido",
      suggested_price: raw.suggested_price || raw.msrp || (bestDeal ? bestDeal.regular_price : 59.99),
      metacritic: raw.metacritic || { score: null, user_score: null, url: "#" },
      howlongtobeat: raw.howlongtobeat || { main_story_hours: null, main_extra_hours: null, completionist_hours: null },
      platforms: Array.isArray(raw.platforms) ? raw.platforms : ["PC"],
      genres: Array.isArray(raw.genres) ? raw.genres : ["Acción"],
      description: raw.description || `Ofertas y métricas recopiladas para ${title}.`,
      stores,
      best_deal: bestDeal,
      scraped_at: raw.updated_at || raw.scraped_at || new Date().toISOString()
    };
  }

  /**
   * Espera brevemente a que el módulo ES de Firebase termine de inicializarse
   */
  async function waitForFirebaseBridge(maxWaitMs = 1500) {
    const start = Date.now();
    while (!window.FirebaseBridge && (Date.now() - start) < maxWaitMs) {
      await new Promise(r => setTimeout(r, 50));
    }
    return window.FirebaseBridge || null;
  }

  /**
   * Carga datos desde Firestore ('games') con fallback a data/games.json
   */
  async function loadData() {
    // 1. Intentar leer desde Firebase Firestore
    try {
      const bridge = await waitForFirebaseBridge();
      if (bridge && bridge.db) {
        const snapshot = await bridge.getDocs(bridge.collection(bridge.db, "games"));
        if (!snapshot.empty) {
          gamesDataset = snapshot.docs.map(doc => normalizeGameDoc(doc.id, doc.data()));
          isLoaded = true;
          lastSyncTime = new Date();
          console.log(`[DataLoader] Sincronizados ${gamesDataset.length} juegos desde Firebase Firestore.`);
          return gamesDataset;
        }
        console.warn("[DataLoader] La colección 'games' en Firestore está vacía. Usando data/games.json...");
      }
    } catch (fbErr) {
      console.warn("[DataLoader] No se pudo leer desde Firestore, cambiando a respaldo local:", fbErr);
    }

    // 2. Respaldo local data/games.json
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
      console.warn('[DataLoader] Usando FALLBACK_GAMES embebido.', err);
      if (gamesDataset.length === 0) {
        gamesDataset = FALLBACK_GAMES;
        isLoaded = true;
        lastSyncTime = new Date();
      }
      return gamesDataset;
    }
  }

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