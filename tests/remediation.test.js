const { loadPage } = require('./helpers');
const pause = () => new Promise(resolve => setTimeout(resolve, 15));

describe('Audit remediation regressions', () => {
  let dom;
  afterEach(() => { if (dom) dom.window.close(); });
  const open = page => { dom = loadPage(page || 'index.html', { adminLoggedIn: true }); return dom.window; };

  test.each(['=1+1', '+SUM(A1)', '-1+2', '@SUM(A1)', ' \t=1+1', '\tAlice', '\rBob', '\n=1'])('CSV neutralizes spreadsheet input %p', value => {
    const w = open();
    expect(w.SecurityUtils.csvCell(value)).toBe('"\'' + value + '"');
  });
  test('CSV preserves commas, quotes and line breaks in one quoted cell', () => {
    expect(open().SecurityUtils.csvCell('A, "B"\nC')).toBe('"A, ""B""\nC"');
  });
  test.each([['100','100m'],['100 meters','100 meters'],['2 kg','2 kg'],['','N/A']])('quantity %p remains readable', (value, expected) => {
    expect(open().SecurityUtils.formatQuantity(value)).toBe(expected);
  });
  test('malformed and wrong-shaped caches cannot abort public reads', async () => {
    const w = open(); w.firebaseServices.db = null;
    for (const data of ['{', 'null', '{}', '"text"', '[null]']) {
      w.localStorage.setItem('products', data);
      expect((await w.DataManager.getProducts()).length).toBe(5);
    }
  });
  test('a successful empty catalogue does not display stale cached records', async () => {
    const w = open();
    w.localStorage.setItem('products', JSON.stringify([{ name: 'Old cached item' }]));
    expect(await w.DataManager.getProducts()).toEqual([]);
  });

  test('document-target keyboard events do not throw or execute an action', async () => {
    const w = open('admin-dashboard.html'); await pause();
    const errors=[]; w.addEventListener('error',event=>errors.push(event.error));
    w.openCategoryModal=jest.fn();
    for(const type of ['keydown','keyup']) w.document.dispatchEvent(new w.KeyboardEvent(type,{key:'Tab',bubbles:true}));
    expect(errors).toEqual([]); expect(w.openCategoryModal).not.toHaveBeenCalled();
  });
  test('Tab keyup on an admin action never executes it; click still does', async () => {
    const w = open('admin-dashboard.html'); await pause();
    w.openCategoryModal = jest.fn();
    const button = w.document.querySelector('[data-action="openCategoryModal"]');
    button.dispatchEvent(new w.KeyboardEvent('keyup', { key: 'Tab', bubbles: true }));
    expect(w.openCategoryModal).not.toHaveBeenCalled();
    button.click(); expect(w.openCategoryModal).toHaveBeenCalledTimes(1);
  });
  test('category cards activate once with Enter and Space, without native-button duplication', async () => {
    const w = open(); w.selectCategory = jest.fn();
    const card = w.document.createElement('div'); card.dataset.action = 'selectCategory'; card.dataset.categoryId = 'sample'; card.setAttribute('role', 'button');
    w.document.body.append(card);
    card.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    card.dispatchEvent(new w.KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(w.selectCategory).toHaveBeenCalledTimes(2);
  });
  test('Escape outside the confirmation dialog preserves an unfinished inquiry', async () => {
    const w = open('contact.html'); await pause();
    const input = w.document.querySelector('[name="firstName"]'); input.value = 'Unsent draft';
    w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(input.value).toBe('Unsent draft');
  });
  test('admin dialog traps focus, closes with Escape and returns to its opener', async () => {
    const w = open('admin-dashboard.html'); await pause();
    const button = w.document.querySelector('[data-action="openCategoryModal"]'); button.focus(); button.click(); await pause();
    const modal = w.document.getElementById('category-modal');
    expect(modal.getAttribute('role')).toBe('dialog');
    expect(modal.contains(w.document.activeElement)).toBe(true);
    w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await pause();
    expect(modal.classList.contains('hidden')).toBe(true); expect(w.document.activeElement).toBe(button);
  });
  test('simultaneous identical inquiries use one ID and one pending write', async () => {
    const w = open(); const writes = []; let finish;
    w.firebaseServices.db.collection('quotes').doc = id => ({ set: data => { writes.push({ id, data }); return new Promise(resolve => { finish = resolve; }); } });
    const quote = { customerName: 'Private name', email: 'private@example.test', message: 'Private message' };
    const first = w.DataManager.saveQuote(quote); const second = w.DataManager.saveQuote(quote);
    for (let i = 0; i < 20 && !finish; i++) await pause();
    expect(writes.length).toBe(1); finish(); await Promise.all([first, second]);
    expect(quote.createdAt).toBeUndefined();
    const stored = JSON.stringify(Object.entries(w.sessionStorage));
    expect(stored).not.toContain('Private'); expect(stored).not.toContain('private@example');
  });
  test('failed acknowledgement reuses exact payload after reload; edited inquiry gets a different ID', async () => {
    const w = open(); const seen = [];
    w.firebaseServices.db.collection('quotes').doc = id => ({ set: data => { seen.push({ id, data }); return Promise.reject(new Error('connection lost')); } });
    const quote = { customerName: 'Sample', email: 'sample@example.test', message: 'Original' };
    await expect(w.DataManager.saveQuote(quote)).rejects.toThrow();
    const receipts = Object.entries(w.sessionStorage); dom.window.close();
    const next = open(); receipts.forEach(([key,value]) => next.sessionStorage.setItem(key,value));
    next.firebaseServices.db.collection('quotes').doc = id => ({ set: data => { seen.push({ id, data }); return Promise.resolve(); } });
    await next.DataManager.saveQuote(quote); await next.DataManager.saveQuote({ ...quote, message: 'Edited' });
    expect(seen[1]).toEqual(seen[0]); expect(seen[2].id).not.toBe(seen[0].id);
  });
  test('a catalogue change cannot duplicate an unchanged inquiry retry', async () => {
    const w = open(); const writes = [];
    w.firebaseServices.db.collection('quotes').doc = id => ({ set: data => { writes.push({id,data}); return writes.length === 1 ? Promise.reject(new Error('lost acknowledgement')) : Promise.resolve(); } });
    const quote = { customerName:'Sample', email:'sample@example.test', message:'Same draft', productId:'p1', product:{id:'p1',name:'Cotton',code:'C1',price:100} };
    await expect(w.DataManager.saveQuote(quote)).rejects.toThrow();
    await w.DataManager.saveQuote({...quote,product:{...quote.product,name:'Renamed cotton',price:110}});
    expect(writes[1]).toEqual(writes[0]);
  });
  test('late acknowledgement remains retryable after the usual cooldown', async () => {
    const w = open(); const writes = []; let finish;
    const realSetTimeout = w.setTimeout.bind(w);
    w.setTimeout = (fn,ms) => realSetTimeout(fn, ms === 5000 ? 10 : ms);
    w.firebaseServices.db.collection('quotes').doc = id => ({set:data=>{writes.push({id,data});return new Promise(resolve=>{finish=resolve;});}});
    const quote = {customerName:'Sample',email:'sample@example.test',message:'Slow inquiry'};
    await expect(w.DataManager.saveQuote(quote)).rejects.toMatchObject({code:'inquiry/pending'});
    finish(); await pause();
    const dateNow = w.Date.now; w.Date.now = () => dateNow() + 31000;
    await w.DataManager.saveQuote(quote);
    expect(writes).toHaveLength(1);
  });
  test('backup maps that resemble special Firestore values retain every field', () => {
    const w = open('admin-dashboard.html');
    const value={office:{latitude:12.3,longitude:77.4,label:'Head Office'},document:{path:'products/p1',firestore:{label:'Plain map'}}};
    const encoded=w.AdminDataTools.encode(value);
    expect(w.AdminDataTools.decode(encoded,w.firebaseServices.db)).toEqual(value);
  });
  test('certificate metadata failure never deletes the underlying file', async () => {
    const w = open('admin-dashboard.html'); await pause();
    const storageDelete = jest.fn(); w.eval('storage = { refFromURL: () => ({ delete: window.__storageDelete }) }'); w.__storageDelete = storageDelete;
    w.firebaseServices.db.collection('certificates').doc = () => ({ delete: () => Promise.reject(new Error('failed')) });
    await expect(w.DataManager.deleteCertificate('sample')).rejects.toThrow('failed');
    expect(storageDelete).not.toHaveBeenCalled();
  });
  test('About certificates honor empty server results and ignore malformed caches', async () => {
    const w = open('about.html'); await pause();
    w.localStorage.setItem('certificates',JSON.stringify([{name:'Previously removed certificate',url:'https://example.test/deleted.pdf'}]));
    await w.loadCertificates();
    expect(w.document.getElementById('certificates-container').textContent).not.toContain('Previously removed certificate');
    w.firebaseServices.db = null;
    for (const value of ['{}','[null]','{']) { w.localStorage.setItem('certificates',value); await expect(w.loadCertificates()).resolves.toBeUndefined(); }
  });

  test('accessible founder-image controls follow existing settings Edit and Cancel mode', async () => {
    const w = open('admin-dashboard.html'); await pause();
    const ids=['setting-user-image-file','setting-home-image-file'];
    ids.forEach(id=>expect(w.document.getElementById(id).disabled).toBe(true));
    w.enterSettingsEditMode();
    ids.forEach(id=>expect(w.document.getElementById(id).disabled).toBe(false));
    w.exitSettingsEditMode(false);
    ids.forEach(id=>expect(w.document.getElementById(id).disabled).toBe(true));
  });
  test('visitor reads preserve saved records and never invent new visitors', async () => {
    const w = open('admin-dashboard.html'); await pause();
    w.localStorage.removeItem('visitors'); expect(w.DataManager.getVisitors()).toEqual([]); expect(w.localStorage.getItem('visitors')).toBeNull();
    const saved = [{ date:'2026-01-01', count:17, pages:{ home:17 } }]; w.localStorage.setItem('visitors', JSON.stringify(saved));
    expect(w.DataManager.getVisitors()).toEqual(saved);
  });
  test('inquiry details expose the saved subject and message as text', async () => {
    const w = open('admin-dashboard.html'); await pause();
    w.firebaseServices.db.collection('quotes').store = { sample: { customerName:'Sample', subject:'technical', message:'<img src=x onerror=alert(1)>', quantity:'3 kg', product:{name:'Cotton'} } };
    await w.renderQuotes();
    const table = w.document.getElementById('quotes-table');
    expect(table.textContent).toContain('technical'); expect(table.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(table.querySelector('img')).toBeNull(); expect(table.textContent).toContain('3 kg'); expect(table.textContent).not.toContain('3 kgm');
  });
});
