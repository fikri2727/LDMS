import Link from "next/link";
import { format } from "date-fns";

export interface StaffTrainingRecordRow {
  id: number;
  type: "training" | "ojt" | "elearning";
  title: string;
  href: string;
  typeLabel: string;
  functionLabel: string;
  startDate: Date;
  endDate: Date;
  venue: string;
  status: "PENDING" | "COMPLETED" | "ABSENT";
  totalHours: number;
}

const STATUS_STYLES: Record<StaffTrainingRecordRow["status"], string> = {
  COMPLETED: "bg-primary/10 text-primary-dark",
  ABSENT: "bg-rose-50 text-rose-600",
  PENDING: "bg-gray-100 text-text-secondary",
};

const STATUS_LABELS: Record<StaffTrainingRecordRow["status"], string> = {
  COMPLETED: "Completed",
  ABSENT: "Absent",
  PENDING: "Pending",
};

export function StaffTrainingRecordTable({ rows }: { rows: StaffTrainingRecordRow[] }) {
  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-text-muted text-xs uppercase tracking-wide">
          <tr>
            <th className="px-4 py-3 font-medium">No.</th>
            <th className="px-4 py-3 font-medium">Training</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Start Date</th>
            <th className="px-4 py-3 font-medium">End Date</th>
            <th className="px-4 py-3 font-medium">Function</th>
            <th className="px-4 py-3 font-medium">Venue</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Total Hours</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r, i) => (
            <tr key={`${r.type}-${r.id}`} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-text-muted">{i + 1}</td>
              <td className="px-4 py-3">
                <Link href={r.href} className="text-primary-dark font-medium hover:underline">
                  {r.title}
                </Link>
              </td>
              <td className="px-4 py-3 text-text-secondary">{r.typeLabel}</td>
              <td className="px-4 py-3 text-text-secondary">{format(r.startDate, "yyyy-MM-dd")}</td>
              <td className="px-4 py-3 text-text-secondary">{format(r.endDate, "yyyy-MM-dd")}</td>
              <td className="px-4 py-3 text-text-secondary">{r.functionLabel}</td>
              <td className="px-4 py-3 text-text-secondary">{r.venue}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full text-xs font-medium px-2 py-0.5 ${STATUS_STYLES[r.status]}`}>
                  {STATUS_LABELS[r.status]}
                </span>
              </td>
              <td className="px-4 py-3 text-text-secondary">{r.totalHours.toFixed(2)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-10 text-center text-text-muted">
                No training records yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
