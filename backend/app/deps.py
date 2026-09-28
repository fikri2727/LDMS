from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models import StaffStatus, User
from app.security import COOKIE_NAME, read_session_token

DB = Annotated[Session, Depends(get_db)]


def get_current_user(request: Request, db: DB) -> User:
    """Replaces requireSession(): 401 if not logged in (the frontend redirects to /login)."""
    token = request.cookies.get(COOKIE_NAME)
    user_id = read_session_token(token) if token else None
    if user_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in.")

    user = db.scalar(select(User).options(joinedload(User.department)).where(User.id == user_id))
    if user is None or user.status == StaffStatus.RESIGN:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require(
    check: Callable[[User], bool], message: str = "You do not have permission to do this."
) -> Callable[[User], User]:
    """Route dependency that 403s unless the permission check passes.

    Usage:  AdminUser = Annotated[User, Depends(require(can_manage_staff, "..."))]
    """

    def dependency(user: CurrentUser) -> User:
        if not check(user):
            raise HTTPException(status.HTTP_403_FORBIDDEN, message)
        return user

    return dependency
