"""Ported from ldms-web/src/lib/pme.ts."""

from datetime import datetime, timedelta

from dateutil.relativedelta import relativedelta
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.labels import PME_ELIGIBLE_DESIGNATIONS
from app.models import Participation, Pme, PmeStatus, StaffStatus, User
from app.services.util import now_utc

PME_WAIT_MONTHS = 3  # PME becomes actionable by the supervisor this many months after the training ends


def get_pme_due_date(training_end: datetime) -> datetime:
    """Due 3 months after the day following the training's completion date."""
    return training_end + timedelta(days=1) + relativedelta(months=PME_WAIT_MONTHS)


def get_evaluation_period(training_end: datetime) -> tuple[datetime, datetime]:
    return training_end + timedelta(days=1), get_pme_due_date(training_end)


def is_pme_due(training_end: datetime, now: datetime | None = None) -> bool:
    return (now or now_utc()) >= get_pme_due_date(training_end)


def is_supervisor(db: Session, user_id: int) -> bool:
    return (
        db.scalar(
            select(func.count()).select_from(User).where(User.supervisor_id == user_id, User.status == StaffStatus.ACTIVE)
        )
        or 0
    ) > 0


def maybe_create_pme(db: Session, participation_id: int) -> None:
    """Once a Public/Inhouse participation is COMPLETED, an Executive/Manager participant gets a
    PME record right away (actionable by their supervisor 3 months after the training ends).
    The supervisor is snapshotted from the participant's profile at creation time."""
    p = db.scalar(
        select(Participation)
        .options(joinedload(Participation.user).joinedload(User.department), joinedload(Participation.training))
        .where(Participation.id == participation_id)
    )
    if p is None or p.user.designation.value not in PME_ELIGIBLE_DESIGNATIONS:
        return
    if db.scalar(select(Pme.id).where(Pme.participation_id == participation_id)):
        return
    db.add(
        Pme(
            training_id=p.training_id,
            participation_id=p.id,
            user_id=p.user_id,
            supervisor_id=p.user.supervisor_id,
            designation=p.user.designation,
            staff_name=p.user.staff_name,
            staff_no=p.user.staff_no,
            department=p.user.department.name if p.user.department else "",
            training_title=p.training.title,
            status=PmeStatus.PENDING,
        )
    )
    db.flush()
