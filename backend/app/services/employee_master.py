"""Employee Master Data: HR's employee report, shared by LDMS and Appraisal.

Rules agreed with HR (2026-11-18):
- The master is the main source. Changes flow master -> LDMS, never back: Edit Staff in LDMS only changes LDMS.
- Per field, the master wins only for fields that changed in the master since the last upload (on the first
  upload, every field counts as changed). Fields the master didn't change keep their LDMS edits.
- A new employee in the master (not resigned) is added to LDMS with the default password and the Staff role.
- Resigned in the master -> Resigned in LDMS (training history is kept).
- Department names follow LDMS: 001B Finance -> 001A, "HUMAN RESOURCES" -> "HUMAN RESOURCE".
- Only the columns below are read from the report; IC, passport, date of birth, phone, race, personal email
  etc. are never stored.
- Appraisal includes everyone not resigned, except interns and Factory contract staff.
"""

import re
from dataclasses import dataclass, field
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.forms import bad
from app.models import (
    Department,
    Designation,
    EmployeeMaster,
    EmployeeMasterImport,
    Gender,
    RoleType,
    StaffStatus,
    User,
)
from app.security import DEFAULT_STAFF_PASSWORD, hash_password
from app.services.excel import open_first_sheet
from app.services.org import sync_department_hod
from app.services.util import now_utc

# attribute -> header in HR's employee report (matched ignoring case and spaces)
COLUMNS: dict[str, str] = {
    "employee_no": "Employee Number",
    "full_name": "Full Name",
    "gender": "Gender",
    "nationality": "Nationality",
    "department": "Department",
    "branch": "Branch",
    "category": "Category",
    "employment_type": "Employee Status",
    "status": "Status",
    "job_position": "Job Position",
    "job_grade": "Job Grade",
    "section": "Section",
    "supervisor_no": "Supervisor Employee Number",
    "work_email": "Work Email",
    "date_joined": "Date Joined",
    "date_resigned": "Date Resigned",
}
REQUIRED = ("employee_no", "full_name", "status", "department")

# HR report name -> the name LDMS uses
DEPARTMENT_ALIASES = {
    "001B - FINANCE & ACCOUNTS": "001A - FINANCE & ACCOUNTS",
    "A002 - HUMAN RESOURCES": "A002 - HUMAN RESOURCE",
}

RESIGNED = "Resigned"

# LDMS fields that follow the master, with the label shown in the preview
SYNCED_FIELDS = {
    "staff_name": "Name",
    "email": "Email",
    "gender": "Gender",
    "nationality": "Nationality",
    "department": "Department",
    "supervisor": "Supervisor",
    "status": "Status",
}


def _squash(v) -> str:
    return re.sub(r"\s+", " ", str(v)).strip() if v not in (None, "") else ""


def normalize_employee_no(v) -> str:
    """'000004, 4, 4.0 and 0001654 (a typo with an extra zero) all become 6-digit numbers."""
    s = _squash(v).lstrip("'").upper()
    if re.fullmatch(r"\d+(\.0+)?", s):
        n = s.split(".")[0]
        return (
            n.lstrip("0").zfill(6)
            if len(n) > 6 and len(n.lstrip("0")) <= 6
            else n.zfill(6)
        )
    return s


def _date(v) -> datetime | None:
    if isinstance(v, datetime):
        return v.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    if isinstance(v, date):
        return datetime(v.year, v.month, v.day)  # noqa: DTZ001 - stored naive, like every LDMS date
    s = _squash(v)
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(s, fmt)  # noqa: DTZ007
        except ValueError:
            pass
    return None


def _email(v) -> str | None:
    s = _squash(v).lower()
    # The HR system fills "000058@vistaemail" when there is no real address.
    return s if re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", s) else None


def department_name(v) -> str | None:
    s = _squash(v).upper()
    return DEPARTMENT_ALIASES.get(s, s) or None


def in_appraisal(row: dict) -> bool:
    if row["status"] == RESIGNED:
        return False
    if (row["employment_type"] or "").lower() == "interns":
        return False
    return not (
        (row["category"] or "").lower() == "factory"
        and (row["employment_type"] or "").lower() == "contract"
    )


def parse_master_excel(data: bytes) -> list[dict]:
    ws = open_first_sheet(data)
    rows = ws.iter_rows(values_only=True)
    header = next(rows, None) or ()
    pos = {_squash(h).lower(): i for i, h in enumerate(header) if h is not None}
    col = {attr: pos.get(name.lower()) for attr, name in COLUMNS.items()}
    missing = [COLUMNS[a] for a in REQUIRED if col[a] is None]
    if missing:
        raise bad(
            "This doesn't look like the HR employee report. Missing column(s): "
            + ", ".join(missing)
            + ". Nothing was changed."
        )

    out, seen, errors = [], {}, []
    for n, r in enumerate(rows, start=2):

        def get(a, r=r):
            return r[col[a]] if col[a] is not None and col[a] < len(r) else None

        if not _squash(get("employee_no")):
            continue
        no = normalize_employee_no(get("employee_no"))
        if no in seen:
            errors.append(f'Row {n}: Employee Number "{no}" is also on row {seen[no]}.')
            continue
        seen[no] = n
        name = _squash(get("full_name")).upper()
        if not name:
            errors.append(f"Row {n} ({no}): Full Name is empty.")
        gender = _squash(get("gender")).upper()[:1]
        sup = _squash(get("supervisor_no"))
        row = {
            "employee_no": no,
            "full_name": name,
            "gender": gender if gender in ("M", "F") else None,
            "nationality": _squash(get("nationality")) or None,
            "department": department_name(get("department")),
            "branch": _squash(get("branch")).upper() or None,
            "category": _squash(get("category")) or None,
            "employment_type": _squash(get("employment_type")) or None,
            "status": _squash(get("status")) or None,
            "job_position": _squash(get("job_position")).upper() or None,
            "job_grade": _squash(get("job_grade")).upper() or None,
            "section": _squash(get("section")).upper() or None,
            "supervisor_no": normalize_employee_no(sup) if sup else None,
            "work_email": _email(get("work_email")),
            "date_joined": _date(get("date_joined")),
            "date_resigned": _date(get("date_resigned")),
        }
        row["in_appraisal"] = in_appraisal(row)
        out.append(row)
    if errors:
        raise bad(
            "\n".join(errors[:30])
            + ("\n..." if len(errors) > 30 else "")
            + "\nNothing was changed."
        )
    if not out:
        raise bad("The file has no employees in it. Nothing was changed.")
    return out


def _ldms_targets(row: dict | None) -> dict:
    """What LDMS should hold for one master row. None values are never pushed (a blank cell doesn't clear LDMS)."""
    if row is None:
        return {}
    return {
        "staff_name": row["full_name"] or None,
        "email": row["work_email"],
        "gender": {"M": "MALE", "F": "FEMALE"}.get(row["gender"] or ""),
        "nationality": row["nationality"],
        "department": row["department"],
        "supervisor": row["supervisor_no"],
        "status": "RESIGN" if row["status"] == RESIGNED else "ACTIVE",
    }


def _master_dict(m: EmployeeMaster) -> dict:
    return {a: getattr(m, a) for a in COLUMNS} | {"in_appraisal": m.in_appraisal}


def designation_for(row: dict) -> Designation:
    """Starting designation for a new joiner (HR can change it in LDMS afterwards)."""
    emp = (row["employment_type"] or "").lower()
    if emp == "interns":
        return Designation.TRAINEE
    if emp == "contract":
        return Designation.CONTRACT
    if "MANAGER" in (row["job_position"] or "") or (row["job_grade"] or "").startswith(
        "M"
    ):
        return Designation.MANAGER
    if (row["category"] or "").lower() == "factory":
        return Designation.NON_EXECUTIVE
    return Designation.EXECUTIVE


@dataclass
class Plan:
    rows: list[dict]
    master_new: int = 0
    master_changed: int = 0
    master_unchanged: int = 0
    new_staff: list[dict] = field(default_factory=list)
    updates: list[dict] = field(
        default_factory=list
    )  # {user, changes: [(field, old, new)]}
    warnings: list[str] = field(default_factory=list)
    only_in_ldms: int = 0


def build_plan(db: Session, rows: list[dict], uploader: User) -> Plan:
    plan = Plan(rows=rows)
    old_master = {
        m.employee_no: _master_dict(m) for m in db.scalars(select(EmployeeMaster)).all()
    }
    users = db.scalars(select(User)).all()
    by_no = {u.staff_no: u for u in users}
    by_id = {u.id: u for u in users}
    depts = db.scalars(select(Department)).all()
    dept_by_name = {_squash(d.name).upper(): d for d in depts}
    file_nos = {r["employee_no"] for r in rows}
    plan.only_in_ldms = sum(
        1
        for u in users
        if u.staff_no not in file_nos and u.status == StaffStatus.ACTIVE
    )

    missing_depts: dict[str, int] = {}
    missing_sups: dict[str, int] = {}

    for r in rows:
        old = old_master.get(r["employee_no"])
        if old is None:
            plan.master_new += 1
        elif any(old[a] != r[a] for a in r):
            plan.master_changed += 1
        else:
            plan.master_unchanged += 1

        new_t, old_t = _ldms_targets(r), _ldms_targets(old)
        dept = dept_by_name.get(r["department"] or "")
        if r["department"] and not dept and r["status"] != RESIGNED:
            missing_depts[r["department"]] = missing_depts.get(r["department"], 0) + 1

        u = by_no.get(r["employee_no"])
        if u is None:
            if r["status"] != RESIGNED:
                plan.new_staff.append({"row": r, "department": dept})
            continue

        changes = []
        for key in SYNCED_FIELDS:
            target = new_t.get(key)
            if target is None or (old is not None and old_t.get(key) == target):
                continue  # blank in the master, or the master didn't change it: keep LDMS as it is
            if key == "department":
                if dept and u.department_id != dept.id:
                    current = next(
                        (d.name for d in depts if d.id == u.department_id), None
                    )
                    changes.append((key, current, dept.name, dept))
            elif key == "supervisor":
                sup = by_no.get(target)
                if sup is None:
                    missing_sups[target] = missing_sups.get(target, 0) + 1
                elif sup.id != u.id and u.supervisor_id != sup.id:
                    cur = by_id.get(u.supervisor_id)
                    changes.append((key, cur.staff_no if cur else None, target, sup))
            elif key == "status":
                if u.status.value != target and not (
                    u.id == uploader.id and target == "RESIGN"
                ):
                    changes.append((key, u.status.value, target, r["date_resigned"]))
            elif key == "gender":
                if u.gender.value != target:
                    changes.append((key, u.gender.value, target, None))
            else:
                # Only capitals or spaces different (e.g. MALAYSIA / Malaysia) is not a change.
                if _squash(getattr(u, key)).casefold() != _squash(target).casefold():
                    changes.append((key, getattr(u, key), target, None))
        if changes:
            plan.updates.append({"user": u, "changes": changes})

    # A new joiner's supervisor may be another new joiner in the same file.
    new_nos = {n["row"]["employee_no"] for n in plan.new_staff}
    for n in plan.new_staff:
        sup = n["row"]["supervisor_no"]
        if sup and sup not in by_no and sup not in new_nos:
            missing_sups[sup] = missing_sups.get(sup, 0) + 1
        if not n["row"]["gender"]:
            plan.warnings.append(
                f"{n['row']['employee_no']} {n['row']['full_name']}: no Gender in the file, saved as Male. Check it in LDMS."
            )

    for name, count in sorted(missing_depts.items()):
        plan.warnings.append(
            f'Department "{name}" ({count} staff) is not in LDMS, so their department is not changed. '
            "Add it under Organization first, then upload again."
        )
    for no, count in sorted(missing_sups.items()):
        plan.warnings.append(
            f"Supervisor {no} ({count} staff) is not in LDMS, so their supervisor is not changed."
        )
    return plan


def _label(key: str, v) -> str | None:
    if v is None:
        return None
    if key == "status":
        return {"ACTIVE": "Active", "RESIGN": "Resigned"}.get(v, v)
    if key == "gender":
        return {"MALE": "Male", "FEMALE": "Female"}.get(v, v)
    return str(v)


def plan_summary(plan: Plan) -> dict:
    rows = plan.rows
    updates = [
        {
            "staffNo": x["user"].staff_no,
            "staffName": x["user"].staff_name,
            "changes": [
                {"field": SYNCED_FIELDS[k], "from": _label(k, a), "to": _label(k, b)}
                for k, a, b, _ in x["changes"]
            ],
        }
        for x in sorted(plan.updates, key=lambda x: x["user"].staff_no)
    ]
    return {
        "fileRows": len(rows),
        "active": sum(1 for r in rows if r["status"] != RESIGNED),
        "resigned": sum(1 for r in rows if r["status"] == RESIGNED),
        "inAppraisal": sum(1 for r in rows if r["in_appraisal"]),
        "masterNew": plan.master_new,
        "masterChanged": plan.master_changed,
        "masterUnchanged": plan.master_unchanged,
        "newStaff": [
            {
                "staffNo": n["row"]["employee_no"],
                "staffName": n["row"]["full_name"],
                "department": n["department"].name
                if n["department"]
                else n["row"]["department"],
            }
            for n in plan.new_staff
        ],
        "updates": updates,
        "resign": [
            u
            for u in updates
            if any(
                c["field"] == "Status" and c["to"] == "Resigned" for c in u["changes"]
            )
        ],
        "onlyInLdms": plan.only_in_ldms,
        "warnings": plan.warnings,
    }


def apply_plan(db: Session, plan: Plan, uploader: User, file_name: str | None) -> dict:
    summary = plan_summary(plan)

    # 1. The master itself: insert or update every row in the file (rows not in the file are kept).
    existing = {m.employee_no: m for m in db.scalars(select(EmployeeMaster)).all()}
    for r in plan.rows:
        m = existing.get(r["employee_no"])
        if m is None:
            db.add(EmployeeMaster(**r))
        elif any(getattr(m, a) != v for a, v in r.items()):
            for a, v in r.items():
                setattr(m, a, v)

    # 2. LDMS: field changes, resignations and new joiners.
    touched_depts: set[int] = set()
    for x in plan.updates:
        u: User = x["user"]
        for key, _old, new, extra in x["changes"]:
            if key == "department":
                touched_depts.update(d for d in (u.department_id, extra.id) if d)
                u.department_id = extra.id
                u.division_id = extra.division_id
                u.hod_id = extra.hod_user_id
            elif key == "supervisor":
                u.supervisor_id = extra.id
            elif key == "status":
                u.status = StaffStatus(new)
                u.date_resign = (extra or now_utc()) if new == "RESIGN" else None
            elif key == "gender":
                u.gender = Gender(new)
            else:
                setattr(u, key, new)

    if plan.new_staff:
        default_hash = hash_password(DEFAULT_STAFF_PASSWORD)
        created: dict[str, User] = {}
        for n in plan.new_staff:
            r, dept = n["row"], n["department"]
            u = User(
                staff_no=r["employee_no"],
                staff_name=r["full_name"],
                email=r["work_email"],
                gender=Gender.FEMALE if r["gender"] == "F" else Gender.MALE,
                designation=designation_for(r),
                nationality=r["nationality"],
                division_id=dept.division_id if dept else None,
                department_id=dept.id if dept else None,
                hod_id=dept.hod_user_id if dept else None,
                role_type=RoleType.STAFF,
                status=StaffStatus.ACTIVE,
                password=default_hash,
                password_is_default=True,
            )
            db.add(u)
            created[r["employee_no"]] = u
        db.flush()
        by_no = {u.staff_no: u for u in db.scalars(select(User)).all()}
        for n in plan.new_staff:
            sup = n["row"]["supervisor_no"]
            if sup and sup in by_no and sup != n["row"]["employee_no"]:
                created[n["row"]["employee_no"]].supervisor_id = by_no[sup].id

    db.flush()
    for d in touched_depts:
        sync_department_hod(db, d)

    stored = {
        k: summary[k] for k in summary if k not in ("updates", "resign", "newStaff")
    } | {
        "updatedStaff": len(summary["updates"]),
        "newStaffCount": len(summary["newStaff"]),
        "resignedCount": len(summary["resign"]),
    }
    db.add(
        EmployeeMasterImport(
            file_name=file_name, uploaded_by_id=uploader.id, summary=stored
        )
    )
    db.commit()
    return summary
