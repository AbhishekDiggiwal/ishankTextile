const { loadPage } = require('./helpers');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('Security hardening', () => {
  let dom;

  afterEach(() => {
    if (dom) dom.window.close();
  });

  test('escapes every HTML-significant quote character', () => {
    dom = loadPage('index.html');
    expect(dom.window.SecurityUtils.escapeHtml(`<img src=x onerror="alert('x')">&`))
      .toBe('&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;');
  });

  test('sanitizer drops executable content and unsafe attributes', () => {
    dom = loadPage('index.html');
    const result = dom.window.SecurityUtils.sanitizeHtml(
      '<p onclick="alert(1)">Safe <strong>text</strong></p>' +
      '<img src=x onerror=alert(2)><script>alert(3)</script>' +
      '<a href="javascript:alert(4)">bad link</a>'
    );
    const container = dom.window.document.createElement('div');
    container.innerHTML = result;

    expect(container.textContent).toContain('Safe text');
    expect(container.textContent).toContain('bad link');
    expect(container.querySelector('script, img')).toBeNull();
    expect(container.querySelector('[onclick], [onerror]')).toBeNull();
    expect(container.querySelector('a').hasAttribute('href')).toBe(false);
  });

  test('URL validation rejects script, file, and credential-confusion URLs', () => {
    dom = loadPage('index.html');
    const utils = dom.window.SecurityUtils;

    expect(utils.safeLinkUrl('javascript:alert(1)')).toBe('');
    expect(utils.safeLinkUrl('file:///etc/passwd')).toBe('');
    expect(utils.safeImageUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    expect(utils.safeLinkUrl('https://trusted.example@evil.example/path'))
      .toBe('https://trusted.example@evil.example/path');
    expect(new URL(utils.safeLinkUrl('https://trusted.example@evil.example/path')).hostname)
      .toBe('evil.example');
  });

  test('admin authorization accepts the claim and rejects an ordinary Firebase user', async () => {
    dom = loadPage('index.html');
    const isAdminUser = dom.window.SecurityUtils.isAdminUser;

    await expect(isAdminUser({
      email: 'someone@example.com',
      getIdTokenResult: async () => ({ claims: { admin: true } })
    }, true)).resolves.toBe(true);
    await expect(isAdminUser({
      email: 'someone@example.com',
      getIdTokenResult: async () => ({ claims: {} })
    }, true)).resolves.toBe(false);
  });

  test('email-based admin fallback requires the signed verified-email claim', async () => {
    dom = loadPage('index.html');
    const isAdminUser = dom.window.SecurityUtils.isAdminUser;

    await expect(isAdminUser({
      email: 'admin@ishanktextile.com',
      getIdTokenResult: async () => ({
        claims: { email: 'admin@ishanktextile.com', email_verified: true }
      })
    }, true)).resolves.toBe(true);
    await expect(isAdminUser({
      email: 'admin@ishanktextile.com',
      getIdTokenResult: async () => ({
        claims: { email: 'admin@ishanktextile.com', email_verified: false }
      })
    }, true)).resolves.toBe(false);
    await expect(isAdminUser({
      email: 'admin@ishanktextile.com'
    }, true)).resolves.toBe(false);
  });

  test('Firebase rules require verified email for the temporary admin fallback', () => {
    const firestoreRules = fs.readFileSync(
      path.resolve(__dirname, '../firestore.rules'),
      'utf8'
    );
    const storageRules = fs.readFileSync(
      path.resolve(__dirname, '../storage.rules'),
      'utf8'
    );

    for (const rules of [firestoreRules, storageRules]) {
      expect(rules).toContain("request.auth.token.email == 'admin@ishanktextile.com'");
      expect(rules).toContain('request.auth.token.email_verified == true');
    }
  });

  test('Firebase bootstrap initializes only the core services used by the site', () => {
    const bootstrap = fs.readFileSync(
      path.resolve(__dirname, '../public/firebase-config.js'),
      'utf8'
    );
    dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
      runScripts: 'outside-only',
      url: 'https://example.test/'
    });
    const auth = { service: 'auth' };
    const firestore = { service: 'firestore' };
    const storage = { service: 'storage' };
    const app = { options: {} };
    dom.window.firebase = {
      apps: [app],
      app: () => app,
      auth: () => auth,
      firestore: () => firestore,
      storage: () => storage
    };

    dom.window.eval(bootstrap);

    expect(dom.window.firebaseServices).toEqual({
      auth,
      db: firestore,
      storage
    });
  });

  test('public inquiry flow no longer loads or invokes App Check', () => {
    const contactMarkup = fs.readFileSync(
      path.resolve(__dirname, '../public/contact.html'),
      'utf8'
    );
    const contactScript = fs.readFileSync(
      path.resolve(__dirname, '../public/scripts/contact-1.js'),
      'utf8'
    );

    expect(contactMarkup).not.toMatch(/app-check|recaptcha/i);
    expect(contactScript).not.toMatch(/appCheck|verifyPublicRequest|Verifying request/i);
  });

  test.each(['about-2.js', 'admin-dashboard-2.js'])(
    'PDF viewer in %s does not sandbox Chrome PDF rendering',
    (filename) => {
      const viewerScript = fs.readFileSync(
        path.resolve(__dirname, '../public/scripts', filename),
        'utf8'
      );

      expect(viewerScript).toContain("const frame = document.createElement('iframe')");
      expect(viewerScript).toContain('frame.src = safeUrl');
      expect(viewerScript).not.toMatch(/frame\.setAttribute\(['"]sandbox['"]/);
    }
  );

  test('site markup contains no executable event attributes and delegated controls work', () => {
    const publicDirectory = path.resolve(__dirname, '../public');
    const applicationSources = fs.readdirSync(publicDirectory)
      .filter((filename) => filename.endsWith('.html') || filename.endsWith('.js'))
      .map((filename) => fs.readFileSync(path.join(publicDirectory, filename), 'utf8'))
      .concat(
        fs.readdirSync(path.join(publicDirectory, 'scripts'))
          .filter((filename) => filename.endsWith('.js'))
          .map((filename) => fs.readFileSync(
            path.join(publicDirectory, 'scripts', filename),
            'utf8'
          ))
      )
      .join('\n');

    expect(applicationSources).not.toMatch(/\son[a-z]+\s*=/i);

    dom = loadPage('admin-login.html');
    const password = dom.window.document.getElementById('password');
    const toggle = dom.window.document.querySelector('[data-action="togglePassword"]');
    expect(password.type).toBe('password');
    toggle.click();
    expect(password.type).toBe('text');
  });

  test('every public HTML page uses the dedicated logo favicon assets', () => {
    const publicDirectory = path.resolve(__dirname, '../public');
    const htmlFiles = fs.readdirSync(publicDirectory)
      .filter((filename) => filename.endsWith('.html'));

    expect(htmlFiles.length).toBeGreaterThan(0);
    for (const filename of htmlFiles) {
      const markup = fs.readFileSync(path.join(publicDirectory, filename), 'utf8');
      expect(markup).toContain('href="favicon.png"');
      expect(markup).toContain('href="apple-touch-icon.png"');
    }
    expect(fs.statSync(path.join(publicDirectory, 'favicon.png')).size).toBeGreaterThan(0);
    expect(fs.statSync(path.join(publicDirectory, 'apple-touch-icon.png')).size)
      .toBeGreaterThan(0);
  });

  test('login signs out authenticated users without administrator authorization', async () => {
    dom = loadPage('admin-login.html');
    const { window } = dom;
    const auth = window.firebaseServices.auth;
    const ordinaryUser = {
      email: 'ordinary@example.com',
      uid: 'ordinary',
      getIdTokenResult: async () => ({ claims: {} })
    };
    auth.signInWithEmailAndPassword = jest.fn().mockResolvedValue({ user: ordinaryUser });
    auth.signOut = jest.fn().mockResolvedValue();

    window.document.getElementById('email').value = ordinaryUser.email;
    window.document.getElementById('password').value = 'correct-password';
    window.document.getElementById('loginForm').dispatchEvent(
      new window.Event('submit', { bubbles: true, cancelable: true })
    );
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(auth.signOut).toHaveBeenCalled();
    expect(window.document.getElementById('errorText').textContent)
      .toBe('This account is not authorized for administration.');
  });

  test('malicious stored quote values render as text in the admin dashboard', async () => {
    dom = loadPage('admin-dashboard.html', { adminLoggedIn: true });
    const { window } = dom;
    await new Promise((resolve) => setTimeout(resolve, 50));
    window.firebaseServices.db.collection('quotes').store.attack = {
      customerName: '<img src=x onerror=alert(1)>',
      email: 'attacker@example.com<script>alert(2)</script>',
      phone: '"><svg/onload=alert(3)>',
      message: '<script>alert(4)</script>',
      createdAt: new Date().toISOString()
    };

    await window.renderQuotes();
    const table = window.document.getElementById('quotes-table');
    expect(table.querySelector('script, img, svg')).toBeNull();
    expect(table.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(table.textContent).toContain('attacker@example.com<script>alert(2)</script>');
  });

  test('clicking empty fixed sidebar space cannot hide navigation or alter dashboard data', async () => {
    const initialCategories = [{ id: 'category-1', name: 'Cotton' }];
    const initialProducts = [{ id: 'product-1', name: 'Poplin', categoryId: 'category-1' }];
    dom = loadPage('admin-dashboard.html', {
      adminLoggedIn: true,
      initialCategories,
      initialProducts
    });
    const { window } = dom;
    await new Promise((resolve) => setTimeout(resolve, 50));

    const sidebar = window.document.querySelector('aside');
    const categoriesBefore = { ...window.firebaseServices.db.collection('categories').store };
    const productsBefore = { ...window.firebaseServices.db.collection('products').store };
    sidebar.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(sidebar.classList.contains('hidden')).toBe(false);
    expect(window.firebaseServices.db.collection('categories').store).toEqual(categoriesBefore);
    expect(window.firebaseServices.db.collection('products').store).toEqual(productsBefore);
  });

  test('clicking an explicitly marked modal backdrop still closes that modal', async () => {
    dom = loadPage('admin-dashboard.html', { adminLoggedIn: true });
    const { window } = dom;
    await new Promise((resolve) => setTimeout(resolve, 50));

    const modal = window.document.getElementById('category-modal');
    modal.classList.remove('hidden');
    modal.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(modal.classList.contains('hidden')).toBe(true);
  });

  test('default recovery quotes match the bounded public quote schema', () => {
    dom = loadPage('admin-dashboard.html', { adminLoggedIn: true });
    const quote = dom.window.DataManager.getDefaultQuotes()[0];

    expect(Object.keys(quote).sort()).toEqual([
      'createdAt',
      'customerName',
      'email',
      'message',
      'phone',
      'product',
      'productId',
      'quantity',
      'subject',
      'whatsappUpdates'
    ]);
    expect(quote.subject).toBe('quote');
    expect(typeof quote.quantity).toBe('string');
    expect(typeof quote.whatsappUpdates).toBe('boolean');
    expect(quote.product).toEqual(expect.objectContaining({
      id: expect.any(String),
      name: expect.any(String),
      code: expect.any(String),
      price: null
    }));
  });
});
