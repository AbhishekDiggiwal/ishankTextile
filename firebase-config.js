// Firebase Configuration
// Replace with your own Firebase project credentials after creating project at https://console.firebase.google.com

const firebaseConfig = {
  apiKey: "AIzaSyC959Is_n8ou_DMq1KMr_sEiq1QTepcJ6k",
  authDomain: "ishanktextile.firebaseapp.com",
  projectId: "ishanktextile",
  storageBucket: "ishanktextile.firebasestorage.app",
  messagingSenderId: "858913371452",
  appId: "1:858913371452:web:14aa27ecf860bbb34a5a39",
  measurementId: "G-DQHESC75K4"
};

// Initialize Firebase only if real credentials are provided
// (placeholder values are detected and skipped to avoid console errors)
const hasRealCredentials = firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('YOUR_');

window.firebaseServices = { auth: null, db: null, storage: null };

if (hasRealCredentials) {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        // Initialize only the services loaded by the current page. Public pages do not
        // load every Firebase SDK, so each service is optional here.
        window.firebaseServices = {
            auth: firebase.auth ? firebase.auth() : null,
            db: firebase.firestore ? firebase.firestore() : null,
            storage: firebase.storage ? firebase.storage() : null
        };
    } catch (e) {
        console.warn('Firebase initialization failed. Running in offline/local mode.', e);
    }
}
