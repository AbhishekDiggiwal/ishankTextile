/*
 * Firebase Hosting serves /__/firebase/init.js from the deployed project and
 * initializes the default app before this file runs. Keeping the generated web
 * configuration out of source control avoids publishing project identifiers in
 * the repository while preserving the normal Firebase Hosting deployment.
 */
(function initializeFirebaseServices(global) {
  'use strict';

  const services = {
    auth: null,
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

}(window));
