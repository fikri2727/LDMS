"""Role-based permission rules (ported 1:1 from ldms-web/src/lib/rbac.ts)."""

from app.models import RoleType, User


def can_manage_staff(u: User) -> bool:
    """Staff List module: manage staff records and org structure."""
    return u.role_type == RoleType.ADMIN


def can_manage_org(u: User) -> bool:
    """Only admins manage divisions/departments/sections and HOD assignment."""
    return u.role_type == RoleType.ADMIN


def can_manage_training(u: User) -> bool:
    """Create/edit/delete Public & Inhouse training sessions, manage participants."""
    return u.role_type == RoleType.ADMIN


def can_manage_ojt(u: User) -> bool:
    """OJT: Clerks can key in OJT sessions and participants on behalf of others."""
    return u.role_type in (RoleType.ADMIN, RoleType.CLERK)


def has_org_wide_view(u: User) -> bool:
    """Whether this user may view org-wide dashboard data vs. own department only."""
    return u.role_type == RoleType.ADMIN


def can_view_all_pme(u: User) -> bool:
    """Admin can view (read-only) any PME record — only the assigned supervisor fills it in."""
    return u.role_type == RoleType.ADMIN


def can_evaluate_on_behalf(u: User) -> bool:
    """Admin can fill in a pending Public/Inhouse survey or OJT evaluation for a participant, and a due
    PME for the staff member's supervisor (the supervisor's name stays as "Evaluated By")."""
    return u.role_type == RoleType.ADMIN


def can_manage_elearning(u: User) -> bool:
    """E-Learning: Admin and Creator build/manage modules — everyone else is a learner."""
    return u.role_type in (RoleType.ADMIN, RoleType.CREATOR)


def can_manage_tna(u: User) -> bool:
    """TNA: Admin sees every staff member's submissions and approves them."""
    return u.role_type == RoleType.ADMIN


def can_submit_tna(u: User) -> bool:
    """TNA: only HODs key in their own Training Need Analysis."""
    return u.is_hod


def can_review_requisitions(u: User) -> bool:
    """Requisition: HODs approve/reject applications from their own department's staff."""
    return u.is_hod


def can_view_all_requisitions(u: User) -> bool:
    """Requisition: Admin sees every application org-wide."""
    return u.role_type == RoleType.ADMIN


def permissions_for(u: User) -> dict[str, bool]:
    """All permission flags, sent to the frontend so it can show/hide menus and buttons."""
    return {
        "canManageStaff": can_manage_staff(u),
        "canManageOrg": can_manage_org(u),
        "canManageTraining": can_manage_training(u),
        "canManageOjt": can_manage_ojt(u),
        "hasOrgWideView": has_org_wide_view(u),
        "canViewAllPme": can_view_all_pme(u),
        "canEvaluateOnBehalf": can_evaluate_on_behalf(u),
        "canManageElearning": can_manage_elearning(u),
        "canManageTna": can_manage_tna(u),
        "canSubmitTna": can_submit_tna(u),
        "canReviewRequisitions": can_review_requisitions(u),
        "canViewAllRequisitions": can_view_all_requisitions(u),
    }
