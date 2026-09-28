FROM nginx:1.24.0-alpine

# Set default app path to internal, but allow overriding during build
ARG BUILD_PATH=apps/internal/build

# Copy build output from the specified app path
COPY ${BUILD_PATH}/ /usr/share/nginx/html

# Copy nginx config
COPY server-conf/ /etc/nginx/conf.d

# Copy entrypoint script to a safe location
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# Convert line endings to LF and make executable
RUN apk add --no-cache dos2unix \
    && dos2unix /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 80

# Use the stable path as entrypoint
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
