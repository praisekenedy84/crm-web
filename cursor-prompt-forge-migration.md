Migrate this project fully away from Docker Compose to a native Laravel + frontend stack, for BOTH local development and production. This app is deployed via Laravel Forge on a shared VPS that already runs other Laravel products natively (PHP-FPM/Nginx, no Docker), with a shared PostgreSQL instance on host port 5433. I want local dev and production to be consistent — no Docker anywhere in this repo going forward.

Repo layout: `backend/` (Laravel app) and `frontend/` (Vite-based JS app), currently orchestrated by a root `docker-compose.yml` meant only for local dev.

Please make the following changes:

1. **Backend environment config**
   - Update `backend/.env.example` (and confirm `.env` if present, without committing secrets) to use:
     - `APP_ENV=production`
     - `APP_DEBUG=false`
     - `DB_CONNECTION=pgsql`
     - `DB_HOST=127.0.0.1`
     - `DB_PORT=5433`
     - `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` as placeholders to be set per-environment (not hardcoded)
     - `REDIS_HOST=127.0.0.1` and `REDIS_PORT=6379` (or leave as placeholders if Redis config differs per environment)
   - Confirm `config/database.php` correctly reads these values with no Docker-specific assumptions (e.g. no hardcoded service names like `postgres` or `redis` as hosts).

2. **Frontend production build**
   - In `frontend/`, ensure there's a working `npm run build` script (via `vite build`) that outputs a static `dist/` folder.
   - Replace any hardcoded `VITE_API_URL: http://localhost:8000` usage with an environment variable read at build time (e.g. from `frontend/.env.production`), defaulting to a placeholder like `https://api.example.com` that I will replace with the real domain.
   - Do not run or reference the Vite dev server (port 5173) anywhere in production-related scripts or docs.

3. **Deploy script**
   - Create a `deploy.sh` (or update existing Forge deploy script reference) at the repo root or in `docs/` that reflects the commands to run in Forge's "Deploy Script" box:
     ```
     cd backend
     composer install --no-dev --optimize-autoloader
     php artisan migrate --force
     php artisan config:cache
     php artisan route:cache
     php artisan view:cache
     cd ../frontend
     npm ci
     npm run build
     ```
     followed by restarting PHP-FPM and any queue workers (list the Forge/Supervisor commands as comments since actual restart is done via Forge's UI/Supervisor config, not this script).

4. **Nginx / web root**
   - Add a short `docs/DEPLOYMENT.md` explaining that Forge's site "Web Directory" should point to `backend/public`, and that the built frontend `dist/` should either:
     a) be served as a separate static Forge site on a subdomain, or
     b) be copied into `backend/public` if this is meant to be a single deployed app.
   - Ask me to confirm which of these two frontend-serving strategies applies before assuming one; default to documenting both as options in the file.

5. **Remove Docker entirely, including for local development**
   - Delete `docker-compose.yml` and any Dockerfiles (`backend/Dockerfile`, `frontend/Dockerfile`) from the repo. I want local dev and production to run the same way — no Docker in either.
   - Update the root `README.md` with a "Local Development Setup" section that mirrors production:
     - Requires PHP, Composer, PostgreSQL, Redis, and Node installed natively (or via a tool like Laravel Valet/Herd on macOS, or native services on Linux) — not containers.
     - `cd backend && composer install && cp .env.example .env && php artisan key:generate`
     - Local Postgres: create a local database/user matching the `.env` values (document that locally this can run on the default port 5432 since there's no shared-server conflict, while production uses 5433 — call this out explicitly so it's not confused).
     - `php artisan migrate`
     - `php artisan serve` (or Valet/Herd equivalent) to run the backend
     - `cd frontend && npm install && npm run dev` for local frontend dev (Vite dev server is fine locally — it's only production that must use the built `dist/` output)
     - Point `VITE_API_URL` in `frontend/.env` (or `.env.local`) at the local backend URL (e.g. `http://localhost:8000`)
   - Add `docs/DEPLOYMENT.md` as previously described for the production-specific steps (Forge deploy script, web directory, frontend build/serve strategy), clearly separated from the local dev instructions in the README.

6. **Sanity checks**
   - Search the codebase for any remaining references to Docker service hostnames (`postgres`, `redis` as hostnames), Docker-specific ports, or `docker compose` commands in scripts, CI config, or docs, and remove or update them.
   - Confirm no `Dockerfile`, `.dockerignore`, or `docker-compose*.yml` files remain anywhere in the repo.
   - Do not change database schema, migrations, or business logic — this is a deployment/infrastructure-only migration.

After making these changes, summarize exactly what was modified, and list any decisions you made that I should double check (especially the frontend-serving strategy in step 4 and any DB/Redis credentials left as placeholders).
