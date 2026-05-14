// Firebase Configuration
// Replace with your own Firebase project credentials after creating project at https://console.firebase.google.com

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
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
