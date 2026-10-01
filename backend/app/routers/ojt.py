"""OJT (on-the-job training). Ported from ldms-web: app/(app)/training/ojt/actions.ts + ojt/**/page.tsx."""

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import joinedload, selectinload

from app.deps import DB, CurrentUser
from app.forms import Form, bad, fdate, ffile, fint, fstr
from app.models import AttendanceStatus, Ojt, ParticipateOjt, StaffStatus, TrainerType, User
from app.rbac import can_evaluate_on_behalf, can_manage_ojt
from app.serialize import Sel, ser
from app.services.excel import parse_ojt_excel
from app.services.survey import apply_ojt_survey_answers, department_snapshot
from app.services.util import compute_days, compute_hours, generate_ojt_code

router = APIRouter(prefix="/api/ojt", tags=["ojt"])


def _get_ojt(db: DB, ojt_id: int) -> Ojt:
    o = db.get(Ojt, ojt_id)
    if o is None:
        raise HTTPException(404, "OJT record not found.")
    return o


def _read_ojt_fields(form) -> dict:
    start, end = fdate(form, "startDate"), fdate(form, "endDate")
    title = fstr(form, "title").strip().upper()
    venue = fstr(form, "venue").strip().upper()
    trainer_name = fstr(form, "trainerName").strip().upper()
    if not title or not venue or not trainer_name:
        raise bad("Title, Venue, and Trainer Name are required.")
    if start is None or end is None:
        raise bad("Start and end dates are required.")
    try:
        trainer_type = TrainerType(fstr(form, "trainerType"))
    except ValueError:
        raise bad("Please select a trainer type.")
    start_time = fstr(form, "startTime") or "09:00"
    end_time = fstr(form, "endTime") or "17:00"
    return {
        "title": title,
        "venue": venue,
        "trainer_type": trainer_type,
        "trainer_name": trainer_name,
        "start_date": start,
        "end_date": end,
        "start_time": start_time,
        "end_time": end_time,
        "total_day": compute_days(start, end),
        "total_hour": compute_hours(start_time, end_time),
    }


def _create_ojt(db: DB, fields: dict, created_by: int) -> Ojt:
    ojt = Ojt(**fields, training_code="", created_by_user_id=created_by)
    db.add(ojt)
    db.flush()
    ojt.training_code = generate_ojt_code(ojt.id, fields["start_date"])
    return ojt


def _active_staff(db: DB):
    return db.scalars(select(User).where(User.status == StaffStatus.ACTIVE).order_by(User.staff_name)).all()


# ---------- Page data ----------


@router.get("")
def ojt_list(db: DB, user: CurrentUser):
    manage = can_manage_ojt(user)
    q = (
        select(Ojt)
        .options(
            selectinload(Ojt.participants).selectinload(ParticipateOjt.user).selectinload(User.department),
            joinedload(Ojt.created_by),
        )
        .order_by(Ojt.start_date.desc())
    )
    if not manage:
        q = q.where(Ojt.participants.any(ParticipateOjt.user_id == user.id))
    ojts = db.scalars(q).unique().all()
    if not manage:
        return ser(ojts)
    return ser(
        ojts,
        {
            "participants": {"user": Sel(only=("staffNo", "staffName"), include={"department": ("name",)})},
            "createdBy": ("staffName",),
        },
    )


@router.get("/trainer-options")
def trainer_options(db: DB, _: CurrentUser):
    """"NAME (STAFFNO)" suggestions for the trainer-name field."""
    return [f"{u.staff_name} ({u.staff_no})" for u in _active_staff(db)]


@router.get("/{ojt_id}")
def ojt_detail(ojt_id: int, db: DB, user: CurrentUser):
    o = db.scalar(
        select(Ojt)
        .options(
            selectinload(Ojt.participants).selectinload(ParticipateOjt.user),
            selectinload(Ojt.participants).selectinload(ParticipateOjt.clerk),
        )
        .where(Ojt.id == ojt_id)
    )
    if o is None:
        raise HTTPException(404, "OJT record not found.")
    manage = can_manage_ojt(user)
    participants = sorted(o.participants, key=lambda p: p.user.staff_name)
    # Regular staff only receive their own participation row — not the full roster.
    visible = participants if manage else [p for p in participants if p.user_id == user.id]
    out = ser(o)
    out["participants"] = ser(visible, {"user": True, "clerk": ("id", "staffNo", "staffName")})

    staff_options = []
    if manage:
        existing = {p.user_id for p in o.participants}
        staff_options = [s for s in ser(_active_staff(db), ("id", "staffNo", "staffName")) if s["id"] not in existing]
    return {"ojt": out, "staffOptions": staff_options}


@router.get("/{ojt_id}/basic")
def ojt_basic(ojt_id: int, db: DB, user: CurrentUser):
    """Own fields for the Edit form — managers, or the staff member who created it."""
    o = _get_ojt(db, ojt_id)
    if not can_manage_ojt(user) and o.created_by_user_id != user.id:
        raise HTTPException(403, "You do not have permission to edit this OJT record.")
    return ser(o)


@router.get("/{ojt_id}/participations/{participation_id}")
def participation_detail(ojt_id: int, participation_id: int, db: DB, user: CurrentUser):
    p = db.scalar(
        select(ParticipateOjt)
        .options(joinedload(ParticipateOjt.ojt), joinedload(ParticipateOjt.user))
        .where(ParticipateOjt.id == participation_id)
    )
    if p is None or p.ojt_id != ojt_id:
        raise HTTPException(404, "Not found.")
    if p.user_id != user.id and not can_manage_ojt(user):
        raise HTTPException(403, "You do not have permission to view this evaluation.")
    return ser(p, {"ojt": True, "user": ("id", "staffNo", "staffName")})


# ---------- Actions ----------


@router.post("")
def create_ojt(form: Form, db: DB, user: CurrentUser):
    """Admin/Clerk keying in an OJT for others -> session only (participants added afterwards).
    Anyone adding their OWN OJT ("Add My OJT", hidden isSelf=1) -> created with themself enrolled
    as COMPLETED plus their before/after survey, in one step."""
    fields = _read_ojt_fields(form)
    if can_manage_ojt(user) and fstr(form, "isSelf") != "1":
        ojt = _create_ojt(db, fields, user.id)
        db.commit()
        return {"id": ojt.id, "redirect": f"/training/ojt/{ojt.id}"}

    me = db.scalar(select(User).options(joinedload(User.department)).where(User.id == user.id))
    ojt = _create_ojt(db, fields, user.id)
    p = ParticipateOjt(
        ojt_id=ojt.id,
        user_id=user.id,
        attendance=AttendanceStatus.COMPLETED,
        department=department_snapshot(me),
    )
    db.add(p)
    apply_ojt_survey_answers(db, p, form)
    db.commit()
    return {"id": ojt.id, "redirect": "/training"}


@router.post("/upload")
async def create_ojt_from_excel(form: Form, db: DB, user: CurrentUser):
    """Bulk-create an OJT session and its participants from Excel. All-or-nothing."""
    if not can_manage_ojt(user):
        raise HTTPException(403, "You do not have permission to upload OJT records.")
    file = ffile(form, "file")
    if file is None:
        raise bad("Please choose an Excel file to upload.")
    parsed = parse_ojt_excel(await file.read())

    staff = db.scalars(
        select(User)
        .options(joinedload(User.department))
        .where(User.staff_no.in_(parsed["staffNos"]), User.status == StaffStatus.ACTIVE)
    ).all()
    by_no = {s.staff_no.upper(): s for s in staff}
    missing = [n for n in parsed["staffNos"] if n not in by_no]
    if missing:
        raise bad(f"These Staff No(s) were not found among active staff: {', '.join(missing)}")

    f = parsed["fields"]
    f["trainer_type"] = TrainerType(f["trainer_type"])
    f["total_day"] = compute_days(f["start_date"], f["end_date"])
    f["total_hour"] = compute_hours(f["start_time"], f["end_time"])
    ojt = _create_ojt(db, f, user.id)
    for no in parsed["staffNos"]:
        s = by_no[no]
        db.add(ParticipateOjt(ojt_id=ojt.id, user_id=s.id, department=department_snapshot(s), clerk_id=user.id))
    db.commit()
    return {"id": ojt.id}


@router.post("/{ojt_id}")
def update_ojt(ojt_id: int, form: Form, db: DB, user: CurrentUser):
    o = _get_ojt(db, ojt_id)
    manage = can_manage_ojt(user)
    if not manage and o.created_by_user_id != user.id:
        raise HTTPException(403, "You do not have permission to edit this OJT record.")
    for k, v in _read_ojt_fields(form).items():
        setattr(o, k, v)
    db.commit()
    return {"redirect": f"/training/ojt/{ojt_id}" if manage else "/training"}


@router.delete("/{ojt_id}")
def delete_ojt(ojt_id: int, db: DB, user: CurrentUser):
    o = _get_ojt(db, ojt_id)
    manage = can_manage_ojt(user)
    if not manage and o.created_by_user_id != user.id:
        raise HTTPException(403, "You do not have permission to delete this OJT record.")
    db.delete(o)
    db.commit()
    return {"redirect": "/training/ojt" if manage else "/training"}


@router.post("/{ojt_id}/participants")
def add_participant(ojt_id: int, form: Form, db: DB, user: CurrentUser):
    if not can_manage_ojt(user):
        raise HTTPException(403, "You do not have permission to add participants.")
    user_id = fint(form, "userId")
    if not user_id:
        raise bad("Please select a staff member.")
    _get_ojt(db, ojt_id)
    participant = db.scalar(select(User).options(joinedload(User.department)).where(User.id == user_id))
    if participant is None:
        raise bad("Staff member not found.")
    if db.scalar(select(ParticipateOjt.id).where(ParticipateOjt.ojt_id == ojt_id, ParticipateOjt.user_id == user_id)):
        raise bad("This staff member is already a participant.")
    db.add(
        ParticipateOjt(ojt_id=ojt_id, user_id=user_id, department=department_snapshot(participant), clerk_id=user.id)
    )
    db.commit()
    return {"ok": True}


@router.delete("/{ojt_id}/participants/{participation_id}")
def remove_participant(ojt_id: int, participation_id: int, db: DB, user: CurrentUser):
    p = db.get(ParticipateOjt, participation_id)
    if p is None or p.ojt_id != ojt_id:
        raise HTTPException(404, "Participant not found.")
    if p.user_id != user.id and not can_manage_ojt(user):
        raise HTTPException(403, "You do not have permission to remove this participant.")
    db.delete(p)
    db.commit()
    return {"ok": True}


@router.post("/{ojt_id}/participants/{participation_id}/survey")
def submit_survey(ojt_id: int, participation_id: int, form: Form, db: DB, user: CurrentUser):
    """The participant evaluates their own before/after skill survey (or an admin on their behalf)."""
    p = db.get(ParticipateOjt, participation_id)
    if p is None or p.ojt_id != ojt_id:
        raise HTTPException(404, "Participant not found.")
    on_behalf = p.user_id != user.id
    if on_behalf and not can_evaluate_on_behalf(user):
        raise HTTPException(403, "You do not have permission to submit this evaluation.")
    if p.attendance == AttendanceStatus.COMPLETED:
        raise bad("This evaluation has already been submitted.")
    apply_ojt_survey_answers(db, p, form)
    if on_behalf:
        p.clerk_id = user.id  # shown as "Key In By"
    db.commit()
    return {"ok": True}
