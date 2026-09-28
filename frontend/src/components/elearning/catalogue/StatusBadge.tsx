export type LearnerModuleStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

const STATUS_STYLES: Record<LearnerModuleStatus, { label: string; dot: string; className: string }> = {
  NOT_STARTED: { label: "Not Started", dot: "bg-text-muted", className: "bg-gray-100 text-text-secondary" },
  IN_PROGRESS: { label: "In Progress", dot: "bg-purple", className: "bg-purple/10 text-purple" },
  COMPLETED: { label: "Completed", dot: "bg-primary", className: "bg-primary/10 text-primary-dark" },
};

export function StatusBadge({ status }: { status: LearnerModuleStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full text-[11px] font-medium px-2.5 py-1 ${s.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
