import os
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite:///./test_meditrack.db"
os.environ["CACHE_TTL"] = "60"

from fastapi.testclient import TestClient

from database import Base, engine, get_db
from main import app
from models import Appointment
from seed import seed_database


def pytest_configure():
    db_file = Path(__file__).resolve().parent.parent / "test_meditrack.db"
    if db_file.exists():
        db_file.unlink()
    Base.metadata.create_all(bind=engine)
    seed_database()


client = TestClient(app)


def _clear_test_db():
    db_file = Path(__file__).resolve().parent.parent / "test_meditrack.db"
    if db_file.exists():
        try:
            db_file.unlink()
        except PermissionError:
            pass


def pytest_unconfigure():
    try:
        client.close()
    finally:
        engine.dispose()
        _clear_test_db()
