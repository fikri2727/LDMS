from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from app.models import Designation, RoleType


class CamelModel(BaseModel):
    """Python snake_case fields, camelCase JSON — matches what the React frontend already uses."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class LoginIn(CamelModel):
    staff_no: str
    password: str
    remember: bool = False


class ChangePasswordIn(CamelModel):
    new_password: str
    confirm_password: str


class SessionOut(CamelModel):
    """Same fields as ldms-web's SessionData, plus the permission flags."""

    user_id: int
    staff_no: str
    staff_name: str
    role_type: RoleType
    is_hod: bool
    designation: Designation
    department_id: int | None
    department: str | None
    password_is_default: bool
    is_supervisor: bool
    permissions: dict[str, bool]
