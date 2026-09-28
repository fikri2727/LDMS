"""Ported from ldms-web/src/lib/survey.ts. Callers are responsible for authorization."""

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from starlette.datastructures import FormData

from app.forms import fstr
from app.models import AttendanceStatus, ParticipateOjt, Participation, StaffStatus, User
from app.services.pme import maybe_create_pme


def _int_or_none(v: str) -> int | None:
    """JS `Number(v) || null` for rating fields."""
    try:
        n = float(v)
    except ValueError:
        return None
    return int(n) if n else None


def _active_user(db: Session, staff_no: str) -> User | None:
    user = db.scalar(select(User).options(joinedload(User.department)).where(User.staff_no == staff_no))
    return None if user is None or user.status == StaffStatus.RESIGN else user


def find_or_create_checkin_participation(db: Session, training_id: int, staff_no: str):
    """QR check-in: resolve a Staff ID to a Participation, auto-enrolling an active staff member
    who wasn't pre-added. Returns (participation, user) or None."""
    user = _active_user(db, staff_no)
    if user is None:
        return None
    p = db.scalar(select(Participation).where(Participation.training_id == training_id, Participation.user_id == user.id))
    if p is None:
        p = Participation(training_id=training_id, user_id=user.id)
        db.add(p)
        db.flush()
    return p, user


def apply_survey_answers(db: Session, participation: Participation, form: FormData) -> None:
    """Saves the post-training survey, marks the participation COMPLETED, and creates the PME if eligible."""
    for field, attr in (
        ("courseRelevance", "course_relevance"),
        ("practicalExercises", "practical_exercises"),
        ("sufficientTime", "sufficient_time"),
        ("trainerEffectiveness", "trainer_effectiveness"),
        ("courseEffectiveness", "course_effectiveness"),
    ):
        setattr(participation, attr, _int_or_none(fstr(form, field)))
    participation.what_learnt = fstr(form, "whatLearnt").strip()
    participation.action_plan = fstr(form, "actionPlan").strip()
    participation.comment_suggestions = fstr(form, "commentSuggestions").strip()
    participation.attendance = AttendanceStatus.COMPLETED
    db.flush()
    maybe_create_pme(db, participation.id)


def department_snapshot(user: User) -> str | None:
    d = user.department
    return (d.short_name or d.name) if d else None


def find_or_create_ojt_checkin_participation(db: Session, ojt_id: int, staff_no: str):
    user = _active_user(db, staff_no)
    if user is None:
        return None
    p = db.scalar(select(ParticipateOjt).where(ParticipateOjt.ojt_id == ojt_id, ParticipateOjt.user_id == user.id))
    if p is None:
        p = ParticipateOjt(ojt_id=ojt_id, user_id=user.id, department=department_snapshot(user))
        db.add(p)
        db.flush()
    return p, user


def apply_ojt_survey_answers(db: Session, participation: ParticipateOjt, form: FormData) -> None:
    participation.q1 = fstr(form, "q1").strip().upper()
    participation.q2 = _int_or_none(fstr(form, "q2"))
    participation.q3 = _int_or_none(fstr(form, "q3"))
    participation.attendance = AttendanceStatus.COMPLETED
    db.flush()
