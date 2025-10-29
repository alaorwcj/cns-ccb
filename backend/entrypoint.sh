#!/usr/bin/env sh
set -e

# Wait for DB
python - <<'PY'
import time, os, sys
import socket
import re

# Extract DB connection info from DATABASE_URL if available
db_url = os.getenv('DATABASE_URL', '')
if db_url:
    # Parse DATABASE_URL: postgresql+psycopg2://user:pass@host:port/dbname
    match = re.match(r'postgresql\+psycopg2://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', db_url)
    if match:
        host = match.group(3)
        port = int(match.group(4))
    else:
        host = os.getenv('DB_HOST','db')
        port = int(os.getenv('DB_PORT','5432'))
else:
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

# Check if database is empty and restore dump if available
python - <<'PY'
import os
import psycopg2
from psycopg2 import sql
import re

# Extract DB connection info from DATABASE_URL if available
db_url = os.getenv('DATABASE_URL', '')
if db_url:
    # Parse DATABASE_URL: postgresql+psycopg2://user:pass@host:port/dbname
    match = re.match(r'postgresql\+psycopg2://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', db_url)
    if match:
        conn_params = {
            'user': match.group(1),
            'password': match.group(2),
            'host': match.group(3),
            'port': match.group(4),
            'database': match.group(5)
        }
    else:
        conn_params = {
            'host': os.getenv('DB_HOST', 'db'),
            'port': os.getenv('DB_PORT', '5432'),
            'user': os.getenv('DB_USER', 'ccb'),
            'password': os.getenv('DB_PASSWORD', 'ccb'),
            'database': os.getenv('DB_NAME', 'ccb')
        }
else:
    conn_params = {
        'host': os.getenv('DB_HOST', 'db'),
        'port': os.getenv('DB_PORT', '5432'),
        'user': os.getenv('DB_USER', 'ccb'),
        'password': os.getenv('DB_PASSWORD', 'ccb'),
        'database': os.getenv('DB_NAME', 'ccb')
    }

try:
    conn = psycopg2.connect(**conn_params)
    cursor = conn.cursor()
    
    # Check if users table exists and has data
    cursor.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'")
    table_exists = cursor.fetchone()[0] > 0
    
    if table_exists:
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        if user_count > 0:
            print("Database already has data, skipping restore")
        else:
            print("Database tables exist but no users, restoring dump...")
            # Restore dump
            import subprocess
            dump_path = '/app/dump_ccb.backup'
            if os.path.exists(dump_path):
                subprocess.run(['pg_restore', '-U', conn_params['user'], '-d', conn_params['database'], dump_path], check=True)
                print("Dump restored successfully")
            else:
                print("Dump file not found")
    else:
        print("No tables found, restoring dump...")
        # Restore dump
        import subprocess
        dump_path = '/app/dump_ccb.backup'
        if os.path.exists(dump_path):
            subprocess.run(['pg_restore', '-U', conn_params['user'], '-d', conn_params['database'], dump_path], check=True)
            print("Dump restored successfully")
        else:
            print("Dump file not found")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"Database check/restore failed: {e}")
PY

# Create tables (import models first so metadata includes all tables)
python - <<'PY'
from app.db.base import Base
from app.db.session import engine
# Import application models so they are registered on Base.metadata
import app.models  # noqa: F401

Base.metadata.create_all(bind=engine)
PY

# Auto-generate initial migration if no revision files exist (ignore .gitkeep)
# if ! find migrations/versions -maxdepth 1 -name "*.py" | grep -q .; then
#   echo "No Alembic revision files found. Autogenerating initial migration..."
#   alembic revision --autogenerate -m "init"
# fi

# Migrate to head
# alembic upgrade head

# Bootstrap seed (admin user if ADMIN_EMAIL/ADMIN_PASSWORD provided)
python -m app.bootstrap || true

# Start API
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
