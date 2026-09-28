"""Small helpers ported from ldms-web/src/lib/training-code.ts and friends."""

import math
from datetime import UTC, datetime


def js_round(x: float, digits: int = 0) -> float:
    """JavaScript Math.round semantics (half rounds up), unlike Python's banker's rounding."""
    m = 10**digits
    return math.floor(x * m + 0.5) / m


def now_utc() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def generate_training_code(program: str, id_: int, date: datetime | None = None) -> str:
    prefix = "PB" if program == "EXT" else "IN"
    return f"{prefix}{(date or now_utc()).strftime('%d%m%y')}{id_:05d}"


def generate_ojt_code(id_: int, date: datetime | None = None) -> str:
    return f"OJ{(date or now_utc()).strftime('%d%m%y')}{id_:05d}"


def compute_days(start: datetime, end: datetime) -> int:
    return math.floor((end - start).total_seconds() / 86400) + 1


def compute_hours(start_time: str, end_time: str) -> float:
    sh, sm = (int(x) for x in start_time.split(":")[:2])
    eh, em = (int(x) for x in end_time.split(":")[:2])
    return js_round(eh + em / 60 - (sh + sm / 60), 2)
