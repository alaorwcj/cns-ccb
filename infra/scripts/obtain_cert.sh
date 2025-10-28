#!/usr/bin/env bash
# Script auxiliar (exemplo) para obter certificado via certbot nginx plugin
# Não execute automaticamente sem revisar.

set -euo pipefail

if [[ $(id -u) -ne 0 ]]; then
  echo "Este script precisa rodar como root (sudo)." >&2
  exit 2
fi

DOMAIN="cns.admsiga.org.br"
EMAIL="seu-email@dominio.tld"

# Certifique-se de que /var/www/certbot exista e tenha as permissões corretas
mkdir -p /var/www/certbot
chown www-data:www-data /var/www/certbot || true

# Testa nginx
nginx -t

# Obter certificado (modo interativo reduzido)
certbot --nginx -d "$DOMAIN" -m "$EMAIL" --agree-tos --no-eff-email --redirect --non-interactive

# Teste de renovação
certbot renew --dry-run

echo "Certificado solicitado e teste de renovação executado. Verifique /etc/letsencrypt/live/$DOMAIN"
