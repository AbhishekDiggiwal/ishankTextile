  let allProducts = [];
  let allCategories = [];
  let currentViewMode = 'grid'; // 'grid' or 'list'
  let currentActiveCategory = null;
  const defaultPriceDisplaySettings = { showCategoryPrices: true, showProductPrices: true };
  let priceDisplaySettings = Object.assign({}, defaultPriceDisplaySettings);
  let isPriceFilterActive = false;
  let isGsmFilterActive = false;

  function escapeHtml(value) {
    return SecurityUtils.escapeHtml(value);
  }
  function productApplications(product) {
    return Array.isArray(product.applications) ? product.applications : String(product.applications || '').split(',').map((item) => item.trim()).filter(Boolean);
  }

  function hasNumberValue(value) {
    return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  }

  function getProductPrimaryPrice(product) {
    if (product.priceType === 'Range') {
      return hasNumberValue(product.priceMin) ? Number(product.priceMin) : null;
    }
    if (hasNumberValue(product.startingPrice)) return Number(product.startingPrice);
    if (hasNumberValue(product.price)) return Number(product.price);
    return null;
  }

  function getCatalogueDataManager() {
    if (typeof DataManager !== 'undefined') return DataManager;
    return window.DataManager || null;
  }

  function rejectAfter(ms, message) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  async function loadPriceDisplaySettings() {
    const defaults = Object.assign({}, defaultPriceDisplaySettings);
    try {
      const manager = getCatalogueDataManager();
      if (!manager || typeof manager.getSettings !== 'function') {
        return defaults;
      }
      const settings = await Promise.race([
        manager.getSettings(),
        rejectAfter(2500, 'Settings read timed out')
      ]);
      return Object.assign(defaults, settings || {});
    } catch (error) {
      console.warn('Using default catalogue price display settings:', error);
      return defaults;
    }
  }

  async function loadCatalogueData() {
    const manager = getCatalogueDataManager();
    if (!manager || typeof manager.getCategories !== 'function' || typeof manager.getProducts !== 'function') {
      throw new Error('Catalogue data manager is unavailable');
    }

    const [settings, categories, products] = await Promise.all([
      loadPriceDisplaySettings(),
      manager.getCategories(),
      manager.getProducts()
    ]);

    priceDisplaySettings = settings;
    allCategories = (Array.isArray(categories) ? categories : []).filter((category) => category.active !== false);
    allProducts = (Array.isArray(products) ? products : []).filter((product) => product.active !== false);

    if (priceDisplaySettings.showProductPrices === false) {
      const priceFilterContainer = document.getElementById('priceFilterContainer');
      if (priceFilterContainer) {
        priceFilterContainer.style.display = 'none';
      }
    }
  }

  function formatProductPrice(product) {
    if (priceDisplaySettings.showProductPrices === false) return '';
    const unit = product.priceUnit === 'kg' ? 'kg' : 'm';
    if (product.priceType === 'Range') {
      if (!hasNumberValue(product.priceMin) || !hasNumberValue(product.priceMax)) return '';
      return '<span class="whitespace-nowrap">&#8377;' + Number(product.priceMin) + ' - &#8377;' + Number(product.priceMax) + '<span class="text-[10px] text-on-surface-variant font-normal">/' + unit + '</span></span>';
    } else {
      const price = getProductPrimaryPrice(product);
      if (price === null) return '';
      return '<span class="text-[9px] text-on-surface-variant font-normal uppercase tracking-wider block text-right leading-none mb-0.5 whitespace-nowrap">Starting Price</span>' +
             '<span class="whitespace-nowrap">&#8377;' + price + '<span class="text-[10px] text-on-surface-variant font-normal">/' + unit + '</span></span>';
    }
  }

  function productCard(product, index) {
    if (currentViewMode === 'list') {
      return productCardList(product, index);
    }
    return productCardGrid(product, index);
  }

  function productCardGrid(product, index) {
    const category = allCategories.find((item) => item.id === product.categoryId);
    const applications = productApplications(product);
    const price = getProductPrimaryPrice(product);
    const featured = index === 2 && currentViewMode !== 'list';

    // Compact classes
    const cardClass = featured
      ? 'lg:col-span-2 group bg-surface-container border border-outline-variant/50 flex flex-col md:flex-row hover:shadow-2xl transition-all duration-300 relative overflow-hidden fabric-texture-overlay product-card rounded-xl md:h-52'
      : 'group bg-surface-container-lowest border border-outline-variant/50 flex flex-col hover:shadow-2xl transition-all duration-300 relative overflow-hidden fabric-texture-overlay product-card rounded-xl';

    const imageClass = (featured
      ? 'w-full md:w-[220px] h-48 md:h-full overflow-hidden relative flex-shrink-0'
      : 'h-48 overflow-hidden relative') + ' bg-surface-variant animate-pulse';

    const contentClass = featured
      ? 'p-4 flex flex-col justify-center flex-grow'
      : 'p-4 flex flex-col flex-grow';

    const rawTag = product.clothing || (category && category.clothing) || 'Suiting';
    const clothingTag = String(rawTag || '').trim();
    const clothingTagHtml = clothingTag
      ? '  <span class="inline-flex items-center px-2.5 py-0.5 bg-primary/[0.08] backdrop-blur-md text-primary border border-primary/20 text-[9px] font-label-bold font-normal rounded-full uppercase tracking-wider shadow-sm leading-none">\n                ' + escapeHtml(clothingTag) + '\n              </span>'
      : '';
    const productPriceHtml = formatProductPrice(product);
    const productMetaHtml = (productPriceHtml || clothingTagHtml)
      ? '<div class="text-primary font-bold text-base flex-shrink-0 text-right flex flex-col justify-end items-end gap-1.5">' + productPriceHtml + clothingTagHtml + '</div>'
      : '';

    return '<article data-action="recordFabricVisit" data-product-id="' + escapeHtml(product.id) + '" class="' + cardClass + '" data-category="' + escapeHtml(product.categoryId) + '" data-price="' + (price === null ? '' : price) + '" data-application="' + escapeHtml(applications.join(' ').toLowerCase()) + '">' +
      '<div class="' + imageClass + '"><img class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" data-remove-loading="true" src="' + escapeHtml(SecurityUtils.safeImageUrl(product.image, fallbackProducts[index % fallbackProducts.length].image)) + '" alt="' + escapeHtml(product.name) + '"><div class="absolute top-3 right-3 bg-primary px-2.5 py-0.5 text-on-primary font-label-bold text-[10px] uppercase rounded-full">' + escapeHtml(category ? category.name : 'Textile') + '</div></div>' +
      '<div class="' + contentClass + '"><div class="flex justify-between items-start mb-2 gap-stack-md"><div class="flex-grow min-w-0"><h4 class="text-base font-bold text-on-surface leading-tight">' + escapeHtml(product.name) + '</h4>' +
      '  <div class="text-on-surface-variant text-[14px] mt-1.5 font-semibold font-mono tracking-wider">' + escapeHtml(product.code || 'IT-FABRIC') + '</div>' +
      '</div>' + productMetaHtml + '</div>' +
      '<p class="text-on-surface-variant text-[12px] mb-2 line-clamp-2">' + escapeHtml(product.description) + '</p>' +
      '<div class="grid grid-cols-3 gap-2 my-2 border-y border-outline-variant/20 py-1.5 text-[11px]">' +
      '<div class="flex flex-col items-start"><span class="text-on-surface-variant text-[10px] uppercase font-label-bold">GSM</span><span class="font-bold">' + escapeHtml(!product.gsm || Number(product.gsm) <= 0 ? 'Custom' : product.gsm) + '</span></div>' +
      '<div class="flex flex-col items-center"><span class="text-on-surface-variant text-[10px] uppercase font-label-bold">Blend</span><span class="font-bold text-center">' + escapeHtml(product.blend || 'Custom') + '</span></div>' +
      '<div class="flex flex-col items-end"><span class="text-on-surface-variant text-[10px] uppercase font-label-bold">Weave</span><span class="font-bold text-right">' + escapeHtml(product.weave || 'Custom') + '</span></div>' +
      '</div>' +
      '<div class="mt-auto flex gap-stack-sm"><button type="button" data-product-id="' + escapeHtml(product.id) + '" data-action="requestQuote" data-stop-propagation="true" class="w-full bg-secondary text-on-secondary py-2 font-label-bold uppercase text-[10px] hover:bg-on-surface-variant rounded-full transition-colors">Request Quote</button></div></div></article>';
  }

  function productCardList(product, index) {
    const category = allCategories.find((item) => item.id === product.categoryId);
    const applications = productApplications(product);
    const price = getProductPrimaryPrice(product);

    const cardClass = 'group bg-surface-container border border-outline-variant/50 flex flex-col md:flex-row hover:shadow-2xl transition-all duration-300 relative overflow-hidden fabric-texture-overlay product-card h-auto md:h-48 rounded-xl';
    const imageClass = 'w-full md:w-[200px] h-44 md:h-full overflow-hidden relative flex-shrink-0 bg-surface-variant animate-pulse';
    const contentClass = 'p-3 md:p-3.5 flex flex-col justify-between flex-grow';
    const rawTag = product.clothing || (category && category.clothing) || 'Suiting';
    const clothingTag = String(rawTag || '').trim();
    const clothingTagHtml = clothingTag
      ? '  <span class="inline-flex items-center px-2.5 py-0.5 bg-primary/[0.08] backdrop-blur-md text-primary border border-primary/20 text-[9px] font-label-bold font-normal rounded-full uppercase tracking-wider shadow-sm leading-none">\n                ' + escapeHtml(clothingTag) + '\n              </span>'
      : '';
    const productPriceHtml = formatProductPrice(product);
    const productMetaHtml = (productPriceHtml || clothingTagHtml)
      ? '<div class="text-primary font-bold text-sm md:text-[16px] flex-shrink-0 text-right flex flex-col justify-end items-end gap-1.5">' + productPriceHtml + clothingTagHtml + '</div>'
      : '';

    return '<article data-action="recordFabricVisit" data-product-id="' + escapeHtml(product.id) + '" class="' + cardClass + '" data-category="' + escapeHtml(product.categoryId) + '" data-price="' + (price === null ? '' : price) + '" data-application="' + escapeHtml(applications.join(' ').toLowerCase()) + '">' +
      '<div class="' + imageClass + '"><img class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" data-remove-loading="true" src="' + escapeHtml(SecurityUtils.safeImageUrl(product.image, fallbackProducts[index % fallbackProducts.length].image)) + '" alt="' + escapeHtml(product.name) + '"><div class="absolute top-3 left-3 bg-primary text-on-primary px-2.5 py-0.5 text-[9px] uppercase font-label-bold rounded-full">' + escapeHtml(category ? category.name : 'Textile') + '</div></div>' +
      '<div class="' + contentClass + '">' +
      '  <div class="flex justify-between items-start gap-2"><div class="flex-grow min-w-0"><h4 class="text-sm md:text-[16px] font-bold text-on-surface leading-tight">' + escapeHtml(product.name) + '</h4>' +
      '  <div class="text-on-surface-variant text-[14px] mt-1.5 font-semibold font-mono tracking-wider">' + escapeHtml(product.code || 'IT-FABRIC') + '</div>' +
      '</div>' + productMetaHtml + '</div>' +
      '  <p class="text-on-surface-variant text-[11px] md:text-xs my-1 line-clamp-1">' + escapeHtml(product.description) + '</p>' +
      '  <div class="grid grid-cols-3 gap-2 my-1 border-y border-outline-variant/20 py-1 text-[11px]">' +
      '<div class="flex flex-col items-start"><span class="text-on-surface-variant text-[9px] md:text-[10px] uppercase font-label-bold">GSM</span><span class="font-bold">' + escapeHtml(!product.gsm || Number(product.gsm) <= 0 ? 'Custom' : product.gsm) + '</span></div>' +
      '<div class="flex flex-col items-center"><span class="text-on-surface-variant text-[9px] md:text-[10px] uppercase font-label-bold">Blend</span><span class="font-bold text-center">' + escapeHtml(product.blend || 'Custom') + '</span></div>' +
      '<div class="flex flex-col items-end"><span class="text-on-surface-variant text-[9px] md:text-[10px] uppercase font-label-bold">Weave</span><span class="font-bold text-right">' + escapeHtml(product.weave || 'Custom') + '</span></div>' +
      '</div>' +
      '  <div class="mt-auto flex gap-2"><button type="button" data-product-id="' + escapeHtml(product.id) + '" data-action="requestQuote" data-stop-propagation="true" class="w-full bg-secondary text-on-secondary py-1.5 font-label-bold uppercase text-[9px] md:text-[10px] hover:bg-on-surface-variant rounded-full transition-colors">Request Quote</button></div>' +
      '</div></article>';
  }

  const ITEMS_PER_PAGE = 10;
  let currentPage = 1;
  let currentFilteredProducts = [];

  function updatePriceTooltip() {
    const slider = document.getElementById('priceRange');
    const tooltip = document.getElementById('priceTooltip');
    if (!slider || !tooltip) return;

    const val = Number(slider.value);
    const min = Number(slider.min || 100);
    const max = Number(slider.max || 500);
    const percent = ((val - min) / (max - min)) * 100;

    tooltip.textContent = '₹' + val;
    tooltip.style.left = `calc(${percent}% + (${10 - percent * 0.2}px))`;
  }

  function updateGsmMinTooltip() {
    const slider = document.getElementById('gsmMinRange');
    const tooltip = document.getElementById('gsmMinTooltip');
    if (!slider || !tooltip) return;

    const val = Number(slider.value);
    const min = Number(slider.min || 100);
    const max = Number(slider.max || 500);
    const percent = ((val - min) / (max - min)) * 100;

    tooltip.textContent = val + ' GSM';
    tooltip.style.left = `calc(${percent}% + (${10 - percent * 0.2}px))`;
  }

  function updateGsmMaxTooltip() {
    const slider = document.getElementById('gsmMaxRange');
    const tooltip = document.getElementById('gsmMaxTooltip');
    if (!slider || !tooltip) return;

    const val = Number(slider.value);
    const min = Number(slider.min || 100);
    const max = Number(slider.max || 500);
    const percent = ((val - min) / (max - min)) * 100;

    tooltip.textContent = val + ' GSM';
    tooltip.style.left = `calc(${percent}% + (${10 - percent * 0.2}px))`;
  }

  function applyFilters() {
    const selectedCategories = Array.from(document.querySelectorAll('[data-filter="category"]:checked')).map((input) => input.value);
    const maxPrice = Number(document.getElementById('priceRange')?.value || 500);
    const minGsm = Number(document.getElementById('gsmMinRange')?.value || 40);
    const maxGsm = Number(document.getElementById('gsmMaxRange')?.value || 500);
    const search = (document.getElementById('catalog-search')?.value || document.getElementById('mobile-catalog-search')?.value || '').toLowerCase();

    // Dynamically update title and description if not in landing view
    const categoriesView = document.getElementById('categoriesView');
    if (categoriesView && categoriesView.classList.contains('hidden')) {
      const titleEl = document.getElementById('catalogTitle');
      const descEl = document.getElementById('catalogDesc');
      if (titleEl && descEl) {
        if (selectedCategories.length === 1) {
          const category = allCategories.find((c) => c.id === selectedCategories[0]);
          if (category) {
            titleEl.textContent = category.name;
            descEl.textContent = category.description || 'Premium textile solutions engineered for School, Defense, Medical, Corporate, Hospitality, Army, Police, and high-performance uniform sectors.';
          }
        } else if (selectedCategories.length === 0) {
          titleEl.textContent = 'All Fabric Collections';
          descEl.textContent = 'Explore our premium range of school uniform, industrial, medical, defense, and high-performance textiles engineered since 2003.';
        } else {
          titleEl.textContent = 'Fabric Collections';
          descEl.textContent = 'Explore our premium range of school uniform, industrial, medical, defense, and high-performance textiles engineered since 2003.';
        }
      }
    }

    // Update URL query parameter without page reload
    const params = new URLSearchParams(window.location.search);
    if (selectedCategories.length === 1) {
      if (params.get('category') !== selectedCategories[0]) {
        window.history.replaceState({ categoryId: selectedCategories[0] }, '', '?category=' + encodeURIComponent(selectedCategories[0]));
      }
    } else {
      if (params.has('category')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }

    currentFilteredProducts = allProducts.filter((product) => {
      const apps = productApplications(product).join(' ').toLowerCase();
      const categoryMatch = !selectedCategories.length || selectedCategories.includes(product.categoryId);
      const productPrice = getProductPrimaryPrice(product);
      const priceMatch = !isPriceFilterActive || priceDisplaySettings.showProductPrices === false || productPrice === null || Number(productPrice) <= maxPrice;

      const productGsm = parseFloat(product.gsm);
      const gsmMatch = !isGsmFilterActive || isNaN(productGsm) || productGsm <= 0 || (productGsm >= minGsm && productGsm <= maxGsm);

      const searchMatch = !search || [product.name, product.code, product.description, apps].join(' ').toLowerCase().includes(search);
      return product.active !== false && categoryMatch && priceMatch && gsmMatch && searchMatch;
    });
    currentPage = 1;
    renderProductsPage();
  }

  function renderProductsPage() {
    const totalPages = Math.ceil(currentFilteredProducts.length / ITEMS_PER_PAGE);
    if (currentPage > totalPages && totalPages > 0) {
      currentPage = totalPages;
    }

    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const pageProducts = currentFilteredProducts.slice(startIdx, endIdx);

    renderProducts(pageProducts);
    renderPaginationControls(totalPages);
  }

  function renderProducts(products) {
    const container = document.getElementById('productsGrid');
    if (!container) return;

    const resultCountEl = document.getElementById('resultCount');
    if (resultCountEl) {
      resultCountEl.textContent = currentFilteredProducts.length;
    }

    if (!products.length) {
      container.innerHTML = '<div class="lg:col-span-2 p-stack-lg bg-surface-container-lowest border border-outline-variant/50 text-center"><h3 class="font-headline-md text-on-surface">No products match your filters</h3><p class="text-on-surface-variant mt-2">Reset filters or contact us for a custom textile requirement.</p></div>';
      return;
    }
    container.innerHTML = products.map(productCard).join('');
  }

  function renderPaginationControls(totalPages) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;

    if (totalPages === 0) {
      paginationContainer.style.display = 'none';
      return;
    }

    paginationContainer.style.display = 'flex';
    let html = '';

    // Left arrow
    const prevDisabled = currentPage === 1 ? 'disabled style="opacity: 0.3; pointer-events: none;"' : '';
    html += '<button data-action="goToPage" data-page="' + (currentPage - 1) + '" class="p-2 border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors rounded-full disabled:opacity-30 disabled:pointer-events-none" ' + prevDisabled + '>' +
      '<span class="material-symbols-outlined flex items-center">chevron_left</span>' +
      '</button>';

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      if (i === currentPage) {
        html += '<button class="w-10 h-10 bg-primary text-on-primary font-label-bold rounded-full">' + i + '</button>';
      } else {
        html += '<button data-action="goToPage" data-page="' + i + '" class="w-10 h-10 border border-outline-variant font-label-bold hover:bg-surface-container transition-colors rounded-full">' + i + '</button>';
      }
    }

    // Right arrow
    const nextDisabled = currentPage === totalPages ? 'disabled style="opacity: 0.3; pointer-events: none;"' : '';
    html += '<button data-action="goToPage" data-page="' + (currentPage + 1) + '" class="p-2 border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors rounded-full disabled:opacity-30 disabled:pointer-events-none" ' + nextDisabled + '>' +
      '<span class="material-symbols-outlined flex items-center">chevron_right</span>' +
      '</button>';

    paginationContainer.innerHTML = html;
  }

  window.goToPage = function(page) {
    currentPage = page;
    renderProductsPage();
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  function requestQuote(productId) {
    recordFabricVisit(productId);
    const product = allProducts.find((item) => item.id === productId);
    if (product) sessionStorage.setItem('quoteProduct', JSON.stringify(product));
    SecurityUtils.navigate('contact.html?quote=' + encodeURIComponent(productId));
  }
  function recordVisit() {
    const visitors = JSON.parse(localStorage.getItem('visitors') || '[]');
    const today = new Date().toISOString().split('T')[0];
    const existing = visitors.find((visit) => visit.date === today);
    if (existing) {
      existing.count += 1;
      existing.pages = existing.pages || {};
      existing.pages.products = (existing.pages.products || 0) + 1;
    } else {
      visitors.push({ date: today, count: 1, pages: { products: 1 } });
    }
    localStorage.setItem('visitors', JSON.stringify(visitors));
  }
  function recordFabricVisit(productId) {
    try {
      const visitors = JSON.parse(localStorage.getItem('visitors') || '[]');
      const today = new Date().toISOString().split('T')[0];
      const existing = visitors.find((visit) => visit.date === today);
      if (existing) {
        existing.fabrics = existing.fabrics || {};
        existing.fabrics[productId] = (existing.fabrics[productId] || 0) + 1;
      } else {
        visitors.push({
          date: today,
          count: 1,
          pages: { products: 1 },
          fabrics: { [productId]: 1 }
        });
      }
      localStorage.setItem('visitors', JSON.stringify(visitors));
    } catch (e) {
      console.error('Error recording fabric visit:', e);
    }
  }
  window.recordFabricVisit = recordFabricVisit;
  function renderCategoryFilters() {
    const container = document.getElementById('categoryFilters');
    if (!container) return;

    if (allCategories.length === 0) {
      container.innerHTML = '<p class="text-body-sm opacity-50 pl-1">No categories active.</p>';
      return;
    }

    container.innerHTML = allCategories.map((category) => `
      <label class="flex items-center gap-2 cursor-pointer group">
        <input class="rounded-none border-outline text-primary focus:ring-primary" type="checkbox" data-filter="category" value="${escapeHtml(category.id)}"/>
        <span class="text-sm group-hover:text-primary transition-colors">${escapeHtml(category.name)}</span>
      </label>
    `).join('');

    // Bind change listener for dynamically rendered category filters
    container.querySelectorAll('[data-filter="category"]').forEach((input) => {
      input.addEventListener('change', applyFilters);
    });
  }

  window.setViewMode = function(mode) {
    currentViewMode = mode;

    // Toggle active state in the control bar buttons
    const gridBtn = document.getElementById('viewGridBtn');
    const listBtn = document.getElementById('viewListBtn');
    const gridEl = document.getElementById('productsGrid');

    if (mode === 'grid') {
      gridBtn?.classList.add('text-primary');
      gridBtn?.classList.remove('opacity-40');
      listBtn?.classList.add('opacity-40');
      listBtn?.classList.remove('text-primary');

      gridEl?.classList.remove('grid-cols-1');
      gridEl?.classList.add('lg:grid-cols-2');
    } else {
      listBtn?.classList.add('text-primary');
      listBtn?.classList.remove('opacity-40');
      gridBtn?.classList.add('opacity-40');
      gridBtn?.classList.remove('text-primary');

      gridEl?.classList.remove('lg:grid-cols-2');
      gridEl?.classList.add('grid-cols-1');
    }

    // Re-render the active page
    renderProductsPage();
  };

  window.showCategoriesView = function(pushState = true) {
    currentActiveCategory = null;

    if (pushState) {
      history.pushState(null, '', window.location.pathname);
    }

    // Update Header
    const titleEl = document.getElementById('catalogTitle');
    const descEl = document.getElementById('catalogDesc');
    if (titleEl) titleEl.textContent = 'Fabric Collections';
    if (descEl) descEl.textContent = 'Explore our premium range of school uniform, industrial, medical, defense, and high-performance textiles engineered since 2003.';
    // Reveal header
    document.getElementById('catalogHeader')?.classList.remove('opacity-0');

    // Toggle Views
    document.getElementById('productsView')?.classList.add('hidden');
    document.getElementById('categoriesView')?.classList.remove('hidden');

    // Explicitly hide pagination when viewing categories
    const paginationContainer = document.getElementById('pagination');
    if (paginationContainer) paginationContainer.style.display = 'none';

    renderCategoriesGrid();
  };

  window.selectCategory = function(categoryId, pushState = true) {
    currentActiveCategory = categoryId;

    if (pushState) {
      history.pushState({ categoryId }, '', '?category=' + encodeURIComponent(categoryId));
    }

    // Update Header
    const titleEl = document.getElementById('catalogTitle');
    const descEl = document.getElementById('catalogDesc');
    const catName = (allCategories.find(c => c.id === categoryId) || {}).name || 'Fabric Collection';
    if (titleEl) titleEl.textContent = catName;
    if (descEl) descEl.textContent = 'Premium textile solutions engineered for School, Defense, Medical, Corporate, Hospitality, Army, Police, and high-performance uniform sectors.';
    // Reveal header
    document.getElementById('catalogHeader')?.classList.remove('opacity-0');

    // Check corresponding specification checkbox in sidebar filters and uncheck others
    document.querySelectorAll('[data-filter="category"]').forEach((input) => {
      input.checked = (input.value === categoryId);
    });

    // Toggle Views
    document.getElementById('categoriesView')?.classList.add('hidden');
    document.getElementById('productsView')?.classList.remove('hidden');

    // Apply filters and render
    applyFilters();

    // Smooth scroll to top of viewport content
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  function renderCategoriesGrid() {
    const container = document.getElementById('categoriesView');
    if (!container) return;

    if (allCategories.length === 0) {
      container.innerHTML = '<div class="lg:col-span-3 p-stack-lg text-center text-on-surface-variant opacity-50">No collections available right now.</div>';
      return;
    }

    container.innerHTML = allCategories.map((category, index) => {
      const catProducts = allProducts.filter(p => p.categoryId === category.id && p.active !== false);
      const showCategoryPrice = priceDisplaySettings.showCategoryPrices !== false && hasNumberValue(category.startingPrice);
      const categoryFooterHtml = showCategoryPrice ? `
            <div class="mt-auto flex justify-between items-center pt-3 border-t border-outline-variant/20">
              <span class="text-primary text-[12px]">Starting from <span class="text-base font-bold">&#8377;${Number(category.startingPrice)}</span><span class="text-[10px] text-on-surface-variant font-normal">/m</span></span>
              <span class="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-on-primary group-hover:translate-x-1 transition-transform">
                <span class="material-symbols-outlined text-[12px]" style="font-variation-settings: 'FILL' 0, 'wght' 600, 'GRAD' 0, 'opsz' 18">arrow_forward</span>
              </span>
            </div>` : '';
      const cardImage = category.image || (catProducts[0] ? catProducts[0].image : 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800');

      return `
        <div data-category-id="${escapeHtml(category.id)}" data-action="selectCategory" class="group bg-surface-container border border-outline-variant/30 flex flex-col hover:shadow-2xl transition-all duration-300 rounded-xl overflow-hidden relative fabric-texture-overlay cursor-pointer product-card">
          <div class="h-44 overflow-hidden relative bg-surface-variant animate-pulse">
            <img class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" data-remove-loading="true" src="${escapeHtml(SecurityUtils.safeImageUrl(cardImage, 'logo.png'))}" alt="${escapeHtml(category.name)}"/>
            <div class="absolute top-3 right-3 bg-primary text-on-primary px-2.5 py-0.5 text-[9px] uppercase font-label-bold rounded-full">Collection</div>
          </div>
          <div class="p-4 flex flex-col flex-grow">
            <h3 class="font-bold text-base text-on-surface mb-1 group-hover:text-primary transition-colors">${escapeHtml(category.name)}</h3>
            <p class="text-on-surface-variant text-[12px] mb-2 leading-relaxed line-clamp-3">${escapeHtml(category.description || 'Premium engineered fabric solution.')}</p>
            <div class="mb-3 flex-grow">
              <span class="inline-flex items-center px-2.5 py-0.5 bg-primary/[0.08] backdrop-blur-md text-primary border border-primary/20 text-[9px] font-label-bold font-normal rounded-full uppercase tracking-wider shadow-sm leading-none">
                ${escapeHtml(category.clothing || 'Suiting')}
              </span>
            </div>
            ${categoryFooterHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  function checkUrlAndRender() {
    const params = new URLSearchParams(window.location.search);
    const categoryId = params.get('category');
    if (categoryId) {
      selectCategory(categoryId, false);
    } else {
      showCategoriesView(false);
    }
  }

  // Hook into browser forward/backward buttons
  window.addEventListener('popstate', (event) => {
    checkUrlAndRender();
  });

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await loadCatalogueData();
    } catch (error) {
      console.error('Unable to load fabric catalogue data:', error);
      allCategories = [];
      allProducts = [];
    }

    renderCategoryFilters();
    checkUrlAndRender();
    recordVisit();

    // Initialize moving tooltips
    updatePriceTooltip();
    updateGsmMinTooltip();
    updateGsmMaxTooltip();

    // Event listeners
    document.getElementById('priceRange')?.addEventListener('input', () => {
      isPriceFilterActive = true;
      updatePriceTooltip();
      applyFilters();
    });

    document.getElementById('gsmMinRange')?.addEventListener('input', (e) => {
      isGsmFilterActive = true;
      const minVal = Number(e.target.value);
      const maxSlider = document.getElementById('gsmMaxRange');
      const maxVal = Number(maxSlider.value);
      if (minVal > maxVal) {
        maxSlider.value = minVal;
        updateGsmMaxTooltip();
      }
      updateGsmMinTooltip();
      applyFilters();
    });

    document.getElementById('gsmMaxRange')?.addEventListener('input', (e) => {
      isGsmFilterActive = true;
      const maxVal = Number(e.target.value);
      const minSlider = document.getElementById('gsmMinRange');
      const minVal = Number(minSlider.value);
      if (maxVal < minVal) {
        minSlider.value = maxVal;
        updateGsmMinTooltip();
      }
      updateGsmMaxTooltip();
      applyFilters();
    });

    document.getElementById('catalog-search')?.addEventListener('input', applyFilters);
    document.getElementById('mobile-catalog-search')?.addEventListener('input', applyFilters);
    document.getElementById('resetFilters')?.addEventListener('click', () => {
      isPriceFilterActive = false;
      isGsmFilterActive = false;
      document.querySelectorAll('[data-filter]').forEach((input) => { input.checked = false; });
      const priceRange = document.getElementById('priceRange');
      if (priceRange) priceRange.value = 500;

      const gsmMin = document.getElementById('gsmMinRange');
      if (gsmMin) gsmMin.value = 40;
      const gsmMax = document.getElementById('gsmMaxRange');
      if (gsmMax) gsmMax.value = 500;

      const search = document.getElementById('catalog-search');
      if (search) search.value = '';
      const searchM = document.getElementById('mobile-catalog-search');
      if (searchM) searchM.value = '';

      // Update tooltips on reset
      updatePriceTooltip();
      updateGsmMinTooltip();
      updateGsmMaxTooltip();

      // Clear URL parameter on reset
      if (window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }

      // Reset category header title and description back to defaults
      const titleEl = document.getElementById('catalogTitle');
      const descEl = document.getElementById('catalogDesc');
      if (titleEl) titleEl.textContent = 'All Fabric Collections';
      if (descEl) descEl.textContent = 'Explore our premium range of school uniform, industrial, medical, defense, and high-performance textiles engineered since 2003.';

      currentFilteredProducts = allProducts;
      currentPage = 1;
      renderProductsPage();
    });
    document.querySelectorAll('button').forEach((button) => {
      if (button.textContent.trim().toLowerCase().includes('quote') && !button.onclick) {
        button.addEventListener('click', () => { SecurityUtils.navigate('contact.html'); });
      }
    });
  });

  function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (!menu) return;
    if (menu.classList.contains('hidden')) {
      menu.classList.remove('hidden');
      setTimeout(() => {
        menu.classList.remove('-translate-y-4', 'opacity-0');
        menu.classList.add('translate-y-0', 'opacity-100');
      }, 10);
    } else {
      menu.classList.remove('translate-y-0', 'opacity-100');
      menu.classList.add('-translate-y-4', 'opacity-0');
      setTimeout(() => {
        menu.classList.add('hidden');
      }, 300);
    }
  }

  function toggleMobileFilters() {
    const container = document.getElementById('mobileFiltersContainer');
    const textEl = document.getElementById('mobileFilterBtnText');
    const arrow = document.getElementById('mobileFilterArrow');
    if (!container || !textEl || !arrow) return;

    const isHidden = container.classList.contains('hidden');
    if (isHidden) {
      container.classList.remove('hidden');
      textEl.textContent = 'Hide Filters';
      arrow.classList.add('rotate-180');
    } else {
      container.classList.add('hidden');
      textEl.textContent = 'Show Filters';
      arrow.classList.remove('rotate-180');
    }
  }
  window.toggleMobileFilters = toggleMobileFilters;
