# Dockerfile (dev)
FROM php:8.1-apache-bookworm

# Paquetes base + deps para GD y extensiones PHP
RUN set -eux; \
  apt-get update && apt-get install -y --no-install-recommends \
    git unzip zip \
    libzip-dev libicu-dev \
    apt-transport-https ca-certificates curl gnupg2 \
    unixodbc-dev \
    # Deps de GD:
    libpng-dev libjpeg62-turbo-dev libfreetype6-dev libwebp-dev \
    $PHPIZE_DEPS \
  ; \
  # Config/instalación de extensiones PHP
  docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp; \
  docker-php-ext-install -j"$(nproc)" gd intl zip opcache; \
  \
  # Apache -> /public
  a2enmod rewrite headers; \
  sed -ri 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/000-default.conf; \
  printf '<Directory "/var/www/html/public">\n AllowOverride All\n</Directory>\n' > /etc/apache2/conf-available/laravel.conf; \
  a2enconf laravel; \
  \
  rm -rf /var/lib/apt/lists/*

# MSSQL ODBC + tools (sin apt-key, con keyring)
RUN set -eux; \
  mkdir -p /etc/apt/keyrings; \
  curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /etc/apt/keyrings/microsoft.gpg; \
  chmod 644 /etc/apt/keyrings/microsoft.gpg; \
  echo "deb [arch=amd64,arm64 signed-by=/etc/apt/keyrings/microsoft.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" \
    > /etc/apt/sources.list.d/mssql-release.list; \
  apt-get update; \
  ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 mssql-tools18; \
  echo 'export PATH="$PATH:/opt/mssql-tools18/bin"' > /etc/profile.d/mssql-tools.sh; \
  rm -rf /var/lib/apt/lists/*
ENV PATH="/opt/mssql-tools18/bin:${PATH}"

# Extensiones PECL de SQL Server
RUN set -eux; \
  pecl install sqlsrv pdo_sqlsrv; \
  docker-php-ext-enable sqlsrv pdo_sqlsrv; \
  apt-get purge -y --auto-remove gnupg2; \
  rm -rf /var/lib/apt/lists/*

# Composer dentro del contenedor
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
EXPOSE 80

# Healthcheck simple
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1/ || exit 1
