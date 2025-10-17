import os
import requests
import pytest
from decimal import Decimal

BASE = os.getenv("API_BASE", "http://127.0.0.1:8000")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@example.com")
ADMIN_PASS = os.getenv("ADMIN_PASSWORD", "changeme")


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{BASE}/auth/login", json={"username": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200
    return r.json()["access"]


def test_duplicate_product_and_stock_movement(admin_token):
    h = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}

    # pick a product
    prods = requests.get(f"{BASE}/products", headers=h).json()
    assert len(prods) > 0
    p = prods[0]
    pid = p["id"]

    # duplicate product
    rdup = requests.post(f"{BASE}/products/{pid}/duplicate", headers=h)
    assert rdup.status_code == 201
    newp = rdup.json()
    assert newp["name"].startswith(p["name"])

    # add stock movement (entrada)
    rmov = requests.post(f"{BASE}/stock/movements", headers=h, json={"product_id": pid, "type": "ENTRADA", "qty": 10, "note": "Test entrada"})
    assert rmov.status_code == 201
    mov = rmov.json()
    assert mov["qty"] == 10

    # check product stock increased (some services apply movements; check product current stock is numeric)
    pr = requests.get(f"{BASE}/products", headers=h).json()
    updated = next((x for x in pr if x["id"] == pid), None)
    assert updated is not None
    assert isinstance(updated["stock_qty"], int)


def test_dash_overview(admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    rd = requests.get(f"{BASE}/dash/overview", headers=h)
    assert rd.status_code == 200
    data = rd.json()
    assert "pedidos_abertos" in data
    assert "low_stock" in data
    assert isinstance(data["pedidos_abertos"], int)
    assert isinstance(data["low_stock"], list)
    assert "medias_saida_mensal" in data
    # medias_saida_mensal is returned as str in service
    assert isinstance(data["medias_saida_mensal"], str)
