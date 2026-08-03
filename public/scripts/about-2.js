  // Load dynamic Founder Image from general settings
  async function loadAboutSettings() {
    const founderImg = document.getElementById('founder-image');
    if (!founderImg) return;

    const showImage = () => {
      founderImg.classList.remove('opacity-0');
      founderImg.classList.add('opacity-100');
    };

    const db = window.firebaseServices && window.firebaseServices.db;
    if (!db) {
      showImage();
      return;
    }

    try {
      // Set a 3-second timeout on the firestore read to prevent hanging forever
      const doc = await Promise.race([
        db.collection('settings').doc('general').get(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
      ]);

      if (doc.exists) {
        const settings = doc.data();
        if (settings && settings.aboutUserImage) {
          founderImg.onload = showImage;
          founderImg.onerror = showImage;
          founderImg.src = settings.aboutUserImage;
          return;
        }
      }
    } catch (err) {
      console.error("Error loading settings/aboutUserImage:", err);
    }
    showImage();
  }

  // Dynamic Certificate and Inline Viewer Logic
  async function loadCertificates() {
    const defaultCertificates = [
      {
        name: "Export License",
        icon: "verified",
        description: "Authorized global trade and logistics compliance."
      },
      {
        name: "GST Compliance",
        icon: "account_balance",
        description: "Validated industrial and tax transparency."
      },
      {
        name: "Import-Export License",
        icon: "public",
        description: "Global Trade and export authorization."
      },
      {
        name: "Environmental",
        icon: "eco",
        description: "Sustainable sourcing and green logistics standard."
      }
    ];

    let certificates = [];
    const db = window.firebaseServices && window.firebaseServices.db;
    if (db) {
      try {
        const snapshot = await db.collection('certificates').get();
        certificates = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error('Error loading certificates from Firestore:', error);
      }
    }

    if (!certificates.length) {
      try {
        certificates = JSON.parse(localStorage.getItem('certificates')) || [];
      } catch (e) {
        certificates = [];
      }
    }

    const container = document.getElementById('certificates-container');
    if (!container) return;
    container.innerHTML = '';

    let certsToRender = [...certificates];
    if (certsToRender.length < 4) {
      const paddingCount = 4 - certsToRender.length;
      const paddingCerts = defaultCertificates.slice(-paddingCount);
      certsToRender = certsToRender.concat(paddingCerts);
    }

    certsToRender.forEach((cert) => {
      const card = document.createElement('div');
      card.className = 'cert-card-reveal p-stack-lg bg-white border border-surface-container-highest rounded-xl text-center group flex flex-col justify-between items-center h-full transition-all duration-700 ease-out opacity-0 translate-y-6 transform';
      const allowedIcons = ['verified', 'account_balance', 'public', 'eco', 'workspace_premium'];
      const safeIcon = allowedIcons.includes(cert.icon) ? cert.icon : 'workspace_premium';
      const safeName = String(cert.name || 'Certificate');
      const safeUrl = SecurityUtils.safeDocumentUrl(cert.url);

      let actionHtml = '';
      if (safeUrl) {
        actionHtml = `<button data-document-url="${SecurityUtils.escapeHtml(safeUrl)}" data-document-name="${SecurityUtils.escapeHtml(safeName)}" data-action="viewDocument" class="mt-4 text-primary font-label-bold text-xs uppercase hover:underline flex items-center justify-center gap-1">` +
          `<span class="material-symbols-outlined text-[14px]">visibility</span>` +
          `<span>View Certificate</span>` +
          `</button>`;
      } else {
        actionHtml = `<span class="mt-4 text-on-surface-variant font-label-bold text-xs uppercase opacity-60">Verified Active</span>`;
      }

      card.innerHTML =
        `<div class="flex flex-col items-center">` +
        `<span class="material-symbols-outlined text-on-surface-variant group-hover:text-primary text-[40px] mb-stack-sm" style="font-variation-settings: 'FILL' 1;">${safeIcon}</span>` +
        `<h4 class="font-label-bold text-on-surface text-base leading-snug">${SecurityUtils.escapeHtml(safeName)}</h4>` +
        `<p class="text-[12px] text-on-surface-variant uppercase mt-1 leading-tight">${SecurityUtils.escapeHtml(cert.description || 'Verified Certification')}</p>` +
        `</div>` +
        actionHtml;

      container.appendChild(card);
      // Force browser layout reflow to ensure the transition from initial opacity-0 state triggers correctly
      void card.offsetHeight;
    });

    // Staggered fade-slide-up reveal for certificate cards
    const certObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const card = entry.target;
          const index = Array.from(container.children).indexOf(card);
          // Stagger each card by 150ms, matching the Manufacturing Excellence cards
          setTimeout(() => {
            card.classList.remove('opacity-0', 'translate-y-6');
            card.classList.add('opacity-100', 'translate-y-0');
            card.classList.add('active');
          }, index * 150);
          certObserver.unobserve(card);
        }
      });
    }, { threshold: 0.15 });

    container.querySelectorAll('.cert-card-reveal').forEach((card) => {
      certObserver.observe(card);
    });
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
    if (!safeUrl) return;

    // Determine type
    const isPdf = safeUrl.startsWith('data:application/pdf') ||
                  /\.pdf(?:$|[?#])/i.test(safeUrl);

    if (isPdf) {
      const frame = document.createElement('iframe');
      frame.src = safeUrl;
      frame.className = 'w-full h-full border-0 rounded-lg bg-white';
      frame.style.minHeight = '65vh';
      frame.title = String(name || 'Document');
      frame.setAttribute('sandbox', '');
      frame.referrerPolicy = 'no-referrer';
      contentEl.appendChild(frame);
    } else {
      const image = document.createElement('img');
      image.src = SecurityUtils.safeImageUrl(safeUrl, 'logo.png');
      image.alt = String(name || 'Certificate');
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

  // Close modals on outside click
  window.onclick = (e) => {
    if (e.target.classList.contains('fixed')) {
      e.target.classList.add('hidden');
      if (e.target.id === 'doc-viewer-modal') {
        closeDocViewer();
      }
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    loadCertificates();
    loadAboutSettings();

    // Helper function to animate stat card with Intersection Observer
    function animateStat(statId, countId, targetVal, suffix, duration = 1200) {
      const statEl = document.getElementById(statId);
      const countEl = document.getElementById(countId);
      if (!statEl || !countEl) return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Visual transition reveal
            statEl.classList.remove('opacity-0', 'translate-y-8');
            statEl.classList.add('opacity-100', 'translate-y-0');

            // Dynamic count-up logic
            let current = 0;
            const target = targetVal;
            const stepTime = Math.max(Math.floor(duration / target), 10);

            const timer = setInterval(() => {
              current++;
              countEl.textContent = current + suffix;
              if (current >= target) {
                clearInterval(timer);
              }
            }, stepTime);

            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      observer.observe(statEl);
    }

    // Initialize both stat animations
    // Specialized Odometer Scroll Trigger for "21+" Years of Excellence
    const stat21El = document.getElementById('stat-21-years');
    if (stat21El) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // 1. Reveal container
            stat21El.classList.remove('opacity-0', 'translate-y-8');
            stat21El.classList.add('opacity-100', 'translate-y-0');

            // 2. Trigger odometer slots slide
            setTimeout(() => {
              const strips = stat21El.querySelectorAll('.odometer-strip');
              const targetDigits = [2, 1];
              strips.forEach((strip, idx) => {
                const digit = targetDigits[idx];
                strip.style.transform = `translateY(-${digit * 10}%)`;
              });
            }, 300);

            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      observer.observe(stat21El);
    }
    // Specialized Matrix Cypher Shuffle for "100%" Industrial Precision
    const statPrecisionEl = document.getElementById('stat-precision-card');
    if (statPrecisionEl) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // 1. Reveal container
            statPrecisionEl.classList.remove('opacity-0', 'translate-y-8');
            statPrecisionEl.classList.add('opacity-100', 'translate-y-0');

            // 2. Trigger cypher shuffle
            setTimeout(() => {
              runCypherShuffle('count-precision', '100%', 1200);
            }, 300);

            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      observer.observe(statPrecisionEl);
    }

    function runCypherShuffle(elementId, targetStr, duration = 1200) {
      const el = document.getElementById(elementId);
      if (!el) return;

      const chars = "0123456789%@&#XYZ$?![]{}";
      const totalSteps = Math.floor(duration / 40); // 30 steps
      let currentStep = 0;

      // Apply Matrix Cypher Shuffle (Technical Blueprint) monospace and crimson styling during shuffling
      el.classList.add('font-mono', 'text-primary', 'tracking-widest');
      el.classList.remove('font-display-lg', 'text-white');

      const interval = setInterval(() => {
        currentStep++;
        const progress = currentStep / totalSteps;

        // Calculate how many characters are locked based on progress
        const numLocked = Math.floor(progress * targetStr.length);

        let displayStr = "";
        for (let i = 0; i < targetStr.length; i++) {
          if (i < numLocked) {
            displayStr += targetStr[i];
          } else {
            displayStr += chars[Math.floor(Math.random() * chars.length)];
          }
        }

        el.textContent = displayStr;

        if (currentStep >= totalSteps) {
          clearInterval(interval);
          el.textContent = targetStr;

          // Revert matrix styles and trigger premium completion pulse
          el.classList.remove('font-mono', 'text-primary', 'tracking-widest');
          el.classList.add('font-display-lg', 'text-white', 'scale-105', 'transition-all', 'duration-500');

          setTimeout(() => {
            el.classList.remove('scale-105');
          }, 500);
        }
      }, 40);
    }

    // Staggered fade-slide-up reveal for Manufacturing Excellence cards
    const mfgCards = [
      document.getElementById('mfg-card-1'),
      document.getElementById('mfg-card-2'),
      document.getElementById('mfg-card-3')
    ];

    const mfgObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const card = entry.target;
          const index = parseInt(card.id.replace('mfg-card-', '')) - 1;
          // Stagger each card by 150ms
          setTimeout(() => {
            card.classList.remove('opacity-0', 'translate-y-6');
            card.classList.add('opacity-100', 'translate-y-0');
          }, index * 150);
          mfgObserver.unobserve(card);
        }
      });
    }, { threshold: 0.15 });

    mfgCards.forEach((card) => { if (card) mfgObserver.observe(card); });
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
