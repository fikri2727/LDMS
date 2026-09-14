import Link from "next/link";
import { format } from "date-fns";
import type { RecentTrainingRecord } from "@/lib/dashboard";

const STATUS_STYLES: Record<RecentTrainingRecord["status"], string> = {
  COMPLETED: "bg-primary/10 text-primary-dark",
  PENDING: "bg-gray-100 text-text-secondary",
  ABSENT: "bg-rose-50 text-rose-600",
};

const STATUS_LABELS: Record<RecentTrainingRecord["status"], string> = {
  COMPLETED: "Completed",
  PENDING: "Pending",
  ABSENT: "Absent",
};

export function RecentTrainingRecords({ records }: { records: RecentTrainingRecord[] }) {
  if (records.length === 0) {
    return <p className="text-sm text-text-muted py-6 text-center">No training records yet.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {records.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-3 py-1 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <Link href={r.href} className="text-sm font-medium text-text-primary hover:text-primary-dark truncate block">
              {r.title}
            </Link>
            <p className="text-xs text-text-muted mt-0.5">
              {r.program} · {format(new Date(r.date), "d MMM yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-text-secondary tabular-nums">{r.hours.toFixed(1)}h</span>
            <span className={`inline-flex rounded-full text-[11px] font-medium px-2 py-0.5 ${STATUS_STYLES[r.status]}`}>
              {STATUS_LABELS[r.status]}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
