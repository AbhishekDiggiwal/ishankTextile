const { loadPage } = require('./helpers');

describe('Feature 3: Catalog Search & Filters', () => {
  let dom;
  let window;
  let document;

  const testProducts = {
    'p1': { id: 'p1', name: 'Premium Twill Fabric', code: 'VD-001', categoryId: 'cat1', startingPrice: 380, price: 380, priceUnit: 'm', active: true, gsm: 240, applications: 'defense,medical', description: 'Strong twill weave' },
    'p2': { id: 'p2', name: 'Cotton Shirting Fabric', code: 'CT-001', categoryId: 'cat2', startingPrice: 180, price: 180, priceUnit: 'm', active: true, gsm: 180, applications: 'corporate', description: 'Soft cotton blend' },
    'p3': { id: 'p3', name: 'Woolen Winter Suit', code: 'WL-001', categoryId: 'cat1', startingPrice: 320, price: 320, priceUnit: 'm', active: true, gsm: 320, applications: 'defense', description: 'Warm and heavy' }
  };

  const testCategories = {
    'cat1': { id: 'cat1', name: 'Vat-Dyed', clothing: 'Suiting', active: true, description: 'Vat dyed' },
    'cat2': { id: 'cat2', name: 'Cotton', clothing: 'Shirting', active: true, description: 'Premium Cotton' }
  };

  beforeEach(async () => {
    dom = loadPage('products-catalogue.html', {
      initialProducts: testProducts,
      initialCategories: testCategories
    });
    window = dom.window;
    document = window.document;

    // Wait for the async DOMContentLoaded and categories/products load
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(() => {
    window.close();
  });

  // TIER 1: Feature Coverage (>= 5 assertions/cases)
  test('Tier 1: Renders category collections in categoriesView on load', () => {
    const categoriesView = document.getElementById('categoriesView');
    expect(categoriesView).toBeTruthy();
    
    // Check that categories render as cards
    const categoryCards = categoriesView.querySelectorAll('.product-card');
    expect(categoryCards.length).toBe(2);
    expect(categoryCards[0].textContent).toContain('Vat-Dyed');
    expect(categoryCards[1].textContent).toContain('Cotton');
  });

  test('Tier 1: Clicking a collection switches to productsView and lists products', () => {
    const categoriesView = document.getElementById('categoriesView');
    const productsView = document.getElementById('productsView');
    
    expect(productsView.classList.contains('hidden')).toBe(true);
    
    // Simulate clicking the first category (Vat-Dyed)
    const firstCatCard = categoriesView.querySelectorAll('.product-card')[0];
    firstCatCard.click();

    expect(categoriesView.classList.contains('hidden')).toBe(true);
    expect(productsView.classList.contains('hidden')).toBe(false);

    // Should list the products in cat1 (p1 and p3)
    const resultCount = document.getElementById('resultCount');
    expect(resultCount.textContent).toBe('2');
  });

  test('Tier 1: Grid vs List view buttons change the layout class names', () => {
    // Navigate to products view
    window.selectCategory('cat1');

    const productsGrid = document.getElementById('productsGrid');
    const viewGridBtn = document.getElementById('viewGridBtn');
    const viewListBtn = document.getElementById('viewListBtn');

    // Default should be grid (lg:grid-cols-2)
    expect(productsGrid.classList.contains('lg:grid-cols-2')).toBe(true);

    // Switch to list
    viewListBtn.click();
    expect(productsGrid.classList.contains('lg:grid-cols-2')).toBe(false);
    expect(productsGrid.classList.contains('grid-cols-1')).toBe(true);

    // Switch back to grid
    viewGridBtn.click();
    expect(productsGrid.classList.contains('lg:grid-cols-2')).toBe(true);
  });

  test('Tier 1: Desktop search input filters the products list correctly', () => {
    window.selectCategory('cat1'); // Show all products of cat1

    const searchInput = document.getElementById('catalog-search');
    searchInput.value = 'Woolen';
    
    // Dispatch input event to trigger filters
    searchInput.dispatchEvent(new window.Event('input'));

    const resultCount = document.getElementById('resultCount');
    expect(resultCount.textContent).toBe('1'); // only woolen product matches
    expect(document.getElementById('productsGrid').textContent).toContain('Woolen Winter Suit');
  });

  test('Tier 1: Reset Filters button restores categoriesView or resets filters to defaults', () => {
    window.selectCategory('cat1');

    const searchInput = document.getElementById('catalog-search');
    searchInput.value = 'Woolen';
    searchInput.dispatchEvent(new window.Event('input'));

    expect(document.getElementById('resultCount').textContent).toBe('1');

    // Click reset
    document.getElementById('resetFilters').click();

    // Reset should clear search, set price range to 500, and show all products (3 products)
    expect(searchInput.value).toBe('');
    expect(document.getElementById('resultCount').textContent).toBe('3');
  });

  // TIER 2: Boundary & Corner Cases (>= 5 assertions/cases)
  test('Tier 2: Empty search displays all active products matching category/other filters', () => {
    window.selectCategory('cat1');
    const searchInput = document.getElementById('catalog-search');
    
    // Input empty string
    searchInput.value = '';
    searchInput.dispatchEvent(new window.Event('input'));
    
    expect(document.getElementById('resultCount').textContent).toBe('2'); // cat1 has 2 products
  });

  test('Tier 2: Maximum price slider limits higher priced items', () => {
    window.selectCategory('cat1'); // cat1: p1 is 380, p3 is 320. cat2: p2 is 180.
    
    const priceRange = document.getElementById('priceRange');
    
    // Show all by checking other categories so we see everything
    document.getElementById('resetFilters').click();
    
    console.log("DEBUG: allProducts inside window:", window.allProducts);
    console.log("DEBUG: categories inside window:", window.allCategories);
    
    // Set price limit to 200
    priceRange.value = 200;
    priceRange.dispatchEvent(new window.Event('input'));

    console.log("DEBUG: resultCount textContent:", document.getElementById('resultCount').textContent);
    console.log("DEBUG: productsGrid innerHTML:", document.getElementById('productsGrid').innerHTML);

    expect(document.getElementById('resultCount').textContent).toBe('1'); // only p2 (180) is <= 200
    expect(document.getElementById('productsGrid').textContent).toContain('Cotton Shirting Fabric');
  });

  test('Tier 2: Case insensitive search matches across multiple fields (name, code, description, apps)', () => {
    window.selectCategory('cat1');
    document.getElementById('resetFilters').click();

    const searchInput = document.getElementById('catalog-search');

    // Search by code (case insensitive)
    searchInput.value = 'ct-001';
    searchInput.dispatchEvent(new window.Event('input'));
    expect(document.getElementById('resultCount').textContent).toBe('1');

    // Search by description keyword
    searchInput.value = 'twill';
    searchInput.dispatchEvent(new window.Event('input'));
    expect(document.getElementById('resultCount').textContent).toBe('1');
    expect(document.getElementById('productsGrid').textContent).toContain('Premium Twill Fabric');

    // Search by applications
    searchInput.value = 'DEFENSE';
    searchInput.dispatchEvent(new window.Event('input'));
    expect(document.getElementById('resultCount').textContent).toBe('2'); // p1 & p3 have defense application
  });

  test('Tier 2: Filtering combo with zero matches shows custom contact/no matches message', () => {
    window.selectCategory('cat1');
    
    const searchInput = document.getElementById('catalog-search');
    searchInput.value = 'Non-existent fabric keyword';
    searchInput.dispatchEvent(new window.Event('input'));

    expect(document.getElementById('resultCount').textContent).toBe('0');
    
    const gridContent = document.getElementById('productsGrid').textContent;
    expect(gridContent).toContain('No products match your filters');
    expect(gridContent).toContain('Reset filters or contact us');
  });

  test('Tier 2: Mobile search input synchronizes and performs filtering correctly', () => {
    window.selectCategory('cat1');
    document.getElementById('resetFilters').click();

    const mobileSearchInput = document.getElementById('mobile-catalog-search');
    expect(mobileSearchInput).toBeTruthy();

    mobileSearchInput.value = 'Cotton';
    mobileSearchInput.dispatchEvent(new window.Event('input'));

    expect(document.getElementById('resultCount').textContent).toBe('1');
    expect(document.getElementById('productsGrid').textContent).toContain('Cotton Shirting Fabric');
  });

  test('Tier 2: Admin price visibility settings hide category and fabric card prices', async () => {
    window.close();
    dom = loadPage('products-catalogue.html', {
      initialProducts: testProducts,
      initialCategories: testCategories,
      initialSettings: {
        showCategoryPrices: false,
        showProductPrices: false
      }
    });
    window = dom.window;
    document = window.document;

    await new Promise(resolve => setTimeout(resolve, 100));

    const categoriesView = document.getElementById('categoriesView');
    expect(categoriesView.textContent).not.toContain('Starting from');
    expect(categoriesView.textContent).not.toContain('arrow_forward');

    window.selectCategory('cat1');
    const productsGridText = document.getElementById('productsGrid').textContent;
    expect(productsGridText).not.toContain('Starting Price');
    expect(productsGridText).not.toContain('₹380');
    expect(productsGridText).toContain('Premium Twill Fabric');

    const priceFilterContainer = document.getElementById('priceFilterContainer');
    expect(priceFilterContainer.style.display).toBe('none');
  });

  test('Tier 2: Null DB prices do not render default category or product prices', async () => {
    window.close();
    dom = loadPage('products-catalogue.html', {
      initialProducts: {
        p1: { id: 'p1', name: 'No Price Fabric', code: 'NP-001', categoryId: 'cat1', startingPrice: null, price: null, priceUnit: 'm', active: true, gsm: 240, applications: 'defense', description: 'Price pending' }
      },
      initialCategories: {
        cat1: { id: 'cat1', name: 'No Price Category', clothing: 'Suiting', active: true, description: 'No DB price yet', startingPrice: null }
      }
    });
    window = dom.window;
    document = dom.window.document;

    await new Promise(resolve => setTimeout(resolve, 100));

    const categoriesViewText = document.getElementById('categoriesView').textContent;
    expect(categoriesViewText).not.toContain('Starting from');
    expect(categoriesViewText).not.toContain('₹180');

    window.selectCategory('cat1');
    const productsGridText = document.getElementById('productsGrid').textContent;
    expect(productsGridText).not.toContain('Starting Price');
    expect(productsGridText).not.toContain('₹0');
    expect(productsGridText).toContain('No Price Fabric');
  });

  test('Tier 2: Missing settings fetch does not block catalogue cards', async () => {
    window.close();
    dom = loadPage('products-catalogue.html', {
      initialProducts: testProducts,
      initialCategories: testCategories,
      disableSettingsMethod: true
    });
    window = dom.window;
    document = dom.window.document;

    await new Promise(resolve => setTimeout(resolve, 100));

    const categoriesViewText = document.getElementById('categoriesView').textContent;
    expect(categoriesViewText).toContain('Vat-Dyed');
    expect(categoriesViewText).not.toContain('Loading Collections');

    window.selectCategory('cat1');
    expect(document.getElementById('productsGrid').textContent).toContain('Premium Twill Fabric');
  });
});
