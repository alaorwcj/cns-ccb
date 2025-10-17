import os
import time
import requests
import pytest

BASE = os.getenv("API_BASE", "http://127.0.0.1:8000")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@example.com")
ADMIN_PASS = os.getenv("ADMIN_PASSWORD", "changeme")


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{BASE}/auth/login", json={"username": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200
    return r.json()["access"]


def test_user_create_login_and_permissions(admin_token):
    h_admin = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}

    # get churches
    rc = requests.get(f"{BASE}/churches", headers={"Authorization": f"Bearer {admin_token}"})
    assert rc.status_code == 200
    churches = rc.json()
    assert len(churches) > 0

    # create a unique user
    ts = int(time.time())
    email = f"user_{ts}@example.com"
    payload = {
        "name": "User Test",
        "email": email,
        "phone": "123456",
        "role": "USUARIO",
        "password": "userpass",
        "church_ids": [churches[0]["id"]],
    }
    r = requests.post(f"{BASE}/users", headers=h_admin, json=payload)
    assert r.status_code == 201, f"create user failed: {r.status_code} {r.text}"
    created = r.json()
    user_id = created["id"]

    # login as new user
    ru = requests.post(f"{BASE}/auth/login", json={"username": email, "password": "userpass"})
    assert ru.status_code == 200, f"user login failed: {ru.status_code} {ru.text}"
    token_user = ru.json()["access"]
    h_user = {"Authorization": f"Bearer {token_user}", "Content-Type": "application/json"}

    # user creates an order for his church -> should succeed
    pid = requests.get(f"{BASE}/products", headers=h_admin).json()[0]["id"]
    rorder = requests.post(f"{BASE}/orders", headers=h_user, json={"church_id": churches[0]["id"], "items": [{"product_id": pid, "qty": 1}]})
    assert rorder.status_code == 201, f"create order as user failed: {rorder.status_code} {rorder.text}"
    order = rorder.json()
    assert order["requester_id"] == user_id

    # user sees his orders
    user_orders = requests.get(f"{BASE}/orders", headers=h_user).json()
    assert any(o["requester_id"] == user_id for o in user_orders)

    # admin sees at least as many orders
    admin_orders = requests.get(f"{BASE}/orders", headers=h_admin).json()
    assert len(admin_orders) >= len(user_orders)

    # admin toggles user to inactive
    rtoggle = requests.patch(f"{BASE}/users/{user_id}/toggle-active", headers=h_admin)
    assert rtoggle.status_code == 200
    toggled = rtoggle.json()
    assert toggled["is_active"] is False

    # login as inactive user should fail (401)
    rlogin2 = requests.post(f"{BASE}/auth/login", json={"username": email, "password": "userpass"})
    assert rlogin2.status_code == 401
