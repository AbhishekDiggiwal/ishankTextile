/*
 * Firebase Hosting serves /__/firebase/init.js from the deployed project and
 * initializes the default app before this file runs. Keeping the generated web
 * configuration out of source control avoids publishing project identifiers in
 * the repository while preserving the normal Firebase Hosting deployment.
 */
(function initializeFirebaseServices(global) {
  'use strict';

  const runtimeSiteKey = typeof global.FIREBASE_APP_CHECK_SITE_KEY === 'string'
    ? global.FIREBASE_APP_CHECK_SITE_KEY.trim()
    : '';
  const services = {
    auth: null,
    appCheck: null,
    appCheckConfigured: Boolean(runtimeSiteKey),
    db: null,
    storage: null
  };
  global.firebaseServices = services;

  if (!global.firebase || !Array.isArray(global.firebase.apps) || !global.firebase.apps.length) {
    console.warn('Firebase auto-initialization is unavailable. Running in offline/local mode.');
    return;
  }

  try {
    services.auth = global.firebase.auth ? global.firebase.auth() : null;
    services.db = global.firebase.firestore ? global.firebase.firestore() : null;
    services.storage = global.firebase.storage ? global.firebase.storage() : null;
  } catch (error) {
    console.warn('Firebase service initialization failed. Running in offline/local mode.', error);
  }

  try {
    const appCheckMeta = global.document &&
      global.document.querySelector('meta[name="firebase-app-check-site-key"]');
    const appOptions = global.firebase.app && global.firebase.app().options
      ? global.firebase.app().options
      : {};
    const appCheckSiteKey = (appCheckMeta && appCheckMeta.content.trim()) ||
      runtimeSiteKey ||
      (typeof appOptions.recaptchaSiteKey === 'string'
        ? appOptions.recaptchaSiteKey.trim()
        : '');

    services.appCheckConfigured = Boolean(appCheckSiteKey);
    if (!appCheckSiteKey) return;

    const EnterpriseProvider = global.firebase.appCheck &&
      global.firebase.appCheck.ReCaptchaEnterpriseProvider;

    if (!global.firebase.appCheck || typeof EnterpriseProvider !== 'function') {
      console.warn('Firebase App Check Enterprise provider is unavailable.');
      return;
    }

    const appCheck = global.firebase.appCheck();
    appCheck.activate(new EnterpriseProvider(appCheckSiteKey), true);
    services.appCheck = appCheck;
  } catch (error) {
    services.appCheck = null;
    console.warn('Firebase App Check initialization failed.', error);
  }
}(window));
