"""Reads multipart/urlencoded form posts the same way the Next.js server actions read FormData.

The frontend's server actions forward their FormData unchanged, so each
endpoint keeps the original field names and parsing rules.
"""

from datetime import datetime
from typing import Annotated

from fastapi import Depends, HTTPException, Request
from starlette.datastructures import FormData, UploadFile


async def _get_form(request: Request) -> FormData:
    return await request.form(max_files=50, max_fields=5000)


Form = Annotated[FormData, Depends(_get_form)]


def fstr(form: FormData, key: str) -> str:
    """String(formData.get(key) ?? "")"""
    v = form.get(key)
    return "" if v is None or isinstance(v, UploadFile) else str(v)


def fopt(form: FormData, key: str) -> str | None:
    """trimmed value, or None when blank"""
    v = fstr(form, key).strip()
    return v or None


def fnum(form: FormData, key: str) -> float | None:
    """Number(value), or None when blank / not a number."""
    v = fstr(form, key).strip()
    if not v:
        return None
    try:
        return float(v)
    except ValueError:
        return None


def fint(form: FormData, key: str) -> int | None:
    n = fnum(form, key)
    return int(n) if n is not None else None


def fall(form: FormData, key: str) -> list[str]:
    """formData.getAll(key) (string values only)"""
    return [str(v) for v in form.getlist(key) if not isinstance(v, UploadFile)]


def fall_int(form: FormData, key: str) -> list[int]:
    out = []
    for v in fall(form, key):
        try:
            f = float(v)
        except ValueError:
            continue
        if f.is_integer():
            out.append(int(f))
    return out


def ffile(form: FormData, key: str) -> UploadFile | None:
    """Uploaded file, or None if absent/empty."""
    v = form.get(key)
    if isinstance(v, UploadFile) and v.filename and (v.size is None or v.size > 0):
        return v
    return None


def fdate(form: FormData, key: str) -> datetime | None:
    """new Date("yyyy-mm-dd") -> UTC midnight; also accepts full ISO strings."""
    v = fstr(form, key).strip()
    return parse_date(v) if v else None


def parse_date(v: str) -> datetime:
    try:
        d = datetime.fromisoformat(v.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(400, f"Invalid date: {v}")
    if d.tzinfo is not None:
        from datetime import UTC

        d = d.astimezone(UTC).replace(tzinfo=None)
    return d


def bad(msg: str) -> HTTPException:
    """Same effect as `throw new Error(msg)` in a server action: the message is shown to the user."""
    return HTTPException(400, msg)
