/**
 * Aplicación Principal - Catálogo "Hottest Deals", Filtros, Ordenamiento y Modal
 * IC3101 Arquitectura de Computadoras - III Proyecto: Web Scraping Multinúcleo
 * Bloque 2: Frontend, Performance & Documentación - Adrián Sánchez
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Estado Global de la Interfaz
  const state = {
    allGames: [],
    filteredGames: [],
    currentPage: 1,
    itemsPerPage: 16,
    filters: {
      search: '',
      hottestOnly: false,
      format: 'all',
      platform: 'all',
      store: 'all',
      minDiscount: 0,
      minMetacritic: 0,
      maxPrice: 100
    },
    sortBy: 'discount-desc'
  };

  // Elementos del DOM
  const elements = {
    // Tabs de navegación
    tabButtons: document.querySelectorAll('.tab-btn'),
    viewSections: document.querySelectorAll('.view-section'),
    
    // Ticker Stats
    totalGamesStat: document.getElementById('ticker-total-games'),
    activeDealsStat: document.getElementById('ticker-active-deals'),
    maxDiscountStat: document.getElementById('ticker-max-discount'),
    avgMetaStat: document.getElementById('ticker-avg-meta'),
    syncTimeStat: document.getElementById('ticker-sync-time'),

    // Controles de Búsqueda y Filtros
    searchInput: document.getElementById('search-input'),
    hottestToggleBtn: document.getElementById('btn-hottest-deals'),
    formatSelect: document.getElementById('filter-format'),
    platformSelect: document.getElementById('filter-platform'),
    storeSelect: document.getElementById('filter-store'),
    metaSlider: document.getElementById('filter-meta-slider'),
    metaSliderVal: document.getElementById('filter-meta-val'),
    sortSelect: document.getElementById('sort-select'),
    pageSizeSelect: document.getElementById('page-size-select'),
    btnResetFilters: document.getElementById('btn-reset-filters'),
    resultsCounter: document.getElementById('results-counter'),

    // Contenedor del Catálogo y Paginación
    gamesGrid: document.getElementById('games-grid'),
    paginationWrap: document.getElementById('pagination-wrap'),

    // Modal de Detalle
    modalOverlay: document.getElementById('game-detail-modal'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    modalBackdropImg: document.getElementById('modal-backdrop-img'),
    modalCoverThumb: document.getElementById('modal-cover-thumb'),
    modalTitle: document.getElementById('modal-title'),
    modalPublisher: document.getElementById('modal-publisher'),
    modalMetaBox: document.getElementById('modal-meta-box'),
    modalUserScore: document.getElementById('modal-user-score'),
    modalStoresTbody: document.getElementById('modal-stores-tbody'),
    modalHltbMain: document.getElementById('modal-hltb-main'),
    modalHltbExtra: document.getElementById('modal-hltb-extra'),
    modalHltbComp: document.getElementById('modal-hltb-comp'),
    modalPlatformsList: document.getElementById('modal-platforms-list'),
    modalDesc: document.getElementById('modal-desc'),
    modalScrapedDate: document.getElementById('modal-scraped-date'),

    // Sincronización con REPO (Kevin)
    fileInput: document.getElementById('repo-file-input'),
    dropZone: document.getElementById('repo-dropzone'),
    syncStatusBox: document.getElementById('sync-status-msg'),
    btnReloadData: document.getElementById('btn-reload-data')
  };

  // 1. Inicialización
  await initApp();

  async function initApp() {
    setupTabNavigation();
    setupFilterEvents();
    setupModalEvents();
    setupRepoSyncEvents();

    // Cargar dataset inicial
    const games = await DataLoader.loadData();
    state.allGames = games;
    state.filteredGames = [...games];

    updateLiveTicker();
    applyFiltersAndRender();

    // Inicializar módulo de rendimiento si existe
    if (typeof BenchmarkModule !== 'undefined') {
      BenchmarkModule.init();
    }
  }

  // 2. Navegación entre Vistas (Tabs)
  function setupTabNavigation() {
    elements.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetViewId = btn.getAttribute('data-view');
        
        elements.tabButtons.forEach(b => b.classList.remove('active'));
        elements.viewSections.forEach(s => s.classList.remove('active'));

        btn.classList.add('active');
        const targetSection = document.getElementById(targetViewId);
        if (targetSection) {
          targetSection.classList.add('active');
        }

        // Si se cambia a tab de rendimiento, forzar resize de canvas para que Chart.js dibuje perfecto
        if (targetViewId === 'view-benchmark') {
          window.dispatchEvent(new Event('resize'));
        }
      });
    });
  }

  // 3. Eventos de Filtro y Ordenamiento
  function setupFilterEvents() {
    // Búsqueda por texto en tiempo real
    elements.searchInput.addEventListener('input', (e) => {
      state.filters.search = e.target.value.trim().toLowerCase();
      state.currentPage = 1;
      applyFiltersAndRender();
    });

    // Toggle Hottest Deals (>= 50% descuento)
    elements.hottestToggleBtn.addEventListener('click', () => {
      state.filters.hottestOnly = !state.filters.hottestOnly;
      elements.hottestToggleBtn.classList.toggle('active', state.filters.hottestOnly);
      state.currentPage = 1;
      applyFiltersAndRender();
    });

    // Filtro por Formato (Todos, Digital, Físico)
    elements.formatSelect.addEventListener('change', (e) => {
      state.filters.format = e.target.value;
      state.currentPage = 1;
      applyFiltersAndRender();
    });

    // Filtro por Plataforma
    elements.platformSelect.addEventListener('change', (e) => {
      state.filters.platform = e.target.value;
      state.currentPage = 1;
      applyFiltersAndRender();
    });

    // Filtro por Tienda
    elements.storeSelect.addEventListener('change', (e) => {
      state.filters.store = e.target.value;
      state.currentPage = 1;
      applyFiltersAndRender();
    });

    // Filtro por Slider de Metacritic
    elements.metaSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.filters.minMetacritic = val;
      elements.metaSliderVal.textContent = `${val}+`;
      state.currentPage = 1;
      applyFiltersAndRender();
    });

    // Ordenamiento
    elements.sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      applyFiltersAndRender();
    });

    // Items por página
    elements.pageSizeSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      state.itemsPerPage = val === 'all' ? 99999 : parseInt(val, 10);
      state.currentPage = 1;
      applyFiltersAndRender();
    });

    // Limpiar todos los filtros
    elements.btnResetFilters.addEventListener('click', () => {
      resetFilters();
    });
  }

  function resetFilters() {
    state.filters = {
      search: '',
      hottestOnly: false,
      format: 'all',
      platform: 'all',
      store: 'all',
      minDiscount: 0,
      minMetacritic: 0,
      maxPrice: 100
    };
    state.sortBy = 'discount-desc';
    state.currentPage = 1;

    // Resetear controles en el DOM
    elements.searchInput.value = '';
    elements.hottestToggleBtn.classList.remove('active');
    elements.formatSelect.value = 'all';
    elements.platformSelect.value = 'all';
    elements.storeSelect.value = 'all';
    elements.metaSlider.value = 0;
    elements.metaSliderVal.textContent = '0+';
    elements.sortSelect.value = 'discount-desc';

    applyFiltersAndRender();
  }

  // 4. Filtrado, Ordenamiento y Paginación
  function applyFiltersAndRender() {
    let result = state.allGames.filter(game => {
      // 1. Filtro de búsqueda por texto
      if (state.filters.search) {
        const titleMatch = game.title.toLowerCase().includes(state.filters.search);
        const pubMatch = game.publisher ? game.publisher.toLowerCase().includes(state.filters.search) : false;
        if (!titleMatch && !pubMatch) return false;
      }

      // 2. Filtro Hottest Deals Only (descuento >= 50%)
      const bestDiscount = game.best_deal ? game.best_deal.discount_percent : 0;
      if (state.filters.hottestOnly && bestDiscount < 50) {
        return false;
      }

      // 3. Filtro por Metacritic Score
      const rawMeta = (game.metacritic && typeof game.metacritic.score === 'number') 
        ? game.metacritic.score 
        : (typeof game.metascore === 'number' ? game.metascore : 0);
      if (rawMeta < state.filters.minMetacritic) {
        return false;
      }

      // 4. Filtro por Formato (Digital / Físico)
      if (state.filters.format !== 'all') {
        const targetFmt = state.filters.format.toLowerCase();
        const hasFormat = game.stores && game.stores.some(s => {
          const f = (s.format || "digital").toLowerCase();
          if (targetFmt === "digital" && (f === "digital")) return true;
          if (targetFmt === "físico" && (f === "físico" || f === "physical")) return true;
          return f.includes(targetFmt);
        });
        if (!hasFormat) return false;
      }

      // 5. Filtro por Plataforma (Mapeo canónico resiliente)
      if (state.filters.platform !== 'all') {
        const targetPlat = state.filters.platform.toLowerCase();
        const normTarget = targetPlat.includes("5") || targetPlat.includes("ps5") ? "ps5" :
                           targetPlat.includes("4") || targetPlat.includes("ps4") ? "ps4" :
                           targetPlat.includes("series") || targetPlat.includes("xbox") ? "xbox" :
                           targetPlat.includes("switch") ? "switch" :
                           targetPlat.includes("pc") ? "pc" : targetPlat;

        const hasPlatform = game.platforms && game.platforms.some(p => {
          const pl = p.toLowerCase();
          if (pl.includes(targetPlat)) return true;
          if (normTarget === "ps5" && (pl.includes("ps5") || pl.includes("playstation 5"))) return true;
          if (normTarget === "ps4" && (pl.includes("ps4") || pl.includes("playstation 4"))) return true;
          if (normTarget === "xbox" && (pl.includes("xbox"))) return true;
          if (normTarget === "switch" && (pl.includes("switch"))) return true;
          if (normTarget === "pc" && (pl.includes("pc") || pl.includes("windows"))) return true;
          return false;
        });
        if (!hasPlatform) return false;
      }

      // 6. Filtro por Tienda
      if (state.filters.store !== 'all') {
        const targetStore = state.filters.store.toLowerCase();
        const hasStore = game.stores && game.stores.some(s => {
          const sName = (s.store_name || s.store || "").toLowerCase();
          if (targetStore === "cheapshark") {
            // CheapShark indexa las tiendas afiliadas (Humble, GameBillet, WinGameStore, GreenManGaming, etc.)
            return sName !== "steam" && sName !== "";
          }
          return sName.includes(targetStore) || targetStore.includes(sName);
        });
        if (!hasStore) return false;
      }

      return true;
    });

    // Ordenamiento
    result.sort((a, b) => {
      const bestA = a.best_deal || { price: 999, discount_percent: 0 };
      const bestB = b.best_deal || { price: 999, discount_percent: 0 };
      const metaA = a.metacritic ? a.metacritic.score : 0;
      const metaB = b.metacritic ? b.metacritic.score : 0;
      const hltbA = a.howlongtobeat ? a.howlongtobeat.main_story_hours : 0;
      const hltbB = b.howlongtobeat ? b.howlongtobeat.main_story_hours : 0;

      switch (state.sortBy) {
        case 'discount-desc':
          return bestB.discount_percent - bestA.discount_percent;
        case 'price-asc':
          return bestA.price - bestB.price;
        case 'price-desc':
          return bestB.price - bestA.price;
        case 'meta-desc':
          return metaB - metaA;
        case 'hltb-asc':
          return hltbA - hltbB;
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'date-desc':
          return new Date(b.release_date || 0) - new Date(a.release_date || 0);
        default:
          return 0;
      }
    });

    state.filteredGames = result;

    // Actualizar Contador de Resultados
    elements.resultsCounter.innerHTML = `Mostrando <strong>${result.length}</strong> de <strong>${state.allGames.length}</strong> juegos con ofertas`;

    renderCatalog();
    renderPagination();
  }

  // 5. Renderizado de Tarjetas ("Hottest Deals")
  function renderCatalog() {
    elements.gamesGrid.innerHTML = '';

    if (state.filteredGames.length === 0) {
      elements.gamesGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--bg-border);">
          <i class="fa-solid fa-gamepad" style="font-size: 3rem; color: var(--text-dim); margin-bottom: 16px;"></i>
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 8px;">No se encontraron ofertas con estos filtros</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 18px;">Prueba ajustando los filtros de plataforma, tienda o bajando el score mínimo.</p>
          <button id="btn-empty-reset" class="btn-reset-filters" style="margin: 0 auto;">Limpiar todos los filtros</button>
        </div>
      `;
      const btnEmptyReset = document.getElementById('btn-empty-reset');
      if (btnEmptyReset) btnEmptyReset.addEventListener('click', resetFilters);
      return;
    }

    // Calcular límites de paginación
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const pageItems = state.filteredGames.slice(startIndex, startIndex + state.itemsPerPage);

    pageItems.forEach(game => {
      const best = game.best_deal || { price: 0, regular_price: 0, discount_percent: 0, store_name: 'Desconocido', format: 'Digital' };
      const isSuperDeal = best.discount_percent >= 60;
      const isHot = best.discount_percent >= 50;

      // Color de Metacritic
      const metaScore = game.metacritic ? game.metacritic.score : 0;
      let metaColorClass = 'meta-red';
      if (metaScore >= 75) metaColorClass = 'meta-green';
      else if (metaScore >= 50) metaColorClass = 'meta-yellow';

      // Fallback seguro de portada
      const coverUrl = game.cover_image || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80';

      // Plataformas badges (primeras 3)
      const platBadges = (game.platforms || []).slice(0, 3).map(p => {
        let shortName = p.replace("PlayStation", "PS").replace("Series X/S", "XSX");
        return `<span class="tag-platform">${shortName}</span>`;
      }).join('');

      // Horas HowLongToBeat
      const hltbHours = game.howlongtobeat ? game.howlongtobeat.main_story_hours : null;
      const hltbHtml = hltbHours ? `<span class="tag-hltb"><i class="fa-regular fa-clock"></i> ${hltbHours}h</span>` : '';

      const card = document.createElement('div');
      card.className = `deal-card ${isHot ? 'is-hot' : ''}`;
      card.innerHTML = `
        <div class="card-image-wrap">
          <img src="${coverUrl}" alt="${game.title}" class="card-img" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80'">
          ${best.discount_percent > 0 ? `
            <div class="discount-badge ${isSuperDeal ? 'super-deal' : ''}">
              <i class="fa-solid fa-fire"></i> -${best.discount_percent}%
            </div>
          ` : ''}
          ${metaScore > 0 ? `
            <div class="metacritic-badge" title="Metascore en Metacritic">
              <span>MC</span>
              <div class="meta-score-box ${metaColorClass}">${metaScore}</div>
            </div>
          ` : ''}
        </div>

        <div class="card-content">
          <h3 class="card-title" title="${game.title}">${game.title}</h3>
          
          <div class="card-meta-tags">
            ${platBadges}
            <span class="tag-format">${best.format || 'Digital'}</span>
            ${hltbHtml}
          </div>

          <div class="card-pricing-box">
            <div class="store-info">
              <span class="store-label">Mejor Oferta En:</span>
              <span class="store-name-tag"><i class="fa-solid fa-store"></i> ${best.store_name}</span>
            </div>
            <div class="price-numbers">
              ${best.regular_price > best.price ? `<div class="price-old">$${best.regular_price.toFixed(2)}</div>` : ''}
              <div class="price-current">$${best.price.toFixed(2)}</div>
            </div>
          </div>

          <div class="card-actions-row">
            <button class="btn-detail" data-game-id="${game.id}">
              <i class="fa-solid fa-circle-info"></i> Ver Detalle
            </button>
            <a href="${best.url || '#'}" target="_blank" rel="noopener noreferrer" class="btn-buy-store">
              <i class="fa-solid fa-cart-shopping"></i> Comprar
            </a>
          </div>
        </div>
      `;

      // Event listener para el botón de detalle
      const detailBtn = card.querySelector('.btn-detail');
      detailBtn.addEventListener('click', () => {
        openGameModal(game.id);
      });

      elements.gamesGrid.appendChild(card);
    });
  }

  // 6. Renderizado de la Paginación
  function renderPagination() {
    elements.paginationWrap.innerHTML = '';
    const totalPages = Math.ceil(state.filteredGames.length / state.itemsPerPage);

    if (totalPages <= 1) return;

    // Botón Anterior
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    prevBtn.disabled = state.currentPage === 1;
    prevBtn.addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        applyFiltersAndRender();
        window.scrollTo({ top: 320, behavior: 'smooth' });
      }
    });
    elements.paginationWrap.appendChild(prevBtn);

    // Rango de páginas visible
    let startPage = Math.max(1, state.currentPage - 2);
    let endPage = Math.min(totalPages, state.currentPage + 2);

    for (let p = startPage; p <= endPage; p++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = `page-btn ${p === state.currentPage ? 'active' : ''}`;
      pageBtn.textContent = p;
      pageBtn.addEventListener('click', () => {
        state.currentPage = p;
        applyFiltersAndRender();
        window.scrollTo({ top: 320, behavior: 'smooth' });
      });
      elements.paginationWrap.appendChild(pageBtn);
    }

    // Botón Siguiente
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    nextBtn.disabled = state.currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
      if (state.currentPage < totalPages) {
        state.currentPage++;
        applyFiltersAndRender();
        window.scrollTo({ top: 320, behavior: 'smooth' });
      }
    });
    elements.paginationWrap.appendChild(nextBtn);
  }

  // 7. Ventana Modal de Detalle por Juego
  function setupModalEvents() {
    elements.modalCloseBtn.addEventListener('click', closeModal);
    elements.modalOverlay.addEventListener('click', (e) => {
      if (e.target === elements.modalOverlay) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && elements.modalOverlay.classList.contains('active')) {
        closeModal();
      }
    });
  }

  function openGameModal(gameId) {
    const game = DataLoader.getGameById(gameId);
    if (!game) return;

    const best = game.best_deal || { price: 0, store_name: '' };

    // Portada y backdrop
    elements.modalBackdropImg.src = game.backdrop_image || game.cover_image;
    elements.modalCoverThumb.src = game.cover_image;
    elements.modalTitle.textContent = game.title;
    elements.modalPublisher.textContent = `${game.publisher || 'Desconocido'} • Lanzamiento: ${game.release_date || 'N/A'}`;

    // Metacritic
    const metaScore = game.metacritic ? game.metacritic.score : 0;
    const userScore = game.metacritic ? game.metacritic.user_score : 'N/A';
    elements.modalMetaBox.textContent = metaScore || 'N/A';
    elements.modalMetaBox.className = 'meta-score-box ' + (metaScore >= 75 ? 'meta-green' : (metaScore >= 50 ? 'meta-yellow' : 'meta-red'));
    elements.modalUserScore.textContent = userScore;

    // HowLongToBeat
    elements.modalHltbMain.textContent = game.howlongtobeat ? `${game.howlongtobeat.main_story_hours} horas` : 'N/A';
    elements.modalHltbExtra.textContent = game.howlongtobeat ? `${game.howlongtobeat.main_extra_hours} horas` : 'N/A';
    elements.modalHltbComp.textContent = game.howlongtobeat ? `${game.howlongtobeat.completionist_hours} horas` : 'N/A';

    // Plataformas
    elements.modalPlatformsList.innerHTML = (game.platforms || []).map(p => `
      <span class="tag-platform">${p}</span>
    `).join('');

    // Descripción
    elements.modalDesc.textContent = game.description || 'Sin descripción disponible para este título.';
    elements.modalScrapedDate.textContent = game.scraped_at ? new Date(game.scraped_at).toLocaleString() : 'Reciente';

    // Tabla de tiendas scrappeadas (Nivel 3)
    elements.modalStoresTbody.innerHTML = '';
    (game.stores || []).forEach(store => {
      const isBest = store.store_name === best.store_name && store.current_price === best.price;
      const tr = document.createElement('tr');
      if (isBest) tr.className = 'best-store-row';

      tr.innerHTML = `
        <td>
          <strong>${store.store_name}</strong>
          ${isBest ? '<span class="best-badge-pill"><i class="fa-solid fa-crown"></i> MEJOR PRECIO</span>' : ''}
        </td>
        <td><span class="tag-platform">${store.platform}</span></td>
        <td><span class="tag-format">${store.format}</span></td>
        <td style="color: var(--text-dim); text-decoration: line-through;">$${store.regular_price.toFixed(2)}</td>
        <td style="color: var(--accent-deal); font-weight: 800; font-size: 1rem;">$${store.current_price.toFixed(2)}</td>
        <td>
          <span class="discount-badge" style="font-size: 0.78rem; padding: 2px 6px;">
            -${store.discount_percent}%
          </span>
        </td>
        <td>
          <a href="${store.url}" target="_blank" rel="noopener noreferrer" class="btn-buy-store" style="padding: 5px 12px; font-size: 0.78rem;">
            Ir a Tienda <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.7rem;"></i>
          </a>
        </td>
      `;
      elements.modalStoresTbody.appendChild(tr);
    });

    elements.modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    elements.modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  // 8. Actualización del Ticker de Estadísticas
  function updateLiveTicker() {
    const stats = DataLoader.getSummaryStats();
    if (!stats) return;

    elements.totalGamesStat.textContent = stats.totalGames;
    elements.activeDealsStat.textContent = stats.activeDeals;
    elements.maxDiscountStat.textContent = `-${stats.maxDiscount}%`;
    elements.avgMetaStat.textContent = `${stats.avgMetacritic}/100`;
    elements.syncTimeStat.textContent = stats.lastSync ? stats.lastSync.toLocaleTimeString() : 'En vivo';
  }

  // 9. Sincronización con REPO (Integración continua con Kevin)
  function setupRepoSyncEvents() {
    // Input de archivo JSON
    elements.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleFileImport(file);
    });

    // Drag & Drop
    ['dragenter', 'dragover'].forEach(name => {
      elements.dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        elements.dropZone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      elements.dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        elements.dropZone.classList.remove('drag-over');
      });
    });

    elements.dropZone.addEventListener('drop', (e) => {
      const file = e.dataTransfer.files[0];
      if (file) handleFileImport(file);
    });

    // Botón Recargar / Refrescar desde servidor
    elements.btnReloadData.addEventListener('click', async () => {
      elements.btnReloadData.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sincronizando...';
      const games = await DataLoader.loadData();
      state.allGames = games;
      state.currentPage = 1;
      updateLiveTicker();
      applyFiltersAndRender();
      setTimeout(() => {
        elements.btnReloadData.innerHTML = '<i class="fa-solid fa-rotate"></i> Sincronizar Ahora';
        showSyncMessage(`Dataset actualizado con éxito (${games.length} juegos en el REPO)`, 'success');
      }, 500);
    });
  }

  function handleFileImport(file) {
    if (!file.name.endsWith('.json')) {
      showSyncMessage('El archivo debe tener formato .json', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const res = DataLoader.importFromJSONString(e.target.result);
      if (res.success) {
        state.allGames = DataLoader.getGames();
        state.currentPage = 1;
        updateLiveTicker();
        applyFiltersAndRender();
        showSyncMessage(`¡Dataset importado con éxito! Se cargaron ${res.count} juegos scrapeados.`, 'success');
      } else {
        showSyncMessage(`Error al procesar JSON: ${res.error}`, 'error');
      }
    };
    reader.readAsText(file);
  }

  function showSyncMessage(msg, type) {
    elements.syncStatusBox.textContent = msg;
    elements.syncStatusBox.style.display = 'block';
    elements.syncStatusBox.style.color = type === 'success' ? 'var(--accent-deal)' : 'var(--accent-danger)';
    elements.syncStatusBox.style.background = type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
    elements.syncStatusBox.style.border = `1px solid ${type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`;
  }
});
