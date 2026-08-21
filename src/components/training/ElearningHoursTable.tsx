"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { format } from "date-fns";

export interface ElearningHoursRow {
  id: number;
  staffNo: string;
  staffName: string;
  department: string;
  moduleId: number;
  moduleTitle: string;
  completedAt: string;
  score: number | null;
  hours: number;
}

export function ElearningHoursTable({ rows }: { rows: ElearningHoursRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.staffName.toLowerCase().includes(q) ||
        r.staffNo.toLowerCase().includes(q) ||
        r.moduleTitle.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totalHours = useMemo(() => filtered.reduce((sum, r) => sum + r.hours, 0), [filtered]);

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Staff or module..."
            className="rounded-xl border border-border pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-text-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 font-medium">Staff No.</th>
              <th className="px-4 py-3 font-medium">Staff Name</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Module</th>
              <th className="px-4 py-3 font-medium">Completed</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-text-secondary">{r.staffNo}</td>
                <td className="px-4 py-3 text-text-primary">{r.staffName}</td>
                <td className="px-4 py-3 text-text-secondary">{r.department}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/elearning/admin/modules/${r.moduleId}`}
                    className="text-primary-dark font-medium hover:underline"
                  >
                    {r.moduleTitle}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-secondary">{format(new Date(r.completedAt), "d MMM yyyy")}</td>
                <td className="px-4 py-3 text-text-secondary">{r.score != null ? `${Math.round(r.score)}%` : "—"}</td>
                <td className="px-4 py-3 text-text-secondary">{r.hours.toFixed(2)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-text-muted">
                  No completed e-learning records found.
                </td>
              </tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-border bg-gray-50 font-semibold">
                <td colSpan={6} className="px-4 py-3 text-right text-text-secondary">
                  Total Hours
                </td>
                <td className="px-4 py-3 text-text-primary">{totalHours.toFixed(2)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
