import fs from 'node:fs';
import path from 'node:path';

const copies = [
  ['firebase/firebase-app-compat.js', 'firebase/firebase-app-compat.js'],
  ['firebase/firebase-app-check-compat.js', 'firebase/firebase-app-check-compat.js'],
  ['firebase/firebase-auth-compat.js', 'firebase/firebase-auth-compat.js'],
  ['firebase/firebase-firestore-compat.js', 'firebase/firebase-firestore-compat.js'],
  ['firebase/firebase-storage-compat.js', 'firebase/firebase-storage-compat.js'],
  ['chart.js/dist/chart.umd.min.js', 'chartjs/chart.umd.min.js'],
  ['mammoth/mammoth.browser.min.js', 'mammoth/mammoth.browser.min.js'],
  ['@fortawesome/fontawesome-free/css/all.min.css', 'fontawesome/css/all.min.css']
];

const vendorRoot = path.resolve('public/vendor');
for (const [sourceRelative, destinationRelative] of copies) {
  const destination = path.join(vendorRoot, destinationRelative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.resolve('node_modules', sourceRelative), destination);
}

const fontSource = path.resolve('node_modules/@fortawesome/fontawesome-free/webfonts');
const fontDestination = path.join(vendorRoot, 'fontawesome/webfonts');
fs.mkdirSync(fontDestination, { recursive: true });
for (const filename of fs.readdirSync(fontSource)) {
  fs.copyFileSync(path.join(fontSource, filename), path.join(fontDestination, filename));
}
