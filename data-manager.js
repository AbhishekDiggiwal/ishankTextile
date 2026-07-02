const fallbackCategories = [
  { id: '1', name: 'Vat-Dyed Fabrics', description: 'Molecular-level color integrity with 24-hour freshness shield', startingPrice: null, clothing: 'Suiting', active: true },
  { id: '2', name: 'Fiber-Dyed Fabrics', description: 'Advanced fiber-dyeing technology with superior color fastness', startingPrice: null, clothing: 'Suiting', active: true },
  { id: '3', name: 'Wollen Fabrics', description: 'High-quality woolen fabric with excellent thermal properties', startingPrice: null, clothing: 'Suiting', active: true },
  { id: '4', name: 'Hosiery Fabrics', description: 'Premium hosiery fabric with superior elasticity and comfort', startingPrice: null, clothing: 'Shirting', active: true },
  { id: '5', name: 'Cotton Fabrics', description: 'Premium cotton fabric with natural breathability and comfort', startingPrice: null, clothing: 'Shirting', active: true }
];

const fallbackProducts = [
  { id: '1', code: 'VD-001', name: 'Vat-Dyed Premium Fabric', categoryId: '1', description: 'Molecular-level color integrity with 24-hour freshness shield. Perfect for high-end uniform applications.', priceType: 'Price', startingPrice: null, priceMin: null, priceMax: null, priceUnit: 'm', clothing: 'Suiting', gsm: 240, blend: '65% Polyester, 35% Viscose', weave: 'Twill / Ripstop', premium: true, image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=1000', active: true },
  { id: '2', code: 'FD-001', name: 'Fiber-Dyed Advanced Fabric', categoryId: '2', description: 'Advanced fiber-dyeing technology with superior color fastness and durability.', priceType: 'Price', startingPrice: null, priceMin: null, priceMax: null, priceUnit: 'm', clothing: 'Suiting', gsm: 285, blend: '80% Polyester, 20% Viscose', weave: 'Poly-Viscose', premium: true, image: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=1000', active: true },
  { id: '3', code: 'WL-001', name: 'Premium Wollen Fabric', categoryId: '3', description: 'Thermal comfort and formal finish for winter uniforms and corporate wear.', priceType: 'Range', startingPrice: null, priceMin: null, priceMax: null, priceUnit: 'm', clothing: 'Suiting', gsm: 320, blend: '70% Wool, 30% Polyester', weave: 'Wool Blend', premium: false, image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=1000', active: true },
  { id: '4', code: 'HS-001', name: 'Premium Hosiery Fabric', categoryId: '4', description: 'Elastic, breathable hosiery fabric suited for medical and hospitality applications.', priceType: 'Price', startingPrice: null, priceMin: null, priceMax: null, priceUnit: 'm', clothing: 'Shirting', gsm: 210, blend: '95% Cotton, 5% Spandex', weave: 'Knitted', premium: false, image: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=1000', active: true },
  { id: '5', code: 'CT-001', name: 'Premium Cotton Fabric', categoryId: '5', description: 'Natural breathability and soft hand-feel for daily uniforms and casual workwear.', priceType: 'Range', startingPrice: null, priceMin: null, priceMax: null, priceUnit: 'm', clothing: 'Shirting', gsm: 180, blend: '100% Cotton', weave: 'Cotton Twill', premium: false, image: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=1000', active: true }
];

const DataManager = {
  getDefaultSettings() {
    return {
      companyName: 'Ishank Textile',
      contactEmail: 'sunilpandiya909@gmail.com',
      contactPhone: '+91 94141 12197',
      showCategoryPrices: true,
      showProductPrices: true
    };
  },

  async getCategories() {
    try {
      const db = window.firebaseServices && window.firebaseServices.db;
      if (db) {
        const snapshot = await Promise.race([
          db.collection('categories').get(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore read timeout')), 3000))
        ]);
        const categories = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        if (categories.length) return categories;
      }
    } catch (error) { console.warn('Using fallback categories (Firestore failed or timed out):', error); }
    return JSON.parse(localStorage.getItem('categories') || JSON.stringify(fallbackCategories));
  },

  async getProducts() {
    try {
      const db = window.firebaseServices && window.firebaseServices.db;
      if (db) {
        const snapshot = await Promise.race([
          db.collection('products').get(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore read timeout')), 3000))
        ]);
        const products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        if (products.length) return products;
      }
    } catch (error) { console.warn('Using fallback products (Firestore failed or timed out):', error); }
    return JSON.parse(localStorage.getItem('products') || JSON.stringify(fallbackProducts));
  },

  async saveQuote(quote) {
    quote.createdAt = new Date().toISOString();
    try {
      const db = window.firebaseServices && window.firebaseServices.db;
      if (db) {
        await Promise.race([
          db.collection('quotes').add(quote),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore write timeout')), 3000))
        ]);
        return;
      }
    } catch (error) { console.warn('Saving quote locally (Firestore failed or timed out):', error); }
    const quotes = JSON.parse(localStorage.getItem('quotes') || '[]');
    quotes.unshift(Object.assign({ id: Date.now().toString() }, quote));
    localStorage.setItem('quotes', JSON.stringify(quotes));
  },

  async getSettings() {
    const defaults = this.getDefaultSettings();
    try {
      const db = window.firebaseServices && window.firebaseServices.db;
      if (db) {
        const doc = await Promise.race([
          db.collection('settings').doc('general').get(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore read timeout')), 3000))
        ]);
        if (doc.exists) return Object.assign({}, defaults, doc.data());
      }
    } catch (error) { console.warn('Using fallback settings (Firestore failed or timed out):', error); }
    return Object.assign({}, defaults, JSON.parse(localStorage.getItem('settings') || '{}'));
  }
};

if (typeof window !== 'undefined') {
  window.DataManager = DataManager;
}
