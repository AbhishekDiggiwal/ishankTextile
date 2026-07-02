const { loadPage } = require('./helpers');

describe('Tier 4: Real-World Application Scenarios', () => {
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

  // Scenario 1: Product Discovery -> Filter -> Quote Request Flow
  test('Scenario 1: Discovery to Quote Request flow', async () => {
    // 1. Client loads products-catalogue.html
    dom = loadPage('products-catalogue.html', {
      initialProducts: testProducts,
      initialCategories: testCategories
    });
    window = dom.window;
    document = window.document;
    await new Promise(resolve => setTimeout(resolve, 50));

    // Mock redirect
    delete window.location;
    window.location = { href: 'http://localhost/products-catalogue.html' };

    // 2. Selects category 'cat1'
    window.selectCategory('cat1');
    expect(document.getElementById('resultCount').textContent).toBe('2'); // p1 and p3

    // 3. User requests a quote for 'p3' (Woolen Winter Suit)
    window.requestQuote('p3');

    // Confirm that the selected product was cached in sessionStorage
    const cachedProduct = JSON.parse(window.sessionStorage.getItem('quoteProduct'));
    expect(cachedProduct).toBeTruthy();
    expect(cachedProduct.id).toBe('p3');
    expect(window.location.href).toContain('contact.html?quote=p3');

    // 4. Client navigates to contact.html (represented by loading contact.html in JSDOM)
    const contactDom = loadPage('contact.html', {
      initialProducts: testProducts,
      initialCategories: testCategories,
      url: 'http://localhost/contact.html?quote=p3'
    });
    const contactDoc = contactDom.window.document;

    // Simulate DOMContentLoaded checks
    await new Promise(resolve => setTimeout(resolve, 50));

    // Assert pre-populated values
    expect(contactDoc.getElementById('subject').value).toBe('quote');
    expect(contactDoc.getElementById('interestedProduct').value).toBe('p3');

    // 5. Submit contact form
    contactDoc.getElementById('firstName').value = 'Robert';
    contactDoc.getElementById('lastName').value = 'Martin';
    contactDoc.getElementById('email').value = 'unclebob@clean-coder.com';
    contactDoc.getElementById('message').value = 'Need 1000m premium suiting woolen fabric.';

    const form = contactDoc.getElementById('contactForm');
    const submitEvent = new contactDom.window.Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);

    await new Promise(resolve => setTimeout(resolve, 50));

    // Verify Firestore quotes collection has the quote
    const dbQuotes = Object.values(contactDom.window.firebaseServices.db.collection('quotes').store);
    expect(dbQuotes.length).toBe(1);
    expect(dbQuotes[0].customerName).toBe('Robert Martin');
    expect(dbQuotes[0].productId).toBe('p3');

    contactDom.window.close();
  });

  // Scenario 2: Administrative Login -> Dashboard Review -> Category Deletion Flow
  test('Scenario 2: Admin login, dashboard review, and category deletion flow', async () => {
    // 1. Admin logs in via admin-login.html
    dom = loadPage('admin-login.html');
    window = dom.window;
    document = window.document;

    delete window.location;
    window.location = { href: 'http://localhost/admin-login.html' };

    document.getElementById('email').value = 'admin@ishanktextile.com';
    document.getElementById('password').value = 'admin123';
    
    const form = document.getElementById('loginForm');
    form.dispatchEvent(new window.Event('submit'));

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(window.firebaseServices.auth.currentUser).not.toBeNull();
    window.close();

    // 2. Admin views dashboard.html
    const dashDom = loadPage('admin-dashboard.html', {
      initialCategories: testCategories,
      initialProducts: testProducts,
      adminLoggedIn: true
    });
    const dashDoc = dashDom.window.document;

    await new Promise(resolve => setTimeout(resolve, 100));

    // Confirm categories read from DB
    const initialCategories = await dashDom.window.firebaseServices.db.collection('categories').get();
    expect(initialCategories.docs.length).toBe(2);

    // 3. Admin deletes category 'cat2'
    await dashDom.window.DataManager.deleteCategory('cat2');
    
    // Refresh categories view
    await dashDom.window.refreshData();

    // Verify category 'cat2' is deleted from Firestore
    const updatedCategories = await dashDom.window.firebaseServices.db.collection('categories').get();
    expect(updatedCategories.docs.length).toBe(1);
    expect(updatedCategories.docs.find(d => d.id === 'cat2')).toBeUndefined();

    dashDom.window.close();
  });

  // Scenario 3: Contact Form validation -> Invalid inputs corrective flow
  test('Scenario 3: Validation failure and corrective input submit flow', async () => {
    dom = loadPage('contact.html', {
      initialProducts: testProducts,
      initialCategories: testCategories
    });
    window = dom.window;
    document = window.document;
    await new Promise(resolve => setTimeout(resolve, 50));

    window.alert = jest.fn();

    // 1. Submit with empty fields
    const form = document.getElementById('contactForm');
    form.dispatchEvent(new window.Event('submit'));
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Please fill in all required fields'));

    // 2. Add some correct fields but invalid email
    document.getElementById('firstName').value = 'Linus';
    document.getElementById('lastName').value = 'Torvalds';
    document.getElementById('email').value = 'linus-without-at-sign'; // invalid
    document.getElementById('subject').value = 'general';
    document.getElementById('message').value = 'Testing validation';

    form.dispatchEvent(new window.Event('submit'));
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('valid email address'));

    // 3. Correct the email and submit successfully
    document.getElementById('email').value = 'linus@linuxfoundation.org';
    form.dispatchEvent(new window.Event('submit'));

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(document.getElementById('successModal').classList.contains('hidden')).toBe(false);

    // 4. Click Close on the Success Modal
    document.querySelector('#successModal button').click();
    expect(document.getElementById('successModal').classList.contains('hidden')).toBe(true);

    // Form should have been reset
    expect(document.getElementById('firstName').value).toBe('');
  });

  // Scenario 4: Admin dashboard analytics and settings update
  test('Scenario 4: Admin updates global company settings', async () => {
    dom = loadPage('admin-dashboard.html', {
      initialCategories: testCategories,
      initialProducts: testProducts,
      adminLoggedIn: true
    });
    window = dom.window;
    document = window.document;

    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify initial company settings are populated
    expect(document.getElementById('setting-company-name').value).toBe('Ishank Textile');

    // 1. Enter edit mode
    window.enterSettingsEditMode();
    expect(document.getElementById('setting-company-name').readOnly).toBe(false);

    // 2. Modify Company name
    document.getElementById('setting-company-name').value = 'Ishank Textile Industries';
    window.checkSettingsChanges();

    // 3. Submit settings change
    const form = document.getElementById('general-settings-form');
    form.dispatchEvent(new window.Event('submit'));

    await new Promise(resolve => setTimeout(resolve, 50));

    // 4. Verify DB was updated
    const settingsDoc = await window.firebaseServices.db.collection('settings').doc('general').get();
    expect(settingsDoc.data().companyName).toBe('Ishank Textile Industries');
  });

  // Scenario 5: Dashboard Search & Deactivate Product Flow
  test('Scenario 5: Admin deactivates a product, which hides it in public catalogue', async () => {
    // 1. Load admin dashboard
    dom = loadPage('admin-dashboard.html', {
      initialCategories: testCategories,
      initialProducts: testProducts,
      adminLoggedIn: true
    });
    window = dom.window;
    document = window.document;

    await new Promise(resolve => setTimeout(resolve, 100));

    // 2. Admin updates product 'p1' to be active = false (inactive)
    const product = testProducts.p1;
    product.active = false;
    await window.DataManager.updateProduct('p1', product);

    // 3. Load public catalogue view products-catalogue.html
    const publicDom = loadPage('products-catalogue.html', {
      initialProducts: {
        'p1': { ...testProducts.p1, active: false }, // inactive
        'p2': testProducts.p2,
        'p3': testProducts.p3
      },
      initialCategories: testCategories
    });
    
    await new Promise(resolve => setTimeout(resolve, 50));

    // View all category collections
    publicDom.window.selectCategory('cat1');

    // p1 should not be active, so resultCount should only show p3 (1 item instead of 2)
    const resultCount = publicDom.window.document.getElementById('resultCount');
    expect(resultCount.textContent).toBe('1');
    expect(publicDom.window.document.getElementById('productsGrid').textContent).not.toContain('Premium Twill Fabric');

    publicDom.window.close();
  });
});
