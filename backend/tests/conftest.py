import os
import pytest
from fastapi.testclient import TestClient
from alembic import command
from alembic.config import Config

from app.main import app
from app.bootstrap import run_bootstrap


@pytest.fixture(scope="session", autouse=True)
def _migrate_and_bootstrap():
    # Point Alembic at project migrations
    cfg = Config("alembic.ini")
    # Ensure DATABASE_URL is in env for alembic.ini
    assert os.getenv("DATABASE_URL"), "DATABASE_URL must be set in env for tests"
    command.upgrade(cfg, "head")
    # Seed admin if configured
    run_bootstrap()


@pytest.fixture()
def client():
    return TestClient(app)
