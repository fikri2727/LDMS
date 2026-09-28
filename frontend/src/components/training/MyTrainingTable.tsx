"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { deleteOjt } from "@/app/(app)/training/ojt/actions";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { SortableTh, type SortDir } from "@/components/ui/SortableTh";

export interface MyTrainingRow {
  id: number;
  type: "training" | "ojt" | "elearning";
  program: string;
  title: string;
  href: string;
  startDate: string;
  endDate: string;
  hoursPerDay: number;
  totalHours: number;
  status: "PENDING" | "COMPLETED" | "ABSENT";
  evaluateHref: string | null;
  editHref: string | null;
  certificateHref: string | null;
}

const STATUS_STYLES: Record<MyTrainingRow["status"], string> = {
  COMPLETED: "bg-primary/10 text-primary-dark",
  ABSENT: "bg-rose-50 text-rose-600",
  PENDING: "bg-gray-100 text-text-secondary",
};

const STATUS_LABELS: Record<MyTrainingRow["status"], string> = {
  COMPLETED: "Complete",
  ABSENT: "Absent",
  PENDING: "Pending",
};

type SortKey = "title" | "program" | "date" | "totalHours" | "status";

const SORT_ACCESSORS: Record<SortKey, (r: MyTrainingRow) => string | number> = {
  title: (r) => r.title,
  program: (r) => r.program,
  date: (r) => r.startDate,
  totalHours: (r) => r.totalHours,
  status: (r) => STATUS_LABELS[r.status],
};

export function MyTrainingTable({ rows }: { rows: MyTrainingRow[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const confirm = useConfirm();

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const accessor = SORT_ACCESSORS[sortKey];
    const copy = [...rows].sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      return typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
    });
    if (sortDir === "desc") copy.reverse();
    return copy;
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function handleDelete(id: number, title: string) {
    if (!(await confirm(`Permanently delete "${title}"? This cannot be undone.`))) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteOjt(id);
      } catch (e) {
        if (e && typeof e === "object" && "digest" in e && typeof e.digest === "string" && e.digest.startsWith("NEXT_")) {
          throw e;
        }
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function renderAction(r: MyTrainingRow) {
    if (r.type === "ojt" && r.evaluateHref) {
      return (
        <Link
          href={r.evaluateHref}
          className="inline-flex rounded-xl bg-primary-dark hover:bg-primary text-white text-xs font-medium px-3 py-1.5 transition-colors"
        >
          Evaluate
        </Link>
      );
    }
    if (r.type === "ojt" && r.editHref) {
      return (
        <div className="flex items-center gap-1">
          <Link
            href={r.editHref}
            title="Edit OJT"
            className="p-1.5 rounded-xl bg-amber-500 text-white hover:opacity-90"
          >
            <Pencil size={14} />
          </Link>
          <button
            disabled={pending}
            onClick={() => handleDelete(r.id, r.title)}
            title="Delete OJT"
            className="p-1.5 rounded-xl bg-rose-600 text-white hover:opacity-90 disabled:opacity-60"
          >
            <Trash2 size={14} />
          </button>
        </div>
      );
    }
    if (r.type === "ojt") {
      return <span className="text-text-muted text-xs">—</span>;
    }
    if (r.type === "elearning") {
      return r.certificateHref ? (
        <Link
          href={r.certificateHref}
          className="inline-flex rounded-xl bg-primary-dark hover:bg-primary text-white text-xs font-medium px-3 py-1.5 transition-colors"
        >
          View Certificate
        </Link>
      ) : (
        <Link
          href={r.href}
          className="inline-flex rounded-xl bg-primary-dark hover:bg-primary text-white text-xs font-medium px-3 py-1.5 transition-colors"
        >
          Continue
        </Link>
      );
    }
    if (r.evaluateHref) {
      return (
        <Link
          href={r.evaluateHref}
          className="inline-flex rounded-xl bg-primary-dark hover:bg-primary text-white text-xs font-medium px-3 py-1.5 transition-colors"
        >
          Evaluate
        </Link>
      );
    }
    return <span className="text-text-muted text-xs">—</span>;
  }

  return (
    <div>
      {error && (
        <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Mobile: stacked cards, one per training — leads with title and the evaluate/continue action. */}
      <div className="sm:hidden bg-surface rounded-2xl border border-border divide-y divide-border overflow-hidden">
        {sorted.map((r) => (
          <div key={`${r.type}-${r.id}-card`} className="p-4">
            <div className="flex items-start justify-between gap-2 mb-1">
              <Link href={r.href} className="text-primary-dark font-medium text-sm">
                {r.title}
              </Link>
              <span
                className={`shrink-0 inline-flex rounded-full text-xs font-medium px-2 py-0.5 ${STATUS_STYLES[r.status]}`}
              >
                {STATUS_LABELS[r.status]}
              </span>
            </div>
            <p className="text-xs text-text-muted mb-3">
              {r.program} &middot; {format(new Date(r.startDate), "dd/MM/yyyy")} –{" "}
              {format(new Date(r.endDate), "dd/MM/yyyy")} &middot; {r.totalHours.toFixed(2)}h
            </p>
            {renderAction(r)}
          </div>
        ))}
        {rows.length === 0 && <div className="px-4 py-10 text-center text-text-muted text-sm">No training records yet.</div>}
      </div>

      {/* Desktop: full sortable table. */}
      <div className="hidden sm:block bg-surface rounded-2xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-text-muted text-xs uppercase tracking-wide">
            <tr>
              <SortableTh label="Title" active={sortKey === "title"} dir={sortDir} onClick={() => toggleSort("title")} className="px-4 py-3" />
              <SortableTh label="Program" active={sortKey === "program"} dir={sortDir} onClick={() => toggleSort("program")} className="px-4 py-3" />
              <SortableTh label="Date" active={sortKey === "date"} dir={sortDir} onClick={() => toggleSort("date")} className="px-4 py-3" />
              <SortableTh label="Total Hours" active={sortKey === "totalHours"} dir={sortDir} onClick={() => toggleSort("totalHours")} className="px-4 py-3" />
              <SortableTh label="Status" active={sortKey === "status"} dir={sortDir} onClick={() => toggleSort("status")} className="px-4 py-3" />
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((r) => (
              <tr key={`${r.type}-${r.id}`} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={r.href} className="text-primary-dark font-medium hover:underline">
                    {r.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-secondary">{r.program}</td>
                <td className="px-4 py-3 text-text-secondary">
                  {format(new Date(r.startDate), "dd/MM/yyyy")} – {format(new Date(r.endDate), "dd/MM/yyyy")}
                </td>
                <td className="px-4 py-3 text-text-secondary">{r.totalHours.toFixed(2)}h</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full text-xs font-medium px-2 py-0.5 ${STATUS_STYLES[r.status]}`}
                  >
                    {STATUS_LABELS[r.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end">{renderAction(r)}</div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-text-muted">
                  No training records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
