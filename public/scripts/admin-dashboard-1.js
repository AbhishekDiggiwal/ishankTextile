  // Safely expose Firebase services after firebase-config.js has run.
  // Falls back to null if Firebase is not configured (placeholder credentials).
  var db = (window.firebaseServices && window.firebaseServices.db) ? window.firebaseServices.db : null;
  var auth = (window.firebaseServices && window.firebaseServices.auth) ? window.firebaseServices.auth : null;
  var storage = (window.firebaseServices && window.firebaseServices.storage) ? window.firebaseServices.storage : null;
