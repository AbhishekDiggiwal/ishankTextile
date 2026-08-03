# Security and deployment

## Repository rules

- Never commit `.firebaserc`, `.env*`, service-account JSON, private keys, API
  secrets, passwords, or exported customer data.
- Firebase Hosting supplies the public web-app configuration at runtime through
  `/__/firebase/init.js`; `public/firebase-config.js` must not contain project
  identifiers.
- Browser dependencies are pinned in `package-lock.json` and copied from
  `node_modules` by `npm run build:site`. Do not add executable CDN scripts.

## Firebase production checklist

1. Confirm the existing administrator account has a verified email before
   deployment. Assign the `admin: true` custom claim only to approved
   administrator accounts. Until that claim is present, the exact-email
   compatibility fallback requires Firebase's signed `email_verified` claim.
2. Enable Firebase Authentication email-enumeration protection, enforce a strong
   password policy, remove unused sign-in providers, and review authorized domains.
3. Keep the public inquiry schema tightly restricted in Firestore rules. The
   form also uses a honeypot, field validation, bounded input sizes, and a short
   browser cooldown. If stronger automated-abuse protection becomes necessary,
   validate a challenge through a trusted backend before writing to Firestore;
   do not make legitimate inquiries depend on an unverified browser-only token.
4. Restrict the Firebase browser API key in Google Cloud to the production
   domains and only the required Firebase APIs. The browser key is public by
   design, but restrictions limit abuse.
5. Review the dry run, then deploy the checked-in Firestore, Storage, and Hosting
   configuration together.

## GitHub checklist

- Require pull requests and passing checks before changes reach the default branch.
- Enable secret scanning, push protection, dependency alerts, Dependabot security
  updates, and code scanning where available for the repository plan.
- Keep the repository public only if its source and full Git history are intended
  for public disclosure.

```powershell
npm ci
npm run lint
npm run build:site
npm test -- --runInBand
npm run build
firebase deploy --dry-run --only firestore:rules,storage,hosting
firebase deploy --only firestore:rules,storage,hosting
```

Deploying these rules does not delete Firestore documents or Storage objects.
Test reads, writes, uploads, and admin login against a non-production Firebase
project first whenever possible.

## Suspected exposure

Revoke or rotate any real secret immediately, then remove it from the current
tree. Because old commits remain downloadable, coordinate a Git history rewrite
and force-push separately if a genuine secret was committed. A history rewrite
changes commit IDs for every collaborator and must not be done casually.
