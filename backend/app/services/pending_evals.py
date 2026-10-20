"""Who still hasn't filled in their post-training evaluation, grouped by department (admin monitoring).

Counts Public/Inhouse and OJT participations that are still PENDING for trainings that have already
started (future trainings aren't "late" yet). Absent participants and resigned staff are left out.
Staff are grouped by their current department.
"""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import AttendanceStatus, Ojt, ParticipateOjt, Participation, StaffStatus, Training, User
from app.serialize import value
from app.services.util import now_utc


def pending_by_department(db: Session, now: datetime | None = None) -> dict:
    now = now or now_utc()
    staff: dict[int, dict] = {}

    def add(user: User, item: dict):
        s = staff.get(user.id)
        if s is None:
            s = staff[user.id] = {
                "id": user.id,
                "staffNo": user.staff_no,
                "staffName": user.staff_name,
                "departmentId": user.department_id,
                "department": user.department.name if user.department else None,
                "items": [],
            }
        s["items"].append(item)

    parts = db.scalars(
        select(Participation)
        .join(Training, Participation.training_id == Training.id)
        .join(User, Participation.user_id == User.id)
        .options(joinedload(Participation.training), joinedload(Participation.user).joinedload(User.department))
        .where(
            Participation.attendance == AttendanceStatus.PENDING,
            Training.start_date <= now,
            User.status == StaffStatus.ACTIVE,
        )
    ).all()
    for p in parts:
        t = p.training
        add(
            p.user,
            {
                "type": "training",
                "trainingId": t.id,
                "participationId": p.id,
                "code": t.training_code,
                "title": t.title,
                "startDate": value(t.start_date),
                "endDate": value(t.end_date),
                "daysOutstanding": max(0, (now - t.end_date).days),
                "href": f"/training/public/{t.id}",
            },
        )

    ojt_parts = db.scalars(
        select(ParticipateOjt)
        .join(Ojt, ParticipateOjt.ojt_id == Ojt.id)
        .join(User, ParticipateOjt.user_id == User.id)
        .options(joinedload(ParticipateOjt.ojt), joinedload(ParticipateOjt.user).joinedload(User.department))
        .where(
            ParticipateOjt.attendance == AttendanceStatus.PENDING,
            Ojt.start_date <= now,
            User.status == StaffStatus.ACTIVE,
        )
    ).all()
    for p in ojt_parts:
        o = p.ojt
        add(
            p.user,
            {
                "type": "ojt",
                "trainingId": o.id,
                "participationId": p.id,
                "code": o.training_code,
                "title": o.title,
                "startDate": value(o.start_date),
                "endDate": value(o.end_date),
                "daysOutstanding": max(0, (now - o.end_date).days),
                "href": f"/training/ojt/{o.id}",
            },
        )

    departments: dict[int | None, dict] = {}
    for s in sorted(staff.values(), key=lambda s: s["staffName"]):
        s["items"].sort(key=lambda i: i["startDate"])
        d = departments.setdefault(
            s["departmentId"],
            {"id": s["departmentId"], "name": s["department"] or "(No department)", "staff": [], "pendingCount": 0},
        )
        d["staff"].append(s)
        d["pendingCount"] += len(s["items"])
    result = sorted(departments.values(), key=lambda d: (d["id"] is None, d["name"]))
    return {
        "departments": result,
        "totalStaff": len(staff),
        "totalPending": sum(d["pendingCount"] for d in result),
    }
