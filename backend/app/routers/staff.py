"""Staff List module. Ported from ldms-web: app/(app)/staff/actions.ts + staff/*/page.tsx data loading."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from app.deps import DB, require
from app.forms import Form, bad, fdate, ffile, fint, fopt, fstr
from app.labels import DESIGNATION_LABELS, FUNCTION_LABELS, GENDER_LABELS, ROLE_LABELS, STATUS_LABELS, enum_from_label
from app.models import (
    Department,
    Designation,
    Division,
    ElearningAssignment,
    ElearningCompletion,
    ElearningModule,
    Gender,
    ParticipateOjt,
    Participation,
    Pme,
    RoleType,
    Section,
    StaffStatus,
    User,
)
from app.rbac import can_manage_staff
from app.security import DEFAULT_STAFF_PASSWORD, hash_password
from app.serialize import ser, value
from app.services.elearning import module_hours_map
from app.services.org import active_staff_options, division_tree, sync_department_hod
from app.services.excel import parse_staff_excel
from app.services.util import compute_days, compute_hours, now_utc

router = APIRouter(prefix="/api/staff", tags=["staff"])

StaffAdmin = Annotated[User, Depends(require(can_manage_staff, "You do not have permission to manage staff records."))]


def _resolve_hod_id(db: DB, department_id: int | None) -> int | None:
    if not department_id:
        return None
    dept = db.get(Department, department_id)
    return dept.hod_user_id if dept else None


def _other_active_admin_count(db: DB, excluding_user_id: int) -> int:
    return db.scalar(
        select(func.count())
        .select_from(User)
        .where(User.role_type == RoleType.ADMIN, User.status == StaffStatus.ACTIVE, User.id != excluding_user_id)
    )


def _enum_or_400(enum_cls, raw: str, label: str):
    try:
        return enum_cls(raw)
    except ValueError:
        raise bad(f"Invalid {label}.")


# ---------- Page data ----------


@router.get("")
def list_staff(
    db: DB,
    _: StaffAdmin,
    q: str | None = None,
    divisionId: int | None = None,
    departmentId: int | None = None,
    status: StaffStatus | None = None,
    role: RoleType | None = None,
):
    stmt = select(User).options(
        joinedload(User.division), joinedload(User.department), joinedload(User.section), joinedload(User.supervisor)
    )
    if q:
        needle = q.upper()
        designations = [k for k, lbl in DESIGNATION_LABELS.items() if needle in k or needle in lbl.upper()]
        conds = [
            User.staff_name.contains(needle, autoescape=True),
            User.staff_no.contains(needle, autoescape=True),
            User.division.has(Division.name.contains(needle, autoescape=True)),
            User.department.has(Department.name.contains(needle, autoescape=True)),
            User.section.has(Section.name.contains(needle, autoescape=True)),
        ]
        if designations:
            conds.append(User.designation.in_([Designation(d) for d in designations]))
        stmt = stmt.where(or_(*conds))
    if divisionId:
        stmt = stmt.where(User.division_id == divisionId)
    if departmentId:
        stmt = stmt.where(User.department_id == departmentId)
    if status:
        stmt = stmt.where(User.status == status)
    if role:
        stmt = stmt.where(User.role_type == role)

    staff = db.scalars(stmt.order_by(User.staff_name)).unique().all()
    return {
        "staff": ser(
            staff,
            {"division": True, "department": True, "section": True, "supervisor": ("staffNo", "staffName")},
        ),
        "divisions": ser(db.scalars(select(Division).order_by(Division.name)).all(), ("id", "name")),
        "departments": ser(
            db.scalars(select(Department).order_by(Department.name)).all(), ("id", "name", "divisionId")
        ),
    }


@router.get("/form-options")
def form_options(db: DB, _: StaffAdmin, excludeId: int | None = None):
    """Division tree + active supervisors, for the Add/Edit Staff form."""
    return {"divisions": division_tree(db), "supervisorOptions": active_staff_options(db, exclude_id=excludeId)}


def _normalize_staff_no(raw: str) -> str:
    return raw.strip().upper()


@router.get("/check-staff-no")
def check_staff_no(db: DB, _: StaffAdmin, staffNo: str = ""):
    """Add Staff form: live check whether a Staff No. is already taken (including resigned staff)."""
    staff_no = _normalize_staff_no(staffNo)
    user = db.scalar(select(User).where(User.staff_no == staff_no)) if staff_no else None
    if user is None:
        return {"staffNo": staff_no, "exists": False}
    return {
        "staffNo": staff_no,
        "exists": True,
        "id": user.id,
        "staffName": user.staff_name,
        "status": user.status.value,
    }


@router.get("/{staff_id}")
def get_staff(staff_id: int, db: DB, _: StaffAdmin):
    user = db.get(User, staff_id)
    if user is None:
        raise HTTPException(404, "Staff not found.")
    return ser(user)


@router.get("/{staff_id}/training-record")
def training_record(staff_id: int, db: DB, _: StaffAdmin):
    staff = db.scalar(select(User).options(joinedload(User.department)).where(User.id == staff_id))
    if staff is None:
        raise HTTPException(404, "Staff not found.")

    parts = db.scalars(
        select(Participation).options(joinedload(Participation.training)).where(Participation.user_id == staff_id)
    ).all()
    ojt_parts = db.scalars(
        select(ParticipateOjt).options(joinedload(ParticipateOjt.ojt)).where(ParticipateOjt.user_id == staff_id)
    ).all()
    assignments = db.scalars(
        select(ElearningAssignment)
        .options(joinedload(ElearningAssignment.module).joinedload(ElearningModule.category))
        .where(ElearningAssignment.user_id == staff_id)
        .order_by(ElearningAssignment.created_at.desc())
    ).all()
    completions = db.scalars(select(ElearningCompletion).where(ElearningCompletion.user_id == staff_id)).all()

    rows: list[dict] = []
    for p in parts:
        t = p.training
        rows.append(
            {
                "id": t.id,
                "type": "training",
                "title": t.title,
                "href": f"/training/public/{t.id}",
                "typeLabel": "Public/Inhouse",
                "functionLabel": FUNCTION_LABELS[t.function.value],
                "startDate": t.start_date,
                "endDate": t.end_date,
                "venue": t.venue,
                "status": p.attendance.value,
                "totalHours": compute_days(t.start_date, t.end_date) * compute_hours(t.start_time, t.end_time),
            }
        )
    for p in ojt_parts:
        o = p.ojt
        rows.append(
            {
                "id": o.id,
                "type": "ojt",
                "title": o.title,
                "href": f"/training/ojt/{o.id}",
                "typeLabel": "OJT",
                "functionLabel": "—",
                "startDate": o.start_date,
                "endDate": o.end_date,
                "venue": o.venue,
                "status": p.attendance.value,
                "totalHours": o.total_day * o.total_hour,
            }
        )

    # Union of assignments and completions — a completed module's assignment may have been removed,
    # but the completion (and its hours) must still show.
    assignment_by_module = {a.module_id: a for a in assignments}
    completion_by_module = {c.module_id: c for c in completions}
    module_ids = set(assignment_by_module) | set(completion_by_module)
    modules = {
        m.id: m
        for m in db.scalars(
            select(ElearningModule).options(joinedload(ElearningModule.category)).where(ElearningModule.id.in_(module_ids))
        ).all()
    } if module_ids else {}
    hours = module_hours_map(db, module_ids)
    for mid in module_ids:
        a = assignment_by_module.get(mid)
        c = completion_by_module.get(mid)
        m = modules.get(mid)
        d = (c.completed_at if c else None) or (a.created_at if a else None) or now_utc()
        rows.append(
            {
                "id": mid,
                "type": "elearning",
                "title": m.title if m else "Untitled Module",
                "href": f"/elearning/admin/modules/{mid}",
                "typeLabel": "E-Learning",
                "functionLabel": m.category.name if m and m.category else "—",
                "startDate": d,
                "endDate": d,
                "venue": "Online",
                "status": "COMPLETED" if c else "PENDING",
                "totalHours": hours.get(mid, 0),
            }
        )

    rows.sort(key=lambda r: r["startDate"], reverse=True)
    for r in rows:
        r["startDate"] = value(r["startDate"])
        r["endDate"] = value(r["endDate"])
    return {"staff": ser(staff, {"department": True}), "rows": rows}


# ---------- Actions ----------


@router.post("")
def create_staff(form: Form, db: DB, _: StaffAdmin):
    staff_no = _normalize_staff_no(fstr(form, "staffNo"))
    staff_name = fstr(form, "staffName").strip().upper()
    gender = fstr(form, "gender")
    designation = fstr(form, "designation")
    if not staff_no or not staff_name or not gender or not designation:
        raise bad("Staff No., Name, Gender, and Designation are required.")
    existing = db.scalar(select(User).where(User.staff_no == staff_no))
    if existing:
        raise bad(_duplicate_message(existing))

    department_id = fint(form, "departmentId")
    user = User(
        staff_no=staff_no,
        staff_name=staff_name,
        email=fopt(form, "email"),
        gender=_enum_or_400(Gender, gender, "gender"),
        designation=_enum_or_400(Designation, designation, "designation"),
        nationality=fopt(form, "nationality"),
        division_id=fint(form, "divisionId"),
        department_id=department_id,
        section_id=fint(form, "sectionId"),
        supervisor_id=fint(form, "supervisorId"),
        role_type=_enum_or_400(RoleType, fstr(form, "roleType") or "STAFF", "role"),
        password=hash_password(DEFAULT_STAFF_PASSWORD),
        password_is_default=True,
        hod_id=_resolve_hod_id(db, department_id),
        status=StaffStatus.ACTIVE,
    )
    db.add(user)
    try:
        db.flush()
    except IntegrityError:  # another admin created the same Staff No. a moment ago
        db.rollback()
        raise bad(f'Staff No "{staff_no}" already exists.')
    if department_id:
        sync_department_hod(db, department_id)
    db.commit()
    return {"id": user.id}


def _duplicate_message(user: User) -> str:
    resigned = " (resigned)" if user.status == StaffStatus.RESIGN else ""
    return f'Staff No "{user.staff_no}" already exists: {user.staff_name}{resigned}.'


@router.post("/bulk-upload")
async def bulk_upload_staff(form: Form, db: DB, session: StaffAdmin):
    """Bulk-import/update staff from Excel. Matched by Staff No: existing -> update (blank cells leave
    values unchanged); new -> create with the default password. All-or-nothing: every problem is
    reported together and nothing is written if any row fails."""
    file = ffile(form, "file")
    if file is None:
        raise bad("Please choose an Excel file to upload.")
    rows = parse_staff_excel(await file.read())

    seen: set[str] = set()
    for r in rows:
        if r["staffNo"] in seen:
            raise bad(f'Row {r["rowNumber"]}: Staff No "{r["staffNo"]}" appears more than once in this file.')
        seen.add(r["staffNo"])

    existing_by_no = {u.staff_no: u for u in db.scalars(select(User).where(User.staff_no.in_(list(seen)))).all()}
    divisions = db.scalars(select(Division)).all()
    departments = db.scalars(select(Department)).all()
    sections = db.scalars(select(Section)).all()
    staff_no_to_id = dict(db.execute(select(User.staff_no, User.id)).all())
    hod_by_dept = {d.id: d.hod_user_id for d in departments}

    def match(units, needle: str):
        n = needle.strip().upper()
        return next((x for x in units if (x.short_name and x.short_name.upper() == n) or x.name.upper() == n), None)

    errors: list[str] = []
    resolved: list[dict] = []
    for row in rows:
        existing = existing_by_no.get(row["staffNo"])
        label = f'Row {row["rowNumber"]} ({row["staffNo"]})'
        res: dict = {"row": row, "isNew": existing is None}

        if row["staffName"]:
            res["staff_name"] = row["staffName"].strip().upper()
        if row["email"]:
            res["email"] = row["email"].strip()
        if row["nationality"]:
            res["nationality"] = row["nationality"].strip().upper()
        for key, labels, attr, name in (
            ("gender", GENDER_LABELS, "gender", "Gender"),
            ("designation", DESIGNATION_LABELS, "designation", "Designation"),
            ("roleType", ROLE_LABELS, "role_type", "System Role"),
            ("status", STATUS_LABELS, "status", "Status"),
        ):
            if row[key]:
                v = enum_from_label(labels, row[key])
                if not v:
                    errors.append(f'{label}: unknown {name} "{row[key]}".')
                res[attr] = v

        department = None
        if row["department"]:
            department = match(departments, row["department"])
            if not department:
                errors.append(f'{label}: Department "{row["department"]}" not found.')
            res["department_id"] = department.id if department else None
        if row["division"]:
            division = match(divisions, row["division"])
            if not division:
                errors.append(f'{label}: Division "{row["division"]}" not found.')
            res["division_id"] = division.id if division else (department.division_id if department else None)
        elif department:
            res["division_id"] = department.division_id
        if row["section"]:
            candidates = [s for s in sections if s.department_id == department.id] if department else sections
            section = match(candidates, row["section"])
            if not section:
                errors.append(
                    f'{label}: Section "{row["section"]}" not found{" in that department" if department else ""}.'
                )
            res["section_id"] = section.id if section else None

        if row["supervisorStaffNo"]:
            if row["supervisorStaffNo"] == row["staffNo"]:
                errors.append(f"{label}: a staff member cannot be their own supervisor.")
            else:
                sid = staff_no_to_id.get(row["supervisorStaffNo"])
                if not sid:
                    errors.append(f'{label}: Supervisor Staff No "{row["supervisorStaffNo"]}" not found.')
                res["supervisor_id"] = sid

        if res["isNew"]:
            if not res.get("staff_name"):
                errors.append(f"{label}: Staff Name is required for a new staff member.")
            if not res.get("gender"):
                errors.append(f"{label}: Gender is required for a new staff member.")
            if not res.get("designation"):
                errors.append(f"{label}: Designation is required for a new staff member.")

        # Bulk upload can't strip the uploader's own Admin access.
        if (
            existing
            and row["staffNo"] == session.staff_no
            and ((res.get("role_type") and res["role_type"] != "ADMIN") or (res.get("status") and res["status"] != "ACTIVE"))
        ):
            errors.append(f"{label}: you can't change your own role or status via bulk upload — have another Admin do it.")
        resolved.append(res)

    if errors:
        raise bad("\n".join(errors))

    default_hash = hash_password(DEFAULT_STAFF_PASSWORD) if any(r["isNew"] for r in resolved) else ""
    touched: set[int] = set()
    for r in resolved:
        dept_id = r.get("department_id")
        if r["isNew"]:
            db.add(
                User(
                    staff_no=r["row"]["staffNo"],
                    staff_name=r["staff_name"],
                    email=r.get("email"),
                    gender=Gender(r["gender"]),
                    designation=Designation(r["designation"]),
                    nationality=r.get("nationality"),
                    division_id=r.get("division_id"),
                    department_id=dept_id,
                    section_id=r.get("section_id"),
                    supervisor_id=r.get("supervisor_id"),
                    role_type=RoleType(r.get("role_type") or "STAFF"),
                    status=StaffStatus(r.get("status") or "ACTIVE"),
                    hod_id=hod_by_dept.get(dept_id) if dept_id else None,
                    password=default_hash,
                    password_is_default=True,
                )
            )
        else:
            u = existing_by_no[r["row"]["staffNo"]]
            for attr in ("staff_name", "email", "nationality", "division_id", "section_id", "supervisor_id"):
                if attr in r:
                    setattr(u, attr, r[attr])
            if "gender" in r:
                u.gender = Gender(r["gender"])
            if "designation" in r:
                u.designation = Designation(r["designation"])
            if "role_type" in r:
                u.role_type = RoleType(r["role_type"])
            if "status" in r:
                u.status = StaffStatus(r["status"])
            if "department_id" in r:
                u.department_id = dept_id
                u.hod_id = hod_by_dept.get(dept_id) if dept_id else None
        if dept_id:
            touched.add(dept_id)

    db.flush()
    for dept_id in touched:
        sync_department_hod(db, dept_id)
    db.commit()
    return {"ok": True, "count": len(resolved)}


@router.post("/{staff_id}")
def update_staff(staff_id: int, form: Form, db: DB, session: StaffAdmin):
    staff_name = fstr(form, "staffName").strip().upper()
    gender = fstr(form, "gender")
    designation = fstr(form, "designation")
    supervisor_id = fint(form, "supervisorId")
    status = _enum_or_400(StaffStatus, fstr(form, "status") or "ACTIVE", "status")
    role_type = _enum_or_400(RoleType, fstr(form, "roleType") or "STAFF", "role")
    department_id = fint(form, "departmentId")

    if not staff_name or not gender or not designation:
        raise bad("Name, Gender, and Designation are required.")
    if supervisor_id == staff_id:
        raise bad("A staff member cannot be their own supervisor.")
    if staff_id == session.id and (role_type != RoleType.ADMIN or status != StaffStatus.ACTIVE):
        if _other_active_admin_count(db, staff_id) == 0:
            raise bad("You are the only active Admin — have another Admin make this change instead.")

    user = db.get(User, staff_id)
    if user is None:
        raise HTTPException(404, "Staff not found.")
    old_department_id = user.department_id

    user.staff_name = staff_name
    user.email = fopt(form, "email")
    user.gender = _enum_or_400(Gender, gender, "gender")
    user.designation = _enum_or_400(Designation, designation, "designation")
    user.nationality = fopt(form, "nationality")
    user.division_id = fint(form, "divisionId")
    user.department_id = department_id
    user.section_id = fint(form, "sectionId")
    user.supervisor_id = supervisor_id
    user.status = status
    user.date_resign = fdate(form, "dateResign") if status == StaffStatus.RESIGN else None
    user.role_type = role_type
    user.hod_id = _resolve_hod_id(db, department_id)
    db.flush()

    # Department may have changed — resync both the old and new department's staff.
    if old_department_id:
        sync_department_hod(db, old_department_id)
    if department_id and department_id != old_department_id:
        sync_department_hod(db, department_id)
    db.commit()
    return {"ok": True}


@router.post("/{staff_id}/reset-password")
def reset_password(staff_id: int, db: DB, _: StaffAdmin):
    user = db.get(User, staff_id)
    if user is None:
        raise HTTPException(404, "Staff not found.")
    user.password = hash_password(DEFAULT_STAFF_PASSWORD)
    user.password_is_default = True
    db.commit()
    return {"ok": True}


@router.delete("/{staff_id}")
def delete_staff(staff_id: int, db: DB, session: StaffAdmin):
    if staff_id == session.id:
        raise bad("You cannot delete your own account. Have another Admin do this instead.")

    def count(model):
        return db.scalar(select(func.count()).select_from(model).where(model.user_id == staff_id))

    if count(Participation) or count(ParticipateOjt) or count(Pme):
        raise bad(
            "This staff member has training history (attendance, OJT, or PME records) and cannot be deleted. "
            'Set their status to "Resigned" instead to preserve those records.'
        )
    user = db.get(User, staff_id)
    if user is None:
        raise HTTPException(404, "Staff not found.")
    db.delete(user)
    db.commit()
    return {"ok": True}

