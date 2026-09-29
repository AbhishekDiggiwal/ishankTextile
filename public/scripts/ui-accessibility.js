(function initAccessibility(global) {
  'use strict';
  const document = global.document;
  let activeDialog = null;
  let returnFocus = null;
  let inertSiblings = [];
  const dialogSelector = '[data-modal-backdrop="true"], #successModal';
  const closeActions = { 'category-modal': 'closeCategoryModal', 'product-modal': 'closeProductModal', 'certificate-modal': 'closeCertificateModal', 'doc-viewer-modal': 'closeDocViewer', successModal: 'closeSuccessModal' };
  const visible = element => element && !element.closest('.hidden, [hidden], [inert]') && global.getComputedStyle(element).display !== 'none';
  const focusable = dialog => [...dialog.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]')].filter(element => !element.disabled && element.tabIndex >= 0 && visible(element));
  function synchronize() {
    document.querySelectorAll('[data-action="selectCategory"]:not([role])').forEach(element => {
      element.setAttribute('role', 'button'); element.tabIndex = 0;
    });
    document.querySelectorAll('[data-action]').forEach(element => {
      if (element.hasAttribute('aria-label')) return;
      const copy = element.cloneNode(true);
      copy.querySelectorAll('.material-symbols-outlined, .fas, .fa').forEach(icon => icon.remove());
      if (copy.textContent.trim()) return;
      const labels = { toggleMobileMenu: 'Toggle navigation', refreshData: 'Refresh data', togglePassword: 'Show or hide password', hideElement: 'Dismiss notice', closeDocViewer: 'Close document', closeProductModal: 'Close product form', closeCategoryModal: 'Close category form', closeCertificateModal: 'Close certificate form', closeSuccessModal: 'Close confirmation' };
      const label = labels[element.dataset.action] || element.getAttribute('title');
      if (label) element.setAttribute('aria-label', label);
    });
    document.querySelectorAll(dialogSelector).forEach(dialog => {
      dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.tabIndex = -1;
      const heading = dialog.querySelector('h1, h2, h3');
      if (heading) { if (!heading.id) heading.id = dialog.id + '-title'; dialog.setAttribute('aria-labelledby', heading.id); }
    });
    const next = [...document.querySelectorAll(dialogSelector)].reverse().find(visible) || null;
    if (next !== activeDialog) {
      inertSiblings.forEach(element => { element.inert = false; });
      inertSiblings = [];
      if (!next) {
        activeDialog = null;
        if (returnFocus && returnFocus.isConnected) returnFocus.focus();
        returnFocus = null;
      } else {
        if (!activeDialog) returnFocus = document.activeElement;
        activeDialog = next;
        for (let branch = next; branch && branch.parentElement; branch = branch.parentElement) {
          for (const sibling of branch.parentElement.children) {
            if (sibling !== branch && !sibling.inert && !['SCRIPT', 'STYLE', 'LINK'].includes(sibling.tagName)) { sibling.inert = true; inertSiblings.push(sibling); }
          }
          if (branch.parentElement === document.body) break;
        }
        (focusable(next)[0] || next).focus();
      }
    }
    const menu = document.getElementById('mobile-menu');
    document.querySelectorAll('[data-action="toggleMobileMenu"]').forEach(button => {
      button.setAttribute('aria-controls', 'mobile-menu');
      button.setAttribute('aria-expanded', String(Boolean(menu && !menu.classList.contains('hidden'))));
    });
  }
  document.addEventListener('keydown', event => {
    if (activeDialog) {
      if (event.key === 'Escape') {
        const close = global[closeActions[activeDialog.id]];
        if (typeof close === 'function') { event.preventDefault(); close(); }
      } else if (event.key === 'Tab') {
        const items = focusable(activeDialog);
        if (!items.length) { event.preventDefault(); activeDialog.focus(); return; }
        const index = items.indexOf(document.activeElement);
        if (event.shiftKey && index <= 0) { event.preventDefault(); items[items.length - 1].focus(); }
        else if (!event.shiftKey && (index === -1 || index === items.length - 1)) { event.preventDefault(); items[0].focus(); }
      }
    } else if (event.key === 'Escape') {
      const menu = document.getElementById('mobile-menu');
      if (menu && !menu.classList.contains('hidden')) {
        const button = document.querySelector('[data-action="toggleMobileMenu"]');
        if (button) { button.click(); button.focus(); }
      }
    }
  });
  const observer = new MutationObserver(synchronize);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
  document.addEventListener('DOMContentLoaded', synchronize);
  synchronize();
}(window));
