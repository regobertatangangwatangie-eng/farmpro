# Simple Dockerfile demonstrating most Dockerfile instructions
# Base image
FROM nginx:1.25-alpine

# Metadata
LABEL maintainer="dev@farmpro.example" \
      org.opencontainers.image.source="https://github.com/your-org/farmpro"

# Build args
ARG APP_ENV=production

# Environment variables
ENV APP_ENV=${APP_ENV} \
    NGINX_PORT=80

# Use shell form for following RUNs
SHELL ["/bin/sh", "-c"]

# Working directory
WORKDIR /usr/share/nginx/html

# Install a tiny tool to allow healthchecks in this demo image
RUN apk add --no-cache curl \
 && mkdir -p /var/log/nginx

# Copy local nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Add docs directory (demonstrates ADD with local directory)
ADD docs/ /usr/share/nginx/html/docs/

# Copy static site content
COPY static/ /usr/share/nginx/html/

# Expose port
EXPOSE 80

# Create a persistent volume for cache/logs
VOLUME ["/var/cache/nginx"]

# Use a non-root user (nginx image ships with user 101)
USER 101

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -f http://localhost:${NGINX_PORT} || exit 1

# Stop signal
STOPSIGNAL SIGTERM

# Entrypoint + default command
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
