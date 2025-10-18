#!/usr/bin/env bash
set -euo pipefail

# If node_modules is missing (e.g., because host bind mount hides image-installed deps),
# install dependencies before starting dev server.
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null || true)" ]; then
  echo "node_modules not found or empty — installing dependencies (no optional)..."
  export NPM_CONFIG_OPTIONAL=false
  npm ci --silent || {
    echo "npm ci failed, trying npm install --no-optional..."
    npm install --no-optional --silent
  }
fi

exec "$@"
