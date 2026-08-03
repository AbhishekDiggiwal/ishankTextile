  function escapeHtml(value) {
    return SecurityUtils.escapeHtml(value);
  }

  function renderPremiumProductCard(product, index) {
    const price = product.startingPrice || product.price || 0;
    const badgeText = index === 0 ? 'MOST POPULAR' : 'TECHNICAL GRADE';
    const badgeClass = index === 0 ? 'bg-primary text-on-primary' : 'bg-secondary text-on-secondary';
    const btnClass = index === 0
      ? 'w-full py-4 bg-primary text-on-primary font-label-bold text-label-bold uppercase rounded-full hover:brightness-110 transition-all'
      : 'w-full py-4 border-2 border-primary text-primary font-label-bold text-label-bold uppercase rounded-full hover:bg-primary/5 transition-all';

    const revealClass = index % 2 === 0 ? 'product-card-reveal-left' : 'product-card-reveal-right';

    // Format price range or starting price
    const unit = product.priceUnit === 'kg' ? 'kg' : 'm';
    let priceHtml = '';
    if (product.priceType === 'Range') {
      const minimum = Number.isFinite(Number(product.priceMin)) ? Number(product.priceMin) : 0;
      const maximum = Number.isFinite(Number(product.priceMax)) ? Number(product.priceMax) : 0;
      priceHtml = `<span class="whitespace-nowrap">₹${minimum} - ₹${maximum}<span class="text-sm font-normal text-on-surface-variant">/${unit}</span></span>`;
    } else {
      const safePrice = Number.isFinite(Number(price)) ? Number(price) : 0;
      priceHtml = `<span class="text-[10px] text-on-surface-variant font-normal uppercase tracking-wider block text-right leading-none mb-0.5">Starting Price</span>` +
                  `<span class="whitespace-nowrap">₹${safePrice}<span class="text-sm font-normal text-on-surface-variant">/${unit}</span></span>`;
    }

    return `
      <div class="bg-white border border-outline/10 rounded-xl overflow-hidden shadow-sm hover:shadow-2xl transition-all group ${revealClass}">
        <div class="h-64 overflow-hidden relative bg-surface-variant animate-pulse">
          <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" data-remove-loading="true" src="${escapeHtml(SecurityUtils.safeImageUrl(product.image, 'logo.png'))}" alt="${escapeHtml(product.name)}"/>
          <div class="absolute top-4 right-4 ${badgeClass} px-3 py-1 rounded text-xs font-bold">${badgeText}</div>
        </div>
        <div class="p-stack-lg">
          <div class="flex justify-between items-start mb-4">
            <h3 class="font-headline-md text-headline-md text-on-surface">${escapeHtml(product.name)}</h3>
            <span class="font-headline-md text-primary text-right flex flex-col justify-end">${priceHtml}</span>
          </div>
          <div class="grid grid-cols-3 gap-2 mb-6">
            <div class="bg-surface-container p-3 rounded">
              <span class="text-[10px] uppercase block opacity-60">Weave</span>
              <span class="font-label-bold">${escapeHtml(product.weave || 'Premium')}</span>
            </div>
            <div class="bg-surface-container p-3 rounded">
              <span class="text-[10px] uppercase block opacity-60">GSM</span>
              <span class="font-label-bold">${escapeHtml(!product.gsm || Number(product.gsm) <= 0 ? 'Custom' : product.gsm)}</span>
            </div>
            <div class="bg-surface-container p-3 rounded">
              <span class="text-[10px] uppercase block opacity-60">Blend</span>
              <span class="font-label-bold">${escapeHtml(product.blend || 'Premium Blend')}</span>
            </div>
          </div>
          <p class="text-on-surface-variant mb-6">${escapeHtml(product.description)}</p>
          <button data-product-id="${escapeHtml(product.id)}" data-action="requestQuote" class="${btnClass}">Request Quote</button>
        </div>
      </div>
    `;
  }

  window.requestQuote = function(productId) {
    SecurityUtils.navigate('contact.html?quote=' + encodeURIComponent(productId));
  };

  async function loadFounderImage() {
    const founderImg = document.getElementById('founder-image');
    if (!founderImg) return;

    const showImage = () => {
      founderImg.classList.remove('opacity-0');
      founderImg.classList.add('opacity-100');
    };

    try {
      const db = window.firebaseServices && window.firebaseServices.db;
      if (db) {
        // Set a 3-second timeout on the firestore read to prevent hanging forever
        const doc = await Promise.race([
          db.collection('settings').doc('general').get(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]);

        if (doc.exists) {
          const settings = doc.data();
          if (settings && settings.homeUserImage) {
            founderImg.onload = showImage;
            founderImg.onerror = showImage;
            founderImg.src = settings.homeUserImage;
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load custom founder image:', err);
    }
    showImage();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    loadFounderImage();
    // Count-up animation for "500+" global partners
    const partnerCountEl = document.getElementById('hero-partner-count');
    if (partnerCountEl) {
      const targetVal = 500;
      const durationTime = 1600; // 1.6 seconds count-up
      const startValTime = performance.now();

      function animateCounter(timestamp) {
        const timeElapsed = timestamp - startValTime;
        const animationProgress = Math.min(timeElapsed / durationTime, 1);

        // Easing out quadratic: ultra-smooth deceleration at the end
        const easedProgress = animationProgress * (2 - animationProgress);
        const calculatedCount = Math.floor(easedProgress * targetVal);

        partnerCountEl.textContent = calculatedCount + '+';

        if (animationProgress < 1) {
          requestAnimationFrame(animateCounter);
        } else {
          partnerCountEl.textContent = targetVal + '+';
          // Neat micro-scale highlight trigger on completion
          partnerCountEl.classList.add('scale-110', 'text-white');
          setTimeout(() => {
            partnerCountEl.classList.remove('scale-110', 'text-white');
          }, 300);
        }
      }

    // Delay animation start slightly to match hero text reveal transitions
    setTimeout(() => {
      requestAnimationFrame(animateCounter);
    }, 300);
  }

  // Bento Grid scroll-reveal stagger animation
  const bentoCards = document.querySelectorAll('.bento-card-reveal');
  if (bentoCards.length) {
    const observerOptions = {
      root: null, // viewport
      rootMargin: '0px 0px -80px 0px', // trigger slightly before entering fully
      threshold: 0.15 // 15% visibility triggers
    };

    const bentoObserver = new IntersectionObserver((entries, observer) => {
      let triggerDelay = 0;
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const card = entry.target;
          card.style.transitionDelay = triggerDelay + 'ms';
          card.classList.add('reveal-active');
          triggerDelay += 180; // 180ms stagger
          observer.unobserve(card);
        }
      });
    }, observerOptions);

    bentoCards.forEach((card) => {
      bentoObserver.observe(card);
    });
  }

  // Bind all static buttons
  document.querySelectorAll('button').forEach((button) => {
      const label = button.textContent.trim().toLowerCase();
      if (label.includes('quote') || label.includes('contact')) {
        if (!button.onclick) {
          button.addEventListener('click', () => { SecurityUtils.navigate('contact.html'); });
        }
      }
      if (label.includes('catalogue') || label.includes('catalog') || label.includes('collection') || label.includes('spec')) {
        button.addEventListener('click', () => { SecurityUtils.navigate('products-catalogue.html'); });
      }
      if (label.includes('engineering') || label.includes('consult')) {
        button.addEventListener('click', () => { SecurityUtils.navigate('contact.html'); });
      }
    });

    // Dynamic Premium Clothing loader
    try {
      const products = await DataManager.getProducts();
      // Filter products marked as premium (and active)
      const premiumProducts = products.filter(p => p.premium === true && p.active !== false);
      const container = document.getElementById('premiumProductsContainer');
      if (container) {
        if (premiumProducts.length >= 2) {
          container.innerHTML = premiumProducts.slice(0, 2).map((prod, idx) => renderPremiumProductCard(prod, idx)).join('');
        } else {
          // Fallback to first 2 available active products if not enough marked as premium
          const activeProducts = products.filter(p => p.active !== false);
          container.innerHTML = activeProducts.slice(0, 2).map((prod, idx) => renderPremiumProductCard(prod, idx)).join('');
        }
      }
    } catch (err) {
      console.warn('Failed to load dynamic premium products:', err);
    }

    // Premium Cards scroll-reveal stagger animation
    initProductCardsReveal();
  });

  function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (!menu) return;
    if (menu.classList.contains('hidden')) {
      menu.classList.remove('hidden');
      setTimeout(() => {
        menu.classList.remove('-translate-y-4', 'opacity-0');
        menu.classList.add('translate-y-0', 'opacity-100');
      }, 10);
    } else {
      menu.classList.remove('translate-y-0', 'opacity-100');
      menu.classList.add('-translate-y-4', 'opacity-0');
      setTimeout(() => {
        menu.classList.add('hidden');
      }, 300);
    }
  }

  // Premium Cards scroll-reveal stagger animation
  function initProductCardsReveal() {
    const productCards = document.querySelectorAll('.product-card-reveal-left, .product-card-reveal-right');
    if (productCards.length) {
      const observerOptions = {
        root: null,
        rootMargin: '0px 0px -80px 0px',
        threshold: 0.1
      };

      const productObserver = new IntersectionObserver((entries, observer) => {
        let triggerDelay = 0;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const card = entry.target;
            card.style.transitionDelay = triggerDelay + 'ms';
            card.classList.add('reveal-active');
            triggerDelay += 220; // 220ms stagger
            observer.unobserve(card);
          }
        });
      }, observerOptions);

      productCards.forEach((card) => {
        productObserver.observe(card);
      });
    }
  }

  // Heritage Section counters scroll intersection trigger
  const heritageSection = document.querySelector('.bg-inverse-surface');
  if (heritageSection) {
    const heritageCounterObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Trigger count-ups with professional deceleration curves
          animateHeritageCounter('heritage-years-count', 21, 1400);
          animateHeritageCounter('heritage-client-count', 500, 1800);
          observer.unobserve(entry.target);
        }
      });
    }, { root: null, rootMargin: '0px 0px -100px 0px', threshold: 0.15 });

    heritageCounterObserver.observe(heritageSection);
  }

  function animateHeritageCounter(elementId, targetVal, durationTime) {
    const element = document.getElementById(elementId);
    if (!element) return;
    const startValTime = performance.now();

    function runCount(timestamp) {
      const timeElapsed = timestamp - startValTime;
      const animationProgress = Math.min(timeElapsed / durationTime, 1);

      // Easing out quadratic deceleration
      const easedProgress = animationProgress * (2 - animationProgress);
      const calculatedCount = Math.floor(easedProgress * targetVal);

      element.textContent = calculatedCount + '+';

      if (animationProgress < 1) {
        requestAnimationFrame(runCount);
      } else {
        element.textContent = targetVal + '+';
        // Elegant pulse scale highlight on finish
        element.classList.add('scale-110');
        setTimeout(() => {
          element.classList.remove('scale-110');
        }, 300);
      }
    }
    requestAnimationFrame(runCount);
  }
