# Deployment (Laravel Forge)

Production runs natively on a shared VPS — PHP-FPM and Nginx managed by Laravel Forge,
alongside other Laravel products on the same server. There is no Docker anywhere in this
stack. For running the project on your own machine, see the **Local Development Setup**
section in the root [`README.md`](../README.md) instead; this document covers production only.

This is a **single Laravel + Inertia application**: the React frontend is compiled into
`public/build` by Vite and served by the same Laravel app that serves the data. One
repository, one Forge site, one deploy. There is no separate frontend site to configure.

## 1. Server prerequisites

These are shared with the other products on the VPS and should already exist:

| Component | Notes |
|---|---|
| PHP 8.2+ with `pdo_pgsql` | Required by `composer.json` |
| PostgreSQL | Shared instance, listening on **port 5433** |
| Redis | Listening on `127.0.0.1:6379` |
| Node.js 20+ and npm | Needed on the server because assets are built during deploy |
| Composer 2 | |

Create a dedicated database and role for this app on the shared PostgreSQL instance —
do not reuse another product's database:

```sql
CREATE ROLE crm WITH LOGIN PASSWORD '<strong-password>';
CREATE DATABASE crm OWNER crm;
```

## 2. Site setup in Forge

Create the site and leave **Web Directory** at Forge's default:

```
/public
```

Since the Laravel app now lives at the repository root, the default is correct — no
custom web directory is needed.

### Deployment strategy

Forge enables **zero-downtime deployments** by default for new sites, and this can only
be chosen at site creation. Either strategy works with this layout:

- **Zero-downtime** — each release is cloned into `releases/` and symlinked. Forge shares
  the `.env` automatically. Add `storage` as a shared path so uploads and logs persist.
  No FPM reload is needed. `npm ci` runs against a cold cache each deploy, so builds are
  slower.
- **Standard** — in-place `git pull` against the live directory. Faster, but the site can
  serve a half-updated state for a few seconds mid-deploy.

## 3. Environment file

Because the Laravel app is at the repository root, Forge's **Environment** tab edits the
correct file (`.env` at the site root) with no extra configuration.

`.env.example` ships with production-shaped defaults:

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
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan queue:restart
npm ci
npm run build
```

Note there are no `cd` steps any more — every command runs at the repository root.

The script uses `$FORGE_PHP` and `$FORGE_COMPOSER` so the site's configured PHP version is
always used. Enable **Restart FPM** in Forge for standard deployments; it is unnecessary
with zero-downtime deployments.

### Queue workers and scheduler

Configure under **Server > Daemons**:

```
php /home/forge/<site>/artisan queue:work --sleep=3 --tries=3 --timeout=90
```

And under **Site > Scheduler** (or a cron entry running every minute):

```
php /home/forge/<site>/artisan schedule:run
```

The scheduler drives `SendTaskReminders`, `ProcessContractExpiry`,
`GeneratePerformanceSnapshots`, and `SyncAllEmailAccounts`.

## 5. Assets

`npm run build` compiles `resources/js` and `resources/css` into `public/build`, and Laravel's
`@vite` directive in `resources/views/app.blade.php` resolves the hashed filenames from the
generated manifest. Nothing needs to be copied by hand, and `public/build` is gitignored —
it is produced on the server during every deploy.

Inertia resolves page components lazily, so each page under `resources/js/Pages` is emitted
as its own chunk rather than one large bundle.

The Vite dev server is a local-only tool and is never run in production.

### Nginx

No custom Nginx configuration is required. Inertia routes are real Laravel routes, so
Forge's default `try_files $uri $uri/ /index.php?$query_string;` handles deep links
correctly. (This is a simplification over the previous SPA layout, which needed an
`/index.html` fallback.)

## 6. Post-deploy checks

```bash
curl -sS https://<domain>/up                     # Laravel health endpoint
curl -sS https://<domain>/api/v1/docs/openapi    # third-party API reachable
```

Then load the site in a browser and navigate to a deep link to confirm routing works.

## 7. The third-party API

`routes/api.php` is still fully wired and is **not** superseded by Inertia. It serves
consumers outside this application's own UI — mobile clients (`sync/delta`), API-key
integrations, the webhook ecosystem, SSO provider callbacks, and the published OpenAPI
spec — authenticated with tokens rather than sessions. It deploys with the same app and
needs no separate configuration.
