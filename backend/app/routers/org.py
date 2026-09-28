"""Organization structure (divisions / departments / sections / HOD).
Ported from ldms-web: app/(app)/organization/actions.ts + page.tsx."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError

from app.deps import DB, require
from app.errors import is_fk_error
from app.forms import Form, bad, fint, fstr
from app.models import Department, Division, Section, User
from app.rbac import can_manage_org
from app.services.org import active_staff_options, division_tree, sync_department_hod

router = APIRouter(prefix="/api/org", tags=["organization"])

OrgAdmin = Annotated[User, Depends(require(can_manage_org, "You do not have permission to manage organization structure."))]


def _name(form) -> str:
    return fstr(form, "name").strip().upper()


def _short_name(form) -> str | None:
    v = fstr(form, "shortName").strip()
    return v.upper() if v else None


def _get(db: DB, model, id_: int):
    obj = db.get(model, id_)
    if obj is None:
        raise HTTPException(404, f"{model.__name__} not found.")
    return obj


def _delete(db: DB, obj, fk_message: str):
    db.delete(obj)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        if is_fk_error(e):
            raise bad(fk_message)
        raise
    return {"ok": True}


@router.get("")
def org_page(db: DB, _: OrgAdmin):
    return {"divisions": division_tree(db), "staff": active_staff_options(db, with_department=True)}


# ---------- Division ----------


@router.post("/divisions")
def create_division(form: Form, db: DB, _: OrgAdmin):
    name = _name(form)
    if not name:
        raise bad("Division name is required.")
    db.add(Division(name=name, short_name=_short_name(form)))
    db.commit()
    return {"ok": True}


@router.post("/divisions/{id_}")
def update_division(id_: int, form: Form, db: DB, _: OrgAdmin):
    name = _name(form)
    if not name:
        raise bad("Division name is required.")
    d = _get(db, Division, id_)
    d.name, d.short_name = name, _short_name(form)
    db.commit()
    return {"ok": True}


@router.delete("/divisions/{id_}")
def delete_division(id_: int, db: DB, _: OrgAdmin):
    return _delete(
        db,
        _get(db, Division, id_),
        "This division still has staff assigned to it (directly, or via its departments/sections). "
        "Reassign those staff first.",
    )


# ---------- Department ----------


@router.post("/divisions/{division_id}/departments")
def create_department(division_id: int, form: Form, db: DB, _: OrgAdmin):
    name = _name(form)
    if not name:
        raise bad("Department name is required.")
    db.add(Department(division_id=division_id, name=name, short_name=_short_name(form)))
    db.commit()
    return {"ok": True}


@router.post("/departments/{id_}")
def update_department(id_: int, form: Form, db: DB, _: OrgAdmin):
    name = _name(form)
    if not name:
        raise bad("Department name is required.")
    d = _get(db, Department, id_)
    d.name, d.short_name = name, _short_name(form)
    db.commit()
    return {"ok": True}


@router.delete("/departments/{id_}")
def delete_department(id_: int, db: DB, _: OrgAdmin):
    return _delete(
        db,
        _get(db, Department, id_),
        "This department still has staff assigned to it (directly, or via its sections). Reassign those staff first.",
    )


@router.post("/departments/{department_id}/hod")
def assign_hod(department_id: int, form: Form, db: DB, _: OrgAdmin):
    hod_user_id = fint(form, "hodUserId")
    dept = _get(db, Department, department_id)
    # Clear isHod on the previous HOD (if different) and set it on the new one.
    if dept.hod_user_id and dept.hod_user_id != hod_user_id:
        prev = db.get(User, dept.hod_user_id)
        if prev:
            prev.is_hod = False
    dept.hod_user_id = hod_user_id
    if hod_user_id:
        _get(db, User, hod_user_id).is_hod = True
    db.flush()
    sync_department_hod(db, department_id)
    db.commit()
    return {"ok": True}


# ---------- Section ----------


@router.post("/departments/{department_id}/sections")
def create_section(department_id: int, form: Form, db: DB, _: OrgAdmin):
    name = _name(form)
    if not name:
        raise bad("Section name is required.")
    db.add(Section(department_id=department_id, name=name, short_name=_short_name(form)))
    db.commit()
    return {"ok": True}


@router.post("/sections/{id_}")
def update_section(id_: int, form: Form, db: DB, _: OrgAdmin):
    name = _name(form)
    if not name:
        raise bad("Section name is required.")
    s = _get(db, Section, id_)
    s.name, s.short_name = name, _short_name(form)
    db.commit()
    return {"ok": True}


@router.delete("/sections/{id_}")
def delete_section(id_: int, db: DB, _: OrgAdmin):
    return _delete(db, _get(db, Section, id_), "This section still has staff assigned to it. Reassign those staff first.")
