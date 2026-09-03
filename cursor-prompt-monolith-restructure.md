Restructure this project from separate `backend/` and `frontend/` folders into a single Laravel + Inertia.js monolith. This should match the architecture already used in another one of my products, CRF-ERP (Laravel 11 + Inertia.js + React, single deploy, session-based auth). Do this migration carefully and incrementally — this is a structural refactor, not a rewrite. Do not change business logic, database schema, or migrations.

## Current structure
```
/backend    ← Laravel API app
/frontend   ← separate React/Vite SPA calling the backend API
```

## Target structure
A single Laravel app at the repo root, with the React frontend living inside it as Inertia pages/components:
```
/app
/routes
  web.php       ← Inertia pages, session auth (my own UI)
  api.php       ← reserved for future third-party API endpoints (Sanctum), not needed yet — leave mostly empty with a placeholder comment
/resources
  /js           ← React components, moved from frontend/src
    /Pages      ← Inertia page components
    /Components ← shared React components
/public
/database
/config
composer.json
package.json    ← merged frontend + backend JS dependencies
vite.config.js  ← configured for Laravel + Inertia (laravel-vite-plugin)
```

## Steps

1. **Move the Laravel app to the repo root**
   - Move everything currently in `backend/` up to the repository root (`app/`, `routes/`, `database/`, `config/`, `public/`, `composer.json`, `.env.example`, etc.)
   - Resolve any path collisions with existing root-level files (e.g. `docker-compose.yml`, `README.md` — docker-compose.yml should already be removed per earlier cleanup; if still present, delete it).

2. **Install Inertia.js in the Laravel app**
   - Add `inertiajs/inertia-laravel` via Composer.
   - Add `@inertiajs/react`, `react`, `react-dom`, and `laravel-vite-plugin` via npm.
   - Set up `app/Http/Middleware/HandleInertiaRequests.php` and register it in the `web` middleware group.
   - Configure `resources/views/app.blade.php` as the Inertia root template.

3. **Migrate frontend code into `resources/js`**
   - Move React components from `frontend/src/` into `resources/js/`, organizing route-level components into `resources/js/Pages/` (Inertia's convention — each Page component maps to a controller's `Inertia::render('PageName')` call) and shared/reusable components into `resources/js/Components/`.
   - Convert the frontend's existing API-calling logic (fetch/axios calls to backend REST endpoints) into standard Laravel controllers returning `Inertia::render(...)` with props, since Inertia removes the need for a separate JSON API layer for first-party pages.
   - Preserve all existing UI/UX and component behavior — this is a data-flow and routing change, not a redesign.

4. **Routing**
   - Convert existing frontend routes (react-router or similar) into Laravel `routes/web.php` entries, each pointing to a controller method that renders the corresponding Inertia page.
   - Keep authenticated routes behind the existing Laravel auth middleware (session-based, not token-based).
   - Create `routes/api.php` with a single placeholder comment noting it's reserved for future third-party API endpoints (Sanctum-authenticated), not implemented yet.

5. **Build tooling**
   - Merge `frontend/package.json` dependencies into a single root `package.json`.
   - Configure `vite.config.js` using `laravel-vite-plugin`, pointing at `resources/js/app.jsx` (or `.js`) as the entry, with the Inertia/React plugins registered.
   - Remove the old Vite dev-server-only setup (port 5173 standalone) — Vite now runs through Laravel's asset pipeline (`npm run dev` via Laravel Vite integration, `npm run build` for production assets served through `public/build`).

6. **Environment config**
   - Update `.env.example` to remove any `VITE_API_URL` variable pointing at a separate backend origin — Inertia pages are served same-origin now, so this is no longer needed. Any remaining Vite env vars should use the `VITE_` prefix Laravel expects.

7. **Delete the old `frontend/` folder** once its contents have been fully migrated and verified working — but only after confirming nothing is missed (list anything you skipped or couldn't cleanly migrate).

8. **Update `docs/DEPLOYMENT.md`** (created in an earlier migration) to remove the "separate frontend site" option entirely, since there's now only one deployable unit. The Forge deploy script becomes:
   ```
   composer install --no-dev --optimize-autoloader
   php artisan migrate --force
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   npm ci
   npm run build
   ```
   followed by the usual PHP-FPM/queue worker restarts via Forge/Supervisor.

9. **Update `README.md`** to reflect the new single-app structure and simplified local dev setup (one `composer install`, one `npm install`, `php artisan serve` + `npm run dev` run alongside each other, no separate frontend server process).

## After finishing
Summarize what was moved, what was converted (API endpoints → Inertia controllers, routes, etc.), and flag anything ambiguous you had to make a judgment call on — especially:
- Any frontend routes that don't map cleanly to a single backend controller/page
- Any API endpoints that were serving something other than this frontend (e.g. webhooks, third-party callbacks) — these should stay in `routes/api.php` rather than being converted to Inertia pages
- Any frontend state management (Redux/Zustand/etc.) that assumed a fully client-side SPA and may need adjustment now that Inertia handles page data via props
