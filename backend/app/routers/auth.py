"""Login, logout, current session, change own password.

Ported from ldms-web: src/app/login/actions.ts, src/app/logout/actions.ts,
src/app/(app)/account/actions.ts.
"""

from fastapi import APIRouter, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.orm import joinedload

from app.config import get_settings
from app.deps import DB, CurrentUser
from app.models import StaffStatus, User
from app.rbac import permissions_for
from app.schemas import ChangePasswordIn, LoginIn, SessionOut
from app.security import (
    COOKIE_NAME,
    DEFAULT_MAX_AGE,
    DEFAULT_STAFF_PASSWORD,
    REMEMBER_MAX_AGE,
    create_session_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _session_out(db: DB, user: User) -> SessionOut:
    # Whether this user has at least one active direct report — gates the PME menu.
    is_supervisor = (
        db.scalar(
            select(func.count())
            .select_from(User)
            .where(User.supervisor_id == user.id, User.status == StaffStatus.ACTIVE)
        )
        or 0
    ) > 0
    return SessionOut(
        user_id=user.id,
        staff_no=user.staff_no,
        staff_name=user.staff_name,
        role_type=user.role_type,
        is_hod=user.is_hod,
        designation=user.designation,
        department_id=user.department_id,
        department=user.department.name if user.department else None,
        password_is_default=user.password_is_default,
        is_supervisor=is_supervisor,
        permissions=permissions_for(user),
    )


@router.post("/login", response_model=SessionOut)
def login(body: LoginIn, response: Response, db: DB):
    staff_no = body.staff_no.strip().upper()
    if not staff_no or not body.password:
        raise HTTPException(400, "Please enter your staff number and password.")

    user = db.scalar(select(User).options(joinedload(User.department)).where(User.staff_no == staff_no))
    if user is None or user.status == StaffStatus.RESIGN or not verify_password(body.password, user.password):
        raise HTTPException(401, "Invalid staff number or password.")

    max_age = REMEMBER_MAX_AGE if body.remember else DEFAULT_MAX_AGE
    response.set_cookie(
        COOKIE_NAME,
        create_session_token(user.id, max_age),
        max_age=max_age,
        httponly=True,
        samesite="lax",
        secure=get_settings().cookie_secure,
    )
    return _session_out(db, user)


@router.post("/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME)


@router.get("/me", response_model=SessionOut)
def me(user: CurrentUser, db: DB):
    return _session_out(db, user)


@router.post("/change-password", status_code=204)
def change_password(body: ChangePasswordIn, user: CurrentUser, db: DB):
    if not body.new_password or not body.confirm_password:
        raise HTTPException(400, "Please fill in all fields.")
    if len(body.new_password) < 6:
        raise HTTPException(400, "New password must be at least 6 characters.")
    if body.new_password != body.confirm_password:
        raise HTTPException(400, "New password and confirmation do not match.")

    user.password = hash_password(body.new_password)
    user.password_is_default = body.new_password == DEFAULT_STAFF_PASSWORD
    db.commit()
