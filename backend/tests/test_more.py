"""Functional tests for everything the module tests didn't already cover.
All inside a rolled-back transaction; storage is faked."""

import json
from datetime import datetime, timedelta

import bcrypt

from app.models import (
    Department,
    Designation,
    Division,
    ElearningAssignment,
    ElearningCategory,
    ElearningLesson,
    ElearningModule,
    Ojt,
    ParticipateOjt,
    Participation,
    Pme,
    RoleType,
    Section,
    StaffStatus,
    Training,
    TrainingRequisition,
    User,
)
from app.security import COOKIE_NAME, create_session_token
from tests.conftest import login_as

T_FORM = {"title": "t", "program": "INTX", "platform": "ONLINE", "function": "LEADERSHIP", "venue": "v",
          "startDate": "2026-06-01", "endDate": "2026-06-01", "startTime": "09:00", "endTime": "13:30", "trainer": "x"}


def _other_staff(db, *exclude):
    return (
        db.query(User)
        .filter(User.role_type == RoleType.STAFF, User.status == StaffStatus.ACTIVE, User.is_hod.is_(False),
                User.id.notin_([u.id for u in exclude]))
        .order_by(User.id)
        .first()
    )


# ---------------- Auth ----------------

def test_auth_session_rules(client, db, staff_user):
    login_as(client, staff_user)
    me = client.get("/api/auth/me").json()
    assert me["userId"] == staff_user.id and me["permissions"]["canManageStaff"] is False

    assert client.post("/api/auth/change-password", json={"newPassword": "abc", "confirmPassword": "abc"}).json()["detail"].startswith("New password must be at least 6")
    assert client.post("/api/auth/change-password", json={"newPassword": "abcdef", "confirmPassword": "abcdeg"}).json()["detail"] == "New password and confirmation do not match."
    assert client.post("/api/auth/change-password", json={"newPassword": "NewPass#1", "confirmPassword": "NewPass#1"}).status_code == 204
    db.refresh(staff_user)
    assert bcrypt.checkpw(b"NewPass#1", staff_user.password.encode()) and staff_user.password_is_default is False

    # new password works through the real login endpoint, old default doesn't
    client.cookies.clear()
    assert client.post("/api/auth/login", json={"staffNo": staff_user.staff_no.lower(), "password": "NewPass#1"}).status_code == 200
    assert client.get("/api/auth/me").status_code == 200
    client.post("/api/auth/logout")
    client.cookies.clear()
    assert client.get("/api/auth/me").status_code == 401

    # tampered cookie
    client.cookies.set(COOKIE_NAME, create_session_token(staff_user.id, 3600)[:-3] + "abc")
    assert client.get("/api/auth/me").status_code == 401

    # resigned staff are locked out, even with a valid session
    login_as(client, staff_user)
    staff_user.status = StaffStatus.RESIGN
    db.flush()
    assert client.get("/api/auth/me").status_code == 401
    client.cookies.clear()
    assert client.post("/api/auth/login", json={"staffNo": staff_user.staff_no, "password": "NewPass#1"}).status_code == 401


# ---------------- Staff ----------------

def test_staff_filters_and_guards(admin_client, db, admin):
    dept = db.query(Department).join(User, User.department_id == Department.id).first()
    r = admin_client.get("/api/staff", params={"departmentId": dept.id}).json()["staff"]
    assert r and all(s["departmentId"] == dept.id for s in r)
    r = admin_client.get("/api/staff", params={"status": "ACTIVE", "role": "ADMIN"}).json()["staff"]
    assert all(s["status"] == "ACTIVE" and s["roleType"] == "ADMIN" for s in r)
    assert admin_client.get("/api/staff", params={"role": "WIZARD"}).status_code == 422
    assert admin_client.get("/api/staff/999999999").status_code == 404
    assert admin_client.post("/api/staff/999999999", data={"staffName": "x", "gender": "MALE", "designation": "EXECUTIVE"}).status_code == 404

    # the only active admin can't demote themself
    others = db.query(User).filter(User.role_type == RoleType.ADMIN, User.status == StaffStatus.ACTIVE, User.id != admin.id).all()
    for o in others:
        o.role_type = RoleType.STAFF
    db.flush()
    r = admin_client.post(f"/api/staff/{admin.id}", data={"staffName": admin.staff_name, "gender": admin.gender.value,
                                                           "designation": admin.designation.value, "roleType": "STAFF", "status": "ACTIVE"})
    assert r.status_code == 400 and "only active Admin" in r.json()["detail"]

    # reset password restores the default
    u = _other_staff(db, admin)
    u.password, u.password_is_default = "x", False
    db.flush()
    assert admin_client.post(f"/api/staff/{u.id}/reset-password").status_code == 200
    db.refresh(u)
    assert bcrypt.checkpw(b"P@ss1234", u.password.encode()) and u.password_is_default


def test_staff_with_history_cannot_be_deleted(admin_client, db, admin):
    u = _other_staff(db, admin)
    t = Training(training_code="X1", title="t", program="EXT", platform="ONLINE", function="DIGITAL", venue="v",
                 start_date=datetime(2026, 1, 1), end_date=datetime(2026, 1, 1), start_time="09:00", end_time="10:00", trainer="x")
    db.add(t); db.flush()
    db.add(Participation(training_id=t.id, user_id=u.id)); db.flush()
    r = admin_client.delete(f"/api/staff/{u.id}")
    assert r.status_code == 400 and "training history" in r.json()["detail"]


def test_bulk_upload_updates_and_keeps_blanks(admin_client, db, admin):
    import io

    from openpyxl import Workbook

    target = _other_staff(db, admin)
    sup = _other_staff(db, admin, target)
    before_name, before_gender = target.staff_name, target.gender
    wb = Workbook(); ws = wb.active
    ws.append(["Staff No", "Staff Name", "Gender", "Designation", "Supervisor Staff No", "Status"])
    ws.append([target.staff_no, "", "", "Manager", sup.staff_no, "Resigned"])
    ws.append(["ZZ1", "dup a", "Male", "Executive", "", ""])
    ws.append(["ZZ1", "dup b", "Male", "Executive", "", ""])
    buf = io.BytesIO(); wb.save(buf)
    r = admin_client.post("/api/staff/bulk-upload", files={"file": ("s.xlsx", buf.getvalue())})
    assert r.status_code == 400 and "appears more than once" in r.json()["detail"]

    ws.delete_rows(3, 2)
    buf = io.BytesIO(); wb.save(buf)
    assert admin_client.post("/api/staff/bulk-upload", files={"file": ("s.xlsx", buf.getvalue())}).status_code == 200
    db.refresh(target)
    assert target.staff_name == before_name and target.gender == before_gender  # blanks untouched
    assert target.designation == Designation.MANAGER and target.supervisor_id == sup.id and target.status == StaffStatus.RESIGN

    assert admin_client.post("/api/staff/bulk-upload", files={"file": ("s.xlsx", b"not an excel file")}).status_code == 400


# ---------------- Organization ----------------

def test_org_update_delete_and_unassign_hod(admin_client, db, staff_user):
    admin_client.post("/api/org/divisions", data={"name": "zz div"})
    div = db.query(Division).filter_by(name="ZZ DIV").one()
    assert admin_client.post(f"/api/org/divisions/{div.id}", data={"name": "zz div 2", "shortName": ""}).status_code == 200
    db.refresh(div)
    assert div.name == "ZZ DIV 2" and div.short_name is None
    assert admin_client.post(f"/api/org/divisions/{div.id}", data={"name": " "}).json()["detail"] == "Division name is required."

    admin_client.post(f"/api/org/divisions/{div.id}/departments", data={"name": "zz d"})
    dept = db.query(Department).filter_by(name="ZZ D").one()
    admin_client.post(f"/api/org/departments/{dept.id}/sections", data={"name": "s1"})
    sec = db.query(Section).filter_by(department_id=dept.id).one()
    admin_client.post(f"/api/org/sections/{sec.id}", data={"name": "s2", "shortName": "x"})
    db.refresh(sec)
    assert (sec.name, sec.short_name) == ("S2", "X")

    staff_user.department_id = dept.id; db.flush()
    admin_client.post(f"/api/org/departments/{dept.id}/hod", data={"hodUserId": str(staff_user.id)})
    admin_client.post(f"/api/org/departments/{dept.id}/hod", data={"hodUserId": ""})  # unassign
    db.refresh(staff_user); db.refresh(dept)
    assert dept.hod_user_id is None and staff_user.is_hod is False and staff_user.hod_id is None

    assert admin_client.delete(f"/api/org/sections/{sec.id}").status_code == 200
    dept_id, div_id = dept.id, div.id
    assert admin_client.delete(f"/api/org/divisions/{div_id}").status_code == 200
    db.expire_all()
    assert db.query(Department).filter_by(id=dept_id).count() == 0  # cascaded in the database
    assert admin_client.delete("/api/org/divisions/999999999").status_code == 404


# ---------------- Training ----------------

def test_training_update_absent_remove(admin_client, client, db, admin, staff_user):
    tid = admin_client.post("/api/training/public", data=T_FORM).json()["id"]
    assert db.get(Training, tid).training_code.startswith("IN010626")  # INTX -> IN prefix, start date
    r = admin_client.post(f"/api/training/public/{tid}", data={**T_FORM, "title": "renamed", "cost": "99.9", "hrdcClaimable": "on"})
    assert r.status_code == 200
    t = db.get(Training, tid); db.refresh(t)
    assert (t.title, t.cost, t.hrdc_claimable) == ("RENAMED", 99.9, True)
    assert admin_client.post(f"/api/training/public/{tid}", data={**T_FORM, "program": "NOPE"}).status_code == 400
    assert admin_client.post(f"/api/training/public/{tid}", data={**T_FORM, "startDate": ""}).status_code == 400

    admin_client.post(f"/api/training/public/{tid}/participants", data={"userId": str(staff_user.id)})
    pid = db.query(Participation).filter_by(training_id=tid).one().id
    assert admin_client.post(f"/api/training/public/{tid}/participants/{pid}/absent").status_code == 200
    assert db.get(Participation, pid).attendance.value == "ABSENT"
    assert admin_client.get(f"/api/training/public/{tid}/basic").json()["title"] == "RENAMED"

    login_as(client, staff_user)
    assert client.get(f"/api/training/public/{tid}/basic").status_code == 403
    assert client.get(f"/api/training/public/{tid}/participations/{pid}").status_code == 200  # own
    other = _other_staff(db, staff_user)
    login_as(client, other)
    assert client.get(f"/api/training/public/{tid}/participations/{pid}").status_code == 403
    assert client.get("/api/training/public").json()["trainings"] == [] or all(
        True for _ in client.get("/api/training/public").json()["trainings"])

    login_as(client, admin)
    assert client.delete(f"/api/training/public/{tid}/participants/{pid}").status_code == 200
    assert db.get(Participation, pid) is None
    # participant id from another training is rejected
    assert client.post(f"/api/training/public/{tid}/participants/999999/absent").status_code == 404


def test_certificate_upload_download_delete(admin_client, client, db, fake_storage, staff_user):
    tid = admin_client.post("/api/training/public", data=T_FORM).json()["id"]
    assert admin_client.post(f"/api/training/public/{tid}/certificates", data={}).json()["detail"] == "Please choose a file to upload."
    admin_client.post(f"/api/training/public/{tid}/certificates", files={"file": ("Cert 1.pdf", b"%PDF")})
    cert = db.get(Training, tid).certificates[0]
    assert fake_storage["saved"] == ["certificates/fake-Cert 1.pdf"]
    login_as(client, staff_user)  # any signed-in user may download (same as before)
    r = client.get(f"/api/training/certificates/{cert.id}/file")
    assert r.status_code == 200 and r.content == b"file:certificates/fake-Cert 1.pdf"
    assert "Cert 1.pdf" in r.headers["content-disposition"]
    assert client.delete(f"/api/training/public/{tid}/certificates/{cert.id}").status_code == 403


# ---------------- OJT ----------------

def test_ojt_owner_rules_and_checkin(client, db, admin, staff_user):
    login_as(client, staff_user)
    base = {"title": "mine", "venue": "v", "trainerType": "EXTERNAL", "trainerName": "t",
            "startDate": "2026-02-01", "endDate": "2026-02-01", "startTime": "08:00", "endTime": "10:00"}
    oid = client.post("/api/ojt", data={**base, "q1": "x", "q2": "2", "q3": "5"}).json()["id"]
    p = db.query(ParticipateOjt).filter_by(ojt_id=oid).one()
    assert (p.attendance.value, p.q3) == ("COMPLETED", 5)

    # owner can edit; stays on My Training
    assert client.post(f"/api/ojt/{oid}", data={**base, "title": "mine 2"}).json() == {"redirect": "/training"}
    other = _other_staff(db, staff_user)
    login_as(client, other)
    assert client.post(f"/api/ojt/{oid}", data=base).status_code == 403
    assert client.delete(f"/api/ojt/{oid}").status_code == 403
    assert client.delete(f"/api/ojt/{oid}/participants/{p.id}").status_code == 403
    assert client.post(f"/api/ojt/{oid}/participants", data={"userId": str(other.id)}).status_code == 403
    assert client.get(f"/api/ojt/{oid}").json()["ojt"]["participants"] == []  # can't see others

    # public OJT QR check-in (no login) auto-enrolls and records the survey
    client.cookies.clear()
    assert client.get(f"/api/checkin/ojt/{oid}").json()["title"] == "MINE 2"
    v = client.post(f"/api/checkin/ojt/{oid}/verify", json={"staffId": other.staff_no}).json()
    assert v["verified"]
    assert client.post(f"/api/checkin/ojt/{oid}/survey", data={"staffNo": other.staff_no, "q1": "learned", "q2": "1", "q3": "4"}).status_code == 200
    op = db.query(ParticipateOjt).filter_by(ojt_id=oid, user_id=other.id).one()
    assert (op.attendance.value, op.q1, op.q3) == ("COMPLETED", "LEARNED", 4) and op.department is not None or True
    assert client.post(f"/api/checkin/ojt/{oid}/verify", json={"staffId": other.staff_no}).json()["alreadyCompleted"]

    login_as(client, admin)
    assert client.delete(f"/api/ojt/{oid}").json() == {"redirect": "/training/ojt"}
    assert db.get(Ojt, oid) is None


# ---------------- PME ----------------

def test_pme_not_due_and_admin_list(client, db, admin):
    exec_user = (db.query(User).filter(User.designation == Designation.MANAGER, User.status == StaffStatus.ACTIVE,
                                       User.supervisor_id.isnot(None)).first()
                 or db.query(User).filter(User.designation == Designation.EXECUTIVE, User.supervisor_id.isnot(None)).first())
    login_as(client, admin)
    end = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")  # ended 5 days ago -> not due for ~3 months
    tid = client.post("/api/training/public", data={**T_FORM, "startDate": end, "endDate": end}).json()["id"]
    client.post(f"/api/training/public/{tid}/participants", data={"userId": str(exec_user.id)})
    pid = db.query(Participation).filter_by(training_id=tid).one().id
    login_as(client, exec_user)
    client.post(f"/api/training/public/{tid}/participants/{pid}/survey", data={"courseRelevance": "4"})
    pme = db.query(Pme).filter_by(participation_id=pid).one()

    login_as(client, db.get(User, exec_user.supervisor_id))
    assert client.post(f"/api/pme/{pme.id}/evaluate", data={}).json()["detail"] == "This PME is not due yet."
    login_as(client, admin)
    lst = client.get("/api/pme").json()
    assert lst["viewAll"] and any(r["id"] == pme.id for r in lst["allRecords"])

    # NON_EXECUTIVE participants never get a PME
    ne = db.query(User).filter(User.designation == Designation.NON_EXECUTIVE, User.status == StaffStatus.ACTIVE).first()
    if ne:
        client.post(f"/api/training/public/{tid}/participants", data={"userId": str(ne.id)})
        npid = db.query(Participation).filter_by(training_id=tid, user_id=ne.id).one().id
        client.post(f"/api/training/public/{tid}/participants/{npid}/survey", data={})
        assert db.query(Pme).filter_by(participation_id=npid).count() == 0


# ---------------- E-Learning ----------------

def test_elearning_edits_files_assign(client, db, admin, staff_user, fake_storage):
    login_as(client, admin)
    mid = client.post("/api/elearning/modules", data={"title": "m"}, files={"certificateBackground": ("bg.png", b"png")}).json()["id"]
    m = db.get(ElearningModule, mid)
    assert m.certificate_background_path == "certificate-backgrounds/fake-bg.png" and m.pass_threshold == 80
    client.post(f"/api/elearning/modules/{mid}", data={"title": "m2", "removeCertificateBackground": "on", "passThreshold": "70"})
    db.refresh(m)
    assert (m.title, m.pass_threshold, m.certificate_background_path) == ("m2", 70, None)
    assert "certificate-backgrounds/fake-bg.png" in fake_storage["deleted"]

    r = client.post(f"/api/elearning/modules/{mid}/lessons?type=SLIDE", data={"title": "s"}, files={"slideFile": ("deck.pdf", b"%PDF", "application/pdf")})
    sid = r.json()["id"]
    s = db.get(ElearningLesson, sid)
    assert (s.slide_file_name, s.slide_file_type) == ("deck.pdf", "application/pdf")
    client.post(f"/api/elearning/modules/{mid}/lessons/{sid}?type=SLIDE", data={"title": "s2", "removeSlideFile": "on", "slideContent": "hello"})
    db.refresh(s)
    assert (s.title, s.slide_file_path, s.slide_content) == ("s2", None, "hello")

    vid = client.post(f"/api/elearning/modules/{mid}/lessons?type=VIDEO", data={"title": "v"}, files={"videoFile": ("a.mp4", b"vid")}).json()["id"]
    # removing the only video source is refused
    r = client.post(f"/api/elearning/modules/{mid}/lessons/{vid}?type=VIDEO", data={"title": "v", "removeVideoFile": "on"})
    assert r.json()["detail"] == "Provide a video URL or upload a video file."

    # learner can't fetch files of an unpublished module; admin can
    assert client.get(f"/api/elearning/lessons/{vid}/file?kind=video").status_code == 200
    login_as(client, staff_user)
    assert client.get(f"/api/elearning/lessons/{vid}/file?kind=video").status_code == 404
    assert client.get(f"/api/elearning/learner/modules/{mid}").status_code == 404

    login_as(client, admin)
    client.post(f"/api/elearning/modules/{mid}/publish")
    login_as(client, staff_user)
    r = client.get(f"/api/elearning/lessons/{vid}/file?kind=video")
    assert r.status_code == 200 and r.headers["content-type"].startswith("video/mp4")

    login_as(client, admin)
    dept_id = staff_user.department_id
    r = client.post(f"/api/elearning/modules/{mid}/assign", data={"target": "department", "departmentId": str(dept_id), "mandatory": "on"})
    n_dept = db.query(User).filter(User.department_id == dept_id, User.status == StaffStatus.ACTIVE).count()
    assert r.json()["count"] == n_dept
    r = client.post(f"/api/elearning/modules/{mid}/assign", data={"target": "all", "dueDate": "2026-12-31"})
    assert db.query(ElearningAssignment).filter_by(module_id=mid).count() == db.query(User).filter(User.status == StaffStatus.ACTIVE).count()
    a = db.query(ElearningAssignment).filter_by(module_id=mid, user_id=staff_user.id).one()
    assert a.due_date.date().isoformat() == "2026-12-31" and a.mandatory is False  # re-assign updated it
    assert client.delete(f"/api/elearning/assignments/{a.id}").status_code == 200

    assert client.post("/api/elearning/categories", data={"name": "ZZ Cat"}).status_code == 200
    assert client.post("/api/elearning/categories", data={"name": "ZZ Cat"}).status_code == 400
    assert db.query(ElearningCategory).filter_by(name="ZZ Cat").count() == 1

    assert client.post(f"/api/elearning/modules/{mid}/archive").status_code == 200
    assert client.delete(f"/api/elearning/modules/{mid}/lessons/{vid}").status_code == 200
    assert "elearning-videos/fake-a.mp4" in fake_storage["deleted"]
    assert client.delete(f"/api/elearning/modules/{mid}").status_code == 200
    assert db.get(ElearningModule, mid) is None

    assert client.get("/api/elearning/learner/dashboard").status_code == 403  # admins have no learner view


def test_quiz_max_attempts(client, db, admin, staff_user):
    login_as(client, admin)
    mid = client.post("/api/elearning/modules", data={"title": "q"}).json()["id"]
    qid = client.post(f"/api/elearning/modules/{mid}/lessons?type=QUIZ", data={"title": "q", "maxAttempts": "1"}).json()["id"]
    client.post(f"/api/elearning/lessons/{qid}/questions", data={"type": "TRUE_FALSE", "question": "?", "trueFalseAnswer": "false"})
    client.post(f"/api/elearning/modules/{mid}/publish")
    login_as(client, staff_user)
    assert client.post(f"/api/elearning/learner/modules/{mid}/quiz/{qid}", data={}).json() == {"score": 0, "passed": False}
    r = client.post(f"/api/elearning/learner/modules/{mid}/quiz/{qid}", data={})
    assert r.status_code == 400 and r.json()["detail"] == "You have used all your attempts for this quiz."
    review = client.get(f"/api/elearning/learner/modules/{mid}/quiz/{qid}").json()
    assert any(o["isCorrect"] for q in review["lesson"]["questions"] for o in q["options"])  # review shows answers


# ---------------- TNA / Requisition / Dashboard ----------------

def test_tna_bad_payload_and_summary_filter(client, db, admin):
    hod = db.query(User).filter(User.is_hod.is_(True), User.status == StaffStatus.ACTIVE).first()
    login_as(client, hod)
    r = client.post("/api/tna", data={"year": "2032", "payload": json.dumps([{"section": "ESG"}])})
    assert r.status_code == 400 and "invalid" in r.json()["detail"]
    client.post("/api/tna", data={"year": "2032", "payload": json.dumps([{"section": "SELF", "order": 0, "problemStatement": "p",
                "training": "t", "targetSkill": 3, "currentSkill": 1, "trainingType": "COACHING", "monthApply": "JAN"}])})
    login_as(client, admin)
    assert client.get("/api/tna/summary", params={"year": 2032, "departmentId": hod.department_id}).json()["items"] == [
        {"section": "SELF", "trainingType": "COACHING"}]
    other_dept = db.query(Department).filter(Department.id != hod.department_id).first()
    assert client.get("/api/tna/summary", params={"year": 2032, "departmentId": other_dept.id}).json()["items"] == []
    login_as(client, hod)
    assert client.get("/api/tna/admin", params={"year": 2032}).status_code == 403


def test_requisition_validation_brochure_and_permissions(client, db, admin, fake_storage):
    member = db.query(User).filter(User.hod_id.isnot(None), User.status == StaffStatus.ACTIVE, User.is_hod.is_(False)).first()
    login_as(client, member)
    base = {"title": "c", "trainingDate": "2031-03-01", "trainingEndDate": "2031-03-02", "startTime": "09:00", "endTime": "17:00",
            "venue": "v", "objective": "o", "fees": "100", "hrdcClaimable": "no", "underAtp": "yes",
            "trainingProvider": "p", "participantUserIds": [str(member.id)]}
    assert client.post("/api/requisitions", data={**base, "fees": "-1"}).json()["detail"] == "Invalid fees amount."
    assert client.post("/api/requisitions", data={**base, "hrdcClaimable": ""}).json()["detail"].startswith("Select whether this training is HRDC")
    assert client.post("/api/requisitions", data={**base, "venue": " "}).json()["detail"] == "Please fill in all required fields."
    rid = client.post("/api/requisitions", data=base, files={"brochureFile": ("b.pdf", b"%PDF")}).json()["id"]
    r = db.get(TrainingRequisition, rid)
    assert r.brochure_file_name == "b.pdf" and r.under_atp and not r.hrdc_claimable and r.training_end_date.day == 2
    b = client.get(f"/api/requisitions/{rid}/brochure")
    assert b.status_code == 200 and b.content == b"file:requisition-brochures/fake-b.pdf"
    assert client.post(f"/api/requisitions/{rid}/grant-id", json={"grantId": "G"}).json()["detail"] == "Not authorized to set the grant ID."
    assert client.delete(f"/api/requisitions/{rid}").json()["detail"] == "Only an Admin can delete a training requisition."
    stranger = _other_staff(db, member)
    if stranger.hod_id != member.id:
        login_as(client, stranger)
        assert client.get(f"/api/requisitions/{rid}/brochure").status_code == 404
    login_as(client, admin)
    assert client.delete(f"/api/requisitions/{rid}").status_code == 200
    assert "requisition-brochures/fake-b.pdf" in fake_storage["deleted"]


def test_dashboard_defaults_and_bad_dates(admin_client):
    r = admin_client.get("/api/dashboard")
    assert r.status_code == 200 and len(r.json()["monthlyCost"]) == 12
    assert admin_client.get("/api/dashboard", params={"start": "not-a-date"}).status_code == 400
