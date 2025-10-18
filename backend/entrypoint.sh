#!/usr/bin/env sh
set -e

# Wait for DB
python - <<'PY'
import time, os, sys
import socket
host = os.getenv('DB_HOST','db')
port = int(os.getenv('DB_PORT','5432'))
s = socket.socket()
for i in range(60):
    try:
        s.connect((host, port))
        print('DB is up')
        break
    except OSError:
        print('Waiting for DB...')
        time.sleep(1)
else:
    print('DB not reachable', file=sys.stderr)
    sys.exit(1)
PY

# Auto-generate initial migration if no revision files exist (ignore .gitkeep)
if ! find migrations/versions -maxdepth 1 -name "*.py" | grep -q .; then
  echo "No Alembic revision files found. Autogenerating initial migration..."
  alembic revision --autogenerate -m "init"
fi

# Migrate to head
alembic upgrade head

# Bootstrap seed (admin user if ADMIN_EMAIL/ADMIN_PASSWORD provided)
python -m app.bootstrap || true

# Start API
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
