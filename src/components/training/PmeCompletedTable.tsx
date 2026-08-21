"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { PME_STATUS_LABELS } from "@/lib/labels";
import { SortableTh, type SortDir } from "@/components/ui/SortableTh";

export interface PmeCompletedRow {
  id: number;
  staffName: string;
  trainingTitle: string;
  status: string;
  date: string;
}

type SortKey = "staffName" | "trainingTitle" | "status" | "date";

const SORT_ACCESSORS: Record<SortKey, (r: PmeCompletedRow) => string> = {
  staffName: (r) => r.staffName,
  trainingTitle: (r) => r.trainingTitle,
  status: (r) => PME_STATUS_LABELS[r.status] ?? r.status,
  date: (r) => r.date,
};

export function PmeCompletedTable({
  rows,
  emptyLabel,
  dateLabel = "Created",
}: {
  rows: PmeCompletedRow[];
  emptyLabel: string;
  dateLabel?: string;
}) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const accessor = SORT_ACCESSORS[sortKey];
    const copy = [...rows].sort((a, b) => accessor(a).localeCompare(accessor(b)));
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

  if (rows.length === 0) {
    return <p className="text-sm text-text-muted mb-6">{emptyLabel}</p>;
  }

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden mb-8">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-text-muted text-xs uppercase tracking-wide">
          <tr>
            <SortableTh label="Staff" active={sortKey === "staffName"} dir={sortDir} onClick={() => toggleSort("staffName")} className="px-4 py-3" />
            <SortableTh label="Training" active={sortKey === "trainingTitle"} dir={sortDir} onClick={() => toggleSort("trainingTitle")} className="px-4 py-3" />
            <SortableTh label="Status" active={sortKey === "status"} dir={sortDir} onClick={() => toggleSort("status")} className="px-4 py-3" />
            <SortableTh label={dateLabel} active={sortKey === "date"} dir={sortDir} onClick={() => toggleSort("date")} className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-text-primary">{r.staffName}</td>
              <td className="px-4 py-3">
                <Link href={`/training/pme/${r.id}`} className="text-primary-dark font-medium hover:underline">
                  {r.trainingTitle}
                </Link>
              </td>
              <td className="px-4 py-3 text-text-secondary">{PME_STATUS_LABELS[r.status]}</td>
              <td className="px-4 py-3 text-text-secondary">{format(new Date(r.date), "d MMM yyyy")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
