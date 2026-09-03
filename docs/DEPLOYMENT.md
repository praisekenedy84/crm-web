# Deployment (Laravel Forge)

Production runs natively on a shared VPS — PHP-FPM and Nginx managed by Laravel Forge,
alongside other Laravel products on the same server. There is no Docker anywhere in this
stack. For running the project on your own machine, see the **Local Development Setup**
section in the root [`README.md`](../README.md) instead; this document covers production only.

## 1. Server prerequisites

These are shared with the other products on the VPS and should already exist:

| Component | Notes |
|---|---|
| PHP 8.2+ with `pdo_pgsql` | Required by `composer.json` |
| PostgreSQL | Shared instance, listening on **port 5433** |
| Redis | Listening on `127.0.0.1:6379` |
| Node.js 20+ and npm | Needed on the server because the frontend is built during deploy |
| Composer 2 | |

Create a dedicated database and role for this app on the shared PostgreSQL instance —
do not reuse another product's database:

```sql
CREATE ROLE crm WITH LOGIN PASSWORD '<strong-password>';
CREATE DATABASE crm OWNER crm;
```

## 2. Site setup in Forge

Create the site, then set **Web Directory** to:

```
/backend/public
```

This is the critical setting. Forge defaults to `/public`, which does not exist at this
repository root — the Laravel app lives in `backend/`, so the document root must point at
`backend/public`.

## 3. Environment file

Forge stores the `.env` for the site, but it must live at `backend/.env`, not the repo root.
Use Forge's **Environment** editor if the site path resolves there, otherwise create it once
over SSH by copying `backend/.env.example` and filling in the blanks.

`backend/.env.example` already ships with production-shaped defaults:

```
APP_ENV=production
APP_DEBUG=false
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5433
```

You must fill in per-environment values that are deliberately left blank:

- `APP_KEY` — generate once with `php artisan key:generate` (never reuse another site's key)
- `APP_URL` — the real site domain
- `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` — the role created in step 1
- `REDIS_PASSWORD` — leave as `null` if the shared Redis has no auth

**Port reminder:** production uses `DB_PORT=5433` because the shared VPS instance was moved
off the default port to avoid clashing with another service. A stock local PostgreSQL install
uses **5432**. Do not copy a production `.env` onto a dev machine without changing the port.

## 4. Deploy script

Paste the contents of [`deploy.sh`](../deploy.sh) into Forge's **Deploy Script** box, or set
the box to `bash deploy.sh`. It performs:

```
cd backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan queue:restart
cd ../frontend
npm ci
npm run build
```

followed by copying the built `dist/` into `backend/public` (see step 5).

Enable **Restart FPM** in Forge so it appends the FPM reload after the script. Queue workers
are restarted by Supervisor once `php artisan queue:restart` has signalled them.

### Queue workers and scheduler

Configure under **Server > Daemons**:

```
php /home/forge/<site>/backend/artisan queue:work --sleep=3 --tries=3 --timeout=90
```

And under **Site > Scheduler** (or a cron entry running every minute):

```
php /home/forge/<site>/backend/artisan schedule:run
```

The scheduler drives `SendTaskReminders`, `ProcessContractExpiry`,
`GeneratePerformanceSnapshots`, and `SyncAllEmailAccounts`.

## 5. Serving the frontend

The frontend is a Vite SPA that builds to a static `frontend/dist/` folder. The Vite dev
server (port 5173) is **development only** and is never run in production.

There are two viable strategies. **This repository is currently configured for option A.**

### Option A — single deployed app (current choice)

`deploy.sh` copies `frontend/dist/` into `backend/public/` after the build, so one Forge site
serves both the SPA and the API from the same origin. `frontend/.env.production` therefore
leaves `VITE_API_URL` empty, and `frontend/src/lib/api.ts` falls back to relative `/api/v1`
requests. No CORS configuration is needed.

The one thing this requires is an Nginx SPA fallback, because client-side routes such as
`/contacts` are not registered in `routes/web.php` and would otherwise hit Laravel and 404.
Edit the site's Nginx config in Forge and make the location blocks read:

```nginx
location /api {
    try_files $uri $uri/ /index.php?$query_string;
}

location / {
    try_files $uri $uri/ /index.html;
}
```

Keep Forge's existing `location ~ \.php$ { ... fastcgi ... }` block untouched — it is what
actually executes `index.php`. Also keep `index index.html index.htm index.php;` so that `/`
resolves to the SPA shell.

If you also expose `/up` (the Laravel health check) or `/storage`, add matching `location`
blocks that fall through to `/index.php?$query_string`.

### Option B — separate static site on a subdomain

Serve the API from `api.example.com` (web directory `/backend/public`) and the SPA from
`app.example.com` as its own Forge site with web directory pointing at `frontend/dist`.

To switch to this, you must:

1. Set `VITE_API_URL=https://api.example.com` in `frontend/.env.production` and rebuild.
2. Remove the `cp -R dist/. ../backend/public/` step from `deploy.sh`.
3. Configure CORS on the API so `app.example.com` is an allowed origin.
4. Add the SPA fallback (`try_files $uri $uri/ /index.html;`) on the frontend site instead.

Auth uses bearer tokens from `localStorage` rather than cookies, so cross-origin does not
require cookie/domain configuration — but it does require the CORS headers in step 3.

## 6. Post-deploy checks

```bash
curl -sS https://<domain>/up                     # Laravel health endpoint
curl -sS https://<domain>/api/v1/docs/openapi    # API reachable
```

Then load the site in a browser and hard-refresh a deep link (for example `/contacts`) to
confirm the SPA fallback in step 5 is working.
