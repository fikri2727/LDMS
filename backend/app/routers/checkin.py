"""Public QR self check-in (NO login). Ported from ldms-web: app/checkin/actions.ts, checkin/ojt/actions.ts.

Staff enter their Staff ID and fill in their evaluation. The participation is always
re-derived from (training, staffNo) — never from a client-supplied participation id.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.deps import DB
from app.forms import Form, bad
from app.models import AttendanceStatus, Ojt, Training
from app.services.survey import (
    apply_ojt_survey_answers,
    apply_survey_answers,
    find_or_create_checkin_participation,
    find_or_create_ojt_checkin_participation,
)

router = APIRouter(prefix="/api/checkin", tags=["checkin"])

NOT_FOUND_MESSAGE = "Staff ID not recognised. Please check and try again, or see the training admin."


class VerifyIn(BaseModel):
    staffId: str = ""


def _verify(db: DB, finder, target_id: int, staff_id: str) -> dict:
    staff_no = staff_id.strip().upper()
    if not staff_no:
        return {"error": "Please enter your Staff ID."}
    result = finder(db, target_id, staff_no)
    if result is None:
        return {"error": NOT_FOUND_MESSAGE}
    participation, user = result
    db.commit()  # auto-enrollment
    if participation.attendance == AttendanceStatus.COMPLETED:
        return {"alreadyCompleted": True, "staffName": user.staff_name}
    return {"verified": True, "staffNo": user.staff_no, "staffName": user.staff_name}


def _title(db: DB, model, id_: int) -> dict:
    obj = db.get(model, id_)
    if obj is None:
        raise HTTPException(404, "Not found.")
    return {"id": obj.id, "title": obj.title}


@router.get("/training/{training_id}")
def training_info(training_id: int, db: DB):
    return _title(db, Training, training_id)


@router.post("/training/{training_id}/verify")
def verify_training(training_id: int, body: VerifyIn, db: DB):
    _title(db, Training, training_id)
    return _verify(db, find_or_create_checkin_participation, training_id, body.staffId)


@router.post("/training/{training_id}/survey")
def submit_training_survey(training_id: int, form: Form, db: DB):
    staff_no = str(form.get("staffNo") or "").strip().upper()
    result = find_or_create_checkin_participation(db, training_id, staff_no)
    if result is None:
        raise bad(NOT_FOUND_MESSAGE)
    participation, _ = result
    if participation.attendance == AttendanceStatus.COMPLETED:
        raise bad("This evaluation has already been submitted.")
    apply_survey_answers(db, participation, form)
    db.commit()
    return {"ok": True}


@router.get("/ojt/{ojt_id}")
def ojt_info(ojt_id: int, db: DB):
    return _title(db, Ojt, ojt_id)


@router.post("/ojt/{ojt_id}/verify")
def verify_ojt(ojt_id: int, body: VerifyIn, db: DB):
    _title(db, Ojt, ojt_id)
    return _verify(db, find_or_create_ojt_checkin_participation, ojt_id, body.staffId)


@router.post("/ojt/{ojt_id}/survey")
def submit_ojt_survey(ojt_id: int, form: Form, db: DB):
    staff_no = str(form.get("staffNo") or "").strip().upper()
    result = find_or_create_ojt_checkin_participation(db, ojt_id, staff_no)
    if result is None:
        raise bad(NOT_FOUND_MESSAGE)
    participation, _ = result
    if participation.attendance == AttendanceStatus.COMPLETED:
        raise bad("This evaluation has already been submitted.")
    apply_ojt_survey_answers(db, participation, form)
    db.commit()
    return {"ok": True}
