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

  // Fallback default legal terms if Firestore document is empty
  const fallbackTerms = `Welcome to the Website Terms and Conditions for Ishank Textile.

These terms and conditions govern your use of our website, located at our custom domain. By accessing and browsing this site, you accept these terms in full. If you disagree with any part of these terms, please do not use our website.

1. Intellectual Property
Unless otherwise stated, Ishank Textile and/or its licensors own the intellectual property rights for all material on the website (including logos, textile designs, catalogs, fabric images, and B2B statistics). All intellectual property rights are reserved. You may view and print pages for your own corporate or personal research, subject to restrictions set in these terms.

You must not:
- Republish material or catalog details from our website.
- Sell, rent, or sub-license fabric patterns or assets.
- Reproduce, duplicate, or copy material from the website.
- Redistribute fabric images, statistics, or custom brand marks.

2. Access & B2B Inquiries
Our website is designed for B2B fabric procurement and inquiry. Access to the product catalogue and request-quote features is open to global institutional buyers. The pricing, specifications, and availability displayed on this catalog are starting estimations and subject to dynamic negotiation. Sunil Pandiya and the administration of Ishank Textile reserve the right to decline quotation fulfillment or modify B2B access levels at any time.

3. Limit of Liability
Ishank Textile manufactures precision textiles, but does not guarantee that the product images or colors displayed online correspond exactly to the physical woven fabric due to monitor calibration variances. Real-time visitor data, active categories, and quotation statistics are for general metrics and audit purposes. Ishank Textile is not liable for minor layout discrepancies or server downtime.

4. Governing Jurisdiction
These Terms and Conditions will be governed by and construed in accordance with the laws of Bhilwara, Rajasthan, India, and any disputes relating to these terms will be subject to the exclusive jurisdiction of the courts of Bhilwara.

Contact Information:
Ishank Textile
42, 1st Floor, Heera Panna Market, Pur Road, Bhilwara, Rajasthan
Email: sunilpandiya909@gmail.com
Phone: +91 94141 12197`;

  document.addEventListener('DOMContentLoaded', async () => {
    const db = window.firebaseServices && window.firebaseServices.db;
    const policyKey = 'website_terms';

    if (db) {
      try {
        const doc = await Promise.race([
          db.collection('settings').doc('policies').get(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore read timeout')), 3000))
        ]);
        if (doc.exists) {
          const data = doc.data() || {};
          const policy = data[policyKey];
          if (policy) {
            if (policy.updatedAt) {
              document.getElementById('policy-date').textContent = SecurityUtils.toDate(policy.updatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
            }

            const dlLink = document.getElementById('policy-download-link');
            const safePolicyUrl = SecurityUtils.safeDocumentUrl(policy.url);
            if (safePolicyUrl && dlLink) {
              dlLink.href = safePolicyUrl;
              dlLink.rel = 'noopener noreferrer';
              dlLink.classList.remove('hidden');
            }

            const contentEl = document.getElementById('policy-content');
            if (policy.isBinaryOnly || (!policy.text && safePolicyUrl)) {
              const safeFilename = SecurityUtils.escapeHtml(policy.filename || 'Word Document');
              const downloadAction = safePolicyUrl
                ? `<a href="${SecurityUtils.escapeHtml(safePolicyUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-6 py-3 bg-primary text-on-primary font-label-bold rounded-full shadow-md hover:scale-[1.02] transition-transform">
                    <span class="material-symbols-outlined text-[18px]">download</span>
                    <span>Download Document</span>
                  </a>`
                : '';
              contentEl.innerHTML = `
                <div class="text-center py-10 px-6 border-2 border-dashed border-outline-variant/30 bg-surface-container/20 rounded-xl max-w-lg mx-auto">
                    <span class="material-symbols-outlined text-5xl text-primary mb-4" style="font-variation-settings: 'FILL' 1;">description</span>
                    <h3 class="font-headline-md text-on-surface text-xl mb-2">Policy Document</h3>
                    <p class="text-on-surface-variant font-body-md text-sm mb-6 leading-relaxed">
                        This policy is stored in an official corporate document format (${safeFilename}). Please download the file below to view the official copy verbatim.
                     </p>
                    ${downloadAction}
                </div>
              `;
              contentEl.classList.remove('whitespace-pre-line');
            } else if (policy.text) {
              const isHtml = policy.filename && policy.filename.toLowerCase().endsWith('.docx');
              if (isHtml) {
                SecurityUtils.setSanitizedHtml(contentEl, policy.text);
                contentEl.classList.remove('whitespace-pre-line');
              } else {
                contentEl.textContent = policy.text;
                contentEl.classList.add('whitespace-pre-line');
              }
            }

            document.getElementById('policy-source').textContent = 'Secure Firestore Database';
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to load terms from Firestore, rendering fallback:', e);
      }
    }

    // Render Fallback if no database content
    document.getElementById('policy-content').textContent = fallbackTerms;
    document.getElementById('policy-date').textContent = 'May 31, 2026';
    document.getElementById('policy-source').textContent = 'Verified Corporate Standards';
  });
