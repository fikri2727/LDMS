"""Password hashing and the signed login cookie.

Passwords: bcrypt, compatible with the hashes bcryptjs wrote from ldms-web,
so existing staff keep their passwords.

Session: the cookie holds only the user id (signed + timestamped, so it can't
be forged or edited). The user's role/HOD flag/department are re-read from the
database on every request, so role changes take effect immediately instead of
after the next login.
"""

import bcrypt
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.config import get_settings

DEFAULT_STAFF_PASSWORD = "P@ss1234"
"""Password assigned to new staff records and used by the admin "Reset Password" action."""

COOKIE_NAME = "ldms_session"
DEFAULT_MAX_AGE = 60 * 60 * 24 * 7  # 7 days
REMEMBER_MAX_AGE = 60 * 60 * 24 * 30  # "Remember me": 30 days


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=10)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except ValueError:
        # Malformed/legacy hash
        return False


def _serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(get_settings().session_secret, salt="ldms-session")


def create_session_token(user_id: int, max_age: int) -> str:
    return _serializer().dumps({"uid": user_id, "ma": max_age})


def read_session_token(token: str) -> int | None:
    """Returns the user id, or None if the cookie is missing, tampered with, or expired."""
    s = _serializer()
    try:
        data = s.loads(token, max_age=REMEMBER_MAX_AGE)
        # Enforce the shorter lifetime for sessions created without "remember me".
        s.loads(token, max_age=int(data.get("ma", DEFAULT_MAX_AGE)))
        return int(data["uid"])
    except (BadSignature, SignatureExpired, KeyError, TypeError, ValueError):
        return None
