/*
 * Central event delegation keeps executable JavaScript out of HTML attributes.
 * Every supported action is explicitly allowlisted below.
 */
(function initializeEventHandlers(global) {
  'use strict';

  function call(name, args) {
    if (typeof global[name] === 'function') {
      return global[name].apply(global, args || []);
    }
    return undefined;
  }

  function runAction(element, event) {
    const action = element.dataset.action;

    switch (action) {
      case 'toggleMobileMenu':
      case 'closeSuccessModal':
      case 'togglePassword':
      case 'showCategoriesView':
      case 'toggleMobileFilters':
      case 'closeDocViewer':
      case 'logout':
      case 'refreshData':
      case 'updateVisitorChart':
      case 'updateQuoteChart':
      case 'updateMostRequestedChart':
      case 'toggleCategoryPriceVisibility':
      case 'openCategoryModal':
      case 'filterCategories':
      case 'toggleProductPriceVisibility':
      case 'openProductModal':
      case 'filterProducts':
      case 'searchProducts':
      case 'updateTopVisitedFabrics':
      case 'exportQuotes':
      case 'enterSettingsEditMode':
      case 'exportAllData':
      case 'resetAllData':
      case 'openCertificateModal':
      case 'closeCertificateModal':
      case 'closeCategoryModal':
      case 'toggleCategoryImageInput':
      case 'closeProductModal':
      case 'togglePriceFields':
      case 'togglePriceUnitFields':
      case 'toggleProductImageInput':
        call(action);
        break;
      case 'showSection':
        call(action, [element.dataset.section, event]);
        break;
      case 'setViewMode':
        call(action, [element.dataset.value]);
        break;
      case 'exitSettingsEditMode':
        call(action, [false]);
        break;
      case 'clickElement': {
        const target = global.document.getElementById(element.dataset.targetId);
        if (target) target.click();
        break;
      }
      case 'hideElement': {
        const target = global.document.getElementById(element.dataset.targetId);
        if (target) target.classList.add('hidden');
        break;
      }
      case 'handleSettingsUserImageUpload':
      case 'uploadPolicyFile':
        call(action, [element, element.dataset.value]);
        break;
      case 'handleCategoryImageUpload':
      case 'handleProductImageUpload':
      case 'importData':
        call(action, [element]);
        break;
      case 'toggleCategoryStatus':
      case 'editCategory':
      case 'deleteCategory':
      case 'toggleProductStatus':
      case 'editProduct':
      case 'deleteProduct':
      case 'deleteCertificate':
        call(action, [element.dataset.recordId]);
        break;
      case 'viewDocument':
        call(action, [element.dataset.documentUrl, element.dataset.documentName]);
        break;
      case 'recordFabricVisit':
      case 'requestQuote':
        call(action, [element.dataset.productId]);
        break;
      case 'goToPage': {
        const page = Number.parseInt(element.dataset.page, 10);
        if (Number.isSafeInteger(page) && page > 0) call(action, [page]);
        break;
      }
      case 'selectCategory':
        call(action, [element.dataset.categoryId]);
        break;
      default:
        break;
    }
  }

  function handleDelegatedEvent(event) {
    const element = event.target.closest('[data-action]');
    if (!element || !global.document.documentElement.contains(element)) return;
    if (element.dataset.actionEvent &&
        element.dataset.actionEvent !== event.type) return;
    if (element.dataset.stopPropagation === 'true') event.stopPropagation();
    runAction(element, event);
  }

  global.document.addEventListener('click', handleDelegatedEvent);
  global.document.addEventListener('change', handleDelegatedEvent);
  global.document.addEventListener('keyup', handleDelegatedEvent);
  global.document.addEventListener('load', (event) => {
    const image = event.target;
    if (image instanceof global.HTMLImageElement && image.dataset.removeLoading === 'true') {
      image.parentElement.classList.remove('animate-pulse', 'bg-surface-variant');
    }
  }, true);
}(window));
