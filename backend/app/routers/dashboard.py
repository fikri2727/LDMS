"""Dashboard figures. Ported from ldms-web: src/lib/dashboard.ts + app/(app)/dashboard/page.tsx.

Admins (org-wide view) get company totals; everyone else only ever gets their own figures
plus their own department's hour summary — decided here from the signed-in user.
"""

from datetime import datetime

from fastapi import APIRouter
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.deps import DB, CurrentUser
from app.forms import parse_date
from app.models import (
    AttendanceStatus,
    Department,
    ElearningCompletion,
    ElearningModule,
    Ojt,
    ParticipateOjt,
    Participation,
    StaffStatus,
    Training,
    TrainingProgram,
    User,
)
from app.rbac import has_org_wide_view
from app.serialize import value
from app.services.elearning import module_hours_map
from app.services.util import compute_days, compute_hours, js_round, now_utc

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

MONTH_LABELS = ["JAN", "FEB", "MAC", "APR", "MEI", "JUN", "JUL", "OGO", "SEP", "OKT", "NOV", "DIS"]
PROGRAM_LABELS = {
    TrainingProgram.EXT: "Public (External)",
    TrainingProgram.INTX: "Inhouse (External Trainer)",
    TrainingProgram.INTI: "Inhouse (Internal Trainer)",
}


def r2(x: float) -> float:
    return js_round(x, 2)


class Data:
    """Loads the date-range data once and serves every figure from it."""

    def __init__(self, db: Session, start: datetime, end: datetime):
        self.db, self.start, self.end = db, start, end
        self.trainings = db.scalars(
            select(Training)
            .options(selectinload(Training.participations).joinedload(Participation.user))
            .where(Training.start_date >= start, Training.end_date <= end)
        ).all()
        self.ojts = db.scalars(
            select(Ojt)
            .options(selectinload(Ojt.participants).joinedload(ParticipateOjt.user))
            .where(Ojt.start_date >= start, Ojt.end_date <= end)
        ).all()

    def mine(self, user_id: int | None):
        if user_id is None:
            return self.trainings, self.ojts
        return (
            [t for t in self.trainings if any(p.user_id == user_id for p in t.participations)],
            [o for o in self.ojts if any(p.user_id == user_id for p in o.participants)],
        )

    def elearning(self, user_id: int | None) -> list[ElearningCompletion]:
        q = select(ElearningCompletion).where(
            ElearningCompletion.completed_at >= self.start, ElearningCompletion.completed_at <= self.end
        )
        if user_id is not None:
            q = q.where(ElearningCompletion.user_id == user_id)
        return self.db.scalars(q).all()


def session_hours(t: Training) -> float:
    return compute_days(t.start_date, t.end_date) * compute_hours(t.start_time, t.end_time)


def completed(parts) -> int:
    return sum(1 for p in parts if p.attendance == AttendanceStatus.COMPLETED)


def training_man_hours(t: Training) -> float:
    """Session length × participants who actually completed it (matches Training Records' Man Hours)."""
    return session_hours(t) * completed(t.participations)


def ojt_man_hours(o: Ojt) -> float:
    return o.total_day * o.total_hour * completed(o.participants)


def elearning_totals(db: Session, completions) -> tuple[float, int]:
    """Each completed module counts as one training on one day, plus its estimated hours."""
    hours = module_hours_map(db, {c.module_id for c in completions})
    return sum(hours[c.module_id] for c in completions), len(completions)


def overview(db: Session, d: Data, user_id: int | None) -> dict:
    trainings, ojts = d.mine(user_id)
    el_hours, el_count = elearning_totals(db, d.elearning(user_id))

    users: set[int] = set()
    for parts in [t.participations for t in trainings] + [o.participants for o in ojts]:
        for p in parts:
            if user_id is not None and p.user_id != user_id:
                continue
            if p.attendance == AttendanceStatus.COMPLETED and p.user.status == StaffStatus.ACTIVE:
                users.add(p.user_id)

    total_day = sum(compute_days(t.start_date, t.end_date) for t in trainings) + sum(o.total_day for o in ojts)
    total_hour = sum(session_hours(t) if user_id else training_man_hours(t) for t in trainings) + sum(
        o.total_hour if user_id else ojt_man_hours(o) for o in ojts
    )
    return {
        "totalTraining": len(trainings) + len(ojts) + el_count,
        "totalUser": len(users),
        "totalDay": total_day + el_count,
        "totalHour": r2(total_hour + el_hours),
    }


def public_vs_ojt(db: Session, d: Data, user_id: int | None) -> list[dict]:
    trainings, ojts = d.mine(user_id)
    public = sum(session_hours(t) if user_id else training_man_hours(t) for t in trainings)
    ojt = sum(o.total_day * o.total_hour if user_id else ojt_man_hours(o) for o in ojts)
    el_hours, _ = elearning_totals(db, d.elearning(user_id))
    return [
        {"name": "Public / Inhouse", "value": r2(public)},
        {"name": "OJT", "value": r2(ojt)},
        {"name": "E-Learning", "value": r2(el_hours)},
    ]


def monthly_cost(d: Data) -> list[dict]:
    totals = [0.0] * 12
    for t in d.trainings:
        totals[t.start_date.month - 1] += t.cost
    return [{"month": m, "cost": r2(totals[i])} for i, m in enumerate(MONTH_LABELS)]


def top_trainers(d: Data, user_id: int | None) -> list[dict]:
    trainings, ojts = d.mine(user_id)
    hours: dict[str, float] = {}
    for t in trainings:
        hours[t.trainer] = hours.get(t.trainer, 0) + session_hours(t)
    for o in ojts:
        hours[o.trainer_name] = hours.get(o.trainer_name, 0) + o.total_day * o.total_hour
    rows = [{"trainer": k, "totalHour": r2(v)} for k, v in hours.items()]
    return sorted(rows, key=lambda r: r["totalHour"], reverse=True)[:5]


def monthly_hours_for_user(db: Session, d: Data, user_id: int) -> list[dict]:
    trainings, ojts = d.mine(user_id)
    totals = [0.0] * 12
    for t in trainings:
        totals[t.start_date.month - 1] += session_hours(t)
    for o in ojts:
        totals[o.start_date.month - 1] += o.total_day * o.total_hour
    completions = d.elearning(user_id)
    hours = module_hours_map(db, {c.module_id for c in completions})
    for c in completions:
        totals[c.completed_at.month - 1] += hours[c.module_id]
    return [{"month": m, "hours": r2(totals[i])} for i, m in enumerate(MONTH_LABELS)]


def department_breakdown(db: Session, d: Data, department_id: int | None = None) -> list[dict]:
    man_hours: dict[int, float] = {}

    def add(parts, day_hour: float, per_man: bool):
        for p in parts:
            if p.attendance != AttendanceStatus.COMPLETED or p.user.status != StaffStatus.ACTIVE:
                continue
            if department_id and p.user.department_id != department_id:
                continue
            if p.user.department_id:
                man_hours[p.user.department_id] = man_hours.get(p.user.department_id, 0) + day_hour * (
                    p.total_man if per_man else 1
                )

    for t in d.trainings:
        add(t.participations, session_hours(t), False)
    for o in d.ojts:
        add(o.participants, o.total_day * o.total_hour, True)

    q = select(Department)
    if department_id:
        q = q.where(Department.id == department_id)
    departments = db.scalars(q).all()
    # Denominator: every active staff member in the department (not only those who trained).
    staff_counts = dict(
        db.execute(
            select(User.department_id, func.count())
            .where(User.status == StaffStatus.ACTIVE, User.department_id.isnot(None))
            .group_by(User.department_id)
        ).all()
    )
    rows = []
    for dept in departments:
        mh = man_hours.get(dept.id, 0)
        count = staff_counts.get(dept.id, 0)
        rows.append(
            {
                "department": dept.short_name or dept.name,
                "departmentFullName": dept.name,
                "manHour": r2(mh),
                "staffCount": count,
                "avgHour": r2(mh / count) if count > 0 else 0,
            }
        )
    return sorted(rows, key=lambda r: r["avgHour"])


def recent_records(db: Session, user_id: int, limit: int = 4) -> list[dict]:
    """Latest activity across Public/Inhouse, OJT and E-Learning — independent of the date filter."""
    parts = db.scalars(
        select(Participation)
        .join(Training)
        .options(joinedload(Participation.training))
        .where(Participation.user_id == user_id)
        .order_by(Training.start_date.desc())
        .limit(limit)
    ).all()
    ojt_parts = db.scalars(
        select(ParticipateOjt)
        .join(Ojt)
        .options(joinedload(ParticipateOjt.ojt))
        .where(ParticipateOjt.user_id == user_id)
        .order_by(Ojt.start_date.desc())
        .limit(limit)
    ).all()
    completions = db.scalars(
        select(ElearningCompletion)
        .where(ElearningCompletion.user_id == user_id)
        .order_by(ElearningCompletion.completed_at.desc())
        .limit(limit)
    ).all()
    titles = dict(
        db.execute(
            select(ElearningModule.id, ElearningModule.title).where(
                ElearningModule.id.in_({c.module_id for c in completions})
            )
        ).all()
    )
    hours = module_hours_map(db, {c.module_id for c in completions})

    rows = [
        {
            "id": f"training-{p.id}",
            "type": "training",
            "program": PROGRAM_LABELS.get(p.training.program, p.training.program.value),
            "title": p.training.title,
            "_date": p.training.start_date,
            "status": p.attendance.value,
            "hours": session_hours(p.training),
            "href": f"/training/public/{p.training_id}",
        }
        for p in parts
    ]
    rows += [
        {
            "id": f"ojt-{p.id}",
            "type": "ojt",
            "program": "OJT",
            "title": p.ojt.title,
            "_date": p.ojt.start_date,
            "status": p.attendance.value,
            "hours": p.ojt.total_day * p.ojt.total_hour,
            "href": f"/training/ojt/{p.ojt_id}",
        }
        for p in ojt_parts
    ]
    rows += [
        {
            "id": f"elearning-{c.id}",
            "type": "elearning",
            "program": "E-Learning",
            "title": titles.get(c.module_id, ""),
            "_date": c.completed_at,
            "status": "COMPLETED",
            "hours": hours[c.module_id],
            "href": f"/elearning/learner/modules/{c.module_id}",
        }
        for c in completions
    ]
    rows.sort(key=lambda r: r["_date"], reverse=True)
    for r in rows:
        r["date"] = value(r.pop("_date"))
    return rows[:limit]


@router.get("")
def dashboard(db: DB, user: CurrentUser, start: str | None = None, end: str | None = None):
    year = now_utc().year
    start_dt = parse_date(start) if start else datetime(year, 1, 1)
    end_dt = parse_date(end) if end else datetime(year, 12, 31)
    d = Data(db, start_dt, end_dt)

    if has_org_wide_view(user):
        return {
            "orgWide": True,
            "overview": overview(db, d, None),
            "split": public_vs_ojt(db, d, None),
            "monthlyCost": monthly_cost(d),
            "monthlyHours": None,
            "topTrainers": top_trainers(d, None),
            "departmentData": department_breakdown(db, d),
            "recentRecords": None,
            "myDepartmentData": None,
        }
    return {
        "orgWide": False,
        "overview": overview(db, d, user.id),
        "split": public_vs_ojt(db, d, user.id),
        "monthlyCost": None,
        "monthlyHours": monthly_hours_for_user(db, d, user.id),
        "topTrainers": top_trainers(d, user.id),
        "departmentData": None,
        "recentRecords": recent_records(db, user.id, 4),
        "myDepartmentData": department_breakdown(db, d, user.department_id) if user.department_id else None,
    }
