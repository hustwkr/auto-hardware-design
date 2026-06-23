# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Electrolytic capacitor lifetime calculator (Arrhenius + Miner) and creepage/clearance safety distance calculator (IEC 62109-1 / UL 840 / UL 1741). Bilingual (Chinese primary, English secondary) engineering tool for power electronics hardware design.

## Commands

```bash
# Start backend server (serves static files + admin API)
cd backend && node server.js
# Server requires ADMIN_PASSWORD env var or backend/.env (≥8 chars)
# Calculator: http://localhost:8080/   Admin: http://localhost:8080/admin

# Offline mode: just open index.html in a browser (no server needed)

# No build step, no test runner, no linter configured
```

## Architecture

### Frontend — zero-dependency, no bundler, no framework

All JS uses IIFE module pattern exposing to `window`. Script load order in `index.html` matters: models first, then UI modules, then `app.js`.

**Model layer** (`js/models/`): Pure calculation functions with zero DOM dependency. `window.CapacitorModel` and `window.SafetyModel` are the public APIs. These are the only files safe to unit test or port to other languages.

**UI layer** (`js/capacitor.js`, `js/safety.js`): DOM manipulation only. Reads inputs from the DOM, calls the model, writes results back. Report generation (web + Word export) lives here too.

**App shell** (`js/app.js`): Tab switching, defaults loading (server API → localStorage fallback), dark mode, auto-save debounce.

**Data flow**: UI module stores results on `window._cd` (capacitor) / `window._sd` (safety) → report generation reads those globals.

### Backend — zero external dependencies

`backend/server.js` is a single-file Node.js HTTP server with no npm packages. Static file serving, scrypt password hashing, HMAC-signed tokens, rate limiting, CSP headers, path traversal protection — all built-in.

`backend/defaults.json` is the persistent store for default calculator parameters. The admin dashboard (`/admin`) allows editing these via authenticated PUT.

### CSS Design System

`css/app.css` uses CSS custom properties (`:root` tokens) for colors, spacing, and typography. Dark mode via `[data-theme="dark"]` selector. Print styles in `@media print` block at the end.

## Conventions

- **Cache busting**: Manual `?v=N` query params on `<script>` and `<link>` tags. Bump the version number when modifying JS/CSS files.
- **Language**: UI text is Chinese-first. `sot(id)` helper safely reads `<select>` element selected option text (guards against `selectedOptions[0]` being undefined).
- **Event binding**: Inline `onclick` handlers for buttons (functions exposed to `window`). Event delegation via `document.addEventListener` for dynamic inputs.
- **Report export**: Word docs generated as HTML blobs with `application/msword` MIME type, saved via File System Access API with download fallback (`saveBlobWithDialog`).
- **Input validation**: UI layer clamps numeric inputs to valid ranges. Model layer returns `null` for invalid/empty input.
- **Engineering formulas**: Rendered via KaTeX CDN. LaTeX strings stored in `data-l` attributes on `.latex` spans.
