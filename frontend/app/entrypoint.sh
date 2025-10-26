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

# Ensure rollup native binary is present. Some rollup native packages are optional
# and may not be installed by npm ci with NPM_CONFIG_OPTIONAL=false. Try to install
# the linux native binary explicitly; ignore failures (best-effort).
echo "Ensuring native rollup binary is installed..."
npm install @rollup/rollup-linux-x64-gnu --no-save --silent || true

# Ensure esbuild native binary is present (esbuild requires platform-specific binary).
echo "Ensuring native esbuild binary is installed..."
npm install @esbuild/linux-x64 --no-save --silent || true

exec "$@"
