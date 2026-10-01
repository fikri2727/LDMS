"""Admin evaluating on someone's behalf: Public/Inhouse survey, OJT evaluation, and PME (for the HOD)."""

from app.models import AttendanceStatus, Designation, ParticipateOjt, Participation, Pme, RoleType, StaffStatus, User
from tests.conftest import login_as

SURVEY = {
    "courseRelevance": "4", "practicalExercises": "4", "sufficientTime": "3", "trainerEffectiveness": "5",
    "courseEffectiveness": "4", "whatLearnt": "x", "actionPlan": "y", "commentSuggestions": "z",
}
PME_FORM = {
    "levelRating": "VERY_GOOD", "levelPercent": "85", "level2Rating": "GOOD", "level2Percent": "75",
    "behavioralRating": "GOOD", "behavioralPercent": "70", "resultRating": "SATISFACTORY", "resultPercent": "65",
}


def _exec_with_supervisor(db) -> User:
    return (
        db.query(User)
        .filter(User.designation == Designation.EXECUTIVE, User.status == StaffStatus.ACTIVE, User.supervisor_id.isnot(None))
        .first()
    )


def _training_with(client, user: User, start="2025-01-06", end="2025-01-07") -> tuple[int, int]:
    form = {"title": "on-behalf test", "program": "INTI", "platform": "ONLINE", "function": "BUSINESS", "venue": "x",
            "startDate": start, "endDate": end, "trainer": "t"}
    tid = client.post("/api/training/public", data=form).json()["id"]
    client.post(f"/api/training/public/{tid}/participants", data={"userId": str(user.id)})
    pid = client.get(f"/api/training/public/{tid}").json()["training"]["participations"][0]["id"]
    return tid, pid


def test_admin_fills_public_survey_on_behalf(client, db, admin, staff_user):
    login_as(client, admin)
    tid, pid = _training_with(client, staff_user)
    r = client.post(f"/api/training/public/{tid}/participants/{pid}/survey", data=SURVEY)
    assert r.status_code == 200, r.text
    p = db.get(Participation, pid)
    db.refresh(p)
    assert p.attendance == AttendanceStatus.COMPLETED and p.trainer_effectiveness == 5
    assert p.keyed_in_by_id == admin.id

    detail = client.get(f"/api/training/public/{tid}/participations/{pid}").json()
    assert detail["keyedInBy"]["staffNo"] == "ADMIN01"
    # can't be submitted twice
    again = client.post(f"/api/training/public/{tid}/participants/{pid}/survey", data=SURVEY)
    assert again.status_code == 400 and again.json()["detail"] == "This evaluation has already been submitted."

    # the participant sees their survey, but not who keyed it in
    login_as(client, staff_user)
    mine = client.get(f"/api/training/public/{tid}/participations/{pid}").json()
    assert mine["keyedInBy"] is None and mine["keyedInById"] is None


def test_own_public_survey_has_no_keyed_in_by(client, db, admin, staff_user):
    login_as(client, admin)
    tid, pid = _training_with(client, staff_user)
    login_as(client, staff_user)
    assert client.post(f"/api/training/public/{tid}/participants/{pid}/survey", data=SURVEY).status_code == 200
    p = db.get(Participation, pid)
    db.refresh(p)
    assert p.attendance == AttendanceStatus.COMPLETED and p.keyed_in_by_id is None


def test_absent_participant_cannot_be_filled_on_behalf(client, db, admin, staff_user):
    login_as(client, admin)
    tid, pid = _training_with(client, staff_user)
    client.post(f"/api/training/public/{tid}/participants/{pid}/absent")
    r = client.post(f"/api/training/public/{tid}/participants/{pid}/survey", data=SURVEY)
    assert r.status_code == 400 and r.json()["detail"] == "This participant is marked absent."


def test_non_admins_cannot_fill_on_behalf(client, db, admin, staff_user):
    login_as(client, admin)
    tid, pid = _training_with(client, staff_user)
    other = (
        db.query(User)
        .filter(User.role_type == RoleType.CLERK, User.status == StaffStatus.ACTIVE)
        .first()
    ) or db.query(User).filter(User.id != staff_user.id, User.role_type == RoleType.STAFF).first()
    login_as(client, other)
    assert client.post(f"/api/training/public/{tid}/participants/{pid}/survey", data=SURVEY).status_code == 403


def test_admin_fills_ojt_evaluation_on_behalf(client, db, admin, staff_user):
    login_as(client, admin)
    form = {"title": "ojt on behalf", "venue": "x", "trainerType": "INTERNAL", "trainerName": "t",
            "startDate": "2025-02-03", "endDate": "2025-02-03", "startTime": "08:00", "endTime": "12:00"}
    oid = client.post("/api/ojt", data=form).json()["id"]
    client.post(f"/api/ojt/{oid}/participants", data={"userId": str(staff_user.id)})
    p = db.query(ParticipateOjt).filter_by(ojt_id=oid, user_id=staff_user.id).one()

    # a Clerk (manages OJT) still can't fill it on the participant's behalf
    clerk = db.query(User).filter(User.role_type == RoleType.CLERK, User.status == StaffStatus.ACTIVE).first()
    if clerk:
        login_as(client, clerk)
        assert client.post(f"/api/ojt/{oid}/participants/{p.id}/survey", data={"q1": "a", "q2": "2", "q3": "4"}).status_code == 403

    login_as(client, admin)
    r = client.post(f"/api/ojt/{oid}/participants/{p.id}/survey", data={"q1": "welding", "q2": "2", "q3": "4"})
    assert r.status_code == 200, r.text
    db.refresh(p)
    assert p.attendance == AttendanceStatus.COMPLETED and (p.q1, p.q2, p.q3) == ("WELDING", 2, 4)
    assert p.clerk_id == admin.id  # shown as "Key In By"
    again = client.post(f"/api/ojt/{oid}/participants/{p.id}/survey", data={"q1": "a", "q2": "1", "q3": "1"})
    assert again.status_code == 400


def test_admin_evaluates_pme_on_behalf_of_supervisor(client, db, admin):
    exec_user = _exec_with_supervisor(db)
    supervisor = db.get(User, exec_user.supervisor_id)
    login_as(client, admin)
    tid, pid = _training_with(client, exec_user)
    client.post(f"/api/training/public/{tid}/participants/{pid}/survey", data=SURVEY)
    pme = db.query(Pme).filter_by(participation_id=pid).one()

    lst = client.get("/api/pme").json()
    assert any(p["id"] == pme.id and p["supervisor"]["id"] == supervisor.id for p in lst["dueWaiting"])
    detail = client.get(f"/api/pme/{pme.id}").json()
    assert detail["onBehalfOf"]["id"] == supervisor.id and detail["keyedInBy"] is None

    r = client.post(f"/api/pme/{pme.id}/evaluate", data=PME_FORM)
    assert r.status_code == 200, r.text
    db.refresh(pme)
    assert pme.status.value == "VERIFIED" and pme.average_mark == 73.75
    assert pme.supervisor_id == supervisor.id  # "Evaluated By" stays the HOD
    assert pme.keyed_in_by_id == admin.id
    assert not any(p["id"] == pme.id for p in client.get("/api/pme").json()["dueWaiting"])
    assert client.get(f"/api/pme/{pme.id}").json()["keyedInBy"]["staffNo"] == "ADMIN01"

    # the HOD sees it as their completed evaluation, without the admin audit details
    login_as(client, supervisor)
    lst = client.get("/api/pme").json()
    assert any(p["id"] == pme.id for p in lst["completed"]) and not any(p["id"] == pme.id for p in lst["myPmes"])
    hod_view = client.get(f"/api/pme/{pme.id}").json()
    assert hod_view["supervisor"]["id"] == supervisor.id
    assert hod_view["keyedInBy"] is None and hod_view["keyedInById"] is None


def test_pme_not_due_cannot_be_done_on_behalf(client, db, admin):
    exec_user = _exec_with_supervisor(db)
    login_as(client, admin)
    tid, pid = _training_with(client, exec_user, start="2099-01-05", end="2099-01-06")
    client.post(f"/api/training/public/{tid}/participants/{pid}/survey", data=SURVEY)
    pme = db.query(Pme).filter_by(participation_id=pid).one()
    assert not any(p["id"] == pme.id for p in client.get("/api/pme").json()["dueWaiting"])
    r = client.post(f"/api/pme/{pme.id}/evaluate", data=PME_FORM)
    assert r.status_code == 400 and r.json()["detail"] == "This PME is not due yet."


def test_pme_without_supervisor(client, db, admin):
    exec_user = _exec_with_supervisor(db)
    supervisor_id = exec_user.supervisor_id
    login_as(client, admin)
    tid, pid = _training_with(client, exec_user)
    client.post(f"/api/training/public/{tid}/participants/{pid}/survey", data=SURVEY)
    pme = db.query(Pme).filter_by(participation_id=pid).one()

    # No supervisor snapshotted on the PME -> falls back to the staff member's current supervisor
    pme.supervisor_id = None
    db.flush()
    assert client.get(f"/api/pme/{pme.id}").json()["onBehalfOf"]["id"] == supervisor_id

    # ...and with no supervisor at all, the admin is told to assign one first
    exec_user.supervisor_id = None
    db.flush()
    db.expire_all()
    r = client.post(f"/api/pme/{pme.id}/evaluate", data=PME_FORM)
    assert r.status_code == 400 and "no supervisor (HOD) assigned" in r.json()["detail"]

    exec_user = db.get(User, exec_user.id)
    exec_user.supervisor_id = supervisor_id
    db.flush()
    db.expire_all()  # a real request gets a fresh session; drop the cached relationship here
    r = client.post(f"/api/pme/{pme.id}/evaluate", data=PME_FORM)
    assert r.status_code == 200, r.text
    db.refresh(pme)
    assert pme.supervisor_id == supervisor_id and pme.keyed_in_by_id == admin.id


def test_pme_requires_all_four_ratings(client, db, admin):
    exec_user = _exec_with_supervisor(db)
    login_as(client, admin)
    tid, pid = _training_with(client, exec_user)
    client.post(f"/api/training/public/{tid}/participants/{pid}/survey", data=SURVEY)
    pme = db.query(Pme).filter_by(participation_id=pid).one()
    login_as(client, db.get(User, exec_user.supervisor_id))
    partial = {k: v for k, v in PME_FORM.items() if not k.startswith("result")}
    r = client.post(f"/api/pme/{pme.id}/evaluate", data=partial)
    assert r.status_code == 400 and r.json()["detail"].startswith("Please give a rating")
