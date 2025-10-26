import os
import requests

BASE = os.getenv("TEST_BASE", "http://localhost:8000")

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@example.com")
ADMIN_PASS = os.getenv("ADMIN_PASSWORD", "changeme")


def get_token():
    r = requests.post(f"{BASE}/auth/login", json={"username": ADMIN_EMAIL, "password": ADMIN_PASS})
    r.raise_for_status()
    return r.json()["access"]


def test_orders_include_product_and_church_names():
    token = get_token()
    h = {"Authorization": f"Bearer {token}"}
    r = requests.get(f"{BASE}/orders", headers=h)
    assert r.status_code == 200
    data = r.json().get("data")
    assert isinstance(data, list)
    if len(data) == 0:
        # nothing to assert, but call passes
        return
    first = data[0]
    assert "church_name" in first and first["church_name"] is not None
    assert "items" in first and isinstance(first["items"], list)
    if len(first["items"]) > 0:
        item = first["items"][0]
        assert "product_name" in item
