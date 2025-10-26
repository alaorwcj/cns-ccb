# CCB CNS

Monorepo with `backend/`, `frontend/`, `infra/`, and `docs/`.

- Backend: FastAPI, SQLAlchemy, Alembic, JWT
- Frontend: React + Vite (to be scaffolded)
- Infra: Docker Compose for db, api, web

## Quickstart (Backend dev)

1) Create virtualenv and install deps

```bash
python -m venv .venv
source .venv/bin/activate  # Windows PowerShell: .venv\\Scripts\\Activate.ps1
pip install -r backend/requirements.txt
```

2) Configure environment

Copy `backend/.env.example` to `backend/.env` and set values.

3) Run API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --app-dir backend/app
```

## Docker Compose (db+api+web)

From `infra/`:

```bash
docker compose up -d --build
```
