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

  test('Firebase bootstrap exposes on-demand App Check from hosted runtime options', () => {
    const bootstrap = fs.readFileSync(
      path.resolve(__dirname, '../public/firebase-config.js'),
      'utf8'
    );
    dom = new JSDOM(
      '<!doctype html><html><head>' +
      '<meta name="firebase-app-check-enabled" content="true">' +
      '</head><body></body></html>', {
      runScripts: 'outside-only',
      url: 'https://example.test/'
      }
    );
    const activate = jest.fn();
    const ReCaptchaEnterpriseProvider = jest.fn(function Provider(siteKey) {
      this.siteKey = siteKey;
    });
    const app = { options: { recaptchaSiteKey: 'hosted-public-site-key' } };
    dom.window.firebase = {
      apps: [app],
      app: () => app,
      appCheck: Object.assign(() => ({ activate }), { ReCaptchaEnterpriseProvider }),
      auth: () => ({ service: 'auth' }),
      firestore: () => ({ service: 'firestore' }),
      storage: () => ({ service: 'storage' })
    };

    dom.window.eval(bootstrap);

    expect(ReCaptchaEnterpriseProvider).not.toHaveBeenCalled();
    expect(activate).not.toHaveBeenCalled();
    expect(dom.window.firebaseServices.appCheck).toBeNull();
    expect(dom.window.firebaseServices.appCheckConfigured).toBe(true);

    dom.window.firebaseServices.initializeAppCheck();

    expect(ReCaptchaEnterpriseProvider).toHaveBeenCalledWith('hosted-public-site-key');
    expect(activate).toHaveBeenCalledWith(
      expect.objectContaining({ siteKey: 'hosted-public-site-key' }),
      true
    );
    expect(dom.window.firebaseServices.appCheck).not.toBeNull();
    expect(dom.window.firebaseServices.appCheckConfigured).toBe(true);
  });

  test('Firebase bootstrap skips App Check on pages that do not submit inquiries', () => {
    const bootstrap = fs.readFileSync(
      path.resolve(__dirname, '../public/firebase-config.js'),
      'utf8'
    );
    dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
      runScripts: 'outside-only',
      url: 'https://example.test/'
    });
    const activate = jest.fn();
    const ReCaptchaEnterpriseProvider = jest.fn(function Provider(siteKey) {
      this.siteKey = siteKey;
    });
    const auth = { service: 'auth' };
    const firestore = { service: 'firestore' };
    const storage = { service: 'storage' };
    const app = { options: { recaptchaSiteKey: 'hosted-public-site-key' } };
    dom.window.firebase = {
      apps: [app],
      app: () => app,
      appCheck: Object.assign(() => ({ activate }), { ReCaptchaEnterpriseProvider }),
      auth: () => auth,
      firestore: () => firestore,
      storage: () => storage
    };

    dom.window.eval(bootstrap);

    expect(ReCaptchaEnterpriseProvider).not.toHaveBeenCalled();
    expect(activate).not.toHaveBeenCalled();
    expect(dom.window.firebaseServices).toEqual(expect.objectContaining({
      auth,
      appCheck: null,
      appCheckConfigured: false,
      db: firestore,
      storage
    }));
  });

  test('Firebase bootstrap leaves App Check idle until an inquiry requests it', () => {
    const bootstrap = fs.readFileSync(
      path.resolve(__dirname, '../public/firebase-config.js'),
      'utf8'
    );
    dom = new JSDOM(
      '<!doctype html><html><head>' +
      '<meta name="firebase-app-check-enabled" content="true">' +
      '</head><body></body></html>', {
      runScripts: 'outside-only',
      url: 'https://example.test/'
      }
    );
    dom.window.document.body.remove();
    const activate = jest.fn(() => {
      if (!dom.window.document.body) throw new Error('document.body is missing');
    });
    const ReCaptchaEnterpriseProvider = jest.fn(function Provider(siteKey) {
      this.siteKey = siteKey;
    });
    const app = { options: { recaptchaSiteKey: 'hosted-public-site-key' } };
    dom.window.firebase = {
      apps: [app],
      app: () => app,
      appCheck: Object.assign(() => ({ activate }), { ReCaptchaEnterpriseProvider }),
      auth: () => ({ service: 'auth' }),
      firestore: () => ({ service: 'firestore' }),
      storage: () => ({ service: 'storage' })
    };

    dom.window.eval(bootstrap);

    expect(activate).not.toHaveBeenCalled();
    const body = dom.window.document.createElement('body');
    dom.window.document.documentElement.appendChild(body);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

    expect(activate).not.toHaveBeenCalled();
    dom.window.firebaseServices.initializeAppCheck();

    expect(activate).toHaveBeenCalledTimes(1);
    expect(dom.window.firebaseServices.appCheck).not.toBeNull();
  });

  test('App Check failure does not disable the other Firebase services', () => {
    const bootstrap = fs.readFileSync(
      path.resolve(__dirname, '../public/firebase-config.js'),
      'utf8'
    );
    dom = new JSDOM(
      '<!doctype html><html><head>' +
      '<meta name="firebase-app-check-enabled" content="true">' +
      '</head><body></body></html>', {
      runScripts: 'outside-only',
      url: 'https://example.test/'
      }
    );
    const auth = { service: 'auth' };
    const firestore = { service: 'firestore' };
    const storage = { service: 'storage' };
    const ReCaptchaEnterpriseProvider = jest.fn(function Provider(siteKey) {
      this.siteKey = siteKey;
    });
    const app = { options: {} };
    dom.window.FIREBASE_APP_CHECK_SITE_KEY = 'runtime-public-site-key';
    dom.window.firebase = {
      apps: [app],
      app: () => app,
      appCheck: Object.assign(() => ({
        activate: () => { throw new Error('activation failed'); }
      }), { ReCaptchaEnterpriseProvider }),
      auth: () => auth,
      firestore: () => firestore,
      storage: () => storage
    };

    dom.window.eval(bootstrap);
    dom.window.firebaseServices.initializeAppCheck();

    expect(dom.window.firebaseServices).toEqual(expect.objectContaining({
      auth,
      appCheck: null,
      appCheckConfigured: true,
      db: firestore,
      storage
    }));
  });

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
