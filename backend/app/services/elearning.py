"""Ported from ldms-web/src/lib/elearning.ts."""

import math

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    ElearningCertificate,
    ElearningCompletion,
    ElearningLesson,
    ElearningLessonProgress,
    ElearningQuizAttempt,
    LessonType,
)
from app.services.util import js_round, now_utc

AVG_READING_WPM = 200
DEFAULT_VIDEO_MINUTES = 10  # video length isn't tracked, so this is a flat per-video estimate
DEFAULT_QUIZ_MINUTES_PER_QUESTION = 1
MIN_QUIZ_MINUTES = 5


def generate_certificate_no(id_: int, year: int | None = None) -> str:
    return f"CERT-{year or now_utc().year}-{id_:05d}"


def estimate_lesson_minutes(
    type_: LessonType | str, slide_content: str | None, time_limit_minutes: int | None, question_count: int
) -> int:
    """Auto-estimated minutes for a single lesson — no manual duration entry required."""
    t = LessonType(type_)
    if t == LessonType.SLIDE:
        words = len((slide_content or "").split())
        return max(1, math.ceil(words / AVG_READING_WPM))
    if t == LessonType.VIDEO:
        return DEFAULT_VIDEO_MINUTES
    if time_limit_minutes:
        return time_limit_minutes
    return max(MIN_QUIZ_MINUTES, question_count * DEFAULT_QUIZ_MINUTES_PER_QUESTION)


def module_hours_map(db: Session, module_ids: list[int] | set[int]) -> dict[int, float]:
    """Auto-calculated total training hours for each module, summed from its lessons (batched)."""
    ids = list(module_ids)
    if not ids:
        return {}
    lessons = db.scalars(
        select(ElearningLesson).options(selectinload(ElearningLesson.questions)).where(ElearningLesson.module_id.in_(ids))
    ).all()
    minutes: dict[int, int] = {i: 0 for i in ids}
    for l in lessons:
        minutes[l.module_id] += estimate_lesson_minutes(l.type, l.slide_content, l.time_limit_minutes, len(l.questions))
    return {mid: js_round(m / 60, 2) for mid, m in minutes.items()}


def get_module_estimated_hours(db: Session, module_id: int) -> float:
    return module_hours_map(db, [module_id])[module_id]


def get_module_progress(db: Session, module_id: int, user_id: int) -> dict:
    lesson_ids = db.scalars(select(ElearningLesson.id).where(ElearningLesson.module_id == module_id)).all()
    if not lesson_ids:
        return {"totalLessons": 0, "completedLessons": 0, "percent": 0}
    done = set(
        db.scalars(
            select(ElearningLessonProgress.lesson_id).where(
                ElearningLessonProgress.user_id == user_id,
                ElearningLessonProgress.lesson_id.in_(lesson_ids),
                ElearningLessonProgress.completed.is_(True),
            )
        ).all()
    ) | set(
        db.scalars(
            select(ElearningQuizAttempt.lesson_id).where(
                ElearningQuizAttempt.user_id == user_id,
                ElearningQuizAttempt.lesson_id.in_(lesson_ids),
                ElearningQuizAttempt.passed.is_(True),
            )
        ).all()
    )
    completed = sum(1 for i in lesson_ids if i in done)
    return {
        "totalLessons": len(lesson_ids),
        "completedLessons": completed,
        "percent": int(js_round(completed / len(lesson_ids) * 100)),
    }


def maybe_complete_module(db: Session, module_id: int, user_id: int) -> None:
    """If every lesson is complete for this user (slide/video marked complete, quiz passed),
    create the ElearningCompletion and issue a certificate. No-op if already done or not eligible."""
    existing = db.scalar(
        select(ElearningCompletion).where(ElearningCompletion.module_id == module_id, ElearningCompletion.user_id == user_id)
    )
    if existing:
        return
    lessons = db.scalars(select(ElearningLesson).where(ElearningLesson.module_id == module_id)).all()
    if not lessons:
        return
    ids = [l.id for l in lessons]
    progress = {
        p.lesson_id: p
        for p in db.scalars(
            select(ElearningLessonProgress).where(
                ElearningLessonProgress.user_id == user_id, ElearningLessonProgress.lesson_id.in_(ids)
            )
        ).all()
    }
    attempts = db.scalars(
        select(ElearningQuizAttempt)
        .where(ElearningQuizAttempt.user_id == user_id, ElearningQuizAttempt.lesson_id.in_(ids))
        .order_by(ElearningQuizAttempt.submitted_at.desc())
    ).all()
    latest_attempt: dict[int, ElearningQuizAttempt] = {}
    for a in attempts:
        latest_attempt.setdefault(a.lesson_id, a)

    quiz_scores: list[float] = []
    for lesson in lessons:
        if lesson.type == LessonType.QUIZ:
            if not any(a.lesson_id == lesson.id and a.passed for a in attempts):
                return
            if lesson.id in latest_attempt:
                quiz_scores.append(latest_attempt[lesson.id].score)
        else:
            p = progress.get(lesson.id)
            if not (p and p.completed):
                return

    final_score = js_round(sum(quiz_scores) / len(quiz_scores), 2) if quiz_scores else 100
    completion = ElearningCompletion(module_id=module_id, user_id=user_id, final_score=final_score)
    db.add(completion)
    db.flush()
    db.add(
        ElearningCertificate(
            certificate_no=generate_certificate_no(completion.id),
            completion_id=completion.id,
            module_id=module_id,
            user_id=user_id,
            score=final_score,
        )
    )
    db.flush()

