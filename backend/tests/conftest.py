"""Runs before any test module is imported (pytest always imports
conftest.py first), so every test sees a local sqlite DB instead of the
Docker-only Postgres host in .env — no Docker needed to run the suite."""
import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
