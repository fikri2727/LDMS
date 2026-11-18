"""Employee Master upload. The two new tables are created inside the test transaction (rolled back
with everything else), so these tests run before the migration is applied and never save anything."""

import io

import pytest
from openpyxl import Workbook

from app.models import Department, EmployeeMaster, EmployeeMasterImport, StaffStatus, User
from app.services.employee_master import department_name, normalize_employee_no

HEADER = [
    "Employee Number",
    "Full Name",
    "New NRIC",
    "Gender",
    "Nationality",
    "Supervisor Employee Number",
    "Status",
    "Employee Status",
    "Department",
    "Branch",
    "Category",
    "Section",
    "Job Position",
    "Job Grade",
    "Date Resigned",
    "Date Joined",
    "Work Email",
]


@pytest.fixture(autouse=True)
def master_tables(db):
    conn = db.connection()
    EmployeeMaster.__table__.create(conn, checkfirst=True)
    EmployeeMasterImport.__table__.create(conn, checkfirst=True)


def xlsx(rows: list[dict]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.append(HEADER)
    for r in rows:
        ws.append([r.get(h) for h in HEADER])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def row_for(u: User, **over) -> dict:
    sup = u.supervisor.staff_no if u.supervisor else None
    r = {
        "Employee Number": "'" + u.staff_no,
        "Full Name": u.staff_name,
        "New NRIC": "900101-10-1234",
        "Gender": "M" if u.gender.value == "MALE" else "F",
        "Nationality": u.nationality,
        "Supervisor Employee Number": int(sup) if sup and sup.isdigit() else sup,
        "Status": "Confirmed" if u.status == StaffStatus.ACTIVE else "Resigned",
        "Employee Status": "Permanent",
        "Department": u.department.name if u.department else None,
        "Category": "Office",
        "Job Position": "EXECUTIVE",
        "Job Grade": "E1",
        "Work Email": u.email,
    }
    r.update(over)
    return r


def upload(client, path: str, data: bytes):
    return client.post(
        f"/api/employee-master/{path}",
        files={"file": ("Master Data.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )


def pick_staff(db, n: int = 3) -> list[User]:
    return (
        db.query(User)
        .filter(User.status == StaffStatus.ACTIVE, User.department_id.isnot(None), User.staff_no.op("~")(r"^\d{6}$"))
        .order_by(User.id)
        .limit(n)
        .all()
    )


def test_helpers():
    assert normalize_employee_no("'000004") == "000004"
    assert normalize_employee_no(294) == "000294"
    assert normalize_employee_no("0001654") == "001654"
    assert department_name("001b - finance  &  accounts") == "001A - FINANCE & ACCOUNTS"
    assert department_name("A002 - HUMAN RESOURCES") == "A002 - HUMAN RESOURCE"


def test_only_admin(client, staff_user, db):
    from tests.conftest import login_as

    login_as(client, staff_user)
    assert upload(client, "preview", xlsx([])).status_code == 403


def test_preview_writes_nothing_and_rejects_wrong_file(admin_client, db):
    r = upload(admin_client, "preview", b"not excel")
    assert r.status_code == 400
    wb = Workbook()
    wb.active.append(["Staff", "Name"])
    buf = io.BytesIO()
    wb.save(buf)
    r = upload(admin_client, "preview", buf.getvalue())
    assert r.status_code == 400 and "Missing column" in r.json()["detail"]

    a, b, c = pick_staff(db)
    r = upload(admin_client, "preview", xlsx([row_for(a), row_for(b), row_for(c, **{"Full Name": "SOMEONE ELSE"})]))
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["fileRows"] == 3 and p["masterNew"] == 3
    assert any(u["staffNo"] == c.staff_no for u in p["updates"])
    assert db.query(EmployeeMaster).count() == 0
    db.refresh(c)
    assert c.staff_name != "SOMEONE ELSE"


def test_duplicate_ids_block(admin_client, db):
    (a,) = pick_staff(db, 1)
    r = upload(admin_client, "preview", xlsx([row_for(a), row_for(a)]))
    assert r.status_code == 400 and "also on row" in r.json()["detail"]


def test_apply_first_upload_master_wins_and_never_stores_ic(admin_client, db):
    a, b, c = pick_staff(db)
    other_dept = db.query(Department).filter(Department.id != b.department_id).order_by(Department.id).first()
    rows = [
        row_for(a, **{"Full Name": a.staff_name + " BIN TEST"}),
        row_for(b, Department=other_dept.name),
        row_for(c, Status="Resigned", **{"Date Resigned": "05/02/2026"}),
    ]
    r = upload(admin_client, "apply", xlsx(rows))
    assert r.status_code == 200, r.text
    db.expire_all()
    assert a.staff_name.endswith("BIN TEST")
    assert b.department_id == other_dept.id and b.hod_id == other_dept.hod_user_id
    assert c.status == StaffStatus.RESIGN and c.date_resign.strftime("%Y-%m-%d") == "2026-02-05"
    assert db.query(EmployeeMaster).count() == 3
    assert db.query(EmployeeMasterImport).count() == 1
    assert "NRIC" not in str({k: v for m in db.query(EmployeeMaster) for k, v in vars(m).items()})


def test_ldms_edit_kept_until_master_changes_that_field(admin_client, db):
    a, _, _ = pick_staff(db)
    assert upload(admin_client, "apply", xlsx([row_for(a)])).status_code == 200

    # Edit in LDMS only: the master is not touched.
    a.staff_name = "LDMS EDITED NAME"
    a.nationality = "LDMS NATIONALITY"
    db.commit()
    assert db.get(EmployeeMaster, a.staff_no).full_name != "LDMS EDITED NAME"

    # Same master file again: nothing changed in the master, so LDMS edits stay.
    p = upload(admin_client, "preview", xlsx([row_for(a, **{"Full Name": db.get(EmployeeMaster, a.staff_no).full_name, "Nationality": db.get(EmployeeMaster, a.staff_no).nationality})])).json()
    assert p["updates"] == []

    # HR changes the name in the master: the name follows; the nationality edit stays.
    m = db.get(EmployeeMaster, a.staff_no)
    r = upload(admin_client, "apply", xlsx([row_for(a, **{"Full Name": "NEW MASTER NAME", "Nationality": m.nationality})]))
    assert r.status_code == 200
    db.expire_all()
    assert a.staff_name == "NEW MASTER NAME"
    assert a.nationality == "LDMS NATIONALITY"


def test_new_joiner_added_resigned_not_added(admin_client, db):
    (a,) = pick_staff(db, 1)
    rows = [
        row_for(a),
        {
            "Employee Number": "'990001",
            "Full Name": "NEW  JOINER  TEST",
            "Gender": "F",
            "Status": "Probation",
            "Employee Status": "Contract",
            "Category": "Factory",
            "Department": "a002 - human resources",
            "Supervisor Employee Number": int(a.staff_no),
            "Work Email": "990001@vistaemail",
        },
        {"Employee Number": "'990002", "Full Name": "LEFT LONG AGO", "Status": "Resigned", "Department": "X"},
    ]
    p = upload(admin_client, "preview", xlsx(rows)).json()
    assert [n["staffNo"] for n in p["newStaff"]] == ["990001"]
    assert p["inAppraisal"] == 1  # factory contract and resigned are left out

    assert upload(admin_client, "apply", xlsx(rows)).status_code == 200
    u = db.query(User).filter_by(staff_no="990001").one()
    assert u.staff_name == "NEW JOINER TEST" and u.gender.value == "FEMALE"
    assert u.designation.value == "CONTRACT" and u.role_type.value == "STAFF" and u.password_is_default
    assert u.department.name == "A002 - HUMAN RESOURCE" and u.supervisor_id == a.id
    assert u.email is None
    assert db.query(User).filter_by(staff_no="990002").count() == 0
    assert db.get(EmployeeMaster, "990002").status == "Resigned"


def test_list(admin_client, db):
    (a,) = pick_staff(db, 1)
    upload(admin_client, "apply", xlsx([row_for(a)]))
    r = admin_client.get("/api/employee-master")
    assert r.status_code == 200
    body = r.json()
    assert body["lastImport"]["fileName"] == "Master Data.xlsx"
    assert body["rows"][0]["employeeNo"] == a.staff_no and body["rows"][0]["inLdms"]


def test_hr_master_access_tick(client, staff_user, db):
    from tests.conftest import login_as

    login_as(client, staff_user)
    assert client.get("/api/employee-master").status_code == 403
    assert client.get("/api/auth/me").json()["permissions"]["canManageMaster"] is False
    staff_user.hr_master = True
    db.commit()
    assert client.get("/api/employee-master").status_code == 200
    assert client.get("/api/auth/me").json()["permissions"]["canManageMaster"] is True
