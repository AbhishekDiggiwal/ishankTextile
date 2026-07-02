const { loadPage } = require('./helpers');

describe('Tier 3: Cross-Feature Combinations', () => {
  let dom;
  let window;
  let document;

  const testProducts = {
    'p1': { id: 'p1', name: 'Premium Twill Fabric', code: 'VD-001', categoryId: 'cat1', startingPrice: 380, price: 380, priceUnit: 'm', active: true, gsm: 240, applications: 'defense', description: 'Strong cotton weave' },
    'p2': { id: 'p2', name: 'Cotton Shirting Fabric', code: 'CT-001', categoryId: 'cat2', startingPrice: 180, price: 180, priceUnit: 'm', active: true, gsm: 180, applications: 'corporate', description: 'Soft cotton blend' },
    'p3': { id: 'p3', name: 'Woolen Winter Suit', code: 'WL-001', categoryId: 'cat1', startingPrice: 320, price: 320, priceUnit: 'm', active: true, gsm: 320, applications: 'defense', description: 'Warm wool coat' }
  };

  const testCategories = {
    'cat1': { id: 'cat1', name: 'Vat-Dyed', clothing: 'Suiting', active: true },
    'cat2': { id: 'cat2', name: 'Cotton', clothing: 'Shirting', active: true }
  };

  afterEach(() => {
    if (window && !window.closed) {
      window.close();
    }
  });

  // Combination 1: Catalog Search + Category Filter + Price Range Filter combined
  test('Combination 1: Catalog Search + Category Filter + Price Range Filter combined', async () => {
    dom = loadPage('products-catalogue.html', {
      initialProducts: testProducts,
      initialCategories: testCategories
    });
    window = dom.window;
    document = window.document;
    await new Promise(resolve => setTimeout(resolve, 50));

    // Show products view
    window.selectCategory('cat1');

    // 1. Set Category checkboxes
    const catCheckboxes = document.querySelectorAll('[data-filter="category"]');
    catCheckboxes.forEach(cb => {
      if (cb.value === 'cat1') cb.checked = true;
      if (cb.value === 'cat2') cb.checked = false;
    });

    // 2. Set search filter to "Wool"
    const searchInput = document.getElementById('catalog-search');
    searchInput.value = 'Wool';

    // 3. Set price range filter limit to 350
    const priceRange = document.getElementById('priceRange');
    priceRange.value = 350;

    // Trigger all change listeners
    window.applyFilters();

    // Verification:
    // Only p3 (startingPrice 320, category cat1, name "Woolen Winter Suit") matches all filters
    // p1 matches category but startingPrice (380) > 350
    // p2 matches price (180) but category is cat2
    expect(document.getElementById('resultCount').textContent).toBe('1');
    expect(document.getElementById('productsGrid').textContent).toContain('Woolen Winter Suit');
  });

  // Combination 2: Firebase Auth login + Redirect to Dashboard + authenticated dashboard access
  test('Combination 2: User login flow transitions state and credentials validate correctly', async () => {
    dom = loadPage('admin-login.html');
    window = dom.window;
    document = window.document;

    // Redefine window.location.href to mock navigation
    delete window.location;
    window.location = { href: 'http://localhost/admin-login.html' };

    // Fill in valid Firebase Auth credentials
    document.getElementById('email').value = 'admin@ishanktextile.com';
    document.getElementById('password').value = 'admin123';
    
    // Submit
    const form = document.getElementById('loginForm');
    const event = new window.Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(window.firebaseServices.auth.currentUser).not.toBeNull();
    expect(window.location.href).toBe('admin-dashboard.html');

    // Load admin dashboard to verify it respects Firebase authentication state
    const dashDom = loadPage('admin-dashboard.html', { adminLoggedIn: true });
    
    // Wait for auth initialization checks on DOMContentLoaded
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // The dash page should not redirect to login page.
    expect(dashDom.window.location.href).toBe('http://localhost/admin-dashboard.html');
    dashDom.window.close();
  });

  // Combination 3: Dashboard authenticated CRUD (adding new category/product) + local persistence
  test('Combination 3: Dashboard authenticated CRUD updates database collections and counts', async () => {
    // Load admin dashboard directly with session authenticated
    dom = loadPage('admin-dashboard.html', {
      initialCategories: testCategories,
      initialProducts: testProducts,
      adminLoggedIn: true
    });
    window = dom.window;
    document = window.document;

    // Wait for dashboard init
    await new Promise(resolve => setTimeout(resolve, 100));

    // Assert initial category count in dashboard
    const categoriesSnapshot = await window.firebaseServices.db.collection('categories').get();
    expect(categoriesSnapshot.docs.length).toBe(2);

    // Simulate adding a category via the dashboard form submit
    document.getElementById('category-name').value = 'New Silk Collection';
    document.getElementById('category-description').value = 'Premium silk fabrics';
    document.getElementById('category-starting-price').value = '600';
    document.getElementById('category-clothing').value = 'Suiting';
    document.getElementById('category-active').checked = true;

    const form = document.getElementById('category-form');
    const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);

    await new Promise(resolve => setTimeout(resolve, 50));

    // Verify it updated the database
    const updatedCategoriesSnapshot = await window.firebaseServices.db.collection('categories').get();
    expect(updatedCategoriesSnapshot.docs.length).toBe(3);
    const newCategory = updatedCategoriesSnapshot.docs.find(doc => doc.data().name === 'New Silk Collection');
    expect(newCategory).toBeDefined();
    expect(newCategory.data().startingPrice).toBe(600);
  });

  test('Combination 4: Dashboard price visibility toggles persist display settings', async () => {
    dom = loadPage('admin-dashboard.html', {
      initialCategories: testCategories,
      initialProducts: testProducts,
      adminLoggedIn: true
    });
    window = dom.window;
    document = window.document;

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(document.getElementById('category-price-toggle').textContent).toContain('Hide Prices');
    expect(document.getElementById('product-price-toggle').textContent).toContain('Hide Prices');

    await window.toggleCategoryPriceVisibility();
    await window.toggleProductPriceVisibility();

    const settingsDoc = await window.firebaseServices.db.collection('settings').doc('general').get();
    expect(settingsDoc.data().showCategoryPrices).toBe(false);
    expect(settingsDoc.data().showProductPrices).toBe(false);
    expect(document.getElementById('category-price-toggle').textContent).toContain('Show Prices');
    expect(document.getElementById('product-price-toggle').textContent).toContain('Show Prices');
  });

  // Combination 5: Quote form URL pre-population + Form Submit + Firestore saving
  test('Combination 5: URL pre-population combined with submission writes correctly to Firestore', async () => {
    // Open contact.html with pre-selected product query parameter
    dom = loadPage('contact.html', {
      initialProducts: testProducts,
      initialCategories: testCategories,
      url: 'http://localhost/contact.html?quote=p1'
    });
    window = dom.window;
    document = window.document;

    await new Promise(resolve => setTimeout(resolve, 50));

    // Confirm it populated values
    expect(document.getElementById('subject').value).toBe('quote');
    expect(document.getElementById('interestedProduct').value).toBe('p1');

    // Fill contact details
    document.getElementById('firstName').value = 'Alice';
    document.getElementById('lastName').value = 'Smith';
    document.getElementById('email').value = 'alice@example.com';
    document.getElementById('message').value = 'Quote inquiry for Twill';

    // Submit inquiry
    const form = document.getElementById('contactForm');
    const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);

    await new Promise(resolve => setTimeout(resolve, 50));

    // Verify Firestore database save
    const quotesStore = window.firebaseServices.db.collection('quotes').store;
    const quotes = Object.values(quotesStore);
    expect(quotes.length).toBe(1);
    expect(quotes[0].customerName).toBe('Alice Smith');
    expect(quotes[0].productId).toBe('p1');
    expect(quotes[0].product.name).toBe('Premium Twill Fabric');
    expect(quotes[0].message).toBe('Quote inquiry for Twill');
  });
});
