#!/usr/bin/env bash
set -e

# Copiamos el código del build (imagen) al runtime dir (persistente si montas volúmenes)
rsync -a --delete /opt/app/ /var/www/html/

cd /var/www/html

# .env y APP_KEY (si no existen)
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp .env.example .env
fi

if ! grep -q "^APP_KEY=base64:" .env; then
  php artisan key:generate --force || true
fi

# Permisos mínimos
chown -R www-data:www-data storage bootstrap/cache
find storage -type d -exec chmod 775 {} \; || true
find storage -type f -exec chmod 664 {} \; || true
chmod -R 775 bootstrap/cache || true

# Caches Laravel
php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

# Arrancar php-fpm + nginx
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
