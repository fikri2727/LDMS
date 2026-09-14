/**
 * A requisition's DISPLAY status. COMPLETED is a real value in the stored
 * RequisitionStatus enum that an Admin can set explicitly (e.g. a training
 * that wrapped up early, or got cancelled after the fact) — but an Approved
 * requisition also automatically shows as Completed once its training has
 * finished, purely computed from the dates already on the record, so nothing
 * needs to be manually updated as trainings pass in the common case.
 */
export type RequisitionDisplayStatus = "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED";

/**
 * A training counts as finished starting the day after it ends (or starts,
 * if it has no end date) — the day it happens, it still shows as Approved
 * rather than flipping to Completed partway through. A requisition already
 * explicitly marked COMPLETED (or anything other than APPROVED) passes
 * through unchanged.
 */
export function deriveRequisitionDisplayStatus(
  status: string,
  trainingDate: string | Date,
  trainingEndDate: string | Date | null
): RequisitionDisplayStatus {
  if (status !== "APPROVED") return status as RequisitionDisplayStatus;

  const reference = trainingEndDate ? new Date(trainingEndDate) : new Date(trainingDate);
  const referenceDateOnly = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const todayDateOnly = new Date();
  todayDateOnly.setHours(0, 0, 0, 0);

  return referenceDateOnly < todayDateOnly ? "COMPLETED" : "APPROVED";
}
