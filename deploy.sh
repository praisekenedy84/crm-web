#!/usr/bin/env bash
#
# Laravel Forge deploy script.
#
# Paste the body of this file into the site's "Deploy Script" box in the Forge UI,
# or call it from there with `bash deploy.sh`. Forge runs the script from the site
# root, which is this repository root, after it has already pulled the latest commit.
#
# This is a single Laravel + Inertia application: one repo, one site, one deploy.
# See docs/DEPLOYMENT.md for site setup (web directory, queue daemons, scheduler).

set -euo pipefail

# $FORGE_PHP / $FORGE_COMPOSER resolve to the PHP version configured for this site.
# Fall back to the bare binaries when running the script outside Forge.
PHP="${FORGE_PHP:-php}"
COMPOSER="${FORGE_COMPOSER:-composer}"

# --- Backend -----------------------------------------------------------------
$COMPOSER install --no-dev --optimize-autoloader --no-interaction

$PHP artisan migrate --force
$PHP artisan config:cache
$PHP artisan route:cache
$PHP artisan view:cache

# Signals running queue workers to exit after their current job so they pick up
# the new code. Supervisor restarts them automatically.
$PHP artisan queue:restart

# --- Frontend ----------------------------------------------------------------
# `npm ci` installs devDependencies too, which the build needs (`tsc && vite build`).
# Do not set NODE_ENV=production before this step.
# Output is written to public/build and served by Laravel's @vite directive.
npm ci
npm run build

# --- Restarts (performed by Forge, not by this script) -----------------------
#
# PHP-FPM reload. Forge injects this line automatically when you enable
# "Restart FPM" on the deploy script, and it needs the sudo password Forge holds:
#
#   ( flock -w 10 9 || exit 1; echo 'Restarting FPM...'; sudo -S service php8.2-fpm reload ) 9>/tmp/fpmlock
#
# Not required if the site uses Forge's zero-downtime deployments, since each
# release is deployed into a new, uncached directory.
#
# Queue workers are managed as Forge Daemons (Supervisor). Configure one per site
# under Server > Daemons, then Forge/Supervisor handles restarts:
#
#   php /home/forge/<site>/artisan queue:work --sleep=3 --tries=3 --timeout=90
#   sudo supervisorctl restart <daemon-name>:*
#
# Laravel's scheduler runs from Forge > Scheduler (or a system cron entry):
#
#   php /home/forge/<site>/artisan schedule:run
