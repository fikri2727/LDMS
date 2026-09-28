"""Public / Inhouse training, My Training, E-Learning hours, training certificates.
Ported from ldms-web: app/(app)/training/public/actions.ts, training/page.tsx,
training/public/**/page.tsx, training/elearning-hours/page.tsx, api/certificates/[id]."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import joinedload, selectinload

from app.deps import DB, CurrentUser, require
from app.forms import Form, bad, fdate, ffile, fint, fnum, fstr
from app.models import (
    AttendanceStatus,
    Certificate,
    ElearningAssignment,
    ElearningCompletion,
    ElearningModule,
    Ojt,
    ParticipateOjt,
    Participation,
    Platform,
    StaffStatus,
    Training,
    TrainingFunction,
    TrainingProgram,
    User,
)
from app.rbac import can_manage_training
from app.serialize import ser
from app.services.elearning import module_hours_map
from app.services.survey import apply_survey_answers
from app.services.uploads import delete_upload, file_response, save_upload
from app.services.util import generate_training_code

router = APIRouter(prefix="/api/training", tags=["training"])

TrainingAdmin = Annotated[
    User, Depends(require(can_manage_training, "You do not have permission to manage training records."))
]


def _get_training(db: DB, training_id: int) -> Training:
    t = db.get(Training, training_id)
    if t is None:
        raise HTTPException(404, "Training not found.")
    return t


def _get_participation(db: DB, training_id: int, participation_id: int) -> Participation:
    p = db.get(Participation, participation_id)
    if p is None or p.training_id != training_id:
        raise HTTPException(404, "Participant not found.")
    return p


def _enum(cls, raw: str, label: str):
    try:
        return cls(raw)
    except ValueError:
        raise bad(f"Please select a valid {label}.")


def _read_training_fields(form) -> dict:
    title = fstr(form, "title").strip().upper()
    program = fstr(form, "program")
    venue = fstr(form, "venue").strip().upper()
    if not title or not program or not venue:
        raise bad("Title, Program, and Venue are required.")
    start, end = fdate(form, "startDate"), fdate(form, "endDate")
    if start is None or end is None:
        raise bad("Start and end dates are required.")
    return {
        "title": title,
        "program": _enum(TrainingProgram, program, "program"),
        "cost": fnum(form, "cost") or 0,
        "platform": _enum(Platform, fstr(form, "platform"), "platform"),
        "function": _enum(TrainingFunction, fstr(form, "function"), "function"),
        "venue": venue,
        "hrdc_claimable": fstr(form, "hrdcClaimable") == "on",
        "start_date": start,
        "end_date": end,
        "start_time": fstr(form, "startTime") or "09:00",
        "end_time": fstr(form, "endTime") or "17:00",
        "trainer": fstr(form, "trainer").strip().upper(),
    }


# ---------- Page data ----------


@router.get("/my")
def my_training(db: DB, user: CurrentUser):
    """Everything on the staff member's "My Training" page (Public/Inhouse, OJT, E-Learning)."""
    parts = db.scalars(
        select(Participation).options(joinedload(Participation.training)).where(Participation.user_id == user.id)
    ).all()
    ojt_parts = db.scalars(
        select(ParticipateOjt).options(joinedload(ParticipateOjt.ojt)).where(ParticipateOjt.user_id == user.id)
    ).all()
    assignments = db.scalars(
        select(ElearningAssignment)
        .options(joinedload(ElearningAssignment.module))
        .where(ElearningAssignment.user_id == user.id)
        .order_by(ElearningAssignment.created_at.desc())
    ).all()
    completions = db.scalars(
        select(ElearningCompletion)
        .options(joinedload(ElearningCompletion.certificate))
        .where(ElearningCompletion.user_id == user.id)
    ).all()
    module_ids = {a.module_id for a in assignments} | {c.module_id for c in completions}
    modules = {m.id: m for m in db.scalars(select(ElearningModule).where(ElearningModule.id.in_(module_ids))).all()}

    trainings = []
    for p in sorted(parts, key=lambda p: p.training.start_date, reverse=True):
        row = ser(p.training)
        row["participations"] = [ser(p)]
        trainings.append(row)
    ojts = []
    for p in sorted(ojt_parts, key=lambda p: p.ojt.start_date, reverse=True):
        row = ser(p.ojt)
        row["participants"] = [ser(p)]
        ojts.append(row)
    return {
        "trainings": trainings,
        "ojts": ojts,
        "elearningAssignments": [{**ser(a), "module": ser(a.module)} for a in assignments],
        "elearningCompletions": [
            {**ser(c), "certificate": ser(c.certificate), "module": ser(modules.get(c.module_id))} for c in completions
        ],
        "moduleHours": {str(k): v for k, v in module_hours_map(db, module_ids).items()},
    }


@router.get("/public")
def public_list(db: DB, user: CurrentUser):
    manage = can_manage_training(user)
    if not manage:
        trainings = db.scalars(
            select(Training)
            .where(Training.participations.any(Participation.user_id == user.id))
            .order_by(Training.start_date.desc())
        ).all()
        return {"trainings": ser(trainings), "ojts": []}

    trainings = db.scalars(
        select(Training)
        .options(
            selectinload(Training.participations).selectinload(Participation.pme),
            selectinload(Training.participations).selectinload(Participation.user).selectinload(User.department),
        )
        .order_by(Training.start_date.desc())
    ).all()
    ojts = db.scalars(
        select(Ojt)
        .options(selectinload(Ojt.participants).selectinload(ParticipateOjt.user))
        .order_by(Ojt.start_date.desc())
    ).all()
    return {
        "trainings": ser(trainings, {"participations": {"pme": True, "user": {"department": True}}}),
        "ojts": ser(ojts, {"participants": {"user": True}}),
    }


@router.get("/public/{training_id}")
def training_detail(training_id: int, db: DB, user: CurrentUser):
    t = db.scalar(
        select(Training)
        .options(
            selectinload(Training.participations).selectinload(Participation.user).selectinload(User.department),
            selectinload(Training.participations).selectinload(Participation.pme),
            selectinload(Training.certificates).selectinload(Certificate.uploaded_by),
        )
        .where(Training.id == training_id)
    )
    if t is None:
        raise HTTPException(404, "Training not found.")
    manage = can_manage_training(user)

    out = ser(t)
    participations = sorted(t.participations, key=lambda p: p.user.staff_name)
    # Regular staff only receive their own participation row — not the full roster.
    visible = participations if manage else [p for p in participations if p.user_id == user.id]
    out["participations"] = ser(visible, {"user": {"department": True}, "pme": True})
    out["certificates"] = ser(
        sorted(t.certificates, key=lambda c: c.uploaded_at, reverse=True), {"uploadedBy": ("id", "staffNo", "staffName")}
    )

    staff_options = []
    if manage:
        existing = {p.user_id for p in t.participations}
        staff_options = [
            o
            for o in ser(
                db.scalars(select(User).where(User.status == StaffStatus.ACTIVE).order_by(User.staff_name)).all(),
                ("id", "staffNo", "staffName"),
            )
            if o["id"] not in existing
        ]
    return {"training": out, "staffOptions": staff_options}


@router.get("/public/{training_id}/basic")
def training_basic(training_id: int, db: DB, _: TrainingAdmin):
    """The training's own fields, for the Edit form."""
    return ser(_get_training(db, training_id))


@router.get("/public/{training_id}/participations/{participation_id}")
def participation_detail(training_id: int, participation_id: int, db: DB, user: CurrentUser):
    """Survey page: only the participant themself or a training admin."""
    p = db.scalar(
        select(Participation)
        .options(joinedload(Participation.training), joinedload(Participation.user))
        .where(Participation.id == participation_id)
    )
    if p is None or p.training_id != training_id:
        raise HTTPException(404, "Not found.")
    if p.user_id != user.id and not can_manage_training(user):
        raise HTTPException(403, "You do not have permission to view this survey.")
    return ser(p, {"training": True, "user": ("id", "staffNo", "staffName")})


@router.get("/elearning-hours")
def elearning_hours(db: DB, _: TrainingAdmin):
    completions = db.scalars(
        select(ElearningCompletion).order_by(ElearningCompletion.completed_at.desc())
    ).all()
    users = {
        u.id: u
        for u in db.scalars(
            select(User).options(joinedload(User.department)).where(User.id.in_({c.user_id for c in completions}))
        ).all()
    }
    module_ids = {c.module_id for c in completions}
    modules = {m.id: m for m in db.scalars(select(ElearningModule).where(ElearningModule.id.in_(module_ids))).all()}
    hours = module_hours_map(db, module_ids)
    return [
        {
            "id": c.id,
            "staffNo": users[c.user_id].staff_no,
            "staffName": users[c.user_id].staff_name,
            "department": users[c.user_id].department.name if users[c.user_id].department else "—",
            "moduleId": c.module_id,
            "moduleTitle": modules[c.module_id].title,
            "completedAt": ser(c)["completedAt"],
            "score": c.final_score,
            "hours": hours[c.module_id],
        }
        for c in completions
    ]


# ---------- Actions ----------


@router.post("/public")
def create_training(form: Form, db: DB, session: TrainingAdmin):
    fields = _read_training_fields(form)
    t = Training(**fields, training_code="", created_by_user_id=session.id)
    db.add(t)
    db.flush()
    t.training_code = generate_training_code(fields["program"].value, t.id, fields["start_date"])
    db.commit()
    return {"id": t.id}


@router.post("/public/{training_id}")
def update_training(training_id: int, form: Form, db: DB, _: TrainingAdmin):
    fields = _read_training_fields(form)
    t = _get_training(db, training_id)
    for k, v in fields.items():
        setattr(t, k, v)
    db.commit()
    return {"ok": True}


@router.delete("/public/{training_id}")
def delete_training(training_id: int, db: DB, _: TrainingAdmin):
    db.delete(_get_training(db, training_id))
    db.commit()
    return {"ok": True}


@router.post("/public/{training_id}/participants")
def add_participant(training_id: int, form: Form, db: DB, _: TrainingAdmin):
    user_id = fint(form, "userId")
    if not user_id:
        raise bad("Please select a staff member.")
    _get_training(db, training_id)
    if db.scalar(select(Participation.id).where(Participation.training_id == training_id, Participation.user_id == user_id)):
        raise bad("This staff member is already a participant.")
    db.add(Participation(training_id=training_id, user_id=user_id))
    db.commit()
    return {"ok": True}


@router.delete("/public/{training_id}/participants/{participation_id}")
def remove_participant(training_id: int, participation_id: int, db: DB, _: TrainingAdmin):
    db.delete(_get_participation(db, training_id, participation_id))
    db.commit()
    return {"ok": True}


@router.post("/public/{training_id}/participants/{participation_id}/absent")
def mark_absent(training_id: int, participation_id: int, db: DB, _: TrainingAdmin):
    _get_participation(db, training_id, participation_id).attendance = AttendanceStatus.ABSENT
    db.commit()
    return {"ok": True}


@router.post("/public/{training_id}/participants/{participation_id}/survey")
def submit_survey(training_id: int, participation_id: int, form: Form, db: DB, user: CurrentUser):
    p = _get_participation(db, training_id, participation_id)
    # Only the participant themself (or a training admin) may submit their evaluation.
    if p.user_id != user.id and not can_manage_training(user):
        raise HTTPException(403, "You do not have permission to submit this evaluation.")
    apply_survey_answers(db, p, form)
    db.commit()
    return {"ok": True}


@router.post("/public/{training_id}/certificates")
async def upload_certificate(training_id: int, form: Form, db: DB, session: TrainingAdmin):
    file = ffile(form, "file")
    if file is None:
        raise bad("Please choose a file to upload.")
    _get_training(db, training_id)
    path = await save_upload("certificates", file)
    db.add(Certificate(training_id=training_id, file_name=file.filename, file_path=path, uploaded_by_user_id=session.id))
    db.commit()
    return {"ok": True}


@router.delete("/public/{training_id}/certificates/{certificate_id}")
def delete_certificate(training_id: int, certificate_id: int, db: DB, _: TrainingAdmin):
    cert = db.get(Certificate, certificate_id)
    if cert is None or cert.training_id != training_id:
        raise HTTPException(404, "Certificate not found.")
    path = cert.file_path
    db.delete(cert)
    db.commit()
    delete_upload(path)
    return {"ok": True}


@router.get("/certificates/{certificate_id}/file")
def download_certificate(certificate_id: int, db: DB, _: CurrentUser):
    cert = db.get(Certificate, certificate_id)
    if cert is None:
        raise HTTPException(404, "Not found")
    return file_response(cert.file_path, cert.file_name, "application/octet-stream")
