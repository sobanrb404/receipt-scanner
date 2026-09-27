"""Basic API smoke test using an in-memory SQLite DB, so it needs no
Docker/Postgres to run — useful for CI.

conftest.py sets DATABASE_URL to sqlite before app.main is ever imported,
so both the app's own engine and this test's session factory point at the
same file, and the app's startup event (table creation) works without
Docker.
"""
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


def test_signup_and_login():
    with TestClient(app) as client:
        signup_res = client.post("/auth/signup", json={"email": "test@example.com", "password": "supersecret"})
        assert signup_res.status_code == 201
        assert signup_res.json()["email"] == "test@example.com"

        login_res = client.post("/auth/login", json={"email": "test@example.com", "password": "supersecret"})
        assert login_res.status_code == 200
        assert "access_token" in login_res.json()


def test_login_with_wrong_password_fails():
    with TestClient(app) as client:
        client.post("/auth/signup", json={"email": "test2@example.com", "password": "supersecret"})
        res = client.post("/auth/login", json={"email": "test2@example.com", "password": "wrongpass"})
        assert res.status_code == 401


def test_receipts_endpoint_requires_auth():
    with TestClient(app) as client:
        res = client.get("/receipts")
        assert res.status_code == 401
