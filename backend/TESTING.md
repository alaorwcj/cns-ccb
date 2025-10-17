Running tests
==============

This project contains integration tests under `backend/tests/` that exercise the running API.

Two recommended ways to run the tests:

1) Using the running docker-compose environment (recommended):

- From the repository root:

```bash
cd infra
# start services (db, api, web)
docker compose up -d
# run pytest inside the api container
docker compose exec api pytest -q /app/tests
```

2) Running tests locally (requires Python >= 3.10, pip, and network access to the running API at http://127.0.0.1:8000):

```bash
cd backend
python3 -m pip install -r requirements.txt
python3 -m pip install pytest requests
# set API_BASE if your API is on another host
API_BASE=http://127.0.0.1:8000 pytest -q tests
```

Notes
-----
- Tests assume an API is running and reachable (default: http://127.0.0.1:8000).
- Tests use the admin account configured by environment variables in `backend/.env` (ADMIN_EMAIL/ADMIN_PASSWORD). If you changed them, export the same env vars before running tests.
- The tests are integration tests and will mutate the database (create users, orders, movements). Run against a test or disposable DB when possible.
