"""Covers GET /export/csv respecting the same filters as GET /receipts."""
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
    client.post("/auth/signup", json={"email": "export@example.com", "password": "supersecret"})
    login = client.post("/auth/login", json={"email": "export@example.com", "password": "supersecret"})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _seed(client: TestClient, headers: dict, vendor: str, date: str, total: float) -> None:
    client.post(
        "/receipts/manual",
        headers=headers,
        json={"vendor": vendor, "purchase_date": date, "total": total},
    )


def test_export_csv_respects_date_filters():
    with TestClient(app) as client:
        headers = _auth_headers(client)
        _seed(client, headers, "August Vendor", "2026-08-15", 100)
        _seed(client, headers, "September Vendor", "2026-09-15", 200)

        res = client.get("/export/csv?date_from=2026-09-01&date_to=2026-09-30", headers=headers)
        assert res.status_code == 200
        body = res.text
        assert "September Vendor" in body
        assert "August Vendor" not in body


def test_export_csv_filename_reflects_date_range():
    with TestClient(app) as client:
        headers = _auth_headers(client)
        res = client.get("/export/csv?date_from=2026-09-01&date_to=2026-09-30", headers=headers)
        assert "2026-09-01" in res.headers["content-disposition"]
        assert "2026-09-30" in res.headers["content-disposition"]


def test_export_csv_with_no_filters_returns_everything():
    with TestClient(app) as client:
        headers = _auth_headers(client)
        _seed(client, headers, "August Vendor", "2026-08-15", 100)
        _seed(client, headers, "September Vendor", "2026-09-15", 200)

        res = client.get("/export/csv", headers=headers)
        assert "August Vendor" in res.text
        assert "September Vendor" in res.text
        assert res.headers["content-disposition"] == "attachment; filename=receipts.csv"
