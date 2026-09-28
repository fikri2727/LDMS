import type { SessionData } from "@/lib/session";

/** Staff List module: manage staff records and org structure. */
export function canManageStaff(session: SessionData) {
  return session.roleType === "ADMIN";
}

/** Only admins manage divisions/departments/sections and HOD assignment. */
export function canManageOrg(session: SessionData) {
  return session.roleType === "ADMIN";
}

/** Create/edit/delete Public & Inhouse training sessions, manage participants. */
export function canManageTraining(session: SessionData) {
  return session.roleType === "ADMIN";
}

/**
 * OJT: Clerk keeps this one carve-out even though it otherwise behaves like
 * Staff — they can key in OJT sessions and participants on behalf of others,
 * but the participant evaluates their own before/after skill survey.
 */
export function canManageOjt(session: SessionData) {
  return session.roleType === "ADMIN" || session.roleType === "CLERK";
}

/** Whether this session may view org-wide dashboard data vs. own department only. */
export function hasOrgWideView(session: SessionData) {
  return session.roleType === "ADMIN";
}

/**
 * Admin can view (read-only) any staff member's PME record for monitoring
 * purposes — only the assigned supervisor can actually fill it in.
 */
export function canViewAllPme(session: SessionData) {
  return session.roleType === "ADMIN";
}

/** E-Learning: Admin and Creator build/manage modules — everyone else is a learner. */
export function canManageElearning(session: SessionData) {
  return session.roleType === "ADMIN" || session.roleType === "CREATOR";
}

/** TNA: Admin sees every staff member's submissions and approves them. */
export function canManageTna(session: SessionData) {
  return session.roleType === "ADMIN";
}

/** TNA: only HODs key in their own Training Need Analysis — regular staff no longer submit one. */
export function canSubmitTna(session: SessionData) {
  return session.isHod;
}

/** Staff Training Requisition: HODs approve/reject applications from their own department's staff. */
export function canReviewRequisitions(session: SessionData) {
  return session.isHod;
}

/** Staff Training Requisition: Admin sees every application org-wide, read-only. */
export function canViewAllRequisitions(session: SessionData) {
  return session.roleType === "ADMIN";
}
