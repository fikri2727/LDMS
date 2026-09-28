from sqlalchemy import select, update
from sqlalchemy.orm import Session, selectinload

from app.models import Department, Division, StaffStatus, User
from app.serialize import ser


def sync_department_hod(db: Session, department_id: int) -> None:
    """Keeps User.hodId in sync with Department.hodUserId for every staff member in that
    department — mirrors the legacy DB trigger (trg_departments_hod_update)."""
    dept = db.get(Department, department_id)
    if dept is None:
        return
    db.execute(update(User).where(User.department_id == department_id).values(hod_id=dept.hod_user_id))


def division_tree(db: Session) -> list[dict]:
    """Divisions -> departments -> sections, all sorted by name (used by the org page and staff forms)."""
    divisions = db.scalars(
        select(Division)
        .options(selectinload(Division.departments).selectinload(Department.sections))
        .order_by(Division.name)
    ).all()
    out = []
    for d in divisions:
        row = ser(d)
        row["departments"] = []
        for dept in sorted(d.departments, key=lambda x: x.name):
            drow = ser(dept)
            drow["sections"] = ser(sorted(dept.sections, key=lambda s: s.name))
            row["departments"].append(drow)
        out.append(row)
    return out


def active_staff_options(db: Session, exclude_id: int | None = None, with_department: bool = False) -> list[dict]:
    q = select(User).where(User.status == StaffStatus.ACTIVE).order_by(User.staff_name)
    if exclude_id is not None:
        q = q.where(User.id != exclude_id)
    cols = ("id", "staffNo", "staffName") + (("departmentId",) if with_department else ())
    return ser(db.scalars(q).all(), cols)

