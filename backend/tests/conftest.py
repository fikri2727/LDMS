"""Tests run against the real Supabase database, but every test runs inside a
transaction that is ROLLED BACK afterwards — nothing is ever saved.
(Route code's db.commit() only releases a SAVEPOINT inside that transaction.)
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db import engine, get_db
from app.main import app
from app.models import RoleType, StaffStatus, User
from app.security import COOKIE_NAME, DEFAULT_MAX_AGE, create_session_token


@pytest.fixture
def db():
    conn = engine.connect()
    trans = conn.begin()
    session = Session(bind=conn, join_transaction_mode="create_savepoint", expire_on_commit=False, autoflush=False)
    app.dependency_overrides[get_db] = lambda: session
    try:
        yield session
    finally:
        app.dependency_overrides.clear()
        session.close()
        trans.rollback()
        conn.close()


@pytest.fixture
def client(db):
    return TestClient(app)


def login_as(client: TestClient, user: User) -> TestClient:
    client.cookies.set(COOKIE_NAME, create_session_token(user.id, DEFAULT_MAX_AGE))
    return client


@pytest.fixture
def admin(db) -> User:
    return db.query(User).filter_by(staff_no="ADMIN01").one()


@pytest.fixture
def admin_client(client, admin):
    return login_as(client, admin)


@pytest.fixture
def staff_user(db) -> User:
    return (
        db.query(User)
        .filter(User.role_type == RoleType.STAFF, User.status == StaffStatus.ACTIVE, User.is_hod.is_(False))
        .order_by(User.id)
        .first()
    )


@pytest.fixture
def fake_storage(monkeypatch):
    """Replace Supabase Storage calls so tests never touch real files. Returns a log of calls."""
    calls = {"saved": [], "deleted": []}

    async def fake_save(subdir, file):
        path = f"{subdir}/fake-{file.filename}"
        calls["saved"].append(path)
        return path

    def fake_delete(path):
        calls["deleted"].append(path)

    import app.routers.elearning as el
    import app.routers.requisition as rq
    import app.routers.training as tr
    import app.services.uploads as up

    for mod in (el, rq, tr):
        monkeypatch.setattr(mod, "save_upload", fake_save)
        monkeypatch.setattr(mod, "delete_upload", fake_delete)
    monkeypatch.setattr(up, "read_upload", lambda path: b"file:" + path.encode())
    return calls
