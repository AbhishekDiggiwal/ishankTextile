        const escapeHtml = SecurityUtils.escapeHtml;

        // Global Error and Promise Rejection Handlers for easy debugging
        window.addEventListener('error', function(event) {
            console.error('Global Error caught:', event.error);
            const msg = event.message || event.error?.message || 'Unknown runtime error';
            if (typeof showToast === 'function') {
                showToast(`Error: ${msg}`, 'error');
            } else {
                alert(`Error: ${msg}`);
            }
        });
        window.addEventListener('unhandledrejection', function(event) {
            console.error('Unhandled Promise Rejection:', event.reason);
            const msg = event.reason?.message || event.reason || 'Unhandled promise rejection';
            if (typeof showToast === 'function') {
                showToast(`Promise Error: ${msg}`, 'error');
            } else {
                alert(`Promise Error: ${msg}`);
            }
        });

        // Helper toggles for price type
        function togglePriceFields() {
            const selectedType = document.querySelector('input[name="product-price-type"]:checked').value;
            const singleCard = document.getElementById('price-type-single-card');
            const rangeCard = document.getElementById('price-type-range-card');
            const singleContainer = document.getElementById('product-single-price-container');
            const rangeContainer = document.getElementById('product-range-price-container');
            const priceInput = document.getElementById('product-price');
            const minInput = document.getElementById('product-price-min');
            const maxInput = document.getElementById('product-price-max');

            if (selectedType === 'Price') {
                singleCard.className = 'p-3 border-2 rounded-xl text-center font-medium border-brand-orange bg-brand-orange/5 text-brand-orange transition-colors';
                rangeCard.className = 'p-3 border-2 rounded-xl text-center font-medium border-gray-200 text-gray-600 hover:border-gray-300 transition-colors';
                singleContainer.classList.remove('hidden');
                rangeContainer.classList.add('hidden');
                priceInput.required = false;
                minInput.required = false;
                maxInput.required = false;
            } else {
                singleCard.className = 'p-3 border-2 rounded-xl text-center font-medium border-gray-200 text-gray-600 hover:border-gray-300 transition-colors';
                rangeCard.className = 'p-3 border-2 rounded-xl text-center font-medium border-brand-orange bg-brand-orange/5 text-brand-orange transition-colors';
                singleContainer.classList.add('hidden');
                rangeContainer.classList.remove('hidden');
                priceInput.required = false;
                minInput.required = false;
                maxInput.required = false;
            }
        }

        // Helper toggles for price unit
        function togglePriceUnitFields() {
            const selectedUnit = document.querySelector('input[name="product-price-unit"]:checked').value;
            const mCard = document.getElementById('price-unit-m-card');
            const kgCard = document.getElementById('price-unit-kg-card');

            if (selectedUnit === 'm') {
                mCard.className = 'p-3 border-2 rounded-xl text-center font-medium border-brand-orange bg-brand-orange/5 text-brand-orange transition-colors';
                kgCard.className = 'p-3 border-2 rounded-xl text-center font-medium border-gray-200 text-gray-600 hover:border-gray-300 transition-colors';
            } else {
                mCard.className = 'p-3 border-2 rounded-xl text-center font-medium border-gray-200 text-gray-600 hover:border-gray-300 transition-colors';
                kgCard.className = 'p-3 border-2 rounded-xl text-center font-medium border-brand-orange bg-brand-orange/5 text-brand-orange transition-colors';
            }
        }

        // Firestore Data Management
        const DataManager = {
            // Initialize with default data if collections are empty
            async init() {
                if (!db) {
                    const defaultSettings = this.getDefaultSettings();
                    // Seed localStorage if empty
                    if (!localStorage.getItem('categories')) {
                        localStorage.setItem('categories', JSON.stringify(this.getDefaultCategories()));
                    }
                    if (!localStorage.getItem('products')) {
                        localStorage.setItem('products', JSON.stringify(this.getDefaultProducts()));
                    }
                    if (!localStorage.getItem('quotes')) {
                        localStorage.setItem('quotes', JSON.stringify(this.getDefaultQuotes()));
                    }
                    if (!localStorage.getItem('settings')) {
                        localStorage.setItem('settings', JSON.stringify(defaultSettings));
                    } else {
                        localStorage.setItem('settings', JSON.stringify({ ...defaultSettings, ...JSON.parse(localStorage.getItem('settings') || '{}') }));
                    }
                    return;
                }
                // Check if categories exist
                const categoriesSnapshot = await db.collection('categories').get();
                if (categoriesSnapshot.empty) {
                    const defaultCategories = this.getDefaultCategories();
                    for (const category of defaultCategories) {
                        await db.collection('categories').doc(category.id).set(category);
                    }
                }

                // Check if products exist
                const productsSnapshot = await db.collection('products').get();
                if (productsSnapshot.empty) {
                    const defaultProducts = this.getDefaultProducts();
                    for (const product of defaultProducts) {
                        await db.collection('products').doc(product.id).set(product);
                    }
                }

                // Check if quotes exist
                const quotesSnapshot = await db.collection('quotes').get();
                if (quotesSnapshot.empty) {
                    const defaultQuotes = this.getDefaultQuotes();
                    for (const quote of defaultQuotes) {
                        await db.collection('quotes').add(quote);
                    }
                }

                // Check if settings exist
                const settingsDoc = await db.collection('settings').doc('general').get();
                if (!settingsDoc.exists) {
                    await db.collection('settings').doc('general').set(this.getDefaultSettings());
                } else {
                    const existingSettings = settingsDoc.data() || {};
                    const missingSettings = Object.entries(this.getDefaultSettings()).reduce((missing, [key, value]) => {
                        if (!(key in existingSettings)) missing[key] = value;
                        return missing;
                    }, {});
                    if (Object.keys(missingSettings).length) {
                        await db.collection('settings').doc('general').set(missingSettings, { merge: true });
                    }
                }
            },

            // Categories
            async getCategories() {
                if (!db) {
                    return JSON.parse(localStorage.getItem('categories') || JSON.stringify(this.getDefaultCategories()));
                }
                const snapshot = await db.collection('categories').get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            },
            async addCategory(category) {
                const id = Date.now().toString();
                category.id = id;
                category.createdAt = new Date().toISOString();
                if (!db) {
                    const categories = await this.getCategories();
                    categories.push(category);
                    localStorage.setItem('categories', JSON.stringify(categories));
                    return category;
                }
                await db.collection('categories').doc(id).set(category);
                return category;
            },
            async updateCategory(id, updates) {
                if (!db) {
                    const categories = await this.getCategories();
                    const index = categories.findIndex(c => c.id === id);
                    if (index !== -1) {
                        categories[index] = { ...categories[index], ...updates };
                        localStorage.setItem('categories', JSON.stringify(categories));
                        return categories[index];
                    }
                    return null;
                }
                await db.collection('categories').doc(id).update(updates);
                const doc = await db.collection('categories').doc(id).get();
                return { id: doc.id, ...doc.data() };
            },
            async deleteCategory(id) {
                if (!db) {
                    const categories = await this.getCategories();
                    const updated = categories.filter(c => c.id !== id);
                    localStorage.setItem('categories', JSON.stringify(updated));
                    return;
                }
                await db.collection('categories').doc(id).delete();
            },

            // Products
            async getProducts() {
                if (!db) {
                    return JSON.parse(localStorage.getItem('products') || JSON.stringify(this.getDefaultProducts()));
                }
                const snapshot = await db.collection('products').get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            },
            async addProduct(product) {
                const id = Date.now().toString();
                product.id = id;
                product.createdAt = new Date().toISOString();
                if (!db) {
                    const products = await this.getProducts();
                    products.push(product);
                    localStorage.setItem('products', JSON.stringify(products));
                    return product;
                }
                await db.collection('products').doc(id).set(product);
                return product;
            },
            async updateProduct(id, updates) {
                if (!db) {
                    const products = await this.getProducts();
                    const index = products.findIndex(p => p.id === id);
                    if (index !== -1) {
                        products[index] = { ...products[index], ...updates };
                        localStorage.setItem('products', JSON.stringify(products));
                        return products[index];
                    }
                    return null;
                }
                await db.collection('products').doc(id).update(updates);
                const doc = await db.collection('products').doc(id).get();
                return { id: doc.id, ...doc.data() };
            },
            async deleteProduct(id) {
                if (!db) {
                    const products = await this.getProducts();
                    const updated = products.filter(p => p.id !== id);
                    localStorage.setItem('products', JSON.stringify(updated));
                    return;
                }
                await db.collection('products').doc(id).delete();
            },

            // Quotes
            async getQuotes() {
                if (!db) {
                    const quotes = JSON.parse(localStorage.getItem('quotes') || JSON.stringify(this.getDefaultQuotes()));
                    return quotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                }
                const snapshot = await db.collection('quotes').orderBy('createdAt', 'desc').get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            },
            async addQuote(quote) {
                quote.createdAt = new Date().toISOString();
                if (!db) {
                    const quotes = await this.getQuotes();
                    quote.id = Date.now().toString();
                    quotes.unshift(quote);
                    localStorage.setItem('quotes', JSON.stringify(quotes));
                    return quote;
                }
                const docRef = await db.collection('quotes').add(quote);
                return { id: docRef.id, ...quote };
            },

            // Visitors (kept in localStorage for simplicity - not critical)
            getVisitors() {
                let visitors = JSON.parse(localStorage.getItem('visitors') || '[]');
                if (visitors.length === 0) {
                    visitors = this.generateSampleVisitors();
                    this.setVisitors(visitors);
                }
                return visitors;
            },
            setVisitors(visitors) {
                localStorage.setItem('visitors', JSON.stringify(visitors));
            },
            recordVisit(page = 'home') {
                const visitors = this.getVisitors();
                const today = new Date().toISOString().split('T')[0];
                const existing = visitors.find(v => v.date === today);

                if (existing) {
                    existing.count++;
                    existing.pages[page] = (existing.pages[page] || 0) + 1;
                } else {
                    visitors.push({
                        date: today,
                        count: 1,
                        pages: { [page]: 1 }
                    });
                }
                this.setVisitors(visitors);
            },

            // Settings
            getDefaultSettings() {
                return {
                    companyName: 'Ishank Textile',
                    contactEmail: 'sunilpandiya909@gmail.com',
                    contactPhone: '+91 94141 12197',
                    showCategoryPrices: true,
                    showProductPrices: true
                };
            },
            async getSettings() {
                const defaults = this.getDefaultSettings();
                if (!db) {
                    return { ...defaults, ...JSON.parse(localStorage.getItem('settings') || '{}') };
                }
                const doc = await db.collection('settings').doc('general').get();
                return doc.exists ? { ...defaults, ...doc.data() } : defaults;
            },
            async setSettings(settings) {
                const defaults = this.getDefaultSettings();
                if (!db) {
                    const currentSettings = JSON.parse(localStorage.getItem('settings') || '{}');
                    const mergedSettings = { ...defaults, ...currentSettings, ...settings };
                    localStorage.setItem('settings', JSON.stringify(mergedSettings));
                    return;
                }
                const currentDoc = await db.collection('settings').doc('general').get();
                const currentSettings = currentDoc.exists ? currentDoc.data() : {};
                const mergedSettings = { ...defaults, ...currentSettings, ...settings };
                await db.collection('settings').doc('general').set(mergedSettings, { merge: true });
            },

            // Image Upload to Firebase Storage
            async uploadImage(file) {
                SecurityUtils.validateFile(file, {
                    maxBytes: 5 * 1024 * 1024,
                    allowedTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
                    allowedExtensions: ['png', 'jpg', 'jpeg', 'gif', 'webp']
                });
                if (!storage) {
                    return await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.onerror = (err) => reject(err);
                        reader.readAsDataURL(file);
                    });
                }
                try {
                    const filename = `images/${Date.now()}_${SecurityUtils.safeFilename(file.name)}`;
                    const ref = storage.ref(filename);

                    // Set a timeout of 30 seconds on the upload to allow larger files to upload
                    await Promise.race([
                        ref.put(file),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Storage upload timed out')), 30000))
                    ]);

                    return await ref.getDownloadURL();
                } catch (storageError) {
                    console.error('Firebase Storage image upload failed:', storageError);
                    throw new Error('Secure image upload failed. Please try again.');
                }
            },

            // Certificates
            async getCertificates() {
                if (!db) {
                    return JSON.parse(localStorage.getItem('certificates') || JSON.stringify([
                        { id: 'cert_1', name: 'Export License', icon: 'verified', url: '', filename: 'default', uploadedAt: new Date().toISOString() },
                        { id: 'cert_2', name: 'GST Compliance', icon: 'account_balance', url: '', filename: 'default', uploadedAt: new Date().toISOString() },
                        { id: 'cert_3', name: 'Import-Export License', icon: 'public', url: '', filename: 'default', uploadedAt: new Date().toISOString() },
                        { id: 'cert_4', name: 'Environmental', icon: 'eco', url: '', filename: 'default', uploadedAt: new Date().toISOString() }
                    ]));
                }
                const snapshot = await db.collection('certificates').get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            },
            async uploadCertificate(file, name, icon) {
                const certificateTypes = {
                    pdf: 'application/pdf',
                    png: 'image/png',
                    jpg: 'image/jpeg',
                    jpeg: 'image/jpeg',
                    gif: 'image/gif',
                    webp: 'image/webp',
                    doc: 'application/msword',
                    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                };
                const certificateExtension = SecurityUtils.safeFilename(file.name).split('.').pop().toLowerCase();
                SecurityUtils.validateFile(file, {
                    maxBytes: 5 * 1024 * 1024,
                    allowedExtensions: Object.keys(certificateTypes)
                });
                let url = '';
                if (!storage) {
                    url = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.onerror = (err) => reject(err);
                        reader.readAsDataURL(file);
                    });
                } else {
                    try {
                        const filename = `certificates/${SecurityUtils.safeFilename(name)}_${Date.now()}_${SecurityUtils.safeFilename(file.name)}`;
                        const ref = storage.ref(filename);

                        // Set a timeout of 30 seconds on the upload to allow larger files to upload
                        await Promise.race([
                            ref.put(file, { contentType: certificateTypes[certificateExtension] }),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('Storage upload timed out')), 30000))
                        ]);

                        url = await ref.getDownloadURL();
                    } catch (storageError) {
                        console.error('Firebase Storage certificate upload failed:', storageError);
                        throw new Error('Secure certificate upload failed. Please try again.');
                    }
                }

                // Save to Firestore
                const certData = {
                    name,
                    icon,
                    url,
                    filename: SecurityUtils.safeFilename(file.name),
                    uploadedAt: new Date().toISOString()
                };

                if (!db) {
                    const certificates = await this.getCertificates();
                    const existingIndex = certificates.findIndex(c => c.name === name);
                    if (existingIndex !== -1) {
                        certData.id = certificates[existingIndex].id;
                        certificates[existingIndex] = certData;
                    } else {
                        certData.id = Date.now().toString();
                        certificates.push(certData);
                    }
                    localStorage.setItem('certificates', JSON.stringify(certificates));
                    return certData;
                }

                // Check if certificate of this name already exists
                const existing = await db.collection('certificates').where('name', '==', name).get();
                if (!existing.empty) {
                    // Update existing
                    const docId = existing.docs[0].id;
                    await db.collection('certificates').doc(docId).update(certData);
                    return { id: docId, ...certData };
                } else {
                    // Create new
                    const docRef = await db.collection('certificates').add(certData);
                    return { id: docRef.id, ...certData };
                }
            },
            async deleteCertificate(id) {
                if (!db) {
                    const certificates = await this.getCertificates();
                    const updated = certificates.filter(c => c.id !== id);
                    localStorage.setItem('certificates', JSON.stringify(updated));
                    return;
                }
                try {
                    // Fetch document first to get the Storage URL
                    const doc = await db.collection('certificates').doc(id).get();
                    if (doc.exists) {
                        const data = doc.data();
                        const url = data.url;
                        let isFirebaseStorageUrl = typeof url === 'string' && url.startsWith('gs://');
                        if (!isFirebaseStorageUrl && typeof url === 'string') {
                            try {
                                const parsedStorageUrl = new URL(url);
                                isFirebaseStorageUrl = parsedStorageUrl.protocol === 'https:' &&
                                    (parsedStorageUrl.hostname === 'firebasestorage.googleapis.com' ||
                                     parsedStorageUrl.hostname.endsWith('.firebasestorage.app'));
                            } catch (_) {
                                isFirebaseStorageUrl = false;
                            }
                        }
                        // Delete only Firebase Storage objects; embedded offline data is never sent to Storage.
                        if (isFirebaseStorageUrl && storage) {
                            try {
                                const ref = storage.refFromURL(url);
                                await ref.delete();
                                console.log('Successfully deleted certificate file from Firebase Storage bucket');
                            } catch (storageError) {
                                console.warn('Could not delete file from Firebase Storage (it may have been deleted already):', storageError);
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error during certificate file deletion from storage:', err);
                }
                // Always delete the Firestore document database entry
                await db.collection('certificates').doc(id).delete();
            },

            // Default Data
            getDefaultCategories() {
                return [
                    {
                        id: '1',
                        name: 'Vat-Dyed Fabrics',
                        description: 'Molecular-level color integrity with 24-hour freshness shield',
                        startingPrice: null,
                        clothing: 'Suiting',
                        image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800',
                        active: true,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: '2',
                        name: 'Fiber-Dyed Fabrics',
                        description: 'Advanced fiber-dyeing technology with superior color fastness',
                        startingPrice: null,
                        clothing: 'Suiting',
                        image: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=800',
                        active: true,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: '3',
                        name: 'Wollen Fabrics',
                        description: 'High-quality woolen fabric with excellent thermal properties',
                        startingPrice: null,
                        clothing: 'Suiting',
                        image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800',
                        active: true,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: '4',
                        name: 'Hosiery Fabrics',
                        description: 'Premium hosiery fabric with superior elasticity and comfort',
                        startingPrice: null,
                        clothing: 'Shirting',
                        image: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=800',
                        active: true,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: '5',
                        name: 'Cotton Fabrics',
                        description: 'Premium cotton fabric with natural breathability and comfort',
                        startingPrice: null,
                        clothing: 'Shirting',
                        image: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=800',
                        active: true,
                        createdAt: new Date().toISOString()
                    }
                ];
            },

            getDefaultProducts() {
                return [
                    {
                        id: '1',
                        code: 'VD-001',
                        name: 'Vat-Dyed Premium Fabric',
                        categoryId: '1',
                        description: 'Molecular-level color integrity with 24-hour freshness shield. Perfect for high-end uniform applications.',
                        priceType: 'Price',
                        startingPrice: null,
                        priceMin: null,
                        priceMax: null,
                        priceUnit: 'm',
                        clothing: 'Suiting',
                        gsm: 240,
                        blend: '65% Polyester, 35% Viscose',
                        weave: 'Twill / Ripstop',
                        premium: true,
                        image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800',
                        active: true,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: '2',
                        code: 'FD-001',
                        name: 'Fiber-Dyed Advanced Fabric',
                        categoryId: '2',
                        description: 'Advanced fiber-dyeing technology with superior color fastness and durability.',
                        priceType: 'Range',
                        startingPrice: null,
                        priceMin: null,
                        priceMax: null,
                        priceUnit: 'm',
                        clothing: 'Suiting',
                        gsm: 285,
                        blend: '80% Polyester, 20% Viscose',
                        weave: 'Poly-Viscose',
                        premium: true,
                        image: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=800',
                        active: true,
                        createdAt: new Date().toISOString()
                    }
                ];
            },

            getDefaultQuotes() {
                const quotes = [];
                const customers = [
                    { name: 'Arjun Mehta', email: 'arjun.mehta@example.com', phone: '+91 98765 43210' },
                    { name: 'Priya Sharma', email: 'priya.sharma@example.com', phone: '+91 91234 56789' },
                    { name: 'Rohan Gupta', email: 'rohan.gupta@example.com', phone: '+91 99887 76655' },
                    { name: 'Ananya Iyer', email: 'ananya.iyer@example.com', phone: '+91 98761 23456' },
                    { name: 'Vikram Singh', email: 'vikram.singh@example.com', phone: '+91 94567 12345' },
                    { name: 'Neha Patel', email: 'neha.patel@example.com', phone: '+91 93210 98765' }
                ];
                const products = [
                    { id: '1', name: 'Vat-Dyed Premium Fabric', code: 'VD-001' },
                    { id: '2', name: 'Fiber-Dyed Advanced Fabric', code: 'FD-001' }
                ];

                for (let i = 0; i < 15; i++) {
                    const customer = customers[i % customers.length];
                    const product = products[i % products.length];
                    const date = new Date();
                    date.setDate(date.getDate() - Math.floor(Math.random() * 20));
                    date.setHours(Math.floor(Math.random() * 12) + 9, Math.floor(Math.random() * 60));

                    quotes.push({
                        customerName: customer.name,
                        email: customer.email,
                        phone: customer.phone,
                        subject: 'quote',
                        productId: product.id,
                        product: { ...product, price: null },
                        quantity: String(Math.floor(Math.random() * 500) + 100),
                        message: `Interested in dynamic volume ordering. Code: ${product.code}`,
                        whatsappUpdates: false,
                        createdAt: date.toISOString()
                    });
                }
                return quotes;
            },

            generateSampleVisitors() {
                const visitors = [];
                for (let i = 180; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const productsVisits = Math.floor(Math.random() * 25) + 10;

                    const v1 = Math.floor(productsVisits * (Math.random() * 0.6 + 0.2));
                    const v2 = productsVisits - v1;

                    visitors.push({
                        date: date.toISOString().split('T')[0],
                        count: Math.floor(Math.random() * 80) + 40,
                        pages: {
                            home: Math.floor(Math.random() * 30) + 15,
                            products: productsVisits,
                            about: Math.floor(Math.random() * 15) + 5,
                            contact: Math.floor(Math.random() * 10) + 3
                        },
                        fabrics: {
                            '1': v1,
                            '2': v2
                        }
                    });
                }
                return visitors;
            }
        };
        window.DataManager = DataManager;
        // Toast Notifications
        function showToast(message, type = 'success') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast flex items-center space-x-3 px-6 py-4 rounded-lg shadow-lg ${
                type === 'success' ? 'bg-green-500 text-white' :
                type === 'error' ? 'bg-red-500 text-white' :
                'bg-blue-500 text-white'
            }`;
            const icon = document.createElement('i');
            icon.className = `fas ${
                type === 'success' ? 'fa-check-circle' :
                type === 'error' ? 'fa-exclamation-circle' :
                'fa-info-circle'
            }`;
            const text = document.createElement('span');
            text.textContent = String(message || '');
            toast.append(icon, text);
            container.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        function updatePriceToggleButton(buttonId, showPrices) {
            const button = document.getElementById(buttonId);
            if (!button) return;

            const icon = button.querySelector('.material-symbols-outlined');
            const label = button.querySelector('span:last-child');
            if (icon) icon.textContent = showPrices ? 'visibility_off' : 'visibility';
            if (label) label.textContent = showPrices ? 'Hide Prices' : 'Show Prices';

            button.className = showPrices
                ? 'border border-primary bg-primary/10 text-primary px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 hover:bg-primary/15'
                : 'border border-outline-variant text-on-surface px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 hover:border-primary hover:text-primary';
        }

        async function updatePriceVisibilityToggles() {
            const settings = await DataManager.getSettings();
            updatePriceToggleButton('category-price-toggle', settings.showCategoryPrices !== false);
            updatePriceToggleButton('product-price-toggle', settings.showProductPrices !== false);
        }

        async function toggleCategoryPriceVisibility() {
            const settings = await DataManager.getSettings();
            const showCategoryPrices = settings.showCategoryPrices === false;
            await DataManager.setSettings({ ...settings, showCategoryPrices });
            await updatePriceVisibilityToggles();
            showToast(`Category card prices ${showCategoryPrices ? 'shown' : 'hidden'}`);
        }

        async function toggleProductPriceVisibility() {
            const settings = await DataManager.getSettings();
            const showProductPrices = settings.showProductPrices === false;
            await DataManager.setSettings({ ...settings, showProductPrices });
            await updatePriceVisibilityToggles();
            showToast(`Fabric card prices ${showProductPrices ? 'shown' : 'hidden'}`);
        }

        // Section Navigation
        async function showSection(section, event) {
            // Prevent default anchor navigation
            if (event) event.preventDefault();
            const allowedSections = new Set([
                'dashboard', 'categories', 'products', 'visitors', 'quotes',
                'certificates', 'settings'
            ]);
            if (!allowedSections.has(section)) return;

            // Hide all sections
            document.querySelectorAll('main > div > section').forEach(s => s.classList.add('hidden'));

            // Show selected section
            document.getElementById(`${section}-section`).classList.remove('hidden');

            // Update sidebar
            document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
            const sidebarItem = event && event.target ? event.target.closest('.sidebar-item') : document.querySelector(`.sidebar-item[href="#${section}"]`);
            if (sidebarItem) sidebarItem.classList.add('active');

            // Update page title
            const titles = {
                dashboard: 'Dashboard',
                categories: 'Product Categories',
                products: 'Products',
                visitors: 'Visitors Analytics',
                quotes: 'Quote Requests',
                certificates: 'Business Documents',
                settings: 'Settings'
            };
            document.getElementById('page-title').textContent = titles[section];

            // Refresh data
            if (section === 'dashboard') {
                await updateKPIs();
                await updateCharts();
            } else if (section === 'categories') {
                await renderCategories();
            } else if (section === 'products') {
                await renderProducts();
                await updateProductCategoryOptions();
            } else if (section === 'quotes') {
                await renderQuotes();
            } else if (section === 'visitors') {
                updateVisitorDetailChart();
                renderTopPages();
                await updateTopVisitedFabrics();
            } else if (section === 'certificates') {
                await renderCertificates();
                await renderPolicies();
            }
        }

        // KPI Updates
        async function updateKPIs() {
            const visitors = DataManager.getVisitors();
            const quotes = await DataManager.getQuotes();
            const categories = await DataManager.getCategories();
            const products = await DataManager.getProducts();

            const today = new Date().toISOString().split('T')[0];
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

            const todayVisitors = visitors.find(v => v.date === today)?.count || 0;
            const yesterdayVisitors = visitors.find(v => v.date === yesterday)?.count || 1;
            const todayQuotes = quotes.filter(q => q.createdAt?.startsWith(today)).length;
            const yesterdayQuotes = quotes.filter(q => q.createdAt?.startsWith(yesterday)).length || 1;

            document.getElementById('kpi-visitors-today').textContent = todayVisitors;
            document.getElementById('kpi-quotes-today').textContent = todayQuotes;
            document.getElementById('kpi-categories').textContent = categories.filter(c => c.active).length;
            document.getElementById('kpi-products').textContent = products.filter(p => p.active).length;

            const visitorChange = ((todayVisitors - yesterdayVisitors) / yesterdayVisitors * 100).toFixed(1);
            const quoteChange = ((todayQuotes - yesterdayQuotes) / yesterdayQuotes * 100).toFixed(1);

            document.getElementById('kpi-visitors-change').textContent = `${Math.abs(visitorChange)}%`;
            document.getElementById('kpi-quotes-change').textContent = `${Math.abs(quoteChange)}%`;
        }

        // Charts
        let visitorsChart, quotesChart, mostRequestedChart, visitorsDetailChart, topFabricsChart;

        async function updateCharts() {
            updateVisitorChart();
            await updateQuoteChart();
            await updateMostRequestedChart();
        }

        function updateVisitorChart() {
            const ctx = document.getElementById('visitorsChart').getContext('2d');
            const visitors = DataManager.getVisitors();
            const days = parseInt(document.getElementById('visitor-chart-period').value) || 7;

            const labels = visitors.slice(-days).map(v => {
                const date = new Date(v.date);
                return date.toLocaleDateString('en-US', { weekday: 'short' });
            });
            const data = visitors.slice(-days).map(v => v.count);

            if (visitorsChart) visitorsChart.destroy();

            visitorsChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Visitors',
                        data,
                        borderColor: '#f97316',
                        backgroundColor: 'rgba(249, 115, 22, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                boxWidth: 12,
                                font: { size: 11, family: 'Rubik' }
                            }
                        }
                    },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        async function updateQuoteChart() {
            const ctx = document.getElementById('quotesChart').getContext('2d');
            const quotes = await DataManager.getQuotes();
            const days = parseInt(document.getElementById('quote-chart-period').value) || 7;

            const dateMap = {};
            for (let i = days - 1; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                dateMap[date.toISOString().split('T')[0]] = 0;
            }

            quotes.forEach(q => {
                const date = q.createdAt?.split('T')[0];
                if (dateMap.hasOwnProperty(date)) {
                    dateMap[date]++;
                }
            });

            const labels = Object.keys(dateMap).map(d => {
                const date = new Date(d);
                return date.toLocaleDateString('en-US', { weekday: 'short' });
            });
            const data = Object.values(dateMap);

            if (quotesChart) quotesChart.destroy();

            quotesChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Quotes',
                        data,
                        backgroundColor: '#2563eb',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                boxWidth: 12,
                                font: { size: 11, family: 'Rubik' }
                            }
                        }
                    },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        async function updateMostRequestedChart() {
            const ctx = document.getElementById('mostRequestedChart').getContext('2d');
            const quotes = await DataManager.getQuotes();
            const days = parseInt(document.getElementById('requested-chart-period').value) || 7;
            const products = await DataManager.getProducts();

            // Filter quotes by time period
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            const filteredQuotes = quotes.filter(q => {
                const quoteDate = new Date(q.createdAt);
                return quoteDate >= cutoffDate;
            });

            // Count requests per product
            const productRequests = {};
            filteredQuotes.forEach(q => {
                const productId = q.productId || q.product?.id;
                if (productId) {
                    productRequests[productId] = (productRequests[productId] || 0) + 1;
                }
            });

            // Sort by request count and get top 5
            const sortedProducts = Object.entries(productRequests)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            // Get product names
            const labels = sortedProducts.map(([id]) => {
                const product = products.find(p => p.id === id);
                return product ? (product.name.length > 15 ? product.name.substring(0, 15) + '...' : product.name) : 'Unknown';
            });

            const data = sortedProducts.map(([_, count]) => count);

            if (mostRequestedChart) mostRequestedChart.destroy();

            // Use horizontal bar chart for better readability
            mostRequestedChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Quote Requests',
                        data,
                        backgroundColor: ['#f97316', '#2563eb', '#10b981', '#6b7280', '#f59e0b'],
                        borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                boxWidth: 12,
                                font: { size: 11, family: 'Rubik' }
                            }
                        }
                    },
                    scales: {
                        x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                        y: { grid: { display: false } }
                    }
                }
            });
        }

        function readNumberOrNull(inputId) {
            const value = document.getElementById(inputId).value;
            if (value === null || value === undefined || String(value).trim() === '') return null;
            const parsed = parseFloat(value);
            return Number.isFinite(parsed) ? parsed : null;
        }

        function hasNumberValue(value) {
            return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
        }

        function formatMoney(value) {
            return hasNumberValue(value) ? '&#8377;' + Number(value) : '-';
        }

        function formatCategoryAdminPrice(category) {
            return formatMoney(category.startingPrice);
        }

        function formatProductAdminPrice(product) {
            const unit = product.priceUnit === 'kg' ? 'kg' : 'm';
            if (product.priceType === 'Range') {
                if (!hasNumberValue(product.priceMin) || !hasNumberValue(product.priceMax)) return '-';
                return '&#8377;' + Number(product.priceMin) + ' - &#8377;' + Number(product.priceMax) + '/' + unit;
            }
            const price = hasNumberValue(product.startingPrice) ? product.startingPrice : product.price;
            return hasNumberValue(price) ? '&#8377;' + Number(price) + '/' + unit : '-';
        }

        // Categories Management
        async function renderCategories(filteredCategories = null) {
            const categories = filteredCategories || await DataManager.getCategories();
            const products = await DataManager.getProducts();
            const tbody = document.getElementById('categories-table');

            tbody.innerHTML = categories.map(cat => {
                const productCount = products.filter(p => p.categoryId === cat.id).length;
                return `
                    <tr class="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td class="py-3 px-4">
                            <img src="${escapeHtml(SecurityUtils.safeImageUrl(cat.image, 'logo.png'))}" alt="${escapeHtml(cat.name)}" class="w-12 h-12 rounded-lg object-cover">
                        </td>
                        <td class="py-3 px-4 font-medium text-dark-gray">${escapeHtml(cat.name)}</td>
                        <td class="py-3 px-4 text-gray-600 text-sm max-w-xs truncate">${escapeHtml(cat.description || '-')}</td>
                        <td class="py-3 px-4 text-brand-orange font-semibold">${formatCategoryAdminPrice(cat)}</td>
                        <td class="py-3 px-4">${productCount}</td>
                        <td class="py-3 px-4">${escapeHtml(cat.clothing || '-')}</td>
                        <td class="py-3 px-4">
                            <div class="flex items-center space-x-2">
                                <button data-record-id="${escapeHtml(cat.id)}" data-action="toggleCategoryStatus" class="${cat.active ? 'text-green-500 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}" title="${cat.active ? 'Deactivate' : 'Activate'}">
                                    <i class="fas ${cat.active ? 'fa-toggle-on text-xl' : 'fa-toggle-off text-xl'}"></i>
                                </button>
                                <button data-record-id="${escapeHtml(cat.id)}" data-action="editCategory" class="text-blue-500 hover:text-blue-700" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button data-record-id="${escapeHtml(cat.id)}" data-action="deleteCategory" class="text-red-500 hover:text-red-700" title="Delete">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        async function openCategoryModal(categoryId = null) {
            const modal = document.getElementById('category-modal');
            const form = document.getElementById('category-form');
            const title = document.getElementById('category-modal-title');

            if (categoryId) {
                const categories = await DataManager.getCategories();
                const category = categories.find(c => c.id === categoryId);
                if (category) {
                    title.textContent = 'Edit Category';
                    document.getElementById('category-id').value = category.id;
                    document.getElementById('category-name').value = category.name;
                    document.getElementById('category-description').value = category.description || '';
                    document.getElementById('category-starting-price').value = category.startingPrice ?? '';
                    document.getElementById('category-clothing').value = category.clothing || 'Suiting';
                    document.getElementById('category-active').checked = category.active;
                }
            } else {
                title.textContent = 'Add Category';
                form.reset();
                document.getElementById('category-id').value = '';
                document.getElementById('category-clothing').value = 'Suiting';
            }

            modal.classList.remove('hidden');
        }

        function closeCategoryModal() {
            document.getElementById('category-modal').classList.add('hidden');
        }

        function editCategory(id) {
            openCategoryModal(id);
        }

        async function toggleCategoryStatus(id) {
            const categories = await DataManager.getCategories();
            const category = categories.find(c => c.id === id);
            if (category) {
                const newStatus = !category.active;
                await DataManager.updateCategory(id, { active: newStatus });
                await renderCategories();
                showToast(`Category ${newStatus ? 'activated' : 'deactivated'} successfully`);
            }
        }

        async function deleteCategory(id) {
            if (confirm('Are you sure you want to delete this category? All associated products will also be affected.')) {
                await DataManager.deleteCategory(id);
                await renderCategories();
                showToast('Category deleted successfully');
            }
        }

        async function filterCategories() {
            const status = document.getElementById('category-filter-status').value;
            const search = document.getElementById('category-search').value.toLowerCase();
            let categories = await DataManager.getCategories();

            if (status) {
                categories = categories.filter(c => c.active === (status === 'active'));
            }
            if (search) {
                categories = categories.filter(c =>
                    c.name.toLowerCase().includes(search) ||
                    (c.description && c.description.toLowerCase().includes(search))
                );
            }
            await renderCategories(categories);
        }

        // Products Management
        async function renderProducts(filteredProducts = null) {
            const products = filteredProducts || await DataManager.getProducts();
            const categories = await DataManager.getCategories();
            const tbody = document.getElementById('products-table');

            tbody.innerHTML = products.map(prod => {
                const category = categories.find(c => c.id === prod.categoryId);
                return `
                    <tr class="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td class="py-3 px-4">
                            <img src="${escapeHtml(SecurityUtils.safeImageUrl(prod.image, 'logo.png'))}" alt="${escapeHtml(prod.name)}" class="w-12 h-12 rounded-lg object-cover">
                        </td>
                        <td class="py-3 px-4 font-mono text-sm text-gray-600">${escapeHtml(prod.code)}</td>
                        <td class="py-3 px-4 font-medium text-dark-gray">${escapeHtml(prod.name)}</td>
                        <td class="py-3 px-4 text-gray-600">${escapeHtml(category?.name || 'Uncategorized')}</td>
                        <td class="py-3 px-4 text-brand-orange font-semibold">${formatProductAdminPrice(prod)}</td>
                        <td class="py-3 px-4 text-gray-600">${escapeHtml(!prod.gsm || Number(prod.gsm) <= 0 ? '-' : Number(prod.gsm))}</td>
                        <td class="py-3 px-4 text-gray-600">${escapeHtml(prod.blend || '-')}</td>
                        <td class="py-3 px-4 text-gray-600">${escapeHtml(prod.clothing || '-')}</td>
                        <td class="py-3 px-4">
                            <div class="flex items-center space-x-2">
                                <button data-record-id="${escapeHtml(prod.id)}" data-action="toggleProductStatus" class="${prod.active ? 'text-green-500 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}" title="${prod.active ? 'Deactivate' : 'Activate'}">
                                    <i class="fas ${prod.active ? 'fa-toggle-on text-xl' : 'fa-toggle-off text-xl'}"></i>
                                </button>
                                <button data-record-id="${escapeHtml(prod.id)}" data-action="editProduct" class="text-blue-500 hover:text-blue-700" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button data-record-id="${escapeHtml(prod.id)}" data-action="deleteProduct" class="text-red-500 hover:text-red-700" title="Delete">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        async function updateProductCategoryOptions() {
            const allCategories = await DataManager.getCategories();
            const categories = allCategories.filter(c => c.active);
            const selects = ['product-category', 'product-filter-category'];

            selects.forEach(selectId => {
                const select = document.getElementById(selectId);
                const currentValue = select.value;
                select.innerHTML = selectId === 'product-filter-category'
                    ? '<option value="">All Categories</option>'
                    : '<option value="">Select Category</option>';

                categories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = String(cat.id || '');
                    option.textContent = String(cat.name || '');
                    select.appendChild(option);
                });

                select.value = currentValue;
            });
        }

        async function filterProducts() {
            const categoryId = document.getElementById('product-filter-category').value;
            const status = document.getElementById('product-filter-status').value;

            let products = await DataManager.getProducts();

            if (categoryId) {
                products = products.filter(p => p.categoryId === categoryId);
            }

            if (status) {
                products = products.filter(p => p.active === (status === 'active'));
            }

            renderProducts(products);
        }

        async function searchProducts() {
            const search = document.getElementById('product-search').value.toLowerCase();
            const allProducts = await DataManager.getProducts();
            const products = allProducts.filter(p =>
                p.name.toLowerCase().includes(search) ||
                p.code.toLowerCase().includes(search) ||
                p.description.toLowerCase().includes(search)
            );
            await renderProducts(products);
        }

        async function openProductModal(productId = null) {
            const modal = document.getElementById('product-modal');
            const form = document.getElementById('product-form');
            const title = document.getElementById('product-modal-title');

            await updateProductCategoryOptions();

            if (productId) {
                const products = await DataManager.getProducts();
                const product = products.find(p => p.id === productId);
                if (product) {
                    title.textContent = 'Edit Product';
                    document.getElementById('product-id').value = product.id;
                    document.getElementById('product-code').value = product.code;
                    document.getElementById('product-name').value = product.name;
                    document.getElementById('product-category').value = product.categoryId;
                    document.getElementById('product-description').value = product.description || '';
                    document.getElementById('product-gsm').value = product.gsm || '';
                    document.getElementById('product-blend').value = product.blend || '';
                    document.getElementById('product-weave').value = product.weave || '';
                    document.getElementById('product-clothing').value = product.clothing || 'Suiting';

                    const priceType = product.priceType === 'Range' ? 'Range' : 'Price';
                    const priceUnit = product.priceUnit === 'kg' ? 'kg' : 'm';

                    document.querySelector(`input[name="product-price-type"][value="${priceType}"]`).checked = true;
                    togglePriceFields();

                    document.getElementById('product-price').value = product.startingPrice ?? '';
                    document.getElementById('product-price-min').value = product.priceMin ?? '';
                    document.getElementById('product-price-max').value = product.priceMax ?? '';

                    document.querySelector(`input[name="product-price-unit"][value="${priceUnit}"]`).checked = true;
                    togglePriceUnitFields();

                    document.getElementById('product-premium').checked = !!product.premium;
                    document.getElementById('product-active').checked = product.active;
                }
            } else {
                title.textContent = 'Add Product';
                form.reset();
                document.getElementById('product-id').value = '';
                document.getElementById('product-clothing').value = 'Suiting';
                document.querySelector('input[name="product-price-type"][value="Price"]').checked = true;
                document.querySelector('input[name="product-price-unit"][value="m"]').checked = true;
                togglePriceFields();
                togglePriceUnitFields();
                document.getElementById('product-premium').checked = false;
            }

            modal.classList.remove('hidden');
        }

        function closeProductModal() {
            document.getElementById('product-modal').classList.add('hidden');
        }

        async function editProduct(id) {
            await openProductModal(id);
        }

        async function toggleProductStatus(id) {
            const products = await DataManager.getProducts();
            const product = products.find(p => p.id === id);
            if (product) {
                const newStatus = !product.active;
                await DataManager.updateProduct(id, { active: newStatus });
                await renderProducts();
                showToast(`Product ${newStatus ? 'activated' : 'deactivated'} successfully`);
            }
        }

        async function deleteProduct(id) {
            if (confirm('Are you sure you want to delete this product?')) {
                await DataManager.deleteProduct(id);
                await renderProducts();
                showToast('Product deleted successfully');
            }
        }

        // Quotes
        async function renderQuotes() {
            const quotes = await DataManager.getQuotes();
            const tbody = document.getElementById('quotes-table');
            const recentTbody = document.getElementById('recent-quotes-table');

            const renderRow = (quote, isRecent = false) => {
                // Get product info - can be from quote.product object or legacy format
                const productName = quote.product?.name || quote.productName || (quote.productId ? 'Unknown Product' : 'N/A');
                const productCode = quote.product?.code || '';
                const dateStr = quote.createdAt ? SecurityUtils.toDate(quote.createdAt).toLocaleDateString() : 'N/A';
                const qtyStr = quote.quantity ? `${quote.quantity}m` : 'N/A';

                if (isRecent) {
                    return `
                    <tr class="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td class="px-6 py-4 font-medium text-dark-gray">${escapeHtml(quote.customerName || 'N/A')}</td>
                        <td class="px-6 py-4 text-gray-600">${escapeHtml(quote.email || '-')}</td>
                        <td class="px-6 py-4 text-gray-600">
                            ${productName !== 'N/A' ? `
                                <div class="flex items-center space-x-2">
                                    <span class="text-xs bg-brand-orange/10 text-brand-orange px-2 py-1 rounded">${escapeHtml(productCode || 'N/A')}</span>
                                    <span>${escapeHtml(productName)}</span>
                                </div>
                            ` : '<span class="text-gray-400">No product selected</span>'}
                        </td>
                        <td class="px-6 py-4 text-gray-600 font-medium">${escapeHtml(qtyStr)}</td>
                        <td class="px-6 py-4 text-gray-600">${escapeHtml(dateStr)}</td>
                    </tr>
                    `;
                } else {
                    return `
                    <tr class="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td class="py-3 px-4 font-mono text-sm">${escapeHtml(quote.id ? String(quote.id).slice(-6).toUpperCase() : 'N/A')}</td>
                        <td class="py-3 px-4 font-medium text-dark-gray">${escapeHtml(quote.customerName || 'N/A')}</td>
                        <td class="py-3 px-4 text-gray-600">${escapeHtml(quote.email || '-')}</td>
                        <td class="py-3 px-4 text-gray-600">${escapeHtml(quote.phone || '-')}</td>
                        <td class="py-3 px-4 text-gray-600">
                            ${productName !== 'N/A' ? `
                                <div class="flex items-center space-x-2">
                                    <span class="text-xs bg-brand-orange/10 text-brand-orange px-2 py-1 rounded">${escapeHtml(productCode || 'N/A')}</span>
                                    <span>${escapeHtml(productName)}</span>
                                </div>
                            ` : '<span class="text-gray-400">No product selected</span>'}
                        </td>
                        <td class="py-3 px-4 text-gray-600 font-medium">${escapeHtml(qtyStr)}</td>
                        <td class="py-3 px-4 text-gray-600">${escapeHtml(dateStr)}</td>
                    </tr>
                    `;
                }
            };

            tbody.innerHTML = quotes.map(q => renderRow(q)).join('');
            recentTbody.innerHTML = quotes.slice(0, 5).map(q => renderRow(q, true)).join('');
        }

        // Visitors Detail
        function updateVisitorDetailChart() {
            const ctx = document.getElementById('visitorsDetailChart').getContext('2d');
            const visitors = DataManager.getVisitors();

            if (visitorsDetailChart) visitorsDetailChart.destroy();

            visitorsDetailChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: visitors.map(v => new Date(v.date).toLocaleDateString()),
                    datasets: [{
                        label: 'Total Visitors',
                        data: visitors.map(v => v.count),
                        borderColor: '#f97316',
                        backgroundColor: 'rgba(249, 115, 22, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                boxWidth: 12,
                                font: { size: 11, family: 'Rubik' }
                            }
                        }
                    },
                    scales: {
                        y: { beginAtZero: true },
                        x: { display: false }
                    }
                }
            });
        }

        function renderTopPages() {
            const visitors = DataManager.getVisitors();
            const pageStats = {};

            visitors.forEach(v => {
                Object.entries(v.pages || {}).forEach(([page, count]) => {
                    pageStats[page] = (pageStats[page] || 0) + count;
                });
            });

            const sorted = Object.entries(pageStats).sort((a, b) => b[1] - a[1]).slice(0, 5);
            const container = document.getElementById('top-pages-list');

            container.innerHTML = sorted.map(([page, count], index) => `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div class="flex items-center space-x-3">
                        <span class="w-6 h-6 ${index < 3 ? 'bg-brand-orange text-white' : 'bg-gray-200 text-gray-600'} rounded-full flex items-center justify-center text-sm font-bold">
                            ${index + 1}
                        </span>
                        <span class="font-medium capitalize">${escapeHtml(page)}</span>
                    </div>
                    <span class="text-gray-600">${Number(count) || 0} visits</span>
                </div>
            `).join('');
        }

        async function updateTopVisitedFabrics() {
            const ctx = document.getElementById('topFabricsChart').getContext('2d');
            const visitors = DataManager.getVisitors();
            const products = await DataManager.getProducts();
            const days = parseInt(document.getElementById('fabric-visit-period').value) || 30;

            // Filter visitors by the selected days period
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            const cutoffStr = cutoffDate.toISOString().split('T')[0];

            const filteredVisitors = visitors.filter(v => v.date >= cutoffStr);

            // Sum up fabric visits
            const fabricVisits = {};
            filteredVisitors.forEach(v => {
                Object.entries(v.fabrics || {}).forEach(([productId, count]) => {
                    fabricVisits[productId] = (fabricVisits[productId] || 0) + count;
                });
            });

            // If no data exists, we can seed some local mock so the user doesn't see an empty page
            if (Object.keys(fabricVisits).length === 0) {
                products.forEach((p, idx) => {
                    fabricVisits[p.id] = Math.floor(Math.random() * 50) + 10 + (3 - idx) * 15;
                });
            }

            // Sort products by visits
            const sortedFabrics = Object.entries(fabricVisits)
                .sort((a, b) => b[1] - a[1]);

            // Update Top Fabric KPI Card
            const topFabricKpiName = document.getElementById('top-fabric-kpi-name');
            const topFabricKpiCode = document.getElementById('top-fabric-kpi-code');
            const topFabricKpiViews = document.getElementById('top-fabric-kpi-views');

            if (sortedFabrics.length > 0) {
                const [topId, topCount] = sortedFabrics[0];
                const topProduct = products.find(p => p.id === topId);
                if (topProduct) {
                    topFabricKpiName.textContent = topProduct.name;
                    topFabricKpiCode.textContent = topProduct.code || 'B2B Fabric';
                    topFabricKpiViews.textContent = `${topCount} views`;
                } else {
                    topFabricKpiName.textContent = 'Standard Premium Fabric';
                    topFabricKpiCode.textContent = 'FAB-PREM';
                    topFabricKpiViews.textContent = `${topCount} views`;
                }
            } else {
                topFabricKpiName.textContent = 'No Data Available';
                topFabricKpiCode.textContent = '-';
                topFabricKpiViews.textContent = '0 views';
            }

            // Prepare graph data
            const topLimit = 5;
            const topSorted = sortedFabrics.slice(0, topLimit);

            const labels = topSorted.map(([id]) => {
                const product = products.find(p => p.id === id);
                return product ? (product.name.length > 18 ? product.name.substring(0, 18) + '...' : product.name) : 'Premium Fabric';
            });

            const data = topSorted.map(([_, count]) => count);

            if (topFabricsChart) topFabricsChart.destroy();

            topFabricsChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Page Views',
                        data,
                        backgroundColor: '#f97316',
                        borderRadius: 6,
                        maxBarThickness: 32
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                boxWidth: 12,
                                font: { size: 11, family: 'Rubik' }
                            }
                        }
                    },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // Certificate Management
        async function renderCertificates() {
            const certificates = await DataManager.getCertificates();
            const container = document.getElementById('certificates-list-container');
            if (!container) return;

            container.innerHTML = '';

            if (certificates.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full py-8 text-center text-gray-500">
                        <span class="material-symbols-outlined text-4xl block mb-2">workspace_premium</span>
                        <p class="text-sm">No business certificates uploaded yet. Click "Upload Certificate" to add one.</p>
                    </div>
                `;
                return;
            }

            certificates.forEach(cert => {
                // Map icon to badge background colors
                const allowedIcons = ['verified', 'account_balance', 'public', 'eco', 'workspace_premium'];
                const safeIcon = allowedIcons.includes(cert.icon) ? cert.icon : 'workspace_premium';
                const safeDocumentUrl = SecurityUtils.safeDocumentUrl(cert.url);
                const safeName = String(cert.name || 'Certificate');
                const safeFilename = SecurityUtils.safeFilename(cert.filename || 'document');
                let badgeColor = 'bg-primary/10 text-primary';
                if (safeIcon === 'account_balance') badgeColor = 'bg-brand-orange/10 text-brand-orange';
                else if (safeIcon === 'public') badgeColor = 'bg-accent-blue/10 text-accent-blue';
                else if (safeIcon === 'eco') badgeColor = 'bg-accent-green/10 text-accent-green';

                const cardHtml = `
                    <div class="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow bg-white flex flex-col justify-between h-full">
                        <div>
                            <div class="flex items-start justify-between mb-4">
                                <div class="flex items-center space-x-3 min-w-0 w-full">
                                    <div class="w-12 h-12 ${badgeColor} rounded-xl flex items-center justify-center flex-shrink-0">
                                        <span class="material-symbols-outlined text-2xl" style="font-variation-settings: 'FILL' 1;">${safeIcon}</span>
                                    </div>
                                    <div class="min-w-0 flex-grow">
                                        <h4 class="font-bold text-dark-gray text-base leading-tight truncate" title="${escapeHtml(safeName)}">${escapeHtml(safeName)}</h4>
                                        <p class="text-xs text-gray-400 mt-1 truncate" title="${escapeHtml(safeFilename)}">${escapeHtml(safeFilename)}</p>
                                    </div>
                                </div>
                            </div>
                            <div class="text-xs text-gray-500 mb-4 flex items-center gap-1">
                                <span class="material-symbols-outlined text-sm">calendar_month</span>
                                <span>Uploaded on: ${escapeHtml(SecurityUtils.toDate(cert.uploadedAt).toLocaleDateString())}</span>
                            </div>
                        </div>
                        <div class="flex gap-2 pt-3 border-t border-gray-100">
                            <button data-document-url="${escapeHtml(safeDocumentUrl)}" data-document-name="${escapeHtml(safeName)}" data-action="viewDocument" ${safeDocumentUrl ? '' : 'disabled'} class="flex-1 bg-gray-100 hover:bg-gray-200 text-dark-gray font-semibold py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-1 disabled:opacity-40 disabled:pointer-events-none" title="View Document">
                                <span class="material-symbols-outlined text-sm">visibility</span>
                                <span>View</span>
                            </button>
                            <a ${safeDocumentUrl ? `href="${escapeHtml(safeDocumentUrl)}"` : ''} target="_blank" rel="noopener noreferrer" download="${escapeHtml(safeFilename)}" class="flex-1 bg-gray-100 hover:bg-gray-200 text-dark-gray font-semibold py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-1 ${safeDocumentUrl ? '' : 'opacity-40 pointer-events-none'}" title="Download Document">
                                <span class="material-symbols-outlined text-sm">download</span>
                                <span>Download</span>
                            </a>
                            <button data-record-id="${escapeHtml(cert.id)}" data-action="deleteCertificate" class="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition-colors flex items-center justify-center" title="Delete">
                                <span class="material-symbols-outlined text-sm">delete</span>
                            </button>
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', cardHtml);
            });
        }

        function openCertificateModal() {
            const modal = document.getElementById('certificate-modal');
            if (modal) {
                document.getElementById('certificate-form').reset();
                const previewContainer = document.getElementById('certificate-file-preview');
                if (previewContainer) {
                    previewContainer.classList.add('hidden');
                }
                modal.classList.remove('hidden');
            }
        }

        function closeCertificateModal() {
            const modal = document.getElementById('certificate-modal');
            if (modal) {
                modal.classList.add('hidden');
                const previewContainer = document.getElementById('certificate-file-preview');
                if (previewContainer) {
                    previewContainer.classList.add('hidden');
                }
            }
        }

        async function deleteCertificate(id) {
            if (confirm('Are you sure you want to delete this certificate?')) {
                await DataManager.deleteCertificate(id);
                await renderCertificates();
                showToast('Certificate deleted successfully');
            }
        }

        // Policy Management
        let currentPolicies = {};

        async function renderPolicies() {
            try {
                const doc = await db.collection('settings').doc('policies').get();
                if (doc.exists) {
                    currentPolicies = doc.data() || {};
                } else {
                    currentPolicies = {};
                }
            } catch (err) {
                console.error('Error fetching policies:', err);
                currentPolicies = {};
            }

            const keys = ['website_terms', 'privacy_policy', 'business_terms'];
            const idMap = {
                website_terms: 'terms',
                privacy_policy: 'privacy',
                business_terms: 'business'
            };

            keys.forEach(key => {
                const policy = currentPolicies[key] || {};
                const shortId = idMap[key];

                document.getElementById(`policy-${shortId}-date`).textContent = policy.updatedAt ? new Date(policy.updatedAt).toLocaleString() : 'Never';
                document.getElementById(`policy-${shortId}-filename`).textContent = policy.filename || 'No file uploaded yet';

                const dlBtn = document.getElementById(`policy-${shortId}-download`);
                if (dlBtn) {
                    const safePolicyUrl = SecurityUtils.safeDocumentUrl(policy.url);
                    if (safePolicyUrl) {
                        dlBtn.href = safePolicyUrl;
                        dlBtn.rel = 'noopener noreferrer';
                        dlBtn.classList.remove('pointer-events-none', 'opacity-40');
                        dlBtn.classList.add('hover:bg-gray-100');
                    } else {
                        dlBtn.removeAttribute('href');
                        dlBtn.classList.add('pointer-events-none', 'opacity-40');
                        dlBtn.classList.remove('hover:bg-gray-100');
                    }
                }
            });
        }

        async function uploadPolicyFile(input, policyKey) {
            const file = input.files[0];
            if (!file) return;

            const ext = file.name.split('.').pop().toLowerCase();
            const supportedExts = ['txt', 'md', 'doc', 'docx'];
            if (!supportedExts.includes(ext)) {
                showToast('Only plain text (.txt, .md) or Word (.doc, .docx) files are supported.', 'error');
                return;
            }
            try {
                SecurityUtils.validateFile(file, {
                    maxBytes: 5 * 1024 * 1024,
                    allowedExtensions: supportedExts
                });
            } catch (validationError) {
                showToast(validationError.message, 'error');
                input.value = '';
                return;
            }

            showToast('Reading and uploading policy file...', 'info');

            let fileUrl = '';
            try {
                if (storage) {
                    const policyTypes = {
                        txt: 'text/plain',
                        md: 'text/markdown',
                        doc: 'application/msword',
                        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    };
                    const filename = `policies/${SecurityUtils.safeFilename(policyKey)}_${Date.now()}_${SecurityUtils.safeFilename(file.name)}`;
                    const ref = storage.ref(filename);
                    await ref.put(file, { contentType: policyTypes[ext] });
                    fileUrl = await ref.getDownloadURL();
                }
            } catch (storageError) {
                console.error('Secure policy upload failed:', storageError);
                showToast('Policy upload failed. Please try again.', 'error');
                input.value = '';
                return;
            }

            const reader = new FileReader();

            if (ext === 'txt' || ext === 'md') {
                reader.onload = async (e) => {
                    const fileText = e.target.result;
                    await savePolicyToDatabase(policyKey, file.name, fileUrl, fileText, false);
                };
                reader.onerror = () => showToast('Failed to read local file.', 'error');
                reader.readAsText(file);
            } else if (ext === 'docx') {
                reader.onload = async (e) => {
                    const arrayBuffer = e.target.result;
                    try {
                        if (typeof mammoth === 'undefined') {
                            await loadMammothScript();
                        }

                        const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
                        const fileHtml = SecurityUtils.sanitizeHtml(result.value || '');

                        await savePolicyToDatabase(policyKey, file.name, fileUrl, fileHtml, false);
                    } catch (mammothError) {
                        console.error('Error parsing docx file with mammoth:', mammothError);
                        await savePolicyToDatabase(policyKey, file.name, fileUrl, '', true);
                    }
                };
                reader.onerror = () => showToast('Failed to read Word file.', 'error');
                reader.readAsArrayBuffer(file);
            } else {
                // For older .doc files, we just upload to storage and mark as isBinaryOnly
                await savePolicyToDatabase(policyKey, file.name, fileUrl, '', true);
            }
        }

        function loadMammothScript() {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'vendor/mammoth/mammoth.browser.min.js';
                script.onload = () => resolve();
                script.onerror = () => reject(new Error('Failed to load mammoth.js from CDN'));
                document.head.appendChild(script);
            });
        }

        async function savePolicyToDatabase(policyKey, filename, fileUrl, text, isBinaryOnly) {
            const policyData = {
                text: SecurityUtils.sanitizeHtml(text),
                filename: SecurityUtils.safeFilename(filename),
                url: SecurityUtils.safeDocumentUrl(fileUrl),
                isBinaryOnly: isBinaryOnly,
                updatedAt: new Date().toISOString()
            };

            try {
                await db.collection('settings').doc('policies').set({
                    [policyKey]: policyData
                }, { merge: true });

                showToast('Policy updated successfully!');
                await renderPolicies();
            } catch (firestoreError) {
                console.error('Error saving policy to firestore:', firestoreError);
                showToast('Failed to save policy to database.', 'error');
            }
        }

        // Data Import/Export
        function exportAllData() {
            const data = {
                categories: DataManager.getCategories(),
                products: DataManager.getProducts(),
                quotes: DataManager.getQuotes(),
                visitors: DataManager.getVisitors(),
                settings: DataManager.getSettings(),
                exportedAt: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ishank-textile-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            showToast('Data exported successfully');
        }

        function importData(input) {
            const file = input.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);

                    if (data.categories) DataManager.setCategories(data.categories);
                    if (data.products) DataManager.setProducts(data.products);
                    if (data.quotes) DataManager.setQuotes(data.quotes);
                    if (data.visitors) DataManager.setVisitors(data.visitors);
                    if (data.settings) DataManager.setSettings(data.settings);

                    showToast('Data imported successfully');
                    updateKPIs();
                    renderCategories();
                    renderProducts();
                } catch (err) {
                    showToast('Error importing data: Invalid file format', 'error');
                }
            };
            reader.readAsText(file);
            input.value = '';
        }

        async function searchCategories() {
            const search = document.getElementById('category-search').value.toLowerCase();
            const allCategories = await DataManager.getCategories();
            const categories = allCategories.filter(c =>
                c.name.toLowerCase().includes(search) ||
                (c.description && c.description.toLowerCase().includes(search))
            );
            await renderCategories(categories);
        }

        async function resetAllData() {
            if (!confirm('WARNING: This will delete ALL database records and reset to defaults. This action cannot be undone. Are you sure?')) {
                return;
            }
            if (!auth || !auth.currentUser) {
                alert('Please sign in again before resetting data.');
                SecurityUtils.navigate('admin-login.html');
                return;
            }

            const password = prompt('Please enter your Admin Password to authorize database reset:');
            if (password === null) return; // User cancelled
            if (!password) {
                alert('Password is required.');
                return;
            }

            try {
                const credential = firebase.auth.EmailAuthProvider.credential(auth.currentUser.email, password);
                await auth.currentUser.reauthenticateWithCredential(credential);

                showToast('Resetting database...');
                const collections = ['categories', 'products', 'quotes', 'certificates'];
                for (const colName of collections) {
                    const snapshot = await db.collection(colName).get();
                    const batch = db.batch();
                    snapshot.docs.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                }

                await DataManager.init();
                showToast('All database records reset to defaults');
                await refreshData();
            } catch (err) {
                console.error("Auth verification failed for reset:", err);
                alert('Authorization failed: Incorrect admin password.');
            }
        }

        // Settings State & Management
        let originalSettings = {
            companyName: 'Ishank Textile',
            contactEmail: 'sunilpandiya909@gmail.com',
            contactPhone: '+91 94141 12197',
            aboutUserImage: '',
            homeUserImage: ''
        };

        // Client-side WebP image conversion
        function convertImageToWebP(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        canvas.toBlob((blob) => {
                            if (blob) {
                                const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                                const webpFile = new File([blob], newFileName, { type: 'image/webp' });
                                resolve(webpFile);
                            } else {
                                reject(new Error('WebP blob creation failed'));
                            }
                        }, 'image/webp', 0.85); // 0.85 quality compression
                    };
                    img.onerror = function(err) {
                        reject(new Error('Image loading failed'));
                    };
                    img.src = e.target.result;
                };
                reader.onerror = function(err) {
                    reject(new Error('File reading failed'));
                };
                reader.readAsDataURL(file);
            });
        }

        async function handleSettingsUserImageUpload(input, type) {
            const file = input.files[0];
            if (!file) return;

            // Validate file type
            if (!file.type.startsWith('image/')) {
                showToast('Please select an image file', 'error');
                return;
            }

            try {
                showToast('Processing image...', 'info');

                // Convert to WebP format
                const webpFile = await convertImageToWebP(file);

                // Validate file size (max 5MB)
                if (webpFile.size > 5 * 1024 * 1024) {
                    showToast('Image size should be less than 5MB', 'error');
                    return;
                }

                showToast('Uploading optimized WebP image...', 'info');
                const imageUrl = await DataManager.uploadImage(webpFile);

                // Store URL and update preview based on type
                if (type === 'home') {
                    document.getElementById('setting-home-image-url').value = imageUrl;
                    document.getElementById('setting-home-image-preview').src = imageUrl;
                } else {
                    document.getElementById('setting-user-image-url').value = imageUrl;
                    document.getElementById('setting-user-image-preview').src = imageUrl;
                }

                // Clear the file input value so same file can be selected again
                input.value = '';

                // Explicitly check for changes to enable Save Changes button
                checkSettingsChanges();

                showToast('Image uploaded successfully');
            } catch (error) {
                console.error('Founder image upload error:', error);
                showToast('Failed to upload image', 'error');
            }
        }

        async function loadSettings() {
            try {
                const settings = await DataManager.getSettings();
                if (settings && Object.keys(settings).length > 0) {
                    originalSettings = {
                        companyName: settings.companyName || '',
                        contactEmail: settings.contactEmail || '',
                        contactPhone: settings.contactPhone || '',
                        aboutUserImage: settings.aboutUserImage || '',
                        homeUserImage: settings.homeUserImage || ''
                    };
                    document.getElementById('setting-company-name').value = originalSettings.companyName;
                    document.getElementById('setting-contact-email').value = originalSettings.contactEmail;
                    document.getElementById('setting-contact-phone').value = originalSettings.contactPhone;
                    document.getElementById('setting-user-image-url').value = originalSettings.aboutUserImage;
                    document.getElementById('setting-home-image-url').value = originalSettings.homeUserImage;

                    const previewAbout = document.getElementById('setting-user-image-preview');
                    if (originalSettings.aboutUserImage) {
                        previewAbout.src = originalSettings.aboutUserImage;
                    } else {
                        previewAbout.src = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAMIv5Ytqq3xAtaDcgx3ujsoghX_n2IrEEAsIIrlwmEcZiKWXzbmUHfbGJLd6aC9ubXXjukl12xxSHiBoESASAqXpAbw_hNlqQ9b5oFDqDU-b_TXEuwuueGvn8Kt2wmdBmnjKd0SAA811axwo08XdoPIW2ZLjHyP4e1HNF382INf-1nY8mdPlXhPQKYHQ37aLntIRLjUD7l9FWFx96kJnln-uttxSQngp4IryWWLAWG_1-UeUuvJV-y7RpIUU1TxUHoOlYRAQjyIXI';
                    }

                    const previewHome = document.getElementById('setting-home-image-preview');
                    if (originalSettings.homeUserImage) {
                        previewHome.src = originalSettings.homeUserImage;
                    } else {
                        previewHome.src = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGwDXOzTC100PVaSnevRzASq7mmzUBNcDc7vVstVNQLg9Qme6gGaDn86uP5eUfHPu4rlvo-7P-e9FWpf5RrdGFEUppfBR2wf2I_WGV201u-VReNnHyajQoWnuwm-4nsGH3fDVJbKmUAj9R7HPT06pvMBK2IwtcvbLfLVY_SJO0MO81D26T1RAgHgtztZWXnu4X_ZXCupDnc3wynkeao7oyvhIeK9pbRJsTPJAWclBFpnOaSkMBN8dKjCnDbXcyaPHfYmtDiCMvVt8';
                    }

                    updatePriceToggleButton('category-price-toggle', settings.showCategoryPrices !== false);
                    updatePriceToggleButton('product-price-toggle', settings.showProductPrices !== false);
                }
            } catch (err) {
                console.error("Error loading settings:", err);
            }
        }

        function enterSettingsEditMode() {
            // Save current input values in originalSettings as a baseline
            originalSettings = {
                companyName: document.getElementById('setting-company-name').value,
                contactEmail: document.getElementById('setting-contact-email').value,
                contactPhone: document.getElementById('setting-contact-phone').value,
                aboutUserImage: document.getElementById('setting-user-image-url').value,
                homeUserImage: document.getElementById('setting-home-image-url').value
            };

            const inputs = ['setting-company-name', 'setting-contact-email', 'setting-contact-phone'];
            inputs.forEach(id => {
                const el = document.getElementById(id);
                el.removeAttribute('readonly');
                el.classList.remove('bg-gray-50', 'text-gray-600', 'cursor-not-allowed');
                el.classList.add('bg-white', 'text-dark-gray');
            });

            // Enable file input buttons
            ['setting-user-image-btn', 'setting-home-image-btn'].forEach(id => {
                const imgBtn = document.getElementById(id);
                imgBtn.removeAttribute('disabled');
                imgBtn.classList.remove('bg-gray-100', 'text-gray-400', 'cursor-not-allowed');
                imgBtn.classList.add('bg-white', 'text-gray-700', 'hover:bg-gray-50', 'border-gray-300', 'cursor-pointer');
            });

            document.getElementById('edit-settings-btn').classList.add('hidden');
            document.getElementById('save-settings-btn').classList.remove('hidden');
            document.getElementById('cancel-settings-btn').classList.remove('hidden');

            // Initially disable save changes until edit happens
            const saveBtn = document.getElementById('save-settings-btn');
            saveBtn.disabled = true;
            saveBtn.className = "bg-brand-orange/50 text-white px-6 py-2 rounded-lg font-medium transition-all cursor-not-allowed";
        }

        function exitSettingsEditMode(isSaved = false) {
            const inputs = ['setting-company-name', 'setting-contact-email', 'setting-contact-phone'];

            if (!isSaved) {
                // Restore original values
                document.getElementById('setting-company-name').value = originalSettings.companyName;
                document.getElementById('setting-contact-email').value = originalSettings.contactEmail;
                document.getElementById('setting-contact-phone').value = originalSettings.contactPhone;
                document.getElementById('setting-user-image-url').value = originalSettings.aboutUserImage;
                document.getElementById('setting-home-image-url').value = originalSettings.homeUserImage;

                const previewAbout = document.getElementById('setting-user-image-preview');
                if (originalSettings.aboutUserImage) {
                    previewAbout.src = originalSettings.aboutUserImage;
                } else {
                    previewAbout.src = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAMIv5Ytqq3xAtaDcgx3ujsoghX_n2IrEEAsIIrlwmEcZiKWXzbmUHfbGJLd6aC9ubXXjukl12xxSHiBoESASAqXpAbw_hNlqQ9b5oFDqDU-b_TXEuwuueGvn8Kt2wmdBmnjKd0SAA811axwo08XdoPIW2ZLjHyP4e1HNF382INf-1nY8mdPlXhPQKYHQ37aLntIRLjUD7l9FWFx96kJnln-uttxSQngp4IryWWLAWG_1-UeUuvJV-y7RpIUU1TxUHoOlYRAQjyIXI';
                }

                const previewHome = document.getElementById('setting-home-image-preview');
                if (originalSettings.homeUserImage) {
                    previewHome.src = originalSettings.homeUserImage;
                } else {
                    previewHome.src = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGwDXOzTC100PVaSnevRzASq7mmzUBNcDc7vVstVNQLg9Qme6gGaDn86uP5eUfHPu4rlvo-7P-e9FWpf5RrdGFEUppfBR2wf2I_WGV201u-VReNnHyajQoWnuwm-4nsGH3fDVJbKmUAj9R7HPT06pvMBK2IwtcvbLfLVY_SJO0MO81D26T1RAgHgtztZWXnu4X_ZXCupDnc3wynkeao7oyvhIeK9pbRJsTPJAWclBFpnOaSkMBN8dKjCnDbXcyaPHfYmtDiCMvVt8';
                }
            }

            inputs.forEach(id => {
                const el = document.getElementById(id);
                el.setAttribute('readonly', true);
                el.classList.add('bg-gray-50', 'text-gray-600', 'cursor-not-allowed');
                el.classList.remove('bg-white', 'text-dark-gray');
            });

            // Disable file input buttons
            ['setting-user-image-btn', 'setting-home-image-btn'].forEach(id => {
                const imgBtn = document.getElementById(id);
                imgBtn.setAttribute('disabled', true);
                imgBtn.classList.remove('bg-white', 'text-gray-700', 'hover:bg-gray-50', 'border-gray-300', 'cursor-pointer');
                imgBtn.classList.add('bg-gray-100', 'text-gray-400', 'cursor-not-allowed');
            });

            document.getElementById('edit-settings-btn').classList.remove('hidden');
            document.getElementById('save-settings-btn').classList.add('hidden');
            document.getElementById('cancel-settings-btn').classList.add('hidden');
        }

        function checkSettingsChanges() {
            const currentName = document.getElementById('setting-company-name').value;
            const currentEmail = document.getElementById('setting-contact-email').value;
            const currentPhone = document.getElementById('setting-contact-phone').value;
            const currentImageUrl = document.getElementById('setting-user-image-url').value;
            const currentHomeImageUrl = document.getElementById('setting-home-image-url').value;

            const hasChanges = currentName !== originalSettings.companyName ||
                               currentEmail !== originalSettings.contactEmail ||
                               currentPhone !== originalSettings.contactPhone ||
                               currentImageUrl !== originalSettings.aboutUserImage ||
                               currentHomeImageUrl !== originalSettings.homeUserImage;

            const saveBtn = document.getElementById('save-settings-btn');
            if (hasChanges) {
                saveBtn.disabled = false;
                saveBtn.className = "bg-brand-orange hover:bg-brand-orange-dark text-white px-6 py-2 rounded-lg font-medium transition-all";
            } else {
                saveBtn.disabled = true;
                saveBtn.className = "bg-brand-orange/50 text-white px-6 py-2 rounded-lg font-medium transition-all cursor-not-allowed";
            }
        }

        // Add event listener to form inputs to enable/disable Save button when changes are made
        const settingsForm = document.getElementById('general-settings-form');
        ['setting-company-name', 'setting-contact-email', 'setting-contact-phone'].forEach(id => {
            document.getElementById(id).addEventListener('input', checkSettingsChanges);
        });

        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const settings = {
                companyName: document.getElementById('setting-company-name').value,
                contactEmail: document.getElementById('setting-contact-email').value,
                contactPhone: document.getElementById('setting-contact-phone').value,
                aboutUserImage: document.getElementById('setting-user-image-url').value,
                homeUserImage: document.getElementById('setting-home-image-url').value
            };

            try {
                await DataManager.setSettings(settings);
                originalSettings = settings;
                exitSettingsEditMode(true);
                showToast('Settings saved successfully');
            } catch (err) {
                console.error("Error saving settings:", err);
                showToast('Error saving settings');
            }
        });

        // Utilities
        async function refreshData() {
            // Find active tab
            let activeSection = 'dashboard';
            const sections = ['dashboard', 'categories', 'products', 'quotes', 'visitors', 'certificates', 'settings'];
            for (const sec of sections) {
                const el = document.getElementById(`${sec}-section`);
                if (el && !el.classList.contains('hidden')) {
                    activeSection = sec;
                    break;
                }
            }

            try {
                showToast(`Refreshing ${activeSection === 'categories' ? 'Product Category' : activeSection} data...`);

                if (activeSection === 'dashboard') {
                    await updateKPIs();
                    await updateCharts();
                    await renderQuotes(); // Recent quotes reside on dashboard card
                } else if (activeSection === 'categories') {
                    await renderCategories();
                } else if (activeSection === 'products') {
                    await renderProducts();
                    await updateProductCategoryOptions();
                } else if (activeSection === 'quotes') {
                    await renderQuotes();
                } else if (activeSection === 'visitors') {
                    updateVisitorDetailChart();
                    renderTopPages();
                } else if (activeSection === 'certificates') {
                    if (typeof renderCertificates === 'function') {
                        await renderCertificates();
                    }
                } else if (activeSection === 'settings') {
                    await loadSettings();
                }

                showToast('Data refreshed');
            } catch (err) {
                console.error("Error refreshing data:", err);
                showToast('Error refreshing data');
            }
        }

        function logout() {
            if (confirm('Are you sure you want to logout?')) {
                SecurityUtils.navigate('index.html');
            }
        }

        function toggleNotifications() {
            showToast('No new notifications');
        }

        async function exportQuotes() {
            const quotes = await DataManager.getQuotes();
            const csv = [
                ['ID', 'Customer', 'Email', 'Phone', 'Product', 'Quantity', 'Date'].join(','),
                ...quotes.map(q => [
                    q.id,
                    q.customerName || '',
                    q.email || '',
                    q.phone || '',
                    q.productName || '',
                    q.quantity || '',
                    new Date(q.createdAt).toLocaleString()
                ].join(','))
            ].join('\n');

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `quotes-export-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }

        // Image Upload Handling
                async function handleCategoryImageUpload(input) {
            const file = input.files[0];
            if (!file) return;

            // Validate file type
            if (!file.type.startsWith('image/')) {
                showToast('Please select an image file', 'error');
                return;
            }

            try {
                showToast('Processing image...', 'info');
                const webpFile = await convertImageToWebP(file);

                // Validate file size (max 5MB)
                if (webpFile.size > 5 * 1024 * 1024) {
                    showToast('Image size should be less than 5MB', 'error');
                    return;
                }

                showToast('Uploading optimized WebP image...', 'info');
                const imageUrl = await DataManager.uploadImage(webpFile);

                // Store in hidden field
                document.getElementById('category-image-data').value = imageUrl;
                document.getElementById('category-image').value = ''; // Clear URL field

                // Show preview
                const preview = document.getElementById('category-image-preview');
                preview.querySelector('img').src = imageUrl;
                preview.classList.remove('hidden');

                showToast('Image uploaded successfully');
            } catch (error) {
                console.error('Image upload error:', error);
                showToast('Failed to upload image', 'error');
            }
        }

                async function handleProductImageUpload(input) {
            const file = input.files[0];
            if (!file) return;

            // Validate file type
            if (!file.type.startsWith('image/')) {
                showToast('Please select an image file', 'error');
                return;
            }

            try {
                showToast('Processing image...', 'info');
                const webpFile = await convertImageToWebP(file);

                // Validate file size (max 5MB)
                if (webpFile.size > 5 * 1024 * 1024) {
                    showToast('Image size should be less than 5MB', 'error');
                    return;
                }

                showToast('Uploading optimized WebP image...', 'info');
                const imageUrl = await DataManager.uploadImage(webpFile);

                // Store in hidden field
                document.getElementById('product-image-data').value = imageUrl;
                document.getElementById('product-image').value = ''; // Clear URL field

                // Show preview
                const preview = document.getElementById('product-image-preview');
                preview.querySelector('img').src = imageUrl;
                preview.classList.remove('hidden');

                showToast('Image uploaded successfully');
            } catch (error) {
                console.error('Image upload error:', error);
                showToast('Failed to upload image', 'error');
            }
        }

        function toggleCategoryImageInput() {
            const urlContainer = document.getElementById('category-image-url-container');
            urlContainer.classList.toggle('hidden');

            if (!urlContainer.classList.contains('hidden')) {
                document.getElementById('category-image').focus();
            }
        }

        function toggleProductImageInput() {
            const urlContainer = document.getElementById('product-image-url-container');
            urlContainer.classList.toggle('hidden');

            if (!urlContainer.classList.contains('hidden')) {
                document.getElementById('product-image').focus();
            }
        }

        function clearCategoryImage() {
            document.getElementById('category-image-data').value = '';
            document.getElementById('category-image').value = '';
            document.getElementById('category-image-file').value = '';
            document.getElementById('category-image-preview').classList.add('hidden');
        }

        function clearProductImage() {
            document.getElementById('product-image-data').value = '';
            document.getElementById('product-image').value = '';
            document.getElementById('product-image-file').value = '';
            document.getElementById('product-image-preview').classList.add('hidden');
        }

        // Override modal open functions to handle image preview
        const originalOpenCategoryModal = openCategoryModal;
        openCategoryModal = async function(categoryId = null) {
            // Clear previous image data
            clearCategoryImage();
            document.getElementById('category-image-url-container').classList.add('hidden');

            if (categoryId) {
                try {
                    const categories = await DataManager.getCategories();
                    const category = categories.find(c => c.id === categoryId);
                    if (category && category.image) {
                        // Check if it's a base64 image or URL
                        if (category.image.startsWith('data:image')) {
                            document.getElementById('category-image-data').value = category.image;
                            const preview = document.getElementById('category-image-preview');
                            preview.querySelector('img').src = SecurityUtils.safeImageUrl(category.image, 'logo.png');
                            preview.classList.remove('hidden');
                        } else {
                            // It's a URL
                            document.getElementById('category-image').value = SecurityUtils.safeImageUrl(category.image);
                            document.getElementById('category-image-url-container').classList.remove('hidden');
                        }
                    }
                } catch (err) {
                    console.error("Error in openCategoryModal override:", err);
                }
            }

            // Call original function
            await originalOpenCategoryModal(categoryId);
        };

        const originalOpenProductModal = openProductModal;
        openProductModal = async function(productId = null) {
            // Clear previous image data
            clearProductImage();
            document.getElementById('product-image-url-container').classList.add('hidden');

            if (productId) {
                try {
                    const products = await DataManager.getProducts();
                    const product = products.find(p => p.id === productId);
                    if (product && product.image) {
                        // Check if it's a base64 image or URL
                        if (product.image.startsWith('data:image')) {
                            document.getElementById('product-image-data').value = product.image;
                            const preview = document.getElementById('product-image-preview');
                            preview.querySelector('img').src = SecurityUtils.safeImageUrl(product.image, 'logo.png');
                            preview.classList.remove('hidden');
                        } else {
                            // It's a URL
                            document.getElementById('product-image').value = SecurityUtils.safeImageUrl(product.image);
                            document.getElementById('product-image-url-container').classList.remove('hidden');
                        }
                    }
                } catch (err) {
                    console.error("Error in openProductModal override:", err);
                }
            }

            // Call original function
            await originalOpenProductModal(productId);
        };

        // Override form submissions to include image data
        document.getElementById('category-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const id = document.getElementById('category-id').value;

            // Get image (prefer uploaded data, then URL, then default)
            let image = document.getElementById('category-image-data').value;
            if (!image) {
                image = document.getElementById('category-image').value;
            }
            image = SecurityUtils.safeImageUrl(
                image,
                'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800'
            );

            const category = {
                name: document.getElementById('category-name').value,
                description: document.getElementById('category-description').value,
                startingPrice: readNumberOrNull('category-starting-price'),
                clothing: document.getElementById('category-clothing').value || 'Suiting',
                image: image,
                active: document.getElementById('category-active').checked
            };

            if (id) {
                await DataManager.updateCategory(id, category);
                showToast('Category updated successfully');
            } else {
                await DataManager.addCategory(category);
                showToast('Category added successfully');
            }

            closeCategoryModal();
            await renderCategories();
            await updateKPIs();
        });

        document.getElementById('product-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const id = document.getElementById('product-id').value;

            // Get image (prefer uploaded data, then URL, then default)
            let image = document.getElementById('product-image-data').value;
            if (!image) {
                image = document.getElementById('product-image').value;
            }
            image = SecurityUtils.safeImageUrl(
                image,
                'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800'
            );

            const selectedPriceType = document.querySelector('input[name="product-price-type"]:checked').value;
            const selectedPriceUnit = document.querySelector('input[name="product-price-unit"]:checked').value;
            const product = {
                code: document.getElementById('product-code').value,
                name: document.getElementById('product-name').value,
                categoryId: document.getElementById('product-category').value,
                description: document.getElementById('product-description').value,
                priceType: selectedPriceType,
                startingPrice: selectedPriceType === 'Price' ? readNumberOrNull('product-price') : null,
                priceMin: selectedPriceType === 'Range' ? readNumberOrNull('product-price-min') : null,
                priceMax: selectedPriceType === 'Range' ? readNumberOrNull('product-price-max') : null,
                priceUnit: selectedPriceUnit,
                clothing: document.getElementById('product-clothing').value || 'Suiting',
                gsm: parseInt(document.getElementById('product-gsm').value) || 0,
                blend: document.getElementById('product-blend').value || '',
                weave: document.getElementById('product-weave').value || '',
                premium: document.getElementById('product-premium').checked,
                image: image,
                active: document.getElementById('product-active').checked
            };

            if (id) {
                await DataManager.updateProduct(id, product);
                showToast('Product updated successfully');
            } else {
                await DataManager.addProduct(product);
                showToast('Product added successfully');
            }

            closeProductModal();
            await renderProducts();
            await updateKPIs();
        });

        // Certificate form submission
        document.getElementById('certificate-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const file = document.getElementById('certificate-file').files[0];
            const name = document.getElementById('certificate-name').value.trim();
            const icon = document.getElementById('certificate-icon').value;

            if (!file) {
                showToast('Please select a file', 'error');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showToast('File size should be less than 5MB', 'error');
                return;
            }

            // Disable submit button and show spinner to prevent multiple clicks
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalBtnHtml = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>Uploading...`;

            try {
                showToast('Uploading certificate...', 'info');
                const result = await DataManager.uploadCertificate(file, name, icon);

                // Explicit size safety check: if Base64 string is too large for Firestore (1MB limit)
                if (result && result.url && result.url.startsWith('data:') && result.url.length > 1000000) {
                    throw new Error('File is too large for database storage. Please compress the file under 700KB, or ensure Firebase Storage is enabled in your console.');
                }

                closeCertificateModal();
                await renderCertificates();
                showToast('Certificate uploaded successfully');
            } catch (error) {
                console.error('Certificate upload error:', error);
                let displayError = error.message || 'Unknown error';
                if (displayError.includes('too large') || displayError.includes('size limit') || displayError.includes('Document parent') || displayError.includes('InvalidArgument')) {
                    displayError = 'File is too large for database fallback. Please compress the PDF/image under 700KB, or ensure Firebase Storage is enabled in your Firebase Console.';
                }
                showToast('Upload failed: ' + displayError, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHtml;
            }
        });

        // Certificate file preview listener
        document.getElementById('certificate-file').addEventListener('change', function() {
            const file = this.files[0];
            const previewContainer = document.getElementById('certificate-file-preview');
            const thumbnailDiv = document.getElementById('cert-preview-thumbnail');
            const filenameP = document.getElementById('cert-preview-filename');
            const filesizeP = document.getElementById('cert-preview-filesize');

            if (!file) {
                if (previewContainer) previewContainer.classList.add('hidden');
                return;
            }

            if (filenameP) filenameP.textContent = file.name;
            if (filesizeP) filesizeP.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

            if (thumbnailDiv) {
                thumbnailDiv.replaceChildren();
                const previewableImages = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
                if (previewableImages.includes(file.type)) {
                    const image = document.createElement('img');
                    const objectUrl = URL.createObjectURL(file);
                    image.src = objectUrl;
                    image.alt = 'Certificate preview';
                    image.className = 'w-full h-full object-cover';
                    image.addEventListener('load', () => URL.revokeObjectURL(objectUrl), { once: true });
                    thumbnailDiv.appendChild(image);
                } else {
                    const icon = document.createElement('span');
                    icon.className = file.type === 'application/pdf'
                        ? 'material-symbols-outlined text-3xl text-red-500'
                        : 'material-symbols-outlined text-3xl text-gray-400';
                    icon.textContent = file.type === 'application/pdf' ? 'picture_as_pdf' : 'description';
                    thumbnailDiv.appendChild(icon);
                }
            }

            if (previewContainer) previewContainer.classList.remove('hidden');
        });

        // Authentication Check — Redirect to login if not signed in
        let dashboardDomReady = document.readyState !== 'loading';
        let verifiedAdminUser = null;
        let dashboardInitialized = false;

        async function initializeDashboardWhenReady() {
            if (!dashboardDomReady || !verifiedAdminUser || dashboardInitialized) return;
            dashboardInitialized = true;
            try {
                await DataManager.init();
                await loadSettings();
                await updateKPIs();
                await updateCharts();
                await renderCategories();
                await renderProducts();
                await renderQuotes();
            } catch (error) {
                dashboardInitialized = false;
                console.error('Dashboard initialization failed:', error);
                showToast('Unable to load the dashboard. Please refresh and try again.', 'error');
            }
        }

        if (auth) {
            auth.onAuthStateChanged(async (user) => {
                const isAdmin = await SecurityUtils.isAdminUser(user, true);
                if (!isAdmin) {
                    if (user) await auth.signOut().catch(() => {});
                    SecurityUtils.navigate('admin-login.html');
                    return;
                }
                verifiedAdminUser = user;
                await initializeDashboardWhenReady();
            });
        } else {
            SecurityUtils.navigate('admin-login.html');
        }

        function logout() {
            if (auth) {
                auth.signOut().then(() => {
                    SecurityUtils.navigate('admin-login.html');
                }).catch(() => {
                    SecurityUtils.navigate('admin-login.html');
                });
            } else {
                SecurityUtils.navigate('admin-login.html');
            }
        }

        // Inline Document Viewer Popup
        function viewDocument(url, name) {
            const modal = document.getElementById('doc-viewer-modal');
            const titleEl = document.getElementById('doc-viewer-title');
            const contentEl = document.getElementById('doc-viewer-content');

            if (!modal || !contentEl) return;

            titleEl.textContent = String(name || 'Document Viewer');
            const safeUrl = SecurityUtils.safeDocumentUrl(url);
            contentEl.replaceChildren();
            if (!safeUrl) {
                showToast('This document URL is not allowed.', 'error');
                return;
            }

            // Determine file type
            const isPdf = safeUrl.startsWith('data:application/pdf') ||
                          /\.pdf(?:$|[?#])/i.test(safeUrl);

            if (isPdf) {
                const frame = document.createElement('iframe');
                frame.src = safeUrl;
                frame.className = 'w-full h-full border-0 rounded-lg bg-white';
                frame.style.minHeight = '65vh';
                frame.title = String(name || 'Document');
                frame.referrerPolicy = 'no-referrer';
                contentEl.appendChild(frame);
            } else {
                const image = document.createElement('img');
                image.src = SecurityUtils.safeImageUrl(safeUrl, 'logo.png');
                image.alt = String(name || 'Document');
                image.className = 'max-w-full max-h-[65vh] object-contain rounded-lg shadow-md';
                contentEl.appendChild(image);
            }

            modal.classList.remove('hidden');
        }

        function closeDocViewer() {
            const modal = document.getElementById('doc-viewer-modal');
            const contentEl = document.getElementById('doc-viewer-content');
            if (contentEl) contentEl.replaceChildren();
            if (modal) modal.classList.add('hidden');
        }

        // Initialize only after both DOM readiness and authorization.
        document.addEventListener('DOMContentLoaded', async () => {
            dashboardDomReady = true;
            await initializeDashboardWhenReady();
        });

        // Close only an explicitly marked modal backdrop. Other fixed UI,
        // including the sidebar, must never be treated as a dismissible modal.
        window.onclick = (e) => {
            const backdrop = e.target;
            if (backdrop instanceof HTMLElement && backdrop.dataset.modalBackdrop === 'true') {
                backdrop.classList.add('hidden');
                if (backdrop.id === 'doc-viewer-modal') {
                    closeDocViewer();
                }
            }
        };
