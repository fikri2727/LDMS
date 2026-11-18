"""Employee Master Data: HR uploads the employee report; LDMS follows it (see services/employee_master.py)."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.deps import DB, require
from app.forms import Form, bad, ffile
from app.models import EmployeeMaster, EmployeeMasterImport, User
from app.rbac import can_manage_master
from app.serialize import value
from app.services.employee_master import (
    apply_plan,
    build_plan,
    parse_master_excel,
    plan_summary,
)

router = APIRouter(prefix="/api/employee-master", tags=["employee-master"])

MasterAdmin = Annotated[
    User, Depends(require(can_manage_master, "You do not have HR Master access."))
]


@router.get("")
def list_master(db: DB, _: MasterAdmin):
    rows = db.scalars(select(EmployeeMaster).order_by(EmployeeMaster.full_name)).all()
    names = {r.employee_no: r.full_name for r in rows}
    in_ldms = set(db.scalars(select(User.staff_no)).all())
    last = db.scalar(
        select(EmployeeMasterImport)
        .options(joinedload(EmployeeMasterImport.uploaded_by))
        .order_by(EmployeeMasterImport.uploaded_at.desc())
        .limit(1)
    )
    return {
        "lastImport": None
        if last is None
        else {
            "fileName": last.file_name,
            "uploadedAt": value(last.uploaded_at),
            "uploadedBy": last.uploaded_by.staff_name if last.uploaded_by else None,
            "summary": last.summary,
        },
        "rows": [
            {
                "employeeNo": r.employee_no,
                "fullName": r.full_name,
                "department": r.department,
                "jobPosition": r.job_position,
                "jobGrade": r.job_grade,
                "category": r.category,
                "employmentType": r.employment_type,
                "status": r.status,
                "supervisorNo": r.supervisor_no,
                "supervisorName": names.get(r.supervisor_no or ""),
                "dateJoined": value(r.date_joined),
                "inAppraisal": r.in_appraisal,
                "inLdms": r.employee_no in in_ldms,
            }
            for r in rows
        ],
    }


async def _plan(form, db, session):
    file = ffile(form, "file")
    if file is None:
        raise bad("Please choose the employee report (.xlsx) to upload.")
    rows = parse_master_excel(await file.read())
    return build_plan(db, rows, session), file.filename


@router.post("/preview")
async def preview(form: Form, db: DB, session: MasterAdmin):
    """What an upload would change. Writes nothing."""
    plan, _ = await _plan(form, db, session)
    return plan_summary(plan)


@router.post("/apply")
async def apply(form: Form, db: DB, session: MasterAdmin):
    plan, name = await _plan(form, db, session)
    return apply_plan(db, plan, session, name)
