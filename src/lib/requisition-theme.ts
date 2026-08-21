export type RequisitionStatusKey = "PENDING" | "APPROVED" | "REJECTED";

export interface RequisitionTheme {
  key: RequisitionStatusKey;
  label: string;
  gradient: string;
  accentHex: string;
  accentSoftHex: string;
  badgeClass: string;
  dotClass: string;
}

const THEMES: Record<RequisitionStatusKey, RequisitionTheme> = {
  PENDING: {
    key: "PENDING",
    label: "Pending Approval",
    gradient: "from-text-primary via-purple to-purple-soft",
    accentHex: "#6D3ECD",
    accentSoftHex: "#C2ACE3",
    badgeClass: "bg-purple/10 text-purple",
    dotClass: "bg-purple",
  },
  APPROVED: {
    key: "APPROVED",
    label: "Approved",
    gradient: "from-text-primary via-primary-dark to-primary",
    accentHex: "#1D8E72",
    accentSoftHex: "#46BEA2",
    badgeClass: "bg-primary/10 text-primary-dark",
    dotClass: "bg-primary-dark",
  },
  REJECTED: {
    key: "REJECTED",
    label: "Rejected",
    gradient: "from-text-primary via-rose-600 to-rose-400",
    accentHex: "#e11d48",
    accentSoftHex: "#fda4af",
    badgeClass: "bg-rose-50 text-rose-600",
    dotClass: "bg-rose-500",
  },
};

export function resolveRequisitionTheme(status: string): RequisitionTheme {
  return THEMES[status as RequisitionStatusKey] ?? THEMES.PENDING;
}

export const ALL_REQUISITION_THEMES = THEMES;
