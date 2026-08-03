/*
 * Firebase Hosting serves /__/firebase/init.js from the deployed project and
 * initializes the default app before this file runs. Keeping the generated web
 * configuration out of source control avoids publishing project identifiers in
 * the repository while preserving the normal Firebase Hosting deployment.
 */
(function initializeFirebaseServices(global) {
  'use strict';

  global.firebaseServices = { auth: null, appCheck: null, db: null, storage: null };

  if (!global.firebase || !Array.isArray(global.firebase.apps) || !global.firebase.apps.length) {
    console.warn('Firebase auto-initialization is unavailable. Running in offline/local mode.');
    return;
  }

  try {
    let appCheck = null;
    const appCheckMeta = global.document &&
      global.document.querySelector('meta[name="firebase-app-check-site-key"]');
    const appOptions = global.firebase.app && global.firebase.app().options
      ? global.firebase.app().options
      : {};
    const appCheckSiteKey = (appCheckMeta && appCheckMeta.content.trim()) ||
      (typeof appOptions.recaptchaSiteKey === 'string'
        ? appOptions.recaptchaSiteKey.trim()
        : '');

    if (global.firebase.appCheck && appCheckSiteKey) {
      appCheck = global.firebase.appCheck();
      appCheck.activate(appCheckSiteKey, true);
    }

    global.firebaseServices = {
      auth: global.firebase.auth ? global.firebase.auth() : null,
      appCheck,
      db: global.firebase.firestore ? global.firebase.firestore() : null,
      storage: global.firebase.storage ? global.firebase.storage() : null
    };
  } catch (error) {
    console.warn('Firebase service initialization failed. Running in offline/local mode.', error);
  }
}(window));
