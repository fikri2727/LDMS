import io
from datetime import datetime

from openpyxl import Workbook

from app.models import Department, Division, RoleType, StaffStatus, User
from tests.conftest import login_as


def test_staff_list_and_filters(admin_client):
    r = admin_client.get("/api/staff")
    assert r.status_code == 200
    body = r.json()
    assert len(body["staff"]) > 100
    s = body["staff"][0]
    assert "password" not in s
    assert {"staffNo", "staffName", "division", "department", "section", "supervisor"} <= s.keys()

    r = admin_client.get("/api/staff", params={"q": "admin01"})
    assert [x["staffNo"] for x in r.json()["staff"]] == ["ADMIN01"]

    r = admin_client.get("/api/staff", params={"q": "manager"})
    assert all(x["designation"] == "MANAGER" or "MANAGER" in (x["staffName"] + (x["department"] or {}).get("name", "")) for x in r.json()["staff"])


def test_staff_permission_denied_for_normal_staff(client, staff_user):
    login_as(client, staff_user)
    r = client.get("/api/staff")
    assert r.status_code == 403
    assert r.json()["detail"] == "You do not have permission to manage staff records."


def test_staff_detail_and_training_record(admin_client, db):
    uid = db.query(User.id).filter(User.staff_no != "ADMIN01").order_by(User.id).first()[0]
    assert admin_client.get(f"/api/staff/{uid}").json()["id"] == uid
    rec = admin_client.get(f"/api/staff/{uid}/training-record").json()
    assert rec["staff"]["id"] == uid
    for row in rec["rows"]:
        assert row["type"] in ("training", "ojt", "elearning")
    opts = admin_client.get("/api/staff/form-options", params={"excludeId": uid}).json()
    assert all(o["id"] != uid for o in opts["supervisorOptions"])
    assert "departments" in opts["divisions"][0]


def test_create_update_reset_delete_staff(admin_client, db):
    dept = db.query(Department).first()
    r = admin_client.post(
        "/api/staff",
        data={"staffNo": "zz9999", "staffName": "test person", "gender": "MALE", "designation": "EXECUTIVE",
              "departmentId": str(dept.id), "divisionId": str(dept.division_id), "roleType": "STAFF"},
    )
    assert r.status_code == 200, r.text
    new_id = r.json()["id"]
    u = db.get(User, new_id)
    assert u.staff_no == "ZZ9999" and u.staff_name == "TEST PERSON" and u.hod_id == dept.hod_user_id

    # duplicate staff no (case and spaces don't matter)
    r = admin_client.post("/api/staff", data={"staffNo": " zz9999 ", "staffName": "x", "gender": "MALE", "designation": "EXECUTIVE"})
    assert r.status_code == 400 and r.json()["detail"] == 'Staff No "ZZ9999" already exists: TEST PERSON.'

    r = admin_client.post(f"/api/staff/{new_id}", data={"staffName": "renamed", "gender": "FEMALE",
                          "designation": "MANAGER", "status": "RESIGN", "dateResign": "2026-01-31", "supervisorId": str(new_id)})
    assert r.json()["detail"] == "A staff member cannot be their own supervisor."
    r = admin_client.post(f"/api/staff/{new_id}", data={"staffName": "renamed", "gender": "FEMALE",
                          "designation": "MANAGER", "status": "RESIGN", "dateResign": "2026-01-31"})
    assert r.status_code == 200, r.text
    db.refresh(u)
    assert u.staff_name == "RENAMED" and u.status.value == "RESIGN" and u.date_resign.year == 2026

    assert admin_client.post(f"/api/staff/{new_id}/reset-password").status_code == 200
    assert admin_client.delete(f"/api/staff/{new_id}").status_code == 200
    assert db.get(User, new_id) is None


def test_cannot_delete_self_or_demote_last_admin(admin_client, admin):
    assert admin_client.delete(f"/api/staff/{admin.id}").status_code == 400


def _xlsx(rows):
    wb = Workbook()
    ws = wb.active
    ws.append(["Staff No", "Staff Name", "Gender", "Designation", "Department"])
    for r in rows:
        ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def test_bulk_upload(admin_client, db):
    dept = db.query(Department).first()
    existing = db.query(User).filter(User.staff_no != "ADMIN01").order_by(User.id).first()
    data = _xlsx([["ZZ8888", "bulk new", "Male", "Executive", dept.short_name or dept.name],
                  [existing.staff_no, "", "", "", ""]])
    r = admin_client.post("/api/staff/bulk-upload", files={"file": ("s.xlsx", data)})
    assert r.status_code == 200, r.text
    new = db.query(User).filter_by(staff_no="ZZ8888").one()
    assert new.department_id == dept.id and new.division_id == dept.division_id

    bad_file = _xlsx([["ZZ7777", "", "Alien", "", "NO SUCH DEPT"]])
    r = admin_client.post("/api/staff/bulk-upload", files={"file": ("s.xlsx", bad_file)})
    assert r.status_code == 400
    msg = r.json()["detail"]
    assert 'unknown Gender "Alien"' in msg and 'Department "NO SUCH DEPT" not found' in msg


def test_org_crud(admin_client, db, staff_user):
    tree = admin_client.get("/api/org").json()
    assert tree["divisions"] and tree["staff"]

    assert admin_client.post("/api/org/divisions", data={"name": "zz test div", "shortName": "ztd"}).status_code == 200
    div = db.query(Division).filter_by(name="ZZ TEST DIV").one()
    assert div.short_name == "ZTD"
    admin_client.post(f"/api/org/divisions/{div.id}/departments", data={"name": "zz dept"})
    dept = db.query(Department).filter_by(name="ZZ DEPT").one()
    admin_client.post(f"/api/org/departments/{dept.id}/sections", data={"name": "zz sec"})

    staff_user.department_id = dept.id
    db.flush()
    assert admin_client.post(f"/api/org/departments/{dept.id}/hod", data={"hodUserId": str(staff_user.id)}).status_code == 200
    db.refresh(staff_user)
    assert staff_user.is_hod and staff_user.hod_id == staff_user.id

    # Same as the Node app: the DB's ON DELETE SET NULL unassigns the staff, sections cascade.
    assert admin_client.delete(f"/api/org/departments/{dept.id}").status_code == 200
    db.expire_all()
    assert staff_user.department_id is None


def test_check_staff_no(client, admin_client, db, staff_user):
    r = admin_client.get("/api/staff/check-staff-no", params={"staffNo": f" {staff_user.staff_no.lower()} "})
    assert r.json() == {
        "staffNo": staff_user.staff_no, "exists": True, "id": staff_user.id,
        "staffName": staff_user.staff_name, "status": "ACTIVE",
    }
    assert admin_client.get("/api/staff/check-staff-no", params={"staffNo": "ZZ-NOPE-1"}).json() == {
        "staffNo": "ZZ-NOPE-1", "exists": False}
    assert admin_client.get("/api/staff/check-staff-no").json()["exists"] is False

    login_as(client, staff_user)  # admins only
    assert client.get("/api/staff/check-staff-no", params={"staffNo": "X"}).status_code == 403
    login_as(client, db.query(User).filter_by(staff_no="ADMIN01").one())

    # resigned staff still block their number
    staff_user.status = StaffStatus.RESIGN
    db.flush()
    r = admin_client.post("/api/staff", data={"staffNo": staff_user.staff_no, "staffName": "x", "gender": "MALE", "designation": "EXECUTIVE"})
    assert r.status_code == 400 and r.json()["detail"].endswith("(resigned).")


def _full_list(db, skip=()):
    active = db.query(User).filter(User.status == StaffStatus.ACTIVE).all()
    return _xlsx([[u.staff_no, "", "", "", ""] for u in active if u.staff_no not in skip])


def test_compare_staff_ids_only(admin_client, db):
    a, b, left = db.query(User).filter(User.role_type == RoleType.STAFF, User.status == StaffStatus.ACTIVE).order_by(User.id).limit(3).all()
    left.status = StaffStatus.RESIGN
    db.flush()
    active_before = db.query(User).filter(User.status == StaffStatus.ACTIVE).count()

    wb = Workbook()  # no header row, one ID twice, and a number Excel stripped the zeros from
    for v in [a.staff_no, a.staff_no, b.staff_no, left.staff_no, 987]:
        wb.active.append([v])
    buf = io.BytesIO()
    wb.save(buf)
    r = admin_client.post("/api/staff/compare", files={"file": ("ids.xlsx", buf.getvalue())})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["fileCount"] == 4 and body["matched"] == 2
    assert body["notRegistered"] == ["000987"]
    assert [x["staffNo"] for x in body["resignedInSystem"]] == [left.staff_no]
    not_in_file = {x["staffNo"] for x in body["notInFile"]}
    assert a.staff_no not in not_in_file and "ADMIN01" not in not_in_file
    assert len(not_in_file) >= active_before - 3
    db.expire_all()
    assert db.query(User).filter(User.status == StaffStatus.ACTIVE).count() == active_before


def test_sync_resign_preview_then_apply(admin_client, db):
    gone, back = db.query(User).filter(User.role_type == RoleType.STAFF, User.status == StaffStatus.ACTIVE).order_by(User.id).limit(2).all()
    back.status = StaffStatus.RESIGN
    back.date_resign = datetime(2026, 1, 1)
    db.flush()
    data = _xlsx([[u.staff_no, "", "", "", ""] for u in db.query(User).filter(User.status == StaffStatus.ACTIVE, User.id != gone.id)]
                 + [[back.staff_no, "", "", "", ""], ["ZZ6666", "sync new", "Male", "Executive", ""]])

    r = admin_client.post("/api/staff/bulk-upload", data={"syncResign": "1", "preview": "1"}, files={"file": ("s.xlsx", data)})
    assert r.status_code == 200, r.text
    p = r.json()
    assert [x["staffNo"] for x in p["toResign"]] == [gone.staff_no]
    assert [x["staffNo"] for x in p["reactivated"]] == [back.staff_no]
    assert [x["staffNo"] for x in p["new"]] == ["ZZ6666"]
    db.expire_all()
    assert gone.status == StaffStatus.ACTIVE and back.status == StaffStatus.RESIGN  # preview wrote nothing
    assert db.query(User).filter_by(staff_no="ZZ6666").count() == 0

    r = admin_client.post("/api/staff/bulk-upload", data={"syncResign": "1"}, files={"file": ("s.xlsx", data)})
    assert r.status_code == 200, r.text
    db.expire_all()
    assert gone.status == StaffStatus.RESIGN and gone.date_resign is not None
    assert back.status == StaffStatus.ACTIVE and back.date_resign is None


def test_sync_resign_keeps_admins_and_refuses_partial_files(admin_client, db, admin):
    r = admin_client.post("/api/staff/bulk-upload", data={"syncResign": "1", "preview": "1"},
                          files={"file": ("s.xlsx", _full_list(db, skip={admin.staff_no}))})
    assert r.status_code == 200, r.text
    assert r.json()["toResign"] == []

    one = db.query(User).filter(User.role_type == RoleType.STAFF, User.status == StaffStatus.ACTIVE).first()
    active_before = db.query(User).filter(User.status == StaffStatus.ACTIVE).count()
    r = admin_client.post("/api/staff/bulk-upload", data={"syncResign": "1"}, files={"file": ("s.xlsx", _xlsx([[one.staff_no, "", "", "", ""]]))})
    assert r.status_code == 400 and "full staff list" in r.json()["detail"]
    db.expire_all()
    assert db.query(User).filter(User.status == StaffStatus.ACTIVE).count() == active_before


def test_upload_without_sync_resigns_nobody_and_matches_hr_department_text(admin_client, db):
    dept = db.query(Department).filter(Department.short_name.isnot(None)).first()
    active_before = db.query(User).filter(User.status == StaffStatus.ACTIVE).count()
    data = _xlsx([["ZZ5555", "hr dept", "Female", "Executive", f"  {dept.short_name}  -  SOME OTHER SPELLING "]])
    assert admin_client.post("/api/staff/bulk-upload", files={"file": ("s.xlsx", data)}).status_code == 200
    db.expire_all()
    assert db.query(User).filter_by(staff_no="ZZ5555").one().department_id == dept.id
    assert db.query(User).filter(User.status == StaffStatus.ACTIVE).count() == active_before + 1
