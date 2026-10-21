FROM php:8.4-fpm

# System deps for Postgres, zip, and git (composer needs git for some packages)
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpq-dev \
    libzip-dev \
    zip \
    unzip \
    && docker-php-ext-install pdo pdo_pgsql zip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Node 22 (LTS) via NodeSource, then install pnpm globally via npm.
# We use npm here because it ships with Node — no install script needed.
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm

# Pull in Composer from its own official image rather than installing it manually.
# This is the canonical pattern — keeps Composer version consistent and image lean.
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy application source (respects .dockerignore — vendor/, node_modules/, .env excluded)
COPY . .

# Ensure required Laravel directories exist before composer install runs,
# because Git does not track empty directories!
RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache

# PHP dependencies — no dev packages in prod, pre-generate class map for faster autoloading
# We pass a dummy APP_KEY here because Laravel's package:discover script will crash if it's completely missing during the build.
RUN APP_KEY="AckfSECXIvnK5r28GVIWUAxmbBSjTsmF" composer install --no-dev --optimize-autoloader

# Fix storage and cache permissions so php-fpm (running as www-data) can write to them
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# JS dependencies + build — output lands in public/build/
# This is what nginx will serve as static assets
RUN pnpm install --frozen-lockfile && pnpm run build

# Runtime hardening — added after composer/pnpm so the build itself isn't restricted
COPY docker/php/zz-hardening.ini /usr/local/etc/php/conf.d/zz-hardening.ini
COPY docker/php/zz-hardening.conf /usr/local/etc/php-fpm.d/zz-hardening.conf

# Expose FastCGI port (only reachable within the Docker network — never published to the host)
EXPOSE 9000

CMD ["php-fpm"]
