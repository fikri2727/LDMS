"""Staff Training Requisition. Ported from ldms-web: app/(app)/requisition/actions.ts + pages + brochure route."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import joinedload, selectinload

from app.deps import DB, CurrentUser
from app.forms import Form, bad, fall_int, fdate, ffile, fnum, fopt, fstr
from app.models import RequisitionParticipant, RequisitionStatus, StaffStatus, TrainingRequisition, User
from app.rbac import can_review_requisitions, can_view_all_requisitions
from app.serialize import ser
from app.services.uploads import delete_upload, file_response, guess_mime_type, save_upload
from app.services.util import now_utc

router = APIRouter(prefix="/api/requisitions", tags=["requisition"])


def _with_count(r: TrainingRequisition, spec=None) -> dict:
    return {**ser(r, spec), "_count": {"participants": len(r.participants)}}


def _can_view(r: TrainingRequisition, user: User) -> bool:
    """Owner, the applicant's HOD, or an Admin."""
    is_hod_reviewer = can_review_requisitions(user) and r.user.hod_id == user.id
    return r.user_id == user.id or is_hod_reviewer or can_view_all_requisitions(user)


# ---------- Page data ----------


@router.get("")
def requisitions(db: DB, user: CurrentUser):
    base = select(TrainingRequisition).options(selectinload(TrainingRequisition.participants))
    mine = db.scalars(
        base.where(TrainingRequisition.user_id == user.id).order_by(TrainingRequisition.created_at.desc())
    ).all()

    pending = []
    if can_review_requisitions(user):
        pending = db.scalars(
            base.options(joinedload(TrainingRequisition.user).joinedload(User.department))
            .join(User, User.id == TrainingRequisition.user_id)
            .where(User.hod_id == user.id, TrainingRequisition.status == RequisitionStatus.PENDING)
            .order_by(TrainingRequisition.created_at.asc())
        ).unique().all()

    everything = []
    if can_view_all_requisitions(user):
        everything = db.scalars(
            base.options(
                joinedload(TrainingRequisition.user).joinedload(User.department),
                joinedload(TrainingRequisition.reviewed_by),
            )
            .order_by(TrainingRequisition.created_at.desc())
            .limit(200)
        ).unique().all()

    return {
        "myApplications": [_with_count(r) for r in mine],
        "pendingForReview": [_with_count(r, {"user": {"department": True}}) for r in pending],
        "allApplications": [
            _with_count(r, {"user": {"department": True}, "reviewedBy": ("id", "staffNo", "staffName")})
            for r in everything
        ],
    }


@router.get("/staff-options")
def staff_options(db: DB, _: CurrentUser):
    return ser(
        db.scalars(select(User).where(User.status == StaffStatus.ACTIVE).order_by(User.staff_name)).all(),
        ("id", "staffNo", "staffName"),
    )


@router.get("/{req_id}")
def requisition_detail(req_id: int, db: DB, user: CurrentUser):
    r = db.scalar(
        select(TrainingRequisition)
        .options(
            joinedload(TrainingRequisition.user).joinedload(User.department),
            joinedload(TrainingRequisition.reviewed_by),
            selectinload(TrainingRequisition.participants).joinedload(RequisitionParticipant.user),
        )
        .where(TrainingRequisition.id == req_id)
    )
    if r is None:
        raise HTTPException(404, "Requisition not found.")
    if not _can_view(r, user):
        raise HTTPException(403, "You do not have permission to view this requisition.")
    return ser(
        r,
        {"user": {"department": True}, "reviewedBy": ("id", "staffNo", "staffName", "isHod"), "participants": {"user": True}},
    )


# ---------- Actions ----------


@router.post("")
async def create_requisition(form: Form, db: DB, user: CurrentUser):
    fees = fnum(form, "fees")
    if fees is None or fees < 0:
        raise bad("Invalid fees amount.")
    participant_ids = fall_int(form, "participantUserIds")
    if not participant_ids:
        raise bad("Add at least one participant.")
    training_date = fdate(form, "trainingDate")
    if training_date is None:
        raise bad("Select a training date.")
    training_end = fdate(form, "trainingEndDate") or training_date

    title = fstr(form, "title").strip()
    start_time = fstr(form, "startTime").strip()
    end_time = fstr(form, "endTime").strip()
    venue = fstr(form, "venue").strip()
    objective = fstr(form, "objective").strip()
    provider = fstr(form, "trainingProvider").strip()
    if not all((title, start_time, end_time, venue, objective, provider)):
        raise bad("Please fill in all required fields.")
    hrdc, atp = fstr(form, "hrdcClaimable"), fstr(form, "underAtp")
    if hrdc not in ("yes", "no"):
        raise bad("Select whether this training is HRDC claimable.")
    if atp not in ("yes", "no"):
        raise bad("Select whether this training is under ATP (Annual Training Plan).")

    r = TrainingRequisition(
        user_id=user.id,
        title=title,
        training_date=training_date,
        training_end_date=training_end,
        start_time=start_time,
        end_time=end_time,
        venue=venue,
        objective=objective,
        fees=fees,
        hrdc_claimable=hrdc == "yes",
        under_atp=atp == "yes",
        training_provider=provider,
        remarks=fopt(form, "remarks"),
        participants=[RequisitionParticipant(user_id=uid) for uid in dict.fromkeys(participant_ids)],
    )
    brochure_file = ffile(form, "brochureFile")
    if brochure_file:
        r.brochure_file_path = await save_upload("requisition-brochures", brochure_file)
        r.brochure_file_name = brochure_file.filename
    db.add(r)
    db.commit()
    return {"id": r.id}


class ReviewIn(BaseModel):
    decision: RequisitionStatus


@router.post("/{req_id}/review")
def review_requisition(req_id: int, body: ReviewIn, db: DB, user: CurrentUser):
    """Admins can approve/reject/complete any requisition and revise a decision; an HOD makes the
    one-time Approve/Reject call for their own department's staff while it's still pending."""
    if body.decision == RequisitionStatus.PENDING:
        raise bad("Invalid decision.")
    r = db.scalar(
        select(TrainingRequisition).options(joinedload(TrainingRequisition.user)).where(TrainingRequisition.id == req_id)
    )
    if r is None:
        raise bad("Requisition not found.")
    is_admin = can_view_all_requisitions(user)
    is_own_hod = can_review_requisitions(user) and r.user.hod_id == user.id
    if body.decision == RequisitionStatus.COMPLETED and not is_admin:
        raise bad("Only an Admin can mark a requisition as Completed.")
    if not is_admin and not is_own_hod:
        raise bad("Not authorized to review this requisition.")
    if not is_admin and r.status != RequisitionStatus.PENDING:
        raise bad("This requisition has already been reviewed.")
    r.status, r.reviewed_by_user_id, r.reviewed_at = body.decision, user.id, now_utc()
    db.commit()
    return {"ok": True}


@router.delete("/{req_id}")
def delete_requisition(req_id: int, db: DB, user: CurrentUser):
    if not can_view_all_requisitions(user):
        raise bad("Only an Admin can delete a training requisition.")
    r = db.get(TrainingRequisition, req_id)
    if r is None:
        raise HTTPException(404, "Requisition not found.")
    path = r.brochure_file_path
    db.delete(r)
    db.commit()
    if path:
        delete_upload(path)
    return {"ok": True}


class GrantIn(BaseModel):
    grantId: str = ""


@router.post("/{req_id}/grant-id")
def update_grant_id(req_id: int, body: GrantIn, db: DB, user: CurrentUser):
    if not can_view_all_requisitions(user):
        raise bad("Not authorized to set the grant ID.")
    r = db.get(TrainingRequisition, req_id)
    if r is None:
        raise HTTPException(404, "Requisition not found.")
    r.grant_id = body.grantId.strip() or None
    db.commit()
    return {"ok": True}


@router.get("/{req_id}/brochure")
def brochure(req_id: int, db: DB, user: CurrentUser):
    r = db.scalar(
        select(TrainingRequisition).options(joinedload(TrainingRequisition.user)).where(TrainingRequisition.id == req_id)
    )
    # Same visibility rule as the detail page; hidden (404) from anyone else.
    if r is None or not r.brochure_file_path or not r.brochure_file_name or not _can_view(r, user):
        raise HTTPException(404, "Not found")
    return file_response(r.brochure_file_path, r.brochure_file_name, guess_mime_type(r.brochure_file_name))
