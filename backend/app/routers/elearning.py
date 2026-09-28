"""E-Learning: module authoring, assignment, learner player, quiz grading, certificates.
Ported from ldms-web: app/(app)/elearning/admin/actions.ts, elearning/learner/actions.ts,
elearning/**/page.tsx, api/elearning/*/[id]/route.ts, lib/elearning.ts."""

import json
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import joinedload, selectinload

from app.deps import DB, CurrentUser, require
from app.forms import Form, bad, fall, fall_int, fdate, ffile, fint, fnum, fstr
from app.models import (
    Department,
    ElearningAssignment,
    ElearningCategory,
    ElearningCertificate,
    ElearningCompletion,
    ElearningLesson,
    ElearningLessonProgress,
    ElearningModule,
    ElearningOption,
    ElearningQuestion,
    ElearningQuizAttempt,
    LessonType,
    ModuleStatus,
    QuestionType,
    RoleType,
    StaffStatus,
    User,
)
from app.rbac import can_manage_elearning
from app.serialize import ser
from app.services.elearning import get_module_progress, maybe_complete_module, module_hours_map
from app.services.uploads import delete_upload, file_response, guess_mime_type, save_upload
from app.services.util import js_round, now_utc

router = APIRouter(prefix="/api/elearning", tags=["elearning"])

ElearningAdmin = Annotated[
    User, Depends(require(can_manage_elearning, "You do not have permission to manage e-learning modules."))
]


def _module(db: DB, module_id: int) -> ElearningModule:
    m = db.get(ElearningModule, module_id)
    if m is None:
        raise HTTPException(404, "Module not found.")
    return m


def _lesson(db: DB, lesson_id: int, module_id: int | None = None) -> ElearningLesson:
    l = db.get(ElearningLesson, lesson_id)
    if l is None or (module_id is not None and l.module_id != module_id):
        raise HTTPException(404, "Lesson not found.")
    return l


def _num_or(form, key: str, default: int) -> int:
    """JS `Number(x) || default`."""
    n = fnum(form, key)
    return int(n) if n else default


def _next_order(db: DB, col, where) -> int:
    return (db.scalar(select(func.max(col)).where(where)) or 0) + 1


# ======================= Admin: page data =======================


@router.get("/admin/analytics")
def analytics(db: DB, _: ElearningAdmin):
    published = db.scalars(
        select(ElearningModule)
        .options(
            joinedload(ElearningModule.category),
            selectinload(ElearningModule.assignments),
        )
        .where(ElearningModule.status == ModuleStatus.PUBLISHED)
        .order_by(ElearningModule.updated_at.desc())
    ).unique().all()
    published_ids = [m.id for m in published]
    completions = db.scalars(select(ElearningCompletion)).all()
    users = {u.id: u for u in db.scalars(select(User).where(User.id.in_({c.user_id for c in completions}))).all()}

    started: dict[int, set[int]] = {}
    if published_ids:
        rows = db.execute(
            select(ElearningLesson.module_id, ElearningLessonProgress.user_id)
            .join(ElearningLesson, ElearningLesson.id == ElearningLessonProgress.lesson_id)
            .where(ElearningLesson.module_id.in_(published_ids))
        ).all()
        for module_id, user_id in rows:
            started.setdefault(module_id, set()).add(user_id)

    avg = db.scalar(select(func.avg(ElearningQuizAttempt.score)))
    recent = db.scalars(
        select(ElearningCertificate)
        .options(joinedload(ElearningCertificate.user), joinedload(ElearningCertificate.module))
        .order_by(ElearningCertificate.issued_at.desc())
        .limit(5)
    ).all()

    completions_by_module: dict[int, list[ElearningCompletion]] = {}
    for c in completions:
        completions_by_module.setdefault(c.module_id, []).append(c)

    return {
        "registeredLearners": db.scalar(select(func.count()).select_from(User).where(User.status == StaffStatus.ACTIVE)),
        "publishedModules": len(published),
        "certificatesIssued": db.scalar(select(func.count()).select_from(ElearningCertificate)),
        "avgQuizScore": float(avg) if avg is not None else None,
        "publishedModuleList": [
            {
                **ser(m, {"category": True}),
                "assignments": [{"userId": a.user_id} for a in m.assignments],
                "completions": [
                    {"userId": c.user_id, "finalScore": c.final_score} for c in completions_by_module.get(m.id, [])
                ],
            }
            for m in published
        ],
        "startedByModule": {str(k): len(v) for k, v in started.items()},
        "recentCertificates": ser(recent, {"user": ("id", "staffNo", "staffName"), "module": True}),
        "allCompletions": [
            {**ser(c), "user": ser(users[c.user_id], ("id", "staffNo", "staffName"))} for c in completions
        ],
    }


@router.get("/categories")
def categories(db: DB, _: ElearningAdmin):
    return ser(db.scalars(select(ElearningCategory).order_by(ElearningCategory.name)).all())


@router.get("/modules/{module_id}")
def module_detail(module_id: int, db: DB, _: ElearningAdmin):
    m = db.scalar(
        select(ElearningModule)
        .options(
            joinedload(ElearningModule.category),
            selectinload(ElearningModule.lessons).selectinload(ElearningLesson.questions),
            selectinload(ElearningModule.assignments).joinedload(ElearningAssignment.user),
        )
        .where(ElearningModule.id == module_id)
    )
    if m is None:
        raise HTTPException(404, "Module not found.")
    out = ser(m, {"category": True})
    out["lessons"] = [
        {**ser(l), "questions": [{"id": q.id} for q in l.questions]} for l in sorted(m.lessons, key=lambda l: l.order)
    ]
    out["assignments"] = ser(
        sorted(m.assignments, key=lambda a: a.created_at, reverse=True), {"user": True}
    )
    out["completions"] = [
        {"userId": uid}
        for uid in db.scalars(select(ElearningCompletion.user_id).where(ElearningCompletion.module_id == module_id))
    ]
    return out


@router.get("/modules/{module_id}/basic")
def module_basic(module_id: int, db: DB, _: ElearningAdmin):
    return ser(_module(db, module_id))


@router.get("/modules/{module_id}/assign-options")
def assign_options(module_id: int, db: DB, _: ElearningAdmin):
    return {
        "module": ser(_module(db, module_id)),
        "staffOptions": ser(
            db.scalars(select(User).where(User.status == StaffStatus.ACTIVE).order_by(User.staff_name)).all(),
            ("id", "staffNo", "staffName"),
        ),
        "departmentOptions": ser(db.scalars(select(Department).order_by(Department.name)).all(), ("id", "name")),
    }


@router.get("/lessons/{lesson_id}")
def lesson_admin(lesson_id: int, db: DB, _: ElearningAdmin):
    """Full lesson incl. questions and correct answers — authoring view."""
    l = db.scalar(
        select(ElearningLesson)
        .options(
            selectinload(ElearningLesson.questions).selectinload(ElearningQuestion.options),
            joinedload(ElearningLesson.module),
        )
        .where(ElearningLesson.id == lesson_id)
    )
    if l is None:
        raise HTTPException(404, "Lesson not found.")
    return ser(l, {"questions": {"options": True}, "module": True})


# ======================= Admin: actions =======================


def _module_fields(form) -> dict:
    title = fstr(form, "title").strip()
    if not title:
        raise bad("Title is required.")
    return {
        "title": title,
        "category_id": fint(form, "categoryId"),
        "description": fstr(form, "description").strip() or None,
        "objectives": fstr(form, "objectives").strip() or None,
        "pass_threshold": _num_or(form, "passThreshold", 80),
    }


@router.post("/modules")
async def create_module(form: Form, db: DB, session: ElearningAdmin):
    fields = _module_fields(form)
    m = ElearningModule(**fields, created_by_user_id=session.id)
    bg = ffile(form, "certificateBackground")
    if bg:
        m.certificate_background_path = await save_upload("certificate-backgrounds", bg)
        m.certificate_background_name = bg.filename
    db.add(m)
    db.commit()
    return {"id": m.id}


@router.post("/modules/{module_id}")
async def update_module(module_id: int, form: Form, db: DB, _: ElearningAdmin):
    fields = _module_fields(form)
    m = _module(db, module_id)
    bg = ffile(form, "certificateBackground")
    if bg:
        if m.certificate_background_path:
            delete_upload(m.certificate_background_path)
        m.certificate_background_path = await save_upload("certificate-backgrounds", bg)
        m.certificate_background_name = bg.filename
    elif fstr(form, "removeCertificateBackground") == "on" and m.certificate_background_path:
        delete_upload(m.certificate_background_path)
        m.certificate_background_path = m.certificate_background_name = None
    for k, v in fields.items():
        setattr(m, k, v)
    db.commit()
    return {"ok": True}


@router.delete("/modules/{module_id}")
def delete_module(module_id: int, db: DB, _: ElearningAdmin):
    m = _module(db, module_id)
    bg = m.certificate_background_path
    db.delete(m)
    db.commit()
    if bg:
        delete_upload(bg)
    return {"ok": True}


@router.post("/modules/{module_id}/publish")
def publish_module(module_id: int, db: DB, _: ElearningAdmin):
    m = _module(db, module_id)
    if not db.scalar(select(func.count()).select_from(ElearningLesson).where(ElearningLesson.module_id == module_id)):
        raise bad("Add at least one lesson before publishing.")
    m.status, m.published_at = ModuleStatus.PUBLISHED, now_utc()
    db.commit()
    return {"ok": True}


@router.post("/modules/{module_id}/unpublish")
def unpublish_module(module_id: int, db: DB, _: ElearningAdmin):
    _module(db, module_id).status = ModuleStatus.DRAFT
    db.commit()
    return {"ok": True}


@router.post("/modules/{module_id}/archive")
def archive_module(module_id: int, db: DB, _: ElearningAdmin):
    _module(db, module_id).status = ModuleStatus.ARCHIVED
    db.commit()
    return {"ok": True}


@router.post("/categories")
def create_category(form: Form, db: DB, _: ElearningAdmin):
    name = fstr(form, "name").strip()
    if not name:
        raise bad("Category name is required.")
    if db.scalar(select(ElearningCategory.id).where(ElearningCategory.name == name)):
        raise bad(f'Category "{name}" already exists.')
    db.add(ElearningCategory(name=name))
    db.commit()
    return {"ok": True}


def _quiz_settings(form) -> dict:
    return {
        "pass_percent": _num_or(form, "passPercent", 80),
        "max_attempts": _num_or(form, "maxAttempts", 3),
        "randomize_questions": fstr(form, "randomizeQuestions") == "on",
        "randomize_options": fstr(form, "randomizeOptions") == "on",
        "show_correct_answers": fstr(form, "showCorrectAnswers") == "on",
        "show_explanation": fstr(form, "showExplanation") == "on",
        "time_limit_minutes": fint(form, "timeLimitMinutes") if fstr(form, "timeLimitMinutes") else None,
    }


async def _save_slide(file) -> dict:
    path = await save_upload("elearning-slides", file)
    return {
        "slide_file_name": file.filename,
        "slide_file_path": path,
        "slide_file_type": file.content_type or guess_mime_type(file.filename or ""),
    }


@router.post("/modules/{module_id}/lessons")
async def create_lesson(module_id: int, type: LessonType, form: Form, db: DB, _: ElearningAdmin):
    title = fstr(form, "title").strip()
    if not title:
        raise bad("Lesson title is required.")
    _module(db, module_id)

    lesson = ElearningLesson(
        module_id=module_id,
        type=type,
        title=title,
        order=_next_order(db, ElearningLesson.order, ElearningLesson.module_id == module_id),
    )
    if type == LessonType.SLIDE:
        lesson.slide_content = fstr(form, "slideContent").strip() or None
        f = ffile(form, "slideFile")
        if f:
            for k, v in (await _save_slide(f)).items():
                setattr(lesson, k, v)
    elif type == LessonType.VIDEO:
        video_url = fstr(form, "videoUrl").strip()
        f = ffile(form, "videoFile")
        if not video_url and not f:
            raise bad("Provide a video URL or upload a video file.")
        if f:
            lesson.video_file_path = await save_upload("elearning-videos", f)
            lesson.video_file_name = f.filename
        lesson.video_url = video_url or None
        lesson.video_description = fstr(form, "videoDescription").strip() or None
    else:
        for k, v in _quiz_settings(form).items():
            setattr(lesson, k, v)
    db.add(lesson)
    db.commit()
    return {"id": lesson.id}


@router.post("/modules/{module_id}/lessons/{lesson_id}")
async def update_lesson(module_id: int, lesson_id: int, type: LessonType, form: Form, db: DB, _: ElearningAdmin):
    title = fstr(form, "title").strip()
    if not title:
        raise bad("Lesson title is required.")
    lesson = _lesson(db, lesson_id, module_id)
    lesson.title = title

    if type == LessonType.SLIDE:
        f = ffile(form, "slideFile")
        if f:
            if lesson.slide_file_path:
                delete_upload(lesson.slide_file_path)
            for k, v in (await _save_slide(f)).items():
                setattr(lesson, k, v)
        elif fstr(form, "removeSlideFile") == "on" and lesson.slide_file_path:
            delete_upload(lesson.slide_file_path)
            lesson.slide_file_name = lesson.slide_file_path = lesson.slide_file_type = None
        lesson.slide_content = fstr(form, "slideContent").strip() or None
    elif type == LessonType.VIDEO:
        video_url = fstr(form, "videoUrl").strip()
        f = ffile(form, "videoFile")
        remove = fstr(form, "removeVideoFile") == "on"
        will_have_file = bool(f) or (bool(lesson.video_file_path) and not remove)
        if not video_url and not will_have_file:
            raise bad("Provide a video URL or upload a video file.")
        if f:
            if lesson.video_file_path:
                delete_upload(lesson.video_file_path)
            lesson.video_file_path = await save_upload("elearning-videos", f)
            lesson.video_file_name = f.filename
        elif remove and lesson.video_file_path:
            delete_upload(lesson.video_file_path)
            lesson.video_file_name = lesson.video_file_path = None
        lesson.video_url = video_url or None
        lesson.video_description = fstr(form, "videoDescription").strip() or None
    else:
        for k, v in _quiz_settings(form).items():
            setattr(lesson, k, v)
    db.commit()
    return {"ok": True}


@router.delete("/modules/{module_id}/lessons/{lesson_id}")
def delete_lesson(module_id: int, lesson_id: int, db: DB, _: ElearningAdmin):
    lesson = _lesson(db, lesson_id, module_id)
    files = [p for p in (lesson.slide_file_path, lesson.video_file_path) if p]
    db.delete(lesson)
    db.commit()
    for p in files:
        delete_upload(p)
    return {"ok": True}


@router.post("/modules/{module_id}/lessons/{lesson_id}/duplicate")
def duplicate_lesson(module_id: int, lesson_id: int, db: DB, _: ElearningAdmin):
    """Copies text/URL content, quiz settings, and questions. Uploaded files are not copied (same as before)."""
    src = db.scalar(
        select(ElearningLesson)
        .options(selectinload(ElearningLesson.questions).selectinload(ElearningQuestion.options))
        .where(ElearningLesson.id == lesson_id, ElearningLesson.module_id == module_id)
    )
    if src is None:
        raise HTTPException(404, "Lesson not found.")
    copy = ElearningLesson(
        module_id=module_id,
        type=src.type,
        title=f"{src.title} (Copy)",
        order=_next_order(db, ElearningLesson.order, ElearningLesson.module_id == module_id),
        slide_content=src.slide_content,
        video_url=src.video_url,
        video_description=src.video_description,
        pass_percent=src.pass_percent,
        max_attempts=src.max_attempts,
        randomize_questions=src.randomize_questions,
        randomize_options=src.randomize_options,
        show_correct_answers=src.show_correct_answers,
        show_explanation=src.show_explanation,
        time_limit_minutes=src.time_limit_minutes,
        questions=[
            ElearningQuestion(
                type=q.type,
                question=q.question,
                explanation=q.explanation,
                marks=q.marks,
                order=q.order,
                options=[ElearningOption(text=o.text, is_correct=o.is_correct, order=o.order) for o in q.options],
            )
            for q in src.questions
        ],
    )
    db.add(copy)
    db.commit()
    return {"ok": True}


@router.post("/modules/{module_id}/lessons/{lesson_id}/reorder")
def reorder_lesson(module_id: int, lesson_id: int, direction: Literal["up", "down"], db: DB, _: ElearningAdmin):
    lessons = db.scalars(
        select(ElearningLesson).where(ElearningLesson.module_id == module_id).order_by(ElearningLesson.order)
    ).all()
    idx = next((i for i, l in enumerate(lessons) if l.id == lesson_id), -1)
    swap = idx - 1 if direction == "up" else idx + 1
    if idx != -1 and 0 <= swap < len(lessons):
        a, b = lessons[idx], lessons[swap]
        a.order, b.order = b.order, a.order
        db.commit()
    return {"ok": True}


@router.post("/lessons/{lesson_id}/questions")
def add_question(lesson_id: int, form: Form, db: DB, _: ElearningAdmin):
    """Returns {"error": ...} for validation problems (the form shows it inline), like the original action."""
    _lesson(db, lesson_id)
    try:
        qtype = QuestionType(fstr(form, "type") or "SINGLE_CHOICE")
    except ValueError:
        return {"error": "Invalid question type."}
    question = fstr(form, "question").strip()
    if not question:
        return {"error": "Question text is required."}

    if qtype == QuestionType.TRUE_FALSE:
        correct = fstr(form, "trueFalseAnswer") or "true"
        options = [
            ElearningOption(text="True", is_correct=correct == "true", order=0),
            ElearningOption(text="False", is_correct=correct == "false", order=1),
        ]
    else:
        correct_idx = set(fall_int(form, "correctOption"))
        options = [
            ElearningOption(text=t.strip(), is_correct=i in correct_idx, order=i)
            for i, t in enumerate(fall(form, "optionText"))
            if t.strip()
        ]
        if len(options) < 2:
            return {"error": "Provide at least two answer options."}
        if not any(o.is_correct for o in options):
            return {"error": "Mark at least one option as correct."}

    db.add(
        ElearningQuestion(
            lesson_id=lesson_id,
            type=qtype,
            question=question,
            explanation=fstr(form, "explanation").strip() or None,
            marks=_num_or(form, "marks", 1),
            order=_next_order(db, ElearningQuestion.order, ElearningQuestion.lesson_id == lesson_id),
            options=options,
        )
    )
    db.commit()
    return {"ok": True}


@router.delete("/questions/{question_id}")
def delete_question(question_id: int, db: DB, _: ElearningAdmin):
    q = db.get(ElearningQuestion, question_id)
    if q is None:
        raise HTTPException(404, "Question not found.")
    db.delete(q)
    db.commit()
    return {"ok": True}


@router.post("/modules/{module_id}/assign")
def assign_module(module_id: int, form: Form, db: DB, session: ElearningAdmin):
    _module(db, module_id)
    target = fstr(form, "target") or "individual"
    if target == "individual":
        user_ids = fall_int(form, "userIds")
    elif target == "department":
        user_ids = list(
            db.scalars(
                select(User.id).where(User.department_id == fint(form, "departmentId"), User.status == StaffStatus.ACTIVE)
            )
        )
    elif target == "all":
        user_ids = list(db.scalars(select(User.id).where(User.status == StaffStatus.ACTIVE)))
    else:
        user_ids = []
    if not user_ids:
        raise bad("Select at least one learner.")

    due, start = fdate(form, "dueDate"), fdate(form, "startDate")
    mandatory = fstr(form, "mandatory") == "on"
    existing = {
        a.user_id: a
        for a in db.scalars(
            select(ElearningAssignment).where(
                ElearningAssignment.module_id == module_id, ElearningAssignment.user_id.in_(user_ids)
            )
        )
    }
    for uid in dict.fromkeys(user_ids):
        a = existing.get(uid)
        if a:
            a.due_date, a.start_date, a.mandatory = due, start, mandatory
        else:
            db.add(
                ElearningAssignment(
                    module_id=module_id,
                    user_id=uid,
                    assigned_by_user_id=session.id,
                    due_date=due,
                    start_date=start,
                    mandatory=mandatory,
                )
            )
    db.commit()
    return {"ok": True, "count": len(user_ids)}


@router.delete("/assignments/{assignment_id}")
def remove_assignment(assignment_id: int, db: DB, _: ElearningAdmin):
    a = db.get(ElearningAssignment, assignment_id)
    if a is None:
        raise HTTPException(404, "Assignment not found.")
    db.delete(a)
    db.commit()
    return {"ok": True}


# ======================= Learner =======================


def _playable_module(db: DB, module_id: int, user: User) -> ElearningModule:
    """A learner can only open published modules; e-learning admins can preview any."""
    m = db.scalar(
        select(ElearningModule).options(selectinload(ElearningModule.lessons)).where(ElearningModule.id == module_id)
    )
    if m is None or (m.status != ModuleStatus.PUBLISHED and not can_manage_elearning(user)):
        raise HTTPException(404, "Module not found.")
    return m


def _done_lesson_ids(db: DB, user_id: int, lesson_ids: list[int]) -> set[int]:
    if not lesson_ids:
        return set()
    done = set(
        db.scalars(
            select(ElearningLessonProgress.lesson_id).where(
                ElearningLessonProgress.user_id == user_id,
                ElearningLessonProgress.lesson_id.in_(lesson_ids),
                ElearningLessonProgress.completed.is_(True),
            )
        )
    )
    done |= set(
        db.scalars(
            select(ElearningQuizAttempt.lesson_id).where(
                ElearningQuizAttempt.user_id == user_id,
                ElearningQuizAttempt.lesson_id.in_(lesson_ids),
                ElearningQuizAttempt.passed.is_(True),
            )
        )
    )
    return done


@router.get("/learner/dashboard")
def learner_dashboard(db: DB, user: CurrentUser):
    if user.role_type == RoleType.ADMIN:
        raise HTTPException(403, "Admins have no learner dashboard.")
    assignments = db.scalars(
        select(ElearningAssignment)
        .options(joinedload(ElearningAssignment.module))
        .where(ElearningAssignment.user_id == user.id)
        .order_by(ElearningAssignment.due_date.asc().nulls_last())
    ).all()
    completions = db.scalars(
        select(ElearningCompletion).where(ElearningCompletion.user_id == user.id).order_by(ElearningCompletion.completed_at.desc())
    ).all()
    certificates = db.scalars(
        select(ElearningCertificate)
        .options(joinedload(ElearningCertificate.module))
        .where(ElearningCertificate.user_id == user.id)
        .order_by(ElearningCertificate.issued_at.desc())
    ).all()
    published = db.scalars(
        select(ElearningModule)
        .options(
            joinedload(ElearningModule.category),
            selectinload(ElearningModule.lessons),
            joinedload(ElearningModule.created_by),
        )
        .where(ElearningModule.status == ModuleStatus.PUBLISHED)
    ).unique().all()
    modules_by_id = {m.id: m for m in db.scalars(select(ElearningModule).where(
        ElearningModule.id.in_({c.module_id for c in completions}))).all()}
    completed_ids = {c.module_id for c in completions}
    assigned_ids = {a.module_id for a in assignments}

    return {
        "assignments": ser(assignments, {"module": True}),
        "completions": [{**ser(c), "module": ser(modules_by_id.get(c.module_id))} for c in completions],
        "certificates": ser(certificates, {"module": True}),
        "allPublished": [
            {
                **ser(m, {"category": True, "createdBy": ("staffName",)}),
                "lessons": [{"id": l.id} for l in m.lessons],
            }
            for m in published
        ],
        "estimatedHours": {str(k): v for k, v in module_hours_map(db, [m.id for m in published]).items()},
        "progress": {
            str(m.id): get_module_progress(db, m.id, user.id)
            for m in published
            if m.id in assigned_ids and m.id not in completed_ids
        },
    }


@router.get("/learner/modules/{module_id}")
def learner_module(module_id: int, db: DB, user: CurrentUser):
    """Module player sidebar: lessons, which are done, overall progress."""
    m = _playable_module(db, module_id, user)
    lessons = sorted(m.lessons, key=lambda l: l.order)
    completion = db.scalar(
        select(ElearningCompletion).where(ElearningCompletion.module_id == module_id, ElearningCompletion.user_id == user.id)
    )
    out = ser(m)
    out["lessons"] = ser(lessons)
    return {
        "module": out,
        "doneLessonIds": sorted(_done_lesson_ids(db, user.id, [l.id for l in lessons])),
        "completion": ser(completion),
        "progress": get_module_progress(db, module_id, user.id),
    }


@router.get("/learner/modules/{module_id}/lessons/{lesson_id}")
def learner_lesson(module_id: int, lesson_id: int, db: DB, user: CurrentUser):
    m = _playable_module(db, module_id, user)
    lessons = sorted(m.lessons, key=lambda l: l.order)
    if not any(l.id == lesson_id for l in lessons):
        raise HTTPException(404, "Lesson not found.")
    progress = db.scalar(
        select(ElearningLessonProgress).where(
            ElearningLessonProgress.lesson_id == lesson_id, ElearningLessonProgress.user_id == user.id
        )
    )
    return {"lessons": ser(lessons), "progress": ser(progress)}


@router.get("/learner/modules/{module_id}/quiz/{lesson_id}")
def learner_quiz(module_id: int, lesson_id: int, db: DB, user: CurrentUser):
    """Correct answers and explanations are only included once the learner has passed or used
    all attempts (the review screen) — never while they can still answer."""
    m = _playable_module(db, module_id, user)
    lesson = db.scalar(
        select(ElearningLesson)
        .options(selectinload(ElearningLesson.questions).selectinload(ElearningQuestion.options))
        .where(ElearningLesson.id == lesson_id)
    )
    if lesson is None or lesson.module_id != module_id or lesson.type != LessonType.QUIZ:
        raise HTTPException(404, "Quiz not found.")
    attempts = db.scalars(
        select(ElearningQuizAttempt)
        .where(ElearningQuizAttempt.lesson_id == lesson_id, ElearningQuizAttempt.user_id == user.id)
        .order_by(ElearningQuizAttempt.attempt_no.desc())
    ).all()
    passed = any(a.passed for a in attempts)
    can_retry = not passed and (lesson.max_attempts is None or len(attempts) < lesson.max_attempts)
    reviewing = passed or (len(attempts) > 0 and not can_retry)

    out = ser(lesson)
    out["questions"] = []
    for q in lesson.questions:
        qd = ser(q)
        if not reviewing:
            qd["explanation"] = None
        qd["options"] = [
            {**ser(o), "isCorrect": o.is_correct if reviewing else False}
            for o in sorted(q.options, key=lambda o: o.order)
        ]
        out["questions"].append(qd)
    return {
        "lesson": out,
        "attempts": ser(attempts),
        "lessons": ser(sorted(m.lessons, key=lambda l: l.order)),
    }


@router.post("/learner/modules/{module_id}/lessons/{lesson_id}/complete")
def mark_lesson_complete(module_id: int, lesson_id: int, db: DB, user: CurrentUser):
    _playable_module(db, module_id, user)
    _lesson(db, lesson_id, module_id)
    p = db.scalar(
        select(ElearningLessonProgress).where(
            ElearningLessonProgress.lesson_id == lesson_id, ElearningLessonProgress.user_id == user.id
        )
    )
    if p is None:
        p = ElearningLessonProgress(lesson_id=lesson_id, user_id=user.id)
        db.add(p)
    p.completed, p.completed_at = True, now_utc()
    db.flush()
    maybe_complete_module(db, module_id, user.id)
    db.commit()
    return {"ok": True}


@router.post("/learner/modules/{module_id}/quiz/{lesson_id}")
def submit_quiz(module_id: int, lesson_id: int, form: Form, db: DB, user: CurrentUser):
    _playable_module(db, module_id, user)
    lesson = db.scalar(
        select(ElearningLesson)
        .options(selectinload(ElearningLesson.questions).selectinload(ElearningQuestion.options))
        .where(ElearningLesson.id == lesson_id, ElearningLesson.module_id == module_id)
    )
    if lesson is None:
        raise HTTPException(404, "Quiz not found.")
    previous = db.scalar(
        select(func.count())
        .select_from(ElearningQuizAttempt)
        .where(ElearningQuizAttempt.lesson_id == lesson_id, ElearningQuizAttempt.user_id == user.id)
    )
    if lesson.max_attempts and previous >= lesson.max_attempts:
        raise bad("You have used all your attempts for this quiz.")

    earned = total = 0
    answer_log: dict[str, list[int]] = {}
    for q in lesson.questions:
        total += q.marks
        selected = fall_int(form, f"q_{q.id}")
        answer_log[str(q.id)] = selected
        correct = {o.id for o in q.options if o.is_correct}
        if correct == set(selected) and len(correct) == len(set(selected)):
            earned += q.marks

    score = js_round(earned / total * 100, 2) if total > 0 else 0
    passed = score >= (lesson.pass_percent if lesson.pass_percent is not None else 80)
    db.add(
        ElearningQuizAttempt(
            lesson_id=lesson_id,
            user_id=user.id,
            attempt_no=previous + 1,
            score=score,
            passed=passed,
            answers=json.dumps(answer_log, separators=(",", ":")),
        )
    )
    db.flush()
    if passed:
        maybe_complete_module(db, module_id, user.id)
    db.commit()
    return {"score": score, "passed": passed}


@router.get("/learner/certificates/{certificate_id}")
def certificate(certificate_id: int, db: DB, user: CurrentUser):
    c = db.scalar(
        select(ElearningCertificate)
        .options(joinedload(ElearningCertificate.module), joinedload(ElearningCertificate.user))
        .where(ElearningCertificate.id == certificate_id)
    )
    if c is None:
        raise HTTPException(404, "Certificate not found.")
    if c.user_id != user.id and not can_manage_elearning(user):
        raise HTTPException(403, "You do not have permission to view this certificate.")
    return ser(c, {"module": True, "user": ("id", "staffNo", "staffName")})


# ======================= Files =======================


@router.get("/lessons/{lesson_id}/file")
def lesson_file(lesson_id: int, db: DB, user: CurrentUser, kind: str | None = None):
    lesson = db.scalar(
        select(ElearningLesson).options(joinedload(ElearningLesson.module)).where(ElearningLesson.id == lesson_id)
    )
    # Same gate as the player: learners can't reach files of unpublished modules.
    if lesson is None or (lesson.module.status != ModuleStatus.PUBLISHED and not can_manage_elearning(user)):
        raise HTTPException(404, "Not found")
    if kind == "video":
        path, name, mime = lesson.video_file_path, lesson.video_file_name, None
    else:
        path, name, mime = lesson.slide_file_path, lesson.slide_file_name, lesson.slide_file_type
    if not path or not name:
        raise HTTPException(404, "Not found")
    return file_response(path, name, mime or guess_mime_type(name), "inline")


@router.get("/modules/{module_id}/certificate-background")
def certificate_background(module_id: int, db: DB, _: CurrentUser):
    m = db.get(ElearningModule, module_id)
    if m is None or not m.certificate_background_path or not m.certificate_background_name:
        raise HTTPException(404, "Not found")
    return file_response(
        m.certificate_background_path, m.certificate_background_name, guess_mime_type(m.certificate_background_name), "inline"
    )
