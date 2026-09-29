# Firebase architecture and recovery

The Firebase migration is already implemented. Public pages read active catalogue records and public settings; inquiries are validated on create. Administrators use Firebase Auth for Firestore and Storage operations. `firebase-config.js` receives web configuration from Hosting at runtime. Firebase web configuration identifies the project and is not an administrator secret; signed authentication claims and backend rules enforce access.

There is no pending localStorage-to-Firestore migration to run. Browser storage still holds local visit counters, offline preview data and non-PII inquiry retry receipts. Never upload local sample data into production as part of this audit.

See `README.md` for local emulators, complete record backups, restore limits and file retention. See `SECURITY.md` for backend authorization and release guidance. New backup imports add missing records only; they do not replace existing data or move uploaded files.

The deployed project's rules, authentication settings, bucket policies and live website require a separate authorized review. Local emulator results describe only the rule files in this checkout.
