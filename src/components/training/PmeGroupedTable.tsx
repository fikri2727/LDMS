"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { format } from "date-fns";
import { PME_STATUS_LABELS } from "@/lib/labels";
import { CollapsibleSection } from "@/components/training/CollapsibleSection";

export interface PmeRecordRow {
  id: number;
  staffName: string;
  staffNo: string;
  trainingTitle: string;
  status: string;
  createdAt: string;
}

export function PmeGroupedTable({ rows, emptyLabel }: { rows: PmeRecordRow[]; emptyLabel: string }) {
  const [search, setSearch] = useState("");
  const [startFilter, setStartFilter] = useState("");
  const [endFilter, setEndFilter] = useState("");
  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      // Compare using the same local-timezone day the "Created" column displays,
      // not the raw UTC date — otherwise a record shown as "19 Aug" can silently
      // fall outside a "Start Date: 19 Aug" filter if it was stored a few hours
      // earlier in UTC.
      const createdDate = format(new Date(r.createdAt), "yyyy-MM-dd");
      if (appliedStart && createdDate < appliedStart) return false;
      if (appliedEnd && createdDate > appliedEnd) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.staffName.toLowerCase().includes(q) &&
          !r.staffNo.toLowerCase().includes(q) &&
          !r.trainingTitle.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [rows, search, appliedStart, appliedEnd]);

  const groups = useMemo(() => {
    const map = new Map<string, PmeRecordRow[]>();
    for (const r of filtered) {
      const arr = map.get(r.trainingTitle) ?? [];
      arr.push(r);
      map.set(r.trainingTitle, arr);
    }
    return [...map.entries()];
  }, [filtered]);

  function handleReset() {
    setSearch("");
    setStartFilter("");
    setEndFilter("");
    setAppliedStart("");
    setAppliedEnd("");
  }

  if (rows.length === 0) {
    return <p className="text-sm text-text-muted mb-6">{emptyLabel}</p>;
  }

  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs text-text-muted mb-1">Start Date</label>
            <input
              type="date"
              value={startFilter}
              onChange={(e) => setStartFilter(e.target.value)}
              className="rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">End Date</label>
            <input
              type="date"
              value={endFilter}
              onChange={(e) => setEndFilter(e.target.value)}
              className="rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={() => {
              setAppliedStart(startFilter);
              setAppliedEnd(endFilter);
            }}
            className="rounded-xl bg-primary-dark hover:bg-primary text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            Filter
          </button>
          <button
            onClick={handleReset}
            className="rounded-xl border border-border bg-surface text-sm font-medium px-4 py-2 text-text-secondary hover:bg-gray-50 transition-colors"
          >
            Reset Filter
          </button>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Search</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Staff or training title..."
              className="rounded-xl border border-border pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-text-muted">No records match these filters.</p>
      ) : (
        groups.map(([title, recs]) => (
          <CollapsibleSection key={title} title={`${title} (${recs.length})`} defaultOpen>
            <div className="bg-surface rounded-2xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-text-muted text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 font-medium">Staff</th>
                    <th className="px-4 py-3 font-medium">Staff No.</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recs.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-text-primary">
                        <Link href={`/training/pme/${r.id}`} className="text-primary-dark font-medium hover:underline">
                          {r.staffName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{r.staffNo}</td>
                      <td className="px-4 py-3 text-text-secondary">{PME_STATUS_LABELS[r.status]}</td>
                      <td className="px-4 py-3 text-text-secondary">{format(new Date(r.createdAt), "d MMM yyyy")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>
        ))
      )}
    </div>
  );
}
