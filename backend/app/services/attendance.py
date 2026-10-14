"""Partial attendance on multi-day Public/Inhouse trainings.

Participation.attended_days lists the day numbers (1 = start date) the participant came;
None means every day. Hours and day counts everywhere go through these helpers.
"""

from app.models import Participation, Training
from app.services.util import compute_days, compute_hours


def training_days(t: Training) -> int:
    return compute_days(t.start_date, t.end_date)


def attended_day_numbers(p: Participation, t: Training | None = None) -> list[int]:
    """Days attended, ignoring any that no longer exist (e.g. the training was shortened later)."""
    total = training_days(t or p.training)
    if p.attended_days is None:
        return list(range(1, total + 1))
    days = sorted({d for d in p.attended_days if 1 <= d <= total})
    return days or list(range(1, total + 1))


def attended_day_count(p: Participation, t: Training | None = None) -> int:
    return len(attended_day_numbers(p, t))


def participant_hours(p: Participation, t: Training | None = None) -> float:
    t = t or p.training
    return attended_day_count(p, t) * compute_hours(t.start_time, t.end_time)
