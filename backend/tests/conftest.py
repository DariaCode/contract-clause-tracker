"""Test fixtures: a FastAPI client backed by an isolated in-memory SQLite DB.

Using SQLite here keeps the critical-path tests fast and dependency-free; the
ORM models are written to be dialect-agnostic so they behave the same on
Postgres in production.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.seed import seed_labels


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,  # one shared in-memory connection
    )
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)
    with TestingSession() as db:
        seed_labels(db)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    # Instantiate without the context manager so the production lifespan
    # (which connects to Postgres and seeds) does NOT run — the fixture above
    # already set up and seeded the isolated SQLite database.
    yield TestClient(app)
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
