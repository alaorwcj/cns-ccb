#!/usr/bin/env bash
# renew_nginx_proxy_certs.sh (repo copy)
# Run acme.sh --cron inside the acme-companion container and reload nginx-proxy

set -euo pipefail

COMPOSE_FILE="/root/app/cns-ccb/infra/docker-compose.nginx-proxy.yml"
ACME_CONTAINER_NAME="nginx-letsencrypt"
NGINX_PROXY_CONTAINER_NAME="nginx-proxy"

# Check docker available
if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found, skipping renewal." >&2
  exit 0
fi

# Check ACME container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${ACME_CONTAINER_NAME}$"; then
  echo "Container ${ACME_CONTAINER_NAME} not found or not running. Skipping renewal." >&2
  exit 0
fi

# Check nginx-proxy container (may be exited)
if ! docker ps -a --format '{{.Names}}' | grep -q "^${NGINX_PROXY_CONTAINER_NAME}$"; then
  echo "Container ${NGINX_PROXY_CONTAINER_NAME} not found. Skipping reload, but attempting cron if possible." >&2
  NGINX_PROXY_FOUND=0
else
  NGINX_PROXY_FOUND=1
fi

# Detect acme.sh path inside the acme container
ACME_PATH=$(docker exec "${ACME_CONTAINER_NAME}" sh -c 'for p in /app/acme.sh /usr/local/bin/acme.sh /usr/bin/acme.sh; do if [ -x "$p" ]; then echo "$p"; exit 0; fi; done; echo ""')

if [ -n "${ACME_PATH}" ]; then
  echo "Found acme.sh in container ${ACME_CONTAINER_NAME}: ${ACME_PATH} — running --cron"
  docker exec "${ACME_CONTAINER_NAME}" sh -c "${ACME_PATH} --cron --home /etc/acme.sh || true"
else
  echo "acme.sh not found in container ${ACME_CONTAINER_NAME}. Skipping cron (check container)." >&2
fi

# Force reload nginx-proxy if present and running
if [ "${NGINX_PROXY_FOUND}" -eq 1 ] && docker ps --format '{{.Names}}' | grep -q "^${NGINX_PROXY_CONTAINER_NAME}$"; then
  echo "Forcing reload of nginx-proxy (${NGINX_PROXY_CONTAINER_NAME})"
  docker kill -s HUP "${NGINX_PROXY_CONTAINER_NAME}" || true
else
  echo "nginx-proxy not running; skipping HUP reload."
fi

echo "Renewal/check executed. Check logs of ${ACME_CONTAINER_NAME} if needed."
