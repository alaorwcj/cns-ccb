#!/usr/bin/env bash
set -euo pipefail

# Simple backup script that runs pg_dump inside the compose-managed DB container
# and copies dumps to infra/backups on the host repository directory.
# Usage: ./infra/backup/backup.sh

REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE_FILE="$REPO_DIR/infra/docker-compose.yml"
BACKUP_DIR="$REPO_DIR/infra/backups"
KEEP_DAYS=${KEEP_DAYS:-14}

mkdir -p "$BACKUP_DIR"

TS=$(date -u +"%Y%m%d_%H%M%SZ")

echo "[backup] timestamp: $TS"

# Get container id of the db service
DB_CONTAINER=$(docker compose -f "$COMPOSE_FILE" ps -q db)
if [ -z "$DB_CONTAINER" ]; then
  echo "[backup] ERROR: could not find db container (is the compose stack up?)." >&2
  exit 2
fi

DUMP_REMOTE="/tmp/ccb_${TS}.dump"
GLOBALS_REMOTE="/tmp/globals_${TS}.sql"

echo "[backup] running pg_dump inside container $DB_CONTAINER"
# Dump database 'ccb' in custom format
docker exec "$DB_CONTAINER" pg_dump -U ccb -Fc ccb -f "$DUMP_REMOTE"
# Dump globals (roles, etc.)
docker exec "$DB_CONTAINER" pg_dumpall -g -U ccb -f "$GLOBALS_REMOTE"

DUMP_LOCAL="$BACKUP_DIR/ccb_${TS}.dump"
GLOBALS_LOCAL="$BACKUP_DIR/globals_${TS}.sql"

echo "[backup] copying dumps to host: $DUMP_LOCAL, $GLOBALS_LOCAL"
docker cp "$DB_CONTAINER:$DUMP_REMOTE" "$DUMP_LOCAL"
docker cp "$DB_CONTAINER:$GLOBALS_REMOTE" "$GLOBALS_LOCAL"

# Remove remote temp files
docker exec "$DB_CONTAINER" rm -f "$DUMP_REMOTE" "$GLOBALS_REMOTE"

# Set safe permissions
chmod 600 "$DUMP_LOCAL" "$GLOBALS_LOCAL" || true

# Optionally prune old backups
if command -v find >/dev/null 2>&1; then
  echo "[backup] removing backups older than $KEEP_DAYS days"
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'ccb_*.dump' -mtime +$KEEP_DAYS -print -exec rm -f {} \;
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'globals_*.sql' -mtime +$KEEP_DAYS -print -exec rm -f {} \;
fi

echo "[backup] done: $DUMP_LOCAL"
