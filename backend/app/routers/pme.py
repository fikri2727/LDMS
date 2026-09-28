"""PME (Performance Monitoring Evaluation). Ported from ldms-web: app/(app)/training/pme/actions.ts + pme pages."""

import re

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.deps import DB, CurrentUser
from app.forms import Form, bad, fstr
from app.labels import RATING_BAND_RANGES, RATING_BAND_SHORT_LABELS
from app.models import Pme, PmeStatus, RatingBand, StaffStatus, User
from app.rbac import can_view_all_pme
from app.serialize import ser
from app.services.pme import get_evaluation_period, is_pme_due
from app.services.util import js_round, now_utc

router = APIRouter(prefix="/api/pme", tags=["pme"])


@router.get("")
def pme_list(db: DB, user: CurrentUser):
    """Supervisor: my team, PMEs waiting on me, my completed ones. Admin: the latest 100, view-only."""
    if can_view_all_pme(user):
        return {
            "viewAll": True,
            "myTeam": [],
            "myPmes": [],
            "completed": [],
            "allRecords": ser(db.scalars(select(Pme).order_by(Pme.created_at.desc()).limit(100)).all()),
        }
    my_team = db.scalars(
        select(User)
        .options(joinedload(User.department))
        .where(User.supervisor_id == user.id, User.status == StaffStatus.ACTIVE)
        .order_by(User.staff_name)
    ).all()
    my_pmes = db.scalars(
        select(Pme)
        .options(joinedload(Pme.training))
        .where(Pme.supervisor_id == user.id, Pme.status == PmeStatus.PENDING)
        .order_by(Pme.created_at)
    ).all()
    completed = db.scalars(
        select(Pme)
        .where(Pme.supervisor_id == user.id, Pme.status == PmeStatus.VERIFIED)
        .order_by(Pme.evaluated_at.desc().nulls_last())
        .limit(50)
    ).all()
    return {
        "viewAll": False,
        "myTeam": ser(my_team, {"department": True}),
        "myPmes": ser(my_pmes, {"training": True}),
        "completed": ser(completed),
        "allRecords": [],
    }


@router.get("/{pme_id}")
def pme_detail(pme_id: int, db: DB, user: CurrentUser):
    """Only the assigned supervisor (who evaluates) or an admin (read-only) — not even the employee."""
    pme = db.scalar(
        select(Pme).options(joinedload(Pme.training), joinedload(Pme.supervisor)).where(Pme.id == pme_id)
    )
    if pme is None:
        raise HTTPException(404, "PME not found.")
    if pme.supervisor_id != user.id and not can_view_all_pme(user):
        raise HTTPException(403, "You do not have permission to view this PME.")
    return ser(pme, {"training": True, "supervisor": ("id", "staffNo", "staffName")})


def _rating_fields(form, prefix: str, question_label: str) -> dict:
    raw = fstr(form, f"{prefix}Rating")
    try:
        rating = RatingBand(raw) if raw else None
    except ValueError:
        raise bad(f'"{question_label}": invalid rating.')
    percent_text = fstr(form, f"{prefix}Percent").strip()
    m = re.search(r"\d+(\.\d+)?", percent_text)
    percent_number = float(m[0]) if m else None
    if rating and percent_number is not None:
        lo, hi = RATING_BAND_RANGES[rating.value]
        if percent_number < lo or percent_number > hi:
            shown = int(percent_number) if percent_number.is_integer() else percent_number
            raise bad(
                f'"{question_label}": {shown}% doesn\'t match "{RATING_BAND_SHORT_LABELS[rating.value]}" '
                f"— must be between {lo}% and {hi}%."
            )
    return {
        "rating": rating,
        "percent_text": percent_text or None,
        "percent_number": percent_number,
        "remark": fstr(form, f"{prefix}Remark").strip() or None,
    }


@router.post("/{pme_id}/evaluate")
def evaluate_pme(pme_id: int, form: Form, db: DB, user: CurrentUser):
    """The assigned supervisor fills in and submits the evaluation in one step."""
    pme = db.scalar(select(Pme).options(joinedload(Pme.training)).where(Pme.id == pme_id))
    if pme is None:
        raise HTTPException(404, "PME not found.")
    if pme.supervisor_id != user.id:
        raise bad("Only this staff member's supervisor can evaluate this PME.")
    if pme.status != PmeStatus.PENDING:
        raise bad("This PME has already been evaluated.")
    if not is_pme_due(pme.training.end_date):
        raise bad("This PME is not due yet.")

    level = _rating_fields(form, "level", "Knowledge Sharing / OJT")
    level2 = _rating_fields(form, "level2", "Learning")
    behavioral = _rating_fields(form, "behavioral", "Behavior")
    result = _rating_fields(form, "result", "Results")

    nums = [x["percent_number"] for x in (level, level2, behavioral, result) if x["percent_number"] is not None]
    ojt_raw = fstr(form, "ojtConducted")
    start, end = get_evaluation_period(pme.training.end_date)

    pme.from_date, pme.to_date = start, end
    pme.ojt_conducted = (ojt_raw == "yes") if ojt_raw else None
    pme.ojt_details = fstr(form, "ojtDetails").strip() or None
    for prefix, f in (("level", level), ("level2", level2), ("behavioral", behavioral), ("result", result)):
        suffix = "2" if prefix == "level2" else ""
        base = "level" if prefix == "level2" else prefix
        setattr(pme, f"{base}_rating{suffix}", f["rating"])
        setattr(pme, f"{base}_percent{suffix}", f["percent_text"])
        setattr(pme, f"{base}_remark{suffix}", f["remark"])
    pme.total_mark = int(js_round(sum(nums))) if nums else None
    pme.average_mark = sum(nums) / len(nums) if nums else None
    pme.status = PmeStatus.VERIFIED
    pme.evaluated_at = now_utc()
    db.commit()
    return {"ok": True}
