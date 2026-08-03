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

  // Fallback default Business Terms if Firestore document is empty
  const fallbackTerms = `Welcome to the Business Terms and Conditions for B2B Procurement at Ishank Textile.

These terms and conditions govern all corporate sales, wholesale purchases, and manufacturing contract orders fulfilled by Ishank Textile, headquartered in Bhilwara, Rajasthan. Any client initiating a dynamic quote request via our catalog accepts these business provisions in full.

1. B2B Quotations and Order Initiation
All catalog pricing values (starting prices e.g., ₹180/m, ₹380/m) are initial baseline indicators. Final procurement pricing is determined dynamically based on:
- Material Specifications: GSM requirements, special weave options (twill, ripstop, knitted, poly-viscose), and dye compliance (Vat-dyed or fiber-dyed).
- Volume Inquiries: Total ordered fabric yardage/meters (Minimum Order Quantity is usually 500 meters per category, subject to administrative review by Sunil Pandiya).
- Customized Branding: Defense uniform logos, corporate patterns, or security patches.

2. Lead Times & Shipping Logistics
All fabric production and automated loom scheduling are managed directly from our manufacturing hubs in Bhilwara.
- Dispatch Timelines: General wholesale batches are scheduled for shipping within 15 to 30 days from formal deposit clearance, depending on the dynamic loom queue.
- Delivery Jurisdiction: All wholesale goods are dispatched under Ex-Factory (Bhilwara) shipping parameters, unless customized shipping logistics are negotiated in support inquiries.

3. Fabric Quality & Inspection
Ishank Textile has maintained certified premium fabric manufacturing standards since 2003.
- Sample Approvals: For high-volume Defense and Medical orders, physical woven lab dips and fabric swatches are shipped for buyer analysis prior to major batch setups.
- Inspection: Buyers have the right to inspect fabrics at our Bhilwara trade location (42, 1st Floor, Heera Panna Market) or within 7 days of delivery receipt. Any claims regarding weave anomalies must be raised within this period.

4. Arbitration & Legal Jurisdiction
All transactions, purchase agreements, and quality audits are governed by industrial laws in force. Any business disputes, delivery claims, or contract issues will be subject to exclusive arbitration within the jurisdiction of the courts of Bhilwara, Rajasthan, India.

If you have corporate questions or want to discuss custom contract orders, please submit a Support request or contact us directly:
Ishank Textile
42, 1st Floor, Heera Panna Market, Pur Road, Bhilwara, Rajasthan
Email: sunilpandiya909@gmail.com
Phone: +91 94141 12197`;

  document.addEventListener('DOMContentLoaded', async () => {
    const db = window.firebaseServices && window.firebaseServices.db;
    const policyKey = 'business_terms';

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
        console.warn('Failed to load business terms from Firestore, rendering fallback:', e);
      }
    }

    // Render Fallback if no database content
    document.getElementById('policy-content').textContent = fallbackTerms;
    document.getElementById('policy-date').textContent = 'May 31, 2026';
    document.getElementById('policy-source').textContent = 'Verified Corporate Standards';
  });
