const { loadPage } = require('./helpers');

describe('Feature 1: DataManager (caching, timeouts, fallback)', () => {
  let dom;
  let window;
  let DataManager;

  beforeEach(() => {
    // Load a blank page or any page to get JSDOM with data-manager loaded
    dom = loadPage('index.html', {
      initialProducts: {
        'p1': { name: 'Premium Twill', categoryId: 'cat1', startingPrice: 350 },
        'p2': { name: 'Cotton blend', categoryId: 'cat2', startingPrice: 150 }
      },
      initialCategories: {
        'cat1': { name: 'Twill Collection' }
      }
    });
    window = dom.window;
    DataManager = window.DataManager;
  });

  afterEach(() => {
    dom.window.close();
  });

  // TIER 1: Feature Coverage (>= 5 assertions/cases)
  test('Tier 1: getCategories returns database categories if available', async () => {
    const categories = await DataManager.getCategories();
    expect(categories).toBeDefined();
    expect(categories.length).toBe(1);
    expect(categories[0].id).toBe('cat1');
    expect(categories[0].name).toBe('Twill Collection');
  });

  test('Tier 1: getProducts returns database products if available', async () => {
    const products = await DataManager.getProducts();
    expect(products).toBeDefined();
    expect(products.length).toBe(2);
    expect(products.find(p => p.id === 'p1').name).toBe('Premium Twill');
  });

  test('Tier 1: saveQuote writes quote to firestore if online', async () => {
    const quote = { customerName: 'John Doe', email: 'john@example.com', message: 'Need 500m fabric' };
    await DataManager.saveQuote(quote);
    
    // Check in database
    const dbQuotes = Object.values(window.firebaseServices.db.collection('quotes').store);
    expect(dbQuotes.length).toBe(1);
    expect(dbQuotes[0].customerName).toBe('John Doe');
    expect(dbQuotes[0].createdAt).toBeDefined(); // must append timestamp
  });

  test('Tier 1: saveQuote appends correct properties including createdAt ISO string', async () => {
    const quote = { customerName: 'Jane Smith', email: 'jane@example.com', message: 'Test message' };
    await DataManager.saveQuote(quote);
    const dbQuotes = Object.values(window.firebaseServices.db.collection('quotes').store);
    expect(dbQuotes[0].email).toBe('jane@example.com');
    expect(new Date(dbQuotes[0].createdAt).getTime()).not.toBeNaN();
  });

  test('Tier 1: getCategories handles fallback when DB collection is empty', async () => {
    // Clear mock firestore categories
    window.firebaseServices.db.collection('categories').store = {};
    const categories = await DataManager.getCategories();
    // Should fallback to default hardcoded categories (5 items)
    expect(categories.length).toBe(5);
    expect(categories[0].name).toBe('Vat-Dyed Fabrics');
  });

  // TIER 2: Boundary & Corner Cases (>= 5 assertions/cases)
  test('Tier 2: getCategories falls back to localStorage or default when db is unconfigured', async () => {
    window.firebaseServices.db = null; // Unconfigure database
    
    // Test case 2.1: localStorage is empty, should get fallbackCategories
    const categories = await DataManager.getCategories();
    expect(categories.length).toBe(5);
    expect(categories[0].name).toBe('Vat-Dyed Fabrics');

    // Test case 2.2: localStorage has cached data, should use cache
    const mockCache = [{ id: 'cached1', name: 'Cached Category' }];
    window.localStorage.setItem('categories', JSON.stringify(mockCache));
    const cachedCategories = await DataManager.getCategories();
    expect(cachedCategories.length).toBe(1);
    expect(cachedCategories[0].name).toBe('Cached Category');
  });

  test('Tier 2: getProducts falls back to default when db fails', async () => {
    window.firestoreFail = true; // DB fails
    
    const products = await DataManager.getProducts();
    // should return default fallbackProducts (5 items)
    expect(products.length).toBe(5);
    expect(products[0].name).toBe('Vat-Dyed Premium Fabric');
  });

  test('Tier 2: getCategories falls back when firestore read times out', async () => {
    window.firestoreReadTimeout = true; // Read times out (rejects)
    
    // Set localStorage cache
    const mockCache = [{ id: 'cache2', name: 'Timeout Cache' }];
    window.localStorage.setItem('categories', JSON.stringify(mockCache));
    
    const categories = await DataManager.getCategories();
    expect(categories.length).toBe(1);
    expect(categories[0].name).toBe('Timeout Cache');
  });

  test('Tier 2: saveQuote saves locally in localStorage when db is offline/fails', async () => {
    window.firebaseServices.db = null; // db offline
    
    const quote = { customerName: 'Offline User', email: 'offline@example.com', message: 'Offline quote request' };
    await DataManager.saveQuote(quote);
    
    const localQuotes = JSON.parse(window.localStorage.getItem('quotes'));
    expect(localQuotes).toBeDefined();
    expect(localQuotes.length).toBe(1);
    expect(localQuotes[0].customerName).toBe('Offline User');
    expect(localQuotes[0].id).toBeDefined(); // generated local id
    expect(localQuotes[0].createdAt).toBeDefined();
  });

  test('Tier 2: saveQuote local storage unshifts quotes to maintain reverse chronological order', async () => {
    window.firebaseServices.db = null;
    
    await DataManager.saveQuote({ customerName: 'First Quote', email: 'first@example.com', message: 'Msg1' });
    await DataManager.saveQuote({ customerName: 'Second Quote', email: 'second@example.com', message: 'Msg2' });
    
    const localQuotes = JSON.parse(window.localStorage.getItem('quotes'));
    expect(localQuotes.length).toBe(2);
    // The second quote should be first in the array (unshifted)
    expect(localQuotes[0].customerName).toBe('Second Quote');
    expect(localQuotes[1].customerName).toBe('First Quote');
  });
});
