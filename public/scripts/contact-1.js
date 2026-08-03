  function showSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
  }
  function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = 'auto';

    // Reset the inquiry section form and product dynamic visibility
    const form = document.getElementById('contactForm');
    if (form) {
      form.reset();
      toggleProductSelection();
    }
  }
  async function loadProducts() {
    const products = (await DataManager.getProducts()).filter((product) => product.active !== false);
    const categories = await DataManager.getCategories();
    const select = document.getElementById('interestedProduct');
    while (select.options.length > 1) select.remove(1);
    products.forEach((product) => {
      const category = categories.find((item) => item.id === product.categoryId);
      const option = document.createElement('option');
      option.value = product.id;

      const unit = product.priceUnit === 'kg' ? 'kg' : 'm';
      let priceStr = '';
      if (product.priceType === 'Range') {
        priceStr = '₹' + (product.priceMin || 0) + ' - ₹' + (product.priceMax || 0);
      } else {
        priceStr = '₹' + (product.startingPrice || product.price || 0);
      }

      option.textContent = (product.code || 'IT') + ' - ' + product.name + ' ' + (category ? '(' + category.name + ')' : '') + ' - ' + priceStr + '/' + unit;
      option.dataset.product = JSON.stringify(product);
      select.appendChild(option);
    });
  }
  function toggleProductSelection() {
    const subject = document.getElementById('subject');
    const container = document.getElementById('product-selection-container');
    const productSelect = document.getElementById('interestedProduct');
    if (subject.value === 'quote' || subject.value === 'bulk') {
      container.classList.remove('hidden');
      productSelect.required = true;
    } else {
      container.classList.add('hidden');
      productSelect.required = false;
      productSelect.value = '';
    }
  }
  function selectProduct(productId) {
    document.getElementById('subject').value = 'quote';
    toggleProductSelection();
    document.getElementById('interestedProduct').value = productId;
  }
  function checkPreselectedProduct() {
    const productId = new URLSearchParams(window.location.search).get('quote');
    if (productId) {
      selectProduct(productId);
      return;
    }
    const stored = sessionStorage.getItem('quoteProduct');
    if (stored) {
      const product = JSON.parse(stored);
      selectProduct(product.id);
      sessionStorage.removeItem('quoteProduct');
    }
  }
  let contactPageInitialized = false;
  document.addEventListener('DOMContentLoaded', async () => {
    if (contactPageInitialized) return;
    contactPageInitialized = true;

    await loadProducts();
    checkPreselectedProduct();
    document.getElementById('subject').addEventListener('change', toggleProductSelection);
    document.getElementById('successModal').addEventListener('click', (event) => {
      if (event.target.id === 'successModal') closeSuccessModal();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeSuccessModal();
    });
    document.querySelectorAll('button').forEach((button) => {
      const label = button.textContent.trim().toLowerCase();
      if (label.includes('quote') && button.type !== 'submit') {
        button.addEventListener('click', () => { SecurityUtils.navigate('contact.html'); });
      }
    });
    document.getElementById('contactForm').addEventListener('submit', async function(event) {
      event.preventDefault();

      const submitBtn = this.querySelector('button[type="submit"]');
      const originalBtnHtml = submitBtn.innerHTML;

      const data = Object.fromEntries(new FormData(this));
      if (data.website) {
        // Honeypot fields are invisible to people but commonly filled by bots.
        return;
      }
      if (!data.firstName || !data.lastName || !data.email || !data.subject || !data.message) {
        alert('Please fill in all required fields.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        alert('Please enter a valid email address.');
        return;
      }
      if ((data.subject === 'quote' || data.subject === 'bulk') && !data.interestedProduct) {
        alert('Please select a product for your quote/bulk order request.');
        return;
      }
      const lastInquiryAt = Number(sessionStorage.getItem('lastInquiryAt') || 0);
      if (Date.now() - lastInquiryAt < 30000) {
        alert('Your previous inquiry was received. Please wait a moment before sending another.');
        return;
      }

      // Show loading state and disable button
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Sending... <span class="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full ml-2 inline-block"></span>';

      try {
        let selectedProduct = null;
        if (data.interestedProduct) {
          const products = await DataManager.getProducts();
          selectedProduct = products.find((product) => product.id === data.interestedProduct);
        }
        const quote = {
          customerName: data.firstName.trim() + ' ' + data.lastName.trim(),
          email: data.email.trim(),
          phone: (data.phone || '').trim(),
          subject: data.subject,
          productId: data.interestedProduct || null,
          product: selectedProduct ? {
            id: String(selectedProduct.id || ''),
            name: String(selectedProduct.name || ''),
            code: String(selectedProduct.code || ''),
            price: selectedProduct.startingPrice ?? selectedProduct.price ?? null
          } : null,
          quantity: (data.quantity || '').trim(),
          message: data.message.trim(),
          whatsappUpdates: data.whatsappUpdates === 'on'
        };
        await DataManager.saveQuote(quote);
        sessionStorage.setItem('lastInquiryAt', String(Date.now()));
        showSuccessModal();
      } catch (err) {
        console.error('Error submitting inquiry:', err);
        alert('An unexpected error occurred. Please try again.');
      } finally {
        // Restore button state
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    });
  });

  function updateOperationalStatus() {
    const statusTag = document.getElementById('operationalStatus');
    if (!statusTag) return;

    // Get current time in Indian Standard Time (IST - UTC+5:30)
    const now = new Date();
    const istTime = new Date(now.getTime() + (5.5 * 3600000));

    const day = istTime.getUTCDay(); // 0: Sunday, 1: Monday, ..., 6: Saturday
    const hours = istTime.getUTCHours();
    const minutes = istTime.getUTCMinutes();

    if (day === 0) {
      // Sunday: Emergency Only
      statusTag.innerHTML = `
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        <span>Emergency Only</span>
      `;
      statusTag.className = 'inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-bold uppercase border border-amber-500/20';
    } else {
      // Monday - Saturday: 11:00 - 20:00 IST
      const currentMinutes = hours * 60 + minutes;
      const startMinutes = 11 * 60; // 11:00 AM
      const endMinutes = 20 * 60; // 8:00 PM

      if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
        statusTag.innerHTML = `
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Active Now</span>
        `;
        statusTag.className = 'inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase border border-emerald-500/20';
      } else {
        statusTag.innerHTML = `
          <span class="h-2 w-2 rounded-full bg-on-surface-variant/40"></span>
          <span>Closed</span>
        `;
        statusTag.className = 'inline-flex items-center gap-1.5 bg-surface-variant/20 text-on-surface-variant/85 px-3 py-1 rounded-full text-xs font-bold uppercase border border-surface-variant/30 opacity-75';
      }
    }
  }

  // Run immediately since script is at the bottom and elements are already parsed
  updateOperationalStatus();

  // Run on load to set dynamic business hours status
  document.addEventListener('DOMContentLoaded', updateOperationalStatus);
  window.addEventListener('load', updateOperationalStatus);

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
