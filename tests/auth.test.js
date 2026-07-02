const { loadPage } = require('./helpers');

describe('Feature 2: Admin Authentication', () => {
  let dom;
  let window;
  let document;

  beforeEach(() => {
    dom = loadPage('admin-login.html');
    window = dom.window;
    document = window.document;
    
    // Mock the location.href to prevent JSDOM navigation errors
    delete window.location;
    window.location = { href: 'http://localhost/admin-login.html' };
  });

  afterEach(() => {
    window.close();
  });

  // TIER 1: Feature Coverage (>= 5 assertions/cases)
  test('Tier 1: Admin login form has email and password inputs', () => {
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const form = document.getElementById('loginForm');
    
    expect(email).toBeTruthy();
    expect(password).toBeTruthy();
    expect(form).toBeTruthy();
  });

  test('Tier 1: Password field starts with type="password"', () => {
    const password = document.getElementById('password');
    expect(password.type).toBe('password');
  });

  test('Tier 1: Toggle password visibility changes input type to text', () => {
    const password = document.getElementById('password');
    const toggleBtn = document.querySelector('button[type="button"]'); // password toggle button

    expect(document.getElementById('togglePasswordLabel')).toBeNull();
    expect(toggleBtn.textContent.trim()).toBe('');
    expect(toggleBtn.classList.contains('right-3')).toBe(true);
    expect(toggleBtn.getAttribute('aria-label')).toBe('Show password');
    expect(toggleBtn.getAttribute('aria-pressed')).toBe('false');
    
    // Trigger password toggle function directly or via click
    window.togglePassword();
    expect(password.type).toBe('text');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Hide password');
    expect(toggleBtn.getAttribute('aria-pressed')).toBe('true');

    window.togglePassword();
    expect(password.type).toBe('password');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Show password');
    expect(toggleBtn.getAttribute('aria-pressed')).toBe('false');
  });

  test('Tier 1: Login is blocked when Firebase Auth is unavailable', () => {
    window.close();
    dom = loadPage('admin-login.html', { offlineMode: true });
    window = dom.window;
    document = window.document;
    delete window.location;
    window.location = { href: 'http://localhost/admin-login.html' };
    
    document.getElementById('email').value = 'admin@ishanktextile.com';
    document.getElementById('password').value = 'admin123';
    
    const form = document.getElementById('loginForm');
    const event = new window.Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);

    expect(window.sessionStorage.getItem('adminLoggedIn')).toBeNull();
    expect(window.location.href).toBe('http://localhost/admin-login.html');
    expect(document.getElementById('errorText').textContent).toContain('authentication is unavailable');
  });

  test('Tier 1: Online Firebase Auth login succeeds with correct credentials', async () => {
    // Auth is mocked by helpers.js
    const auth = window.firebaseServices.auth;
    expect(auth).not.toBeNull();

    document.getElementById('email').value = 'admin@ishanktextile.com';
    document.getElementById('password').value = 'admin123';
    
    const form = document.getElementById('loginForm');
    const event = new window.Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);

    // Wait for the async Firebase signIn to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(auth.currentUser).not.toBeNull();
    expect(auth.currentUser.email).toBe('admin@ishanktextile.com');
    expect(window.location.href).toBe('admin-dashboard.html');
  });

  // TIER 2: Boundary & Corner Cases (>= 5 assertions/cases)
  test('Tier 2: Unavailable Firebase Auth never accepts local credentials', () => {
    window.close();
    dom = loadPage('admin-login.html', { offlineMode: true });
    window = dom.window;
    document = window.document;
    delete window.location;
    window.location = { href: 'http://localhost/admin-login.html' };
    
    document.getElementById('email').value = 'wrong@email.com';
    document.getElementById('password').value = 'wrongpassword';
    
    const form = document.getElementById('loginForm');
    const event = new window.Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);

    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    expect(errorDiv.classList.contains('hidden')).toBe(false);
    expect(errorText.textContent).toContain('authentication is unavailable');
    expect(document.getElementById('password').value).toBe('');
    expect(window.sessionStorage.getItem('adminLoggedIn')).toBeNull();
  });

  test('Tier 2: Missing email or password shows local input validation error', () => {
    document.getElementById('email').value = '';
    document.getElementById('password').value = 'admin123';
    
    const form = document.getElementById('loginForm');
    const event = new window.Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);

    const errorText = document.getElementById('errorText');
    expect(errorText.textContent).toContain('Please enter both email and password');
  });

  test('Tier 2: Online Firebase Auth handles auth/user-not-found error correctly', async () => {
    const auth = window.firebaseServices.auth;
    // Mock auth signIn to throw user-not-found
    auth.signInWithEmailAndPassword = jest.fn().mockRejectedValue({
      code: 'auth/user-not-found'
    });

    document.getElementById('email').value = 'nonexistent@ishanktextile.com';
    document.getElementById('password').value = 'anypass';
    
    const form = document.getElementById('loginForm');
    const event = new window.Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);

    await new Promise(resolve => setTimeout(resolve, 50));

    const errorText = document.getElementById('errorText');
    expect(errorText.textContent).toBe('No account found with this email');
    expect(document.getElementById('password').value).toBe('');
  });

  test('Tier 2: Online Firebase Auth handles auth/wrong-password error correctly', async () => {
    const auth = window.firebaseServices.auth;
    auth.signInWithEmailAndPassword = jest.fn().mockRejectedValue({
      code: 'auth/wrong-password'
    });

    document.getElementById('email').value = 'admin@ishanktextile.com';
    document.getElementById('password').value = 'wrongpass';
    
    const form = document.getElementById('loginForm');
    const event = new window.Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);

    await new Promise(resolve => setTimeout(resolve, 50));

    const errorText = document.getElementById('errorText');
    expect(errorText.textContent).toBe('Incorrect password');
  });

  test('Tier 2: Online Firebase Auth handles auth/invalid-email error correctly', async () => {
    const auth = window.firebaseServices.auth;
    auth.signInWithEmailAndPassword = jest.fn().mockRejectedValue({
      code: 'auth/invalid-email'
    });

    document.getElementById('email').value = 'invalidemail';
    document.getElementById('password').value = 'admin123';
    
    const form = document.getElementById('loginForm');
    const event = new window.Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);

    await new Promise(resolve => setTimeout(resolve, 50));

    const errorText = document.getElementById('errorText');
    expect(errorText.textContent).toBe('Please enter a valid email address');
  });
});
