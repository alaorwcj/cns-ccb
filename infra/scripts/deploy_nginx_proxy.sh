#!/usr/bin/env bash
set -euo pipefail

if [[ $(id -u) -ne 0 ]]; then
  echo "Execute com sudo ou como root" >&2
  exit 2
fi

COMPOSE_FILE="/root/app/cns-ccb/infra/docker-compose.nginx-proxy.yml"
BACKUP_DIR="/root/deploy-backups/cns-$(date +%F_%T)"
PROXY_DIR="/root/app/cns-ccb/infra/proxy"

echo "Criando backup e diretórios..."
mkdir -p "$BACKUP_DIR"
mkdir -p "$PROXY_DIR/certs" "$PROXY_DIR/vhost.d" "$PROXY_DIR/html" "$PROXY_DIR/conf.d" "$PROXY_DIR/acme"

# Backup docker-compose atual e nginx conf se existirem
cp /root/app/cns-ccb/infra/docker-compose.yml "$BACKUP_DIR/docker-compose.yml" || true
cp -r /etc/nginx/sites-available "$BACKUP_DIR/sites-available" || true
cp -r /etc/nginx/sites-enabled "$BACKUP_DIR/sites-enabled" || true

cd /root/app/cns-ccb/infra

# Build images (opcional) e sube os serviços do nginx-proxy
docker-compose -f "$COMPOSE_FILE" build --parallel

# Start proxy first
docker-compose -f "$COMPOSE_FILE" up -d nginx-proxy nginx-letsencrypt

# Wait a bit for proxy to be ready
sleep 5

# Start application services
docker-compose -f "$COMPOSE_FILE" up -d web api

echo "Deploy executado. Verifique os logs dos containers:"

echo "docker-compose -f $COMPOSE_FILE logs -f nginx-proxy nginx-letsencrypt web api"

echo "Se algo falhar, restaure os backups em $BACKUP_DIR"
