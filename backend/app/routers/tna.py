"""TNA (Training Need Analysis). Ported from ldms-web: app/(app)/tna/actions.ts + tna/**/page.tsx."""

import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.orm import joinedload, selectinload

from app.deps import DB, CurrentUser, require
from app.forms import Form, bad, fint, fstr
from app.models import (
    Department,
    StaffStatus,
    Tna,
    TnaItem,
    TnaSection,
    TnaStatus,
    TnaTrainingOption,
    TnaTrainingType,
    User,
)
from app.rbac import can_manage_tna, can_submit_tna
from app.serialize import Sel, ser
from app.services.util import now_utc

router = APIRouter(prefix="/api/tna", tags=["tna"])

TnaAdmin = Annotated[
    User, Depends(require(can_manage_tna, "You do not have permission to manage the TNA training catalogue."))
]


def _options(db: DB):
    return ser(db.scalars(select(TnaTrainingOption).order_by(TnaTrainingOption.order)).all())


# ---------- Page data ----------


@router.get("/admin")
def admin_overview(year: int, db: DB, _: TnaAdmin):
    """Everything the admin TNA page needs for the given year."""
    all_staff = db.scalars(
        select(User)
        .options(joinedload(User.department))
        .where(User.status == StaffStatus.ACTIVE)
        .order_by(User.staff_name)
    ).all()
    departments = db.scalars(select(Department).options(joinedload(Department.hod)).order_by(Department.name)).all()
    year_tnas = db.scalars(
        select(Tna).options(joinedload(Tna.approved_by), selectinload(Tna.items)).where(Tna.year == year)
    ).unique().all()
    # Item-level detail for the Excel report — includes any TNA submitted this year even if its
    # owner is no longer the HOD, so a past submission is never silently dropped from the export.
    report_items = db.scalars(
        select(TnaItem)
        .join(Tna)
        .options(
            joinedload(TnaItem.tna).joinedload(Tna.user).joinedload(User.department),
            joinedload(TnaItem.tna).joinedload(Tna.approved_by),
        )
        .where(Tna.year == year)
        .order_by(TnaItem.tna_id, TnaItem.order)
    ).unique().all()

    return {
        "allStaff": ser(all_staff, {"department": True}),
        "departments": [
            {**ser(d, ("id", "name", "hodUserId")), "hod": ser(d.hod, ("id", "staffNo", "staffName"))}
            for d in departments
        ],
        "yearTnas": [
            {
                **ser(t, ("id", "userId", "status", "createdAt", "approvedAt")),
                "approvedBy": ser(t.approved_by, ("staffName",)),
                "_count": {"items": len(t.items)},
            }
            for t in year_tnas
        ],
        "reportItems": [
            {
                **ser(i),
                "tna": {
                    **ser(i.tna, ("year", "status", "createdAt", "approvedAt")),
                    "approvedBy": ser(i.tna.approved_by, ("staffName",)),
                    "user": ser(i.tna.user, Sel(only=("staffNo", "staffName"), include={"department": ("name",)})),
                },
            }
            for i in report_items
        ],
    }


@router.get("/mine")
def my_tna(year: int, db: DB, user: CurrentUser):
    """The HOD's own TNA for the year (or null) plus the training catalogue."""
    if not can_submit_tna(user):
        raise HTTPException(403, "Only Heads of Department submit a Training Need Analysis.")
    tna = db.scalar(select(Tna).options(selectinload(Tna.items)).where(Tna.user_id == user.id, Tna.year == year))
    return {"tna": ser(tna, {"items": True}), "trainingOptions": _options(db)}


@router.get("/options")
def options(db: DB, _: TnaAdmin):
    return ser(
        db.scalars(select(TnaTrainingOption).order_by(TnaTrainingOption.section, TnaTrainingOption.order)).all(),
        ("id", "section", "groupName", "label"),
    )


@router.get("/summary")
def summary(year: int, db: DB, _: TnaAdmin, departmentId: int | None = None):
    q = select(TnaItem.section, TnaItem.training_type).join(Tna).where(Tna.year == year)
    if departmentId:
        q = q.join(User, User.id == Tna.user_id).where(User.department_id == departmentId)
    return {
        "departments": ser(db.scalars(select(Department).order_by(Department.name)).all(), ("id", "name")),
        "items": [{"section": s.value, "trainingType": t.value} for s, t in db.execute(q).all()],
    }


@router.get("/{tna_id}")
def tna_detail(tna_id: int, db: DB, _: TnaAdmin):
    tna = db.scalar(
        select(Tna)
        .options(joinedload(Tna.user).joinedload(User.department), selectinload(Tna.items))
        .where(Tna.id == tna_id)
    )
    if tna is None:
        raise HTTPException(404, "TNA not found.")
    return {"tna": ser(tna, {"user": {"department": True}, "items": True}), "trainingOptions": _options(db)}


# ---------- Actions ----------


@router.post("")
def save_tna(form: Form, db: DB, user: CurrentUser):
    if not can_submit_tna(user):
        raise bad("Only Heads of Department submit a Training Need Analysis.")
    year = fint(form, "year")
    if not year:
        raise bad("Invalid year.")
    try:
        rows = [
            TnaItem(
                section=TnaSection(it["section"]),
                order=int(it["order"]),
                problem_statement=str(it["problemStatement"]),
                training=str(it["training"]),
                target_skill=int(it["targetSkill"]),
                current_skill=int(it["currentSkill"]),
                training_type=TnaTrainingType(it["trainingType"]),
                month_apply=str(it["monthApply"]),
            )
            for it in json.loads(fstr(form, "payload") or "[]")
        ]
    except (ValueError, KeyError, TypeError):
        raise bad("The TNA form data is invalid. Please check every row and try again.")

    tna = db.scalar(select(Tna).where(Tna.user_id == user.id, Tna.year == year))
    if tna and tna.status == TnaStatus.APPROVED:
        raise bad("This TNA record has already been approved and can no longer be edited.")
    if tna is None:
        tna = Tna(user_id=user.id, year=year, status=TnaStatus.PENDING)
        db.add(tna)
        db.flush()
    db.execute(delete(TnaItem).where(TnaItem.tna_id == tna.id))
    for r in rows:
        r.tna_id = tna.id
        db.add(r)
    db.commit()
    return {"ok": True}


@router.post("/{tna_id}/approve")
def approve_tna(tna_id: int, db: DB, user: CurrentUser):
    if not can_manage_tna(user):
        raise bad("Not authorized")
    tna = db.get(Tna, tna_id)
    if tna is None:
        raise HTTPException(404, "TNA not found.")
    tna.status, tna.approved_at, tna.approved_by_user_id = TnaStatus.APPROVED, now_utc(), user.id
    db.commit()
    return {"ok": True}


def _option_fields(form) -> tuple[str, str | None]:
    label = fstr(form, "label").strip().upper()
    if not label:
        raise bad("Training name is required.")
    group = fstr(form, "groupName").strip()
    return label, (group.upper() if group else None)


@router.post("/options")
def create_option(section: TnaSection, form: Form, db: DB, _: TnaAdmin):
    label, group = _option_fields(form)
    last = db.scalar(select(func.max(TnaTrainingOption.order)).where(TnaTrainingOption.section == section))
    db.add(
        TnaTrainingOption(section=section, group_name=group, label=label, order=(last if last is not None else -1) + 1)
    )
    db.commit()
    return {"ok": True}


@router.post("/options/{option_id}")
def update_option(option_id: int, form: Form, db: DB, _: TnaAdmin):
    label, group = _option_fields(form)
    opt = db.get(TnaTrainingOption, option_id)
    if opt is None:
        raise HTTPException(404, "Training option not found.")
    opt.label, opt.group_name = label, group
    db.commit()
    return {"ok": True}


@router.delete("/options/{option_id}")
def delete_option(option_id: int, db: DB, _: TnaAdmin):
    opt = db.get(TnaTrainingOption, option_id)
    if opt is None:
        raise HTTPException(404, "Training option not found.")
    db.delete(opt)
    db.commit()
    return {"ok": True}
