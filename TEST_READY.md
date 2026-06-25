# Static Front-End and Data Manager Test Suite

This test suite provides comprehensive test coverage for the static front-end and browser data manager components using Jest and JSDOM.

## Tested Features

1. **Feature 1: DataManager (`data-manager.js`)**
   - Offline & online caching mechanisms.
   - Firestore writes and reads.
   - Timeout conditions using `Promise.race` and fallback behavior.
   - LocalStorage backup storage.

2. **Feature 2: Admin Authentication (`admin-login.html`)**
   - Firebase Auth integration happy paths.
   - Local/Offline credentials fallback handling (`admin@ishanktextile.com` / `admin123`).
   - Detailed Firebase Auth error code translations (e.g., wrong password, user not found, invalid email).

3. **Feature 3: Catalog Search & Filters (`products-catalogue.html`)**
   - Category collections card list rendering.
   - Desktop and mobile keyword searches.
   - Price sliders, specifications matching.
   - Full list resets and fallback empty states.

4. **Feature 4: Quote Form Submission (`contact.html`)**
   - Validation rules (name, format, email structure).
   - Dynamic product query parameter prepopulation.
   - Storage-based session recovery (`sessionStorage` checks).
   - Escape controls for confirmation modals.
   - Simulated Indian Standard Time (IST) business operational checks.

---

## Test Organization

The tests are categorized into 4 tiers in the `tests/` directory:

- **Tier 1: Feature Coverage** (`tests/data-manager.test.js`, `tests/auth.test.js`, `tests/catalog.test.js`, `tests/quote.test.js`):
  Ensures basic functionality works as expected. Contains `>= 20` assertions.
- **Tier 2: Boundary & Corner Cases** (same files):
  Validates input validation, database failure fallbacks, timeout handling, and edge cases. Contains `>= 20` assertions.
- **Tier 3: Cross-Feature Combinations** (`tests/combinations.test.js`):
  Ensures complex combinations work (e.g., search + category checkbox + price filter simultaneously, login to dashboard navigation, dashboard category modifications). Contains `>= 4` test cases.
- **Tier 4: Real-World Application Scenarios** (`tests/scenarios.test.js`):
  End-to-end simulated flows (e.g., User discovers product -> filters -> requests quote -> submits form -> database records quote). Contains `>= 5` test cases.

---

## How to Run the Tests

### 1. Install Dependencies
Run the following command to install `jest` and `jest-environment-jsdom`:
```bash
npm install
```

*(Note: On Windows PowerShell, if you encounter script execution policy errors, use `cmd.exe /c "npm install"`)*

### 2. Execute Tests
Run the test command:
```bash
npm run test
```

*(Or use `cmd.exe /c "npm run test"` if PowerShell script execution is disabled).*
