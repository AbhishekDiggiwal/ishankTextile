if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');


function loadPage(htmlFileName, options = {}) {
  const { initialProducts = [], initialCategories = [], offlineMode = false, adminLoggedIn = false } = options;

  const filePath = path.resolve(__dirname, '..', htmlFileName);
  let html = fs.readFileSync(filePath, 'utf8');

  // Strip external script tags to avoid network calls
  html = html.replace(/<script[^>]*src="http[^"]*"[^>]*><\/script>/gi, '<!-- stripped external script -->');

  const dataManagerCode = fs.readFileSync(path.resolve(__dirname, '../data-manager.js'), 'utf8');

  // Let's create the mock script block to run before everything
  const mockScriptBlock = `
    <script>
      // Setup mock firebase services
      class MockFirestoreDoc {
        constructor(id, data, collection) {
          this.id = id;
          this._data = data;
          this._collection = collection;
        }
        async get() {
          return {
            id: this.id,
            exists: this._data !== undefined,
            data: () => this._data || null
          };
        }
        async set(data, options = {}) {
          if (options.merge && this._data) {
            this._data = { ...this._data, ...data };
          } else {
            this._data = { ...data };
          }
          this._collection.store[this.id] = this._data;
        }
        async update(updates) {
          if (!this._data) throw new Error("Document does not exist");
          this._data = { ...this._data, ...updates };
          this._collection.store[this.id] = this._data;
        }
        async delete() {
          delete this._collection.store[this.id];
          this._data = undefined;
        }
      }

      class MockFirestoreCollection {
        constructor(name, initialData = {}) {
          this.name = name;
          this.store = { ...initialData };
        }
        doc(id) {
          if (!id) id = Math.random().toString(36).substring(2);
          return new MockFirestoreDoc(id, this.store[id], this);
        }
        async add(data) {
          const id = Math.random().toString(36).substring(2);
          this.store[id] = { ...data };
          return new MockFirestoreDoc(id, this.store[id], this);
        }
        async get() {
          if (window.firestoreReadTimeout) {
            return new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Firestore read timeout')), 100);
            });
          }
          if (window.firestoreFail) {
            throw new Error('Firestore read error');
          }
          const docs = Object.entries(this.store).map(([id, data]) => ({
            id,
            data: () => data
          }));
          return { docs };
        }
        orderBy(field, direction) {
          return {
            get: async () => {
              const snapshot = await this.get();
              snapshot.docs.sort((a, b) => {
                const valA = a.data()[field];
                const valB = b.data()[field];
                if (valA < valB) return direction === 'desc' ? 1 : -1;
                if (valA > valB) return direction === 'desc' ? -1 : 1;
                return 0;
              });
              return snapshot;
            }
          };
        }
        where(field, operator, value) {
          return {
            get: async () => {
              const snapshot = await this.get();
              snapshot.docs = snapshot.docs.filter(doc => {
                const val = doc.data()[field];
                if (operator === '==') return val === value;
                return false;
              });
              return snapshot;
            }
          };
        }
      }

      class MockFirestore {
        constructor() {
          this.collections = {
            products: new MockFirestoreCollection('products', ${JSON.stringify(initialProducts)}),
            categories: new MockFirestoreCollection('categories', ${JSON.stringify(initialCategories)}),
            quotes: new MockFirestoreCollection('quotes'),
            settings: new MockFirestoreCollection('settings'),
            certificates: new MockFirestoreCollection('certificates')
          };
        }
        collection(name) {
          if (!this.collections[name]) {
            this.collections[name] = new MockFirestoreCollection(name);
          }
          return this.collections[name];
        }
      }

      class MockAuth {
        constructor() {
          this.currentUser = null;
          this.listeners = [];
        }
        onAuthStateChanged(listener) {
          this.listeners.push(listener);
          // Trigger listener asynchronously to allow test setup
          setTimeout(() => listener(this.currentUser), 0);
          return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
          };
        }
        async signInWithEmailAndPassword(email, password) {
          if (email === 'admin@ishanktextile.com' && password === 'admin123') {
            this.currentUser = { email, uid: 'admin_uid' };
            this.listeners.forEach(l => l(this.currentUser));
            return { user: this.currentUser };
          } else {
            const error = new Error('Wrong password');
            error.code = 'auth/wrong-password';
            throw error;
          }
        }
        async signOut() {
          this.currentUser = null;
          this.listeners.forEach(l => l(null));
        }
      }

      window.firebase = {
        apps: ['mock-app'],
        initializeApp: () => window.firebase,
        app: () => window.firebase,
        firestore: () => window.firebaseServices.db,
        auth: () => window.firebaseServices.auth,
        storage: () => window.firebaseServices.storage
      };

      window.firebaseServices = {
        auth: ${offlineMode ? 'null' : 'new MockAuth()'},
        db: new MockFirestore(),
        storage: null
      };

      if (${adminLoggedIn}) {
        window.sessionStorage.setItem('adminLoggedIn', 'true');
      }

      window.scrollTo = () => {};
      window.alert = () => {};
      window.confirm = () => true;
      window.firestoreReadTimeout = false;
      window.firestoreFail = false;
      window.Chart = class {
        constructor(ctx, config) {
          this.ctx = ctx;
          this.config = config;
        }
        destroy() {}
        update() {}
      };
      window.tailwind = {
        config: {
          theme: {
            extend: {
              colors: {}
            }
          }
        }
      };
      window.IntersectionObserver = class {
        constructor(callback) {
          this.callback = callback;
        }
        observe(element) {
          setTimeout(() => {
            if (this.callback) {
              this.callback([{
                target: element,
                isIntersecting: true,
                intersectionRatio: 1
              }], this);
            }
          }, 0);
        }
        unobserve() {}
        disconnect() {}
      };
      window.requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 0);
      window.cancelAnimationFrame = (id) => clearTimeout(id);
    </script>
  `;

  // Insert mock scripts at the very top of head
  html = html.replace('<head>', '<head>' + mockScriptBlock);

  // Replace local script sources with inline contents
  html = html.replace(/<script[^>]*src="firebase-config\.js"[^>]*><\/script>/gi, '<!-- config mocked -->');
  html = html.replace(/<script[^>]*src="data-manager\.js"[^>]*><\/script>/gi, `<script>${dataManagerCode}\nwindow.DataManager = DataManager;</script>`);

  const virtualConsole = new VirtualConsole();
  virtualConsole.sendTo(console);

  const url = options.url || ('http://localhost/' + htmlFileName);
  const dom = new JSDOM(html, {
    url,
    runScripts: 'dangerously',
    resources: 'usable',
    virtualConsole
  });

  // Mock Date constructor in JSDOM window to delegate to Node global.Date for mock time support
  const originalDate = dom.window.Date;
  dom.window.Date = class extends originalDate {
    constructor(...args) {
      if (args.length === 0) {
        super(global.Date.now());
      } else {
        super(...args);
      }
    }
    static now() {
      return global.Date.now();
    }
  };

  // Dispatch DOMContentLoaded event automatically so page script initialization runs
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

  return dom;
}

module.exports = {
  loadPage
};
