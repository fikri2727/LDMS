import { resolveRequisitionTheme } from "@/lib/requisition-theme";

export function RequisitionStatusBadge({ status }: { status: string }) {
  const theme = resolveRequisitionTheme(status);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full text-[11px] font-medium px-2.5 py-1 ${theme.badgeClass}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${theme.dotClass}`} />
      {theme.label}
    </span>
  );
}
