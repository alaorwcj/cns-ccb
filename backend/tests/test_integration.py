import os
import requests
import pytest

BASE = os.getenv("API_BASE", "http://127.0.0.1:8000")

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@example.com")
ADMIN_PASS = os.getenv("ADMIN_PASSWORD", "changeme")


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{BASE}/auth/login", json={"username": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access"]


def test_products_and_churches(token):
    h = {"Authorization": f"Bearer {token}"}
    rp = requests.get(f"{BASE}/products", headers=h)
    rc = requests.get(f"{BASE}/churches", headers=h)
    assert rp.status_code == 200
    assert rc.status_code == 200
    prods = rp.json()
    churches = rc.json()
    assert isinstance(prods, list) and len(prods) > 0
    assert isinstance(churches, list) and len(churches) > 0


def test_create_order_flow(token):
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    prods = requests.get(f"{BASE}/products", headers=h).json()
    chr = requests.get(f"{BASE}/churches", headers=h).json()
    pid = prods[0]["id"]
    stock = prods[0]["stock_qty"]
    cid = chr[0]["id"]

    # invalid order
    r1 = requests.post(f"{BASE}/orders", headers=h, json={"church_id": cid, "items": [{"product_id": pid, "qty": stock + 999}]})
    assert r1.status_code == 400

    # valid order
    r2 = requests.post(f"{BASE}/orders", headers=h, json={"church_id": cid, "items": [{"product_id": pid, "qty": 1}]})
    assert r2.status_code == 201
    order = r2.json()
    oid = order["id"]

    # approve
    r3 = requests.put(f"{BASE}/orders/{oid}/approve", headers={"Authorization": f"Bearer {token}"})
    assert r3.status_code == 200

    # deliver
    r4 = requests.put(f"{BASE}/orders/{oid}/deliver", headers={"Authorization": f"Bearer {token}"})
    assert r4.status_code == 200

    # receipt
    r5 = requests.get(f"{BASE}/orders/{oid}/receipt", headers={"Authorization": f"Bearer {token}"})
    assert r5.status_code == 200
    assert r5.headers.get("content-type") == "application/pdf"
