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

  // Fallback default Privacy Policy if Firestore document is empty
  const fallbackTerms = `Welcome to the Privacy Policy for Ishank Textile.

At Ishank Textile, we respect your privacy and are committed to protecting the confidential business and personal information you share with us. This policy describes how we collect, process, secure, and use the information submitted via our B2B quotation catalog and visitors analytics tracker.

1. Information We Collect
To offer premium B2B fabric solutions, we collect information when you interact with our website, specifically when requesting a quotation or contacting us for custom fabric audits:
- Corporate Contact Information: Your name, email address, phone number, and company name.
- Procurement Metrics: Fabric selections, quantities (in meters), application types (Defense, Corporate, Medical, Hospitality), and specific customized design notes.
- Web Telemetry: Anonymized visitor numbers, page views (e.g., visits to home, fabrics, or contact pages), and individual fabric cards click tracking to aggregate "Top Visited Fabrics" on our secure admin analytics dashboard.

2. How We Use Your Information
We use your business telemetry and details strictly to optimize operations and support B2B fulfillment:
- To generate custom quotations, inspect pricing options, and coordinate logistic shipments from our factory in Bhilwara, Rajasthan.
- To study material demand trends (e.g. 180-day quote requests and page-level analytics) using automated, anonymized ChartJS graphics on our private admin panel.
- We DO NOT sell, trade, or distribute your email, phone, or procurement records to third-party marketing firms. All data is securely locked within the Ishank Textile Firebase project database.

3. Sourcing Design Safeguards
Since 2003, we have worked with sensitive uniform specifications for Defense, Security, and Corporate clients. Any proprietary requirements, logo patches, weave patterns, or custom thread parameters described in your quotes are kept completely confidential.

4. Cookies and Analytical Trackers
We use minor browser storage mechanisms (such as localStorage) to count daily B2B catalog clicks and visitor logs. These metrics are processed locally to help our administration monitor site health and performance without tracking private individual consumer identities.

If you have questions regarding this Privacy Policy, please contact our support office:
Ishank Textile
42, 1st Floor, Heera Panna Market, Pur Road, Bhilwara, Rajasthan
Email: sunilpandiya909@gmail.com
Phone: +91 94141 12197`;

  document.addEventListener('DOMContentLoaded', async () => {
    const db = window.firebaseServices && window.firebaseServices.db;
    const policyKey = 'privacy_policy';

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
        console.warn('Failed to load privacy policy from Firestore, rendering fallback:', e);
      }
    }

    // Render Fallback if no database content
    document.getElementById('policy-content').textContent = fallbackTerms;
    document.getElementById('policy-date').textContent = 'May 31, 2026';
    document.getElementById('policy-source').textContent = 'Verified Corporate Standards';
  });
