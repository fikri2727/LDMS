"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Lock } from "lucide-react";
import { format } from "date-fns";
import { PME_STATUS_LABELS } from "@/lib/labels";
import { SortableTh, type SortDir } from "@/components/ui/SortableTh";

export interface PendingPmeRow {
  id: number;
  staffName: string;
  staffNo: string;
  trainingTitle: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  due: boolean;
}

type SortKey = "staffName" | "staffNo" | "trainingTitle" | "periodStart" | "periodEnd" | "status";

const SORT_ACCESSORS: Record<SortKey, (r: PendingPmeRow) => string> = {
  staffName: (r) => r.staffName,
  staffNo: (r) => r.staffNo,
  trainingTitle: (r) => r.trainingTitle,
  periodStart: (r) => r.periodStart,
  periodEnd: (r) => r.periodEnd,
  status: (r) => PME_STATUS_LABELS[r.status] ?? r.status,
};

export function PendingPmeTable({ rows }: { rows: PendingPmeRow[] }) {
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
    return <p className="text-sm text-text-muted mb-6">Nothing to evaluate right now.</p>;
  }

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden mb-8">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-text-muted text-xs uppercase tracking-wide">
          <tr>
            <th className="px-4 py-3 font-medium">No.</th>
            <SortableTh label="Name" active={sortKey === "staffName"} dir={sortDir} onClick={() => toggleSort("staffName")} className="px-4 py-3" />
            <SortableTh label="Staff No." active={sortKey === "staffNo"} dir={sortDir} onClick={() => toggleSort("staffNo")} className="px-4 py-3" />
            <SortableTh label="Training Title" active={sortKey === "trainingTitle"} dir={sortDir} onClick={() => toggleSort("trainingTitle")} className="px-4 py-3" />
            <SortableTh label="Evaluation Period Start" active={sortKey === "periodStart"} dir={sortDir} onClick={() => toggleSort("periodStart")} className="px-4 py-3" />
            <SortableTh label="Evaluation Period End" active={sortKey === "periodEnd"} dir={sortDir} onClick={() => toggleSort("periodEnd")} className="px-4 py-3" />
            <SortableTh label="Evaluation Status" active={sortKey === "status"} dir={sortDir} onClick={() => toggleSort("status")} className="px-4 py-3" />
            <th className="px-4 py-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((r, i) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-text-muted">{i + 1}</td>
              <td className="px-4 py-3 text-text-primary">{r.staffName}</td>
              <td className="px-4 py-3 text-text-secondary">{r.staffNo}</td>
              <td className="px-4 py-3 text-text-secondary">{r.trainingTitle}</td>
              <td className="px-4 py-3 text-text-secondary">{format(new Date(r.periodStart), "yyyy-MM-dd")}</td>
              <td className="px-4 py-3 text-text-secondary">{format(new Date(r.periodEnd), "yyyy-MM-dd")}</td>
              <td className="px-4 py-3">
                <span className="inline-flex rounded-full bg-gray-100 text-text-secondary text-xs font-medium px-2.5 py-1">
                  {PME_STATUS_LABELS[r.status]}
                </span>
              </td>
              <td className="px-4 py-3">
                {r.due ? (
                  <Link
                    href={`/training/pme/${r.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary-dark hover:bg-primary text-white text-xs font-medium px-3 py-1.5 transition-colors"
                  >
                    <Pencil size={13} /> Evaluate
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Evaluation period has not ended yet"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 text-white text-xs font-medium px-3 py-1.5 opacity-90 cursor-not-allowed"
                  >
                    <Lock size={13} /> Evaluate
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
