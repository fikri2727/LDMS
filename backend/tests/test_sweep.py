"""Robustness sweep: call EVERY API operation as every kind of user, with missing,
nonexistent and real IDs and empty/garbage input. Nothing may return a 500.

Every request runs inside its own SAVEPOINT that is rolled back, inside an outer
transaction that is also rolled back — nothing is saved. File storage is faked.
"""

import re

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import engine, get_db
from app.main import app
from app.models import (
    Certificate,
    ElearningAssignment,
    ElearningCertificate,
    ElearningLesson,
    ElearningModule,
    ElearningQuestion,
    Ojt,
    ParticipateOjt,
    Participation,
    Pme,
    RoleType,
    Section,
    StaffStatus,
    Tna,
    TnaTrainingOption,
    Training,
    TrainingRequisition,
    User,
)
from app.security import COOKIE_NAME, DEFAULT_MAX_AGE, create_session_token

MISSING = 987654321


def _first_id(db, model):
    return db.scalar(select(model.id).order_by(model.id)) or MISSING


@pytest.fixture(scope="module")
def world():
    """Real IDs from the database (read-only lookup)."""
    with Session(engine) as db:
        admin = db.scalar(select(User).where(User.staff_no == "ADMIN01"))
        staff = db.scalar(
            select(User)
            .where(User.role_type == RoleType.STAFF, User.is_hod.is_(False), User.status == StaffStatus.ACTIVE)
            .order_by(User.id)
        )
        hod = db.scalar(select(User).where(User.is_hod.is_(True), User.status == StaffStatus.ACTIVE).order_by(User.id))
        ids = {
            "staff_id": staff.id,
            "id_": _first_id(db, Section),
            "division_id": db.scalar(select(User.division_id).where(User.division_id.isnot(None))) or MISSING,
            "department_id": db.scalar(select(User.department_id).where(User.department_id.isnot(None))) or MISSING,
            "training_id": _first_id(db, Training),
            "participation_id": _first_id(db, Participation),
            "certificate_id": _first_id(db, Certificate),
            "ojt_id": _first_id(db, Ojt),
            "pme_id": _first_id(db, Pme),
            "module_id": _first_id(db, ElearningModule),
            "lesson_id": _first_id(db, ElearningLesson),
            "question_id": _first_id(db, ElearningQuestion),
            "assignment_id": _first_id(db, ElearningAssignment),
            "tna_id": _first_id(db, Tna),
            "option_id": _first_id(db, TnaTrainingOption),
            "req_id": _first_id(db, TrainingRequisition),
        }
        # OJT participation id lives under the same {participation_id} name; use real one for OJT paths.
        ids["ojt_participation_id"] = _first_id(db, ParticipateOjt)
        ids["elearning_certificate_id"] = _first_id(db, ElearningCertificate)
        return {"users": {"admin": admin.id, "staff": staff.id, "hod": hod.id}, "ids": ids}


@pytest.fixture(autouse=True)
def fake_storage(monkeypatch):
    async def fake_save(subdir, file):
        return f"{subdir}/fake"

    import app.routers.elearning as el
    import app.routers.requisition as rq
    import app.routers.training as tr

    for mod in (el, rq, tr):
        for name, fn in (
            ("save_upload", fake_save),
            ("delete_upload", lambda path: None),
        ):
            if hasattr(mod, name):
                monkeypatch.setattr(mod, name, fn)
    import app.services.uploads as up

    monkeypatch.setattr(up, "read_upload", lambda path: b"fake-bytes")


def _operations():
    ops = []
    for path, methods in app.openapi()["paths"].items():
        for method in methods:
            ops.append((method.upper(), path))
    return ops


def _fill(path: str, ids: dict, real: bool) -> str:
    def repl(m):
        name = m.group(1)
        if not real:
            return str(MISSING)
        if name == "participation_id" and path.startswith("/api/ojt"):
            return str(ids["ojt_participation_id"])
        if name == "certificate_id" and "/elearning/" in path:
            return str(ids["elearning_certificate_id"])
        return str(ids.get(name, MISSING))

    return re.sub(r"\{(\w+)\}", repl, path)


QUERY = {  # required query params for some endpoints
    "/api/tna/admin": "?year=2026",
    "/api/tna/mine": "?year=2026",
    "/api/tna/summary": "?year=2026",
    "/api/tna/options": "?section=ESG",
    "/api/elearning/modules/{module_id}/lessons": "?type=SLIDE",
    "/api/elearning/modules/{module_id}/lessons/{lesson_id}": "?type=SLIDE",
    "/api/elearning/modules/{module_id}/lessons/{lesson_id}/reorder": "?direction=up",
}

GARBAGE_FORM = {
    "staffNo": "", "staffName": "x", "gender": "ALIEN", "designation": "?", "departmentId": "abc",
    "startDate": "not-a-date", "endDate": "2026-13-45", "startTime": "25:99", "endTime": "",
    "program": "NOPE", "platform": "?", "function": "?", "title": "t", "venue": "v", "cost": "free",
    "userId": "xyz", "userIds": ["a", "1.5"], "fees": "-5", "year": "abc", "payload": "{not json",
    "q_1": "zz", "decision": "MAYBE", "type": "BAD", "question": "q", "optionText": ["a"],
    "passPercent": "hundred", "marks": "-1", "target": "department", "trainerType": "X", "trainerName": "t",
    "levelRating": "AMAZING", "levelPercent": "abc%", "label": "", "name": "", "hodUserId": "99999999",
}


def _json_body(path):
    if path.endswith("/review"):
        return {"decision": "MAYBE"}
    if path.endswith("/grant-id"):
        return {"grantId": 12345}
    if path.endswith("/verify"):
        return {"staffId": None}
    if path.startswith("/api/auth/login"):
        return {"staffNo": "", "password": ""}
    if path.endswith("change-password"):
        return {"newPassword": "a", "confirmPassword": "b"}
    return None


@pytest.mark.parametrize("identity", ["anonymous", "admin", "staff", "hod"])
def test_no_endpoint_crashes(identity, world):
    conn = engine.connect()
    outer = conn.begin()
    failures = []
    try:
        for method, path in _operations():
            for real in (False, True):
                for variant in ("empty", "garbage"):
                    sp = conn.begin_nested()
                    db = Session(bind=conn, join_transaction_mode="create_savepoint", expire_on_commit=False)
                    app.dependency_overrides[get_db] = (lambda s: (lambda: s))(db)
                    client = TestClient(app, raise_server_exceptions=False)
                    if identity != "anonymous":
                        client.cookies.set(
                            COOKIE_NAME, create_session_token(world["users"][identity], DEFAULT_MAX_AGE)
                        )
                    url = _fill(path, world["ids"], real) + QUERY.get(path, "")
                    try:
                        if method == "GET":
                            r = client.get(url)
                        elif method == "DELETE":
                            r = client.delete(url)
                        else:
                            body = _json_body(path)
                            if body is not None:
                                r = client.post(url, json=body if variant == "garbage" else {})
                            elif variant == "garbage":
                                r = client.post(url, data=GARBAGE_FORM, files={"file": ("x.xlsx", b"not excel")})
                            else:
                                r = client.post(url, data={})
                        if r.status_code >= 500:
                            failures.append(f"{r.status_code} {method} {url} [{variant}] {r.text[:200]}")
                    finally:
                        app.dependency_overrides.clear()
                        db.close()
                        if sp.is_active:
                            sp.rollback()
    finally:
        outer.rollback()
        conn.close()
    assert not failures, f"{len(failures)} crash(es) as {identity}:\n" + "\n".join(failures)
