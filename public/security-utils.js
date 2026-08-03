/*
 * Shared browser-side security helpers.
 *
 * This file intentionally has no dependencies so it can load before Firebase
 * and can also be exercised directly by the Jest security tests.
 */
(function initSecurityUtils(global) {
  'use strict';

  const ADMIN_EMAIL = 'admin@ishanktextile.com';
  const MAX_DATA_IMAGE_LENGTH = 1_500_000;
  const MAX_DATA_DOCUMENT_LENGTH = 7_500_000;
  const SAFE_IMAGE_DATA_URL = /^data:image\/(?:png|jpeg|jpg|gif|webp);base64,[a-z0-9+/=\s]+$/i;
  const SAFE_PDF_DATA_URL = /^data:application\/pdf;base64,[a-z0-9+/=\s]+$/i;
  const SAFE_DOCUMENT_IMAGE_DATA_URL = /^data:image\/(?:png|jpeg|jpg|gif|webp);base64,[a-z0-9+/=\s]+$/i;

  function toString(value) {
    return value === null || value === undefined ? '' : String(value);
  }

  function escapeHtml(value) {
    return toString(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character]));
  }

  function isLocalHostname(hostname) {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  }

  function safeUrl(value, options) {
    const settings = Object.assign({
      allowRelative: true,
      allowMailto: false,
      allowTel: false,
      allowDataImage: false,
      allowDataDocument: false
    }, options || {});
    const candidate = toString(value).trim();
    if (!candidate || /[\u0000-\u001f\u007f]/.test(candidate)) return '';

    if (
      settings.allowDataImage &&
      candidate.length <= MAX_DATA_IMAGE_LENGTH &&
      SAFE_IMAGE_DATA_URL.test(candidate)
    ) {
      return candidate;
    }

    if (
      settings.allowDataDocument &&
      candidate.length <= MAX_DATA_DOCUMENT_LENGTH &&
      (SAFE_PDF_DATA_URL.test(candidate) || SAFE_DOCUMENT_IMAGE_DATA_URL.test(candidate))
    ) {
      return candidate;
    }

    if (settings.allowMailto && /^mailto:[^@\s]+@[^@\s]+$/i.test(candidate)) return candidate;
    if (settings.allowTel && /^tel:\+?[0-9().\s-]{7,25}$/i.test(candidate)) return candidate;

    try {
      const base = global.document && global.document.baseURI
        ? global.document.baseURI
        : 'https://localhost/';
      const parsed = new URL(candidate, base);
      const baseUrl = new URL(base);

      if (parsed.protocol === 'https:') return parsed.href;
      if (parsed.protocol === 'http:' && isLocalHostname(parsed.hostname)) return parsed.href;
      if (settings.allowRelative && parsed.origin === baseUrl.origin) return parsed.href;
    } catch (_) {
      return '';
    }

    return '';
  }

  function safeImageUrl(value, fallback) {
    return safeUrl(value, { allowRelative: true, allowDataImage: true }) ||
      safeUrl(fallback, { allowRelative: true, allowDataImage: true }) ||
      '';
  }

  function safeDocumentUrl(value) {
    return safeUrl(value, { allowRelative: true, allowDataDocument: true });
  }

  function safeLinkUrl(value) {
    return safeUrl(value, {
      allowRelative: true,
      allowMailto: true,
      allowTel: true
    });
  }

  function navigate(value) {
    const destination = safeUrl(value, { allowRelative: true });
    if (!destination) return false;
    if (typeof global.__securityNavigate === 'function') {
      global.__securityNavigate(destination);
      return true;
    }
    if (global.location && typeof global.location.assign === 'function') {
      global.location.assign(destination);
      return true;
    }
    return false;
  }

  function sanitizeHtml(html) {
    if (!global.DOMParser) return escapeHtml(html);

    const parser = new global.DOMParser();
    const parsed = parser.parseFromString(`<div>${toString(html)}</div>`, 'text/html');
    const root = parsed.body.firstElementChild;
    if (!root) return '';

    const allowedTags = new Set([
      'A', 'B', 'BLOCKQUOTE', 'BR', 'CODE', 'DIV', 'EM', 'H1', 'H2', 'H3',
      'H4', 'H5', 'H6', 'HR', 'I', 'LI', 'OL', 'P', 'PRE', 'SPAN', 'STRONG',
      'TABLE', 'TBODY', 'TD', 'TH', 'THEAD', 'TR', 'U', 'UL'
    ]);
    const dropWithContent = new Set([
      'APPLET', 'BASE', 'EMBED', 'FORM', 'FRAME', 'FRAMESET', 'IFRAME', 'LINK',
      'META', 'OBJECT', 'SCRIPT', 'STYLE', 'SVG', 'MATH', 'TEMPLATE'
    ]);

    Array.from(root.querySelectorAll('*')).forEach((element) => {
      if (!allowedTags.has(element.tagName)) {
        if (dropWithContent.has(element.tagName)) {
          element.remove();
        } else {
          element.replaceWith(...Array.from(element.childNodes));
        }
        return;
      }

      Array.from(element.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        let keep = false;

        if (element.tagName === 'A' && name === 'href') {
          const safeHref = safeLinkUrl(attribute.value);
          if (safeHref) {
            element.setAttribute('href', safeHref);
            keep = true;
          }
        } else if (element.tagName === 'A' && name === 'title') {
          element.setAttribute('title', toString(attribute.value).slice(0, 300));
          keep = true;
        } else if ((element.tagName === 'TD' || element.tagName === 'TH') &&
                   (name === 'colspan' || name === 'rowspan') &&
                   /^[1-9][0-9]?$/.test(attribute.value)) {
          keep = true;
        }

        if (!keep) element.removeAttribute(attribute.name);
      });

      if (element.tagName === 'A' && element.hasAttribute('href')) {
        element.setAttribute('target', '_blank');
        element.setAttribute('rel', 'noopener noreferrer');
      }
    });

    return root.innerHTML;
  }

  function setSanitizedHtml(element, html) {
    if (!element) return;
    element.innerHTML = sanitizeHtml(html);
  }

  function safeFilename(filename) {
    const cleaned = toString(filename)
      .normalize('NFKC')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^\.+/, '')
      .slice(0, 120);
    return cleaned || 'file';
  }

  function validateFile(file, policy) {
    if (!file) throw new Error('Please select a file.');
    const settings = Object.assign({
      maxBytes: 5 * 1024 * 1024,
      allowedTypes: [],
      allowedExtensions: []
    }, policy || {});
    const extension = safeFilename(file.name).split('.').pop().toLowerCase();
    const typeAllowed = settings.allowedTypes.length === 0 ||
      settings.allowedTypes.includes(file.type);
    const extensionAllowed = settings.allowedExtensions.length === 0 ||
      settings.allowedExtensions.includes(extension);

    if (!typeAllowed || !extensionAllowed) {
      throw new Error('This file type is not allowed.');
    }
    if (!Number.isFinite(file.size) || file.size <= 0 || file.size > settings.maxBytes) {
      throw new Error(`File must be smaller than ${Math.floor(settings.maxBytes / 1024 / 1024)}MB.`);
    }
    return true;
  }

  async function isAdminUser(user, forceRefresh) {
    if (!user || typeof user.getIdTokenResult !== 'function') return false;
    try {
      const result = await user.getIdTokenResult(Boolean(forceRefresh));
      const claims = result && result.claims ? result.claims : {};
      if (claims.admin === true) return true;
      return toString(claims.email).trim().toLowerCase() === ADMIN_EMAIL &&
        claims.email_verified === true;
    } catch (_) {
      return false;
    }
  }

  function toDate(value) {
    if (value && typeof value.toDate === 'function') return value.toDate();
    if (value && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
    const date = new Date(value || 0);
    return Number.isNaN(date.getTime()) ? new Date(0) : date;
  }

  const api = Object.freeze({
    ADMIN_EMAIL,
    escapeHtml,
    isAdminUser,
    navigate,
    safeDocumentUrl,
    safeFilename,
    safeImageUrl,
    safeLinkUrl,
    safeUrl,
    sanitizeHtml,
    setSanitizedHtml,
    toDate,
    validateFile
  });

  global.SecurityUtils = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof window !== 'undefined' ? window : globalThis));
