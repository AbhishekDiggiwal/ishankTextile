# Original User Request

## Initial Request — 2026-06-25T11:22:42+05:30

Verify the entire repository (root static HTML/JS files and the Next.js `src` folder), identifying and resolving code issues, optimizing performance, and removing redundancies without modifying any UI-UX design or breaking existing functionality.

Working directory: c:\Users\Admin\Documents\Codex\2026-05-14\i-have-a-website-at-github
Integrity mode: development

## Requirements

### R1. Repository-Wide Code Auditing & Bug Fixes
Audit all files in the repository (including static HTML files like `products-catalogue.html`, `admin-dashboard.html`, `index.html`, and React/Next.js files inside the `src` folder) for bugs, syntax errors, or logic issues and fix them.

### R2. Code Optimization & Redundancy Cleanup
Optimize algorithms, database calls, dynamic caching, and code structure. Identify and safely remove dead/redundant code blocks without breaking the application's runtime behavior.

### R3. UI-UX and Functional Integrity Preservation
Preserve all visual layout spacing, styling, colors, responsiveness, fonts, and user flows exactly. Do not make any design changes.

## Verification & Test Plan

### Static & Dynamic Testing
- All pages must load and function without any JavaScript console errors or build compilation errors.
- Verify admin dashboard logic directly via code-level unit testing/mocks, checking validation paths, and database query structures.

### Agent-as-Judge UI Integrity Review
- An independent auditor agent will compare the layout structure, CSS classes, styles, and visual components before and after optimization to verify that the UI-UX design is 100% unchanged.

## Acceptance Criteria

### Verification & Stability
- [ ] No JavaScript runtime or console errors across all pages (`index.html`, `about.html`, `products-catalogue.html`, `admin-dashboard.html`).
- [ ] The Next.js project inside the `src` directory builds successfully without compilation errors.
- [ ] Visual regression assessment by the auditor agent confirms that layout, padding, font sizes, alignments, and styles match the original layout exactly.
- [ ] Confirmed that all Firestore queries, validation rules, and page routing logic operate correctly with zero behavior degradation.
