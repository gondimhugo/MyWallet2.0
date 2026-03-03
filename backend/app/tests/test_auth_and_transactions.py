from datetime import date
from fastapi.testclient import TestClient

from app.main import create_app
from app.db.init_db import ensure_seed

app = create_app()
client = TestClient(app)

def setup_module():
    ensure_seed()

def test_login_and_crud():
    # login
    r = client.post("/api/auth/login", json={"email":"admin@gastos.local","password":"admin123"})
    assert r.status_code == 200
    tokens = r.json()
    assert "access_token" in tokens

    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    # create
    r = client.post("/api/transactions", json={
        "date": date.today().isoformat(),
        "amount": 10.50,
        "type": "EXPENSE",
        "status": "OPEN",
        "description": "teste",
        "category_id": None,
        "account_id": None,
    }, headers=headers)
    assert r.status_code == 200
    tx = r.json()
    tx_id = tx["id"]

    # list
    r = client.get("/api/transactions", headers=headers)
    assert r.status_code == 200
    assert any(x["id"] == tx_id for x in r.json())

    # update
    r = client.patch(f"/api/transactions/{tx_id}", json={"status":"PAID"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["status"] == "PAID"

    # delete
    r = client.delete(f"/api/transactions/{tx_id}", headers=headers)
    assert r.status_code == 200
