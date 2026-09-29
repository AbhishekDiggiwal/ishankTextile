# Ishank Textile Website

The deployed website consists of static pages in `public/`. Firebase provides authentication, Firestore records and Storage files. The separate `src/` Next.js application is not the Firebase Hosting entry point. Exact dependency versions are pinned in `package.json` and `package-lock.json`.

## Local checks

```sh
npm ci
npm run build:site
npm test -- --runInBand
npm run lint
npm run security:scan
npm run build
```

`build:site` regenerates Tailwind CSS and vendored libraries, including the document worker built from patched dependencies. Keep `public/vendor/mammoth/versions.json`, license files and generated JavaScript together. Updating only Mammoth's installed dependencies does not repair an already shipped browser bundle.

`npm run dev` serves the optional Next.js app. To review the actual website, serve `public/` using a loopback-only preview with a separate Firebase demo-project emulator configuration. Block production authentication, Firestore and Storage at the preview boundary; never use production configuration for disposable tests. The audit preview uses ports 3000 and 3001 for modified and original pages, and Auth/Firestore/Storage emulators on 9099/8080/9199. This preview infrastructure is deliberately outside the production application.

## Data protection

- Backups contain all managed Firestore collections, both public settings documents, raw document IDs and typed values, plus the saved browser visit history. Storage links are preserved; file bytes require a separate Storage backup.
- Restore adds missing database records only. Existing records, settings, files and browser visit history remain unchanged. Incomplete older exports are rejected rather than treated as empty data.
- Restore and reset use one atomic database transaction, limited to 500 writes and an 8 MB client preflight budget. Larger operations stop without mutation and require a separately reviewed recovery process.
- Reset downloads a recovery backup, checks for concurrent changes and requires confirmation. It resets catalogue, inquiry and certificate records; it retains Storage files, policies, general settings and browser history. A restore does not overwrite the default records created by reset.
- Legacy fields are preserved on unrelated admin edits. A missing legacy record that fails current create rules requires review before restoration; the whole restore fails without partial writes.
- Removing a certificate record retains its file, protecting shared links and recovery backups. Existing files are never automatically garbage-collected.
- Visitor statistics are browser-local and may include historical sample records from older versions. No new sample traffic or customer inquiries are generated.

## Admin mobile app

The existing admin login and dashboard can be installed as **Ishank Admin**. Only those pages link the app manifest. Its scope, ./admin-, includes both existing admin paths with or without .html; public catalogue, contact and About pages stay outside the installed app.

After a separately authorized HTTPS release, open the admin login page on the phone. On Android Chrome, use the browser menu to install or add to the home screen. On iPhone Safari, use Share → Add to Home Screen and open it as a web app when offered. Browser wording varies. Launching the icon opens the existing dashboard and its normal authorization check; a signed-out admin goes through the existing login form.

This is an online admin app. It adds no service worker, offline cache, queued writes, permissions, or new login persistence. Firebase sessions, uploads, downloads, rules and records keep their existing behavior. Closing the session may require signing in again. The browser supplies installation controls; no install banner or dashboard layout changes were added.

public/admin-manifest.json supplies the name, scope and standalone window. public/admin-icon.svg embeds the exact existing logo bytes for scalable icons; the existing PNG and Apple touch icon remain available. No original media is modified. HTTPS or a loopback development origin is required for installation; an ordinary HTTP LAN address is insufficient. Actual Android/iOS installation remains a device acceptance check.

The [web app manifest scope specification](https://www.w3.org/TR/appmanifest/#nav-scope) uses URL-prefix matching. See [installability requirements](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) and [scalable manifest icons](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons). Service workers are optional for this online installation model.

## Release guidance

Build and review Hosting assets and rule changes as one release. A frontend using exact inquiry retries needs the matching Firestore replay rule; deploying only those assets leaves retries unable to acknowledge an earlier successful write. Follow `SECURITY.md` for the reviewed release commands and authorization checks. Ordinary Hosting-only changes do not require unrelated rule deployment, but a change to rules must be reviewed and released explicitly with its dependent code.

The local audit does not deploy, push, migrate data, rotate credentials or verify live project settings. Confirm the target Firebase project and take operational backups before any separately authorized release. The repository has an automatic push hook: keep audit changes uncommitted.

## Structure

- `public/`: actual website, page scripts, images and vendored browser assets.
- `firestore.rules`, `storage.rules`, `firestore.indexes.json`: backend access controls and indexes.
- `scripts/`: static asset generation and repository checks.
- `tests/`: compatibility and targeted regression checks. Mock tests do not prove rule enforcement; use real emulators as well.
- `src/`: optional Next.js application.
