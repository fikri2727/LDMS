"""Prisma-style JSON serialization of SQLAlchemy rows.

`ser(user, {"department": True, "supervisor": ("staffNo", "staffName")})`
returns the same shape Prisma's `include`/`select` gave the Next.js pages:
camelCase keys (the real DB column names), nested relations, ISO dates.

Include spec values:
  True                     -> the related row(s), all columns
  {..nested spec..}        -> all columns + nested includes
  ("colA", "colB")         -> only these columns (Prisma `select`)
  Sel(only=(...), include={...}) -> both
"""

import enum
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any

from pydantic.alias_generators import to_snake
from sqlalchemy import inspect as sa_inspect

HIDDEN_COLUMNS = {"password"}


@dataclass
class Sel:
    only: tuple[str, ...] | None = None
    include: dict[str, Any] = field(default_factory=dict)


def value(v: Any) -> Any:
    if isinstance(v, datetime):
        # Stored as naive UTC (Prisma convention) -> ISO with Z so JS Date parses it as UTC.
        return v.isoformat(timespec="milliseconds") + "Z"
    if isinstance(v, date):
        return v.isoformat()
    if isinstance(v, enum.Enum):
        return v.value
    return v


def _normalize(spec: Any) -> Sel:
    if spec is True or spec is None:
        return Sel()
    if isinstance(spec, Sel):
        return spec
    if isinstance(spec, dict):
        return Sel(include=spec)
    if isinstance(spec, (tuple, list, set)):
        return Sel(only=tuple(spec))
    raise TypeError(f"Bad include spec: {spec!r}")


def ser(obj: Any, spec: Any = None) -> Any:
    if obj is None:
        return None
    if isinstance(obj, (list, tuple)):
        return [ser(o, spec) for o in obj]

    sel = _normalize(spec)
    mapper = sa_inspect(obj).mapper
    out: dict[str, Any] = {}
    for col in mapper.columns:
        key = col.name
        if key in HIDDEN_COLUMNS or (sel.only is not None and key not in sel.only):
            continue
        out[key] = value(getattr(obj, mapper.get_property_by_column(col).key))

    for rel_name, rel_spec in sel.include.items():
        out[rel_name] = ser(getattr(obj, to_snake(rel_name)), rel_spec)
    return out
