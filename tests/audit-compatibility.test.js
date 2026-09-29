const { loadPage } = require('./helpers');

describe('Administrator logout compatibility', () => {
  let dom;
  afterEach(() => dom?.window.close());

  test('the existing logout control signs out and returns to login', async () => {
    dom = loadPage('admin-dashboard.html', { adminLoggedIn: true });
    await new Promise(resolve => setTimeout(resolve, 50));
    const auth = dom.window.firebaseServices.auth;
    const signOut = jest.spyOn(auth, 'signOut');
    dom.window.document.querySelector('[data-action="logout"]').click();
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(auth.currentUser).toBeNull();
    expect(dom.window.__lastNavigation).toBe('http://localhost/admin-login.html');
  });

  test('a sign-out service failure retains the existing login redirect', async () => {
    dom = loadPage('admin-dashboard.html', { adminLoggedIn: true });
    await new Promise(resolve => setTimeout(resolve, 50));
    const signOut = jest.spyOn(dom.window.firebaseServices.auth, 'signOut')
      .mockRejectedValue(new Error('Synthetic auth service failure'));
    dom.window.document.querySelector('[data-action="logout"]').click();
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(dom.window.__lastNavigation).toBe('http://localhost/admin-login.html');
  });

  test('unavailable authentication keeps the existing login destination', async () => {
    dom = loadPage('admin-dashboard.html', { offlineMode: true });
    dom.window.__lastNavigation = undefined;
    dom.window.document.querySelector('[data-action="logout"]').click();
    expect(dom.window.__lastNavigation).toBe('http://localhost/admin-login.html');
  });
});
