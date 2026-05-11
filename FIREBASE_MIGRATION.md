# Firebase Migration Guide

## Overview
Migrating from localStorage to Firebase (Auth + Firestore + Storage)

## Changes Made So Far

### 1. Firebase Configuration ✅
- Created `firebase-config.js` with Firebase SDK initialization
- Placeholder config - replace with your actual Firebase project credentials

### 2. Admin Login Page ✅
- Updated `admin-login.html` to use Firebase Auth
- Changed from username/password to email/password
- Uses Firebase Authentication for secure login

### 3. Admin Dashboard - In Progress
- Added Firebase SDK imports
- Updated authentication check to use Firebase Auth
- Updated logout function to use Firebase Auth
- Need to: Update DataManager to use Firestore

## Next Steps

### Update DataManager for Firestore
The DataManager needs to be converted from localStorage to Firestore:

```javascript
// Current (localStorage):
getCategories() {
    return JSON.parse(localStorage.getItem('categories') || '[]');
}

// New (Firestore):
async getCategories() {
    const snapshot = await db.collection('categories').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

All methods need to become async:
- getCategories() → async
- addCategory() → async
- updateCategory() → async
- deleteCategory() → async
- getProducts() → async
- addProduct() → async
- updateProduct() → async
- deleteProduct() → async
- getQuotes() → async
- addQuote() → async

### Update Image Upload
Change from base64 to Firebase Storage:

```javascript
// Upload image to Firebase Storage
async uploadImage(file) {
    const ref = storage.ref(`images/${Date.now()}_${file.name}`);
    await ref.put(file);
    return await ref.getDownloadURL();
}
```

### Update Other Pages
1. **contact.html** - Save quotes to Firestore
2. **products-catalogue.html** - Load products from Firestore
3. **index.html** - Load categories from Firestore (if needed)

## Firebase Setup Instructions

### 1. Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click "Create Project"
3. Name it: "ishank-textile"
4. Enable Google Analytics (optional)

### 2. Get Configuration
1. Click "</>" (Web) to add a web app
2. Register app: "Ishank Textile Website"
3. Copy the config object
4. Replace in `firebase-config.js`

### 3. Enable Services
1. **Authentication**: Enable Email/Password sign-in
2. **Firestore Database**: Create database (start in test mode)
3. **Storage**: Enable and create bucket

### 4. Create Admin User
1. Go to Authentication → Users
2. Click "Add User"
3. Email: admin@ishanktextile.com
4. Password: (create secure password)
5. Click "Add User"

### 5. Security Rules
Set Firestore security rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Cost
- **Firebase Auth**: Free (10,000 users/month)
- **Firestore**: Free (50K reads, 20K writes, 1GB storage/day)
- **Storage**: Free (5GB storage, 1GB download/day)
- **Hosting**: Free (10GB storage, 10GB/month bandwidth)

**Total: $0/month for small business usage**

## Migration Time Estimate
- DataManager conversion: 2-3 hours
- Image upload update: 1 hour
- Other pages update: 1-2 hours
- Testing: 1-2 hours

**Total: 1-2 days of work**

## Need Help?
The migration is complex. Would you like me to:
1. Continue with the full migration now?
2. Create the Firestore DataManager?
3. Update the remaining pages?

Let me know how you'd like to proceed!
