"""Covers POST /receipts/manual — adding a receipt with no photo."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, engine, get_db
from app.main import app

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def _auth_headers(client: TestClient) -> dict:
    client.post("/auth/signup", json={"email": "manual@example.com", "password": "supersecret"})
    login = client.post("/auth/login", json={"email": "manual@example.com", "password": "supersecret"})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_manual_receipt():
    with TestClient(app) as client:
        headers = _auth_headers(client)
        res = client.post(
            "/receipts/manual",
            headers=headers,
            json={"vendor": "Corner Store", "total": 250.0, "currency": "PKR", "category": "food"},
        )
        assert res.status_code == 201
        body = res.json()
        assert body["vendor"] == "Corner Store"
        assert body["total"] == 250.0
        assert body["status"] == "confirmed"
        assert body["source"] == "manual"


def test_manual_receipt_requires_positive_total():
    with TestClient(app) as client:
        headers = _auth_headers(client)
        res = client.post(
            "/receipts/manual",
            headers=headers,
            json={"vendor": "Corner Store", "total": 0},
        )
        assert res.status_code == 422


def test_manual_receipt_appears_in_list():
    with TestClient(app) as client:
        headers = _auth_headers(client)
        client.post("/receipts/manual", headers=headers, json={"vendor": "Corner Store", "total": 250.0})
        res = client.get("/receipts", headers=headers)
        assert res.status_code == 200
        assert len(res.json()) == 1
        assert res.json()[0]["source"] == "manual"
