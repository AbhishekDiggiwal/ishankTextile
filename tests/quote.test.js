const { loadPage } = require('./helpers');

describe('Feature 4: Quote Form Submission', () => {
  let dom;
  let window;
  let document;

  const testProducts = {
    'p1': { id: 'p1', name: 'Premium Twill Fabric', code: 'VD-001', categoryId: 'cat1', startingPrice: 380, priceUnit: 'm', active: true },
    'p2': { id: 'p2', name: 'Cotton Shirting Fabric', code: 'CT-001', categoryId: 'cat2', startingPrice: 180, priceUnit: 'm', active: true }
  };

  const testCategories = {
    'cat1': { id: 'cat1', name: 'Vat-Dyed', clothing: 'Suiting', active: true },
    'cat2': { id: 'cat2', name: 'Cotton', clothing: 'Shirting', active: true }
  };

  beforeEach(async () => {
    // Standard load
    dom = loadPage('contact.html', {
      initialProducts: testProducts,
      initialCategories: testCategories
    });
    window = dom.window;
    document = window.document;

    // Wait for the async product load
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  afterEach(() => {
    window.close();
    jest.useRealTimers();
  });

  // TIER 1: Feature Coverage (>= 5 assertions/cases)
  test('Tier 1: Quote form has required fields and structure', () => {
    expect(document.getElementById('firstName')).toBeTruthy();
    expect(document.getElementById('lastName')).toBeTruthy();
    expect(document.getElementById('email')).toBeTruthy();
    expect(document.getElementById('subject')).toBeTruthy();
    expect(document.getElementById('message')).toBeTruthy();
  });

  test('Tier 1: Selecting subject "quote" or "bulk" shows product selection and makes it required', () => {
    const subject = document.getElementById('subject');
    const container = document.getElementById('product-selection-container');
    const interestedProduct = document.getElementById('interestedProduct');

    // Default is empty / general
    expect(container.classList.contains('hidden')).toBe(true);
    expect(interestedProduct.required).toBe(false);

    // Select Request Quote
    subject.value = 'quote';
    subject.dispatchEvent(new window.Event('change'));
    expect(container.classList.contains('hidden')).toBe(false);
    expect(interestedProduct.required).toBe(true);

    // Select General Inquiry
    subject.value = 'general';
    subject.dispatchEvent(new window.Event('change'));
    expect(container.classList.contains('hidden')).toBe(true);
    expect(interestedProduct.required).toBe(false);
  });

  test('Tier 1: Prepopulating quote via URL parameters sets correct options', async () => {
    // Load with custom URL
    const customDom = loadPage('contact.html', {
      initialProducts: testProducts,
      initialCategories: testCategories,
      url: 'http://localhost/contact.html?quote=p2'
    });
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const customDoc = customDom.window.document;
    expect(customDoc.getElementById('subject').value).toBe('quote');
    expect(customDoc.getElementById('interestedProduct').value).toBe('p2');
    
    customDom.window.close();
  });

  test('Tier 1: Prepopulating quote via sessionStorage sets correct options', async () => {
    // Setup sessionStorage
    dom.window.sessionStorage.setItem('quoteProduct', JSON.stringify(testProducts.p1));
    
    // Call page load check checkPreselectedProduct
    dom.window.checkPreselectedProduct();

    expect(document.getElementById('subject').value).toBe('quote');
    expect(document.getElementById('interestedProduct').value).toBe('p1');
  });

  test('Tier 1: Successful form submit saves quote to DataManager and shows success modal', async () => {
    // Setup online db quote tracking
    const originalSaveQuote = window.DataManager.saveQuote;
    window.DataManager.saveQuote = jest.fn().mockImplementation(originalSaveQuote);

    document.getElementById('firstName').value = 'Jane';
    document.getElementById('lastName').value = 'Doe';
    document.getElementById('email').value = 'jane@example.com';
    document.getElementById('subject').value = 'general';
    document.getElementById('message').value = 'Fabric request test';

    const form = document.getElementById('contactForm');
    const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(window.DataManager.saveQuote).toHaveBeenCalled();
    expect(document.getElementById('successModal').classList.contains('hidden')).toBe(false);
  });

  // TIER 2: Boundary & Corner Cases (>= 5 assertions/cases)
  test('Tier 2: Missing required field blocks submit and alerts error', () => {
    window.alert = jest.fn();

    document.getElementById('firstName').value = ''; // missing
    document.getElementById('lastName').value = 'Doe';
    document.getElementById('email').value = 'jane@example.com';
    document.getElementById('subject').value = 'general';
    document.getElementById('message').value = 'Fabric request test';

    const form = document.getElementById('contactForm');
    const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Please fill in all required fields'));
  });

  test('Tier 2: Invalid email format triggers alert validation error', () => {
    window.alert = jest.fn();

    document.getElementById('firstName').value = 'Jane';
    document.getElementById('lastName').value = 'Doe';
    document.getElementById('email').value = 'invalid-email-format'; // invalid email
    document.getElementById('subject').value = 'general';
    document.getElementById('message').value = 'Fabric request test';

    const form = document.getElementById('contactForm');
    const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('valid email address'));
  });

  test('Tier 2: Request Quote without selecting a product shows validation alert', () => {
    window.alert = jest.fn();

    document.getElementById('firstName').value = 'Jane';
    document.getElementById('lastName').value = 'Doe';
    document.getElementById('email').value = 'jane@example.com';
    document.getElementById('subject').value = 'quote'; // quote requires product
    document.getElementById('interestedProduct').value = ''; // missing
    document.getElementById('message').value = 'Fabric request test';

    const form = document.getElementById('contactForm');
    const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('select a product'));
  });

  test('Tier 2: Escape key press closes active success modal', () => {
    window.showSuccessModal();
    expect(document.getElementById('successModal').classList.contains('hidden')).toBe(false);

    // Press Escape
    const escapeEvent = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(escapeEvent);

    expect(document.getElementById('successModal').classList.contains('hidden')).toBe(true);
  });

  test('Tier 2: Operational status badge changes dynamically depending on simulated IST time', () => {
    jest.useFakeTimers();

    // Test case 2.5a: Monday 12:00 PM IST (Active)
    // Mon Jun 15 2026 12:00:00 IST is Mon Jun 15 2026 06:30:00 UTC
    jest.setSystemTime(new Date(Date.UTC(2026, 5, 15, 6, 30, 0))); // UTC + 5:30 = 12:00
    window.updateOperationalStatus();
    expect(document.getElementById('operationalStatus').textContent).toContain('Active Now');

    // Test case 2.5b: Monday 10:00 PM IST (Closed)
    // Mon Jun 15 2026 22:00:00 IST is Mon Jun 15 2026 16:30:00 UTC
    jest.setSystemTime(new Date(Date.UTC(2026, 5, 15, 16, 30, 0)));
    window.updateOperationalStatus();
    expect(document.getElementById('operationalStatus').textContent).toContain('Closed');

    // Test case 2.5c: Sunday 12:00 PM IST (Emergency Only)
    // Sun Jun 14 2026 12:00:00 IST is Sun Jun 14 2026 06:30:00 UTC
    jest.setSystemTime(new Date(Date.UTC(2026, 5, 14, 6, 30, 0)));
    window.updateOperationalStatus();
    expect(document.getElementById('operationalStatus').textContent).toContain('Emergency Only');
  });
});
