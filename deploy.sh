#!/usr/bin/env bash
#
# Laravel Forge deploy script.
#
# Paste the body of this file into the site's "Deploy Script" box in the Forge UI,
# or call it from there with `bash deploy.sh`. Forge runs the script from the site
# root, which is this repository root, after it has already pulled the latest commit.
#
# See docs/DEPLOYMENT.md for site setup (web directory, Nginx, queue daemons).

set -euo pipefail

# --- Backend -----------------------------------------------------------------
cd backend

composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Signals running queue workers to exit after their current job so they pick up
# the new code. Supervisor restarts them automatically.
php artisan queue:restart

# --- Frontend ----------------------------------------------------------------
cd ../frontend

# `npm ci` installs devDependencies too, which the build needs (`tsc && vite build`).
# Do not set NODE_ENV=production before this step.
npm ci
npm run build

# The built SPA is served from the Laravel public directory (same-origin strategy).
# `assets/` is cleared first so hashed bundles from previous deploys do not pile up.
# This never touches Laravel's own public files (index.php, .htaccess, storage symlink).
rm -rf ../backend/public/assets
cp -R dist/. ../backend/public/

# --- Restarts (performed by Forge, not by this script) -----------------------
#
# PHP-FPM reload. Forge injects this line automatically when you enable
# "Restart FPM" on the deploy script, and it needs the sudo password Forge holds:
#
#   ( flock -w 10 9 || exit 1; echo 'Restarting FPM...'; sudo -S service php8.2-fpm reload ) 9>/tmp/fpmlock
#
# Queue workers are managed as Forge Daemons (Supervisor). Configure one per site
# under Server > Daemons, then Forge/Supervisor handles restarts:
#
#   php /home/forge/<site>/backend/artisan queue:work --sleep=3 --tries=3 --timeout=90
#   sudo supervisorctl restart <daemon-name>:*
#
# Laravel's scheduler runs from Forge > Scheduler (or a system cron entry):
#
#   php /home/forge/<site>/backend/artisan schedule:run
