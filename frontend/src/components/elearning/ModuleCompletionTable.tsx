"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { MODULE_STATUS_LABELS } from "@/lib/labels";
import { SortableTh, type SortDir } from "@/components/ui/SortableTh";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-text-secondary",
  REVIEW: "bg-purple/10 text-purple",
  PUBLISHED: "bg-primary/10 text-primary-dark",
  ARCHIVED: "bg-rose-50 text-rose-600",
};

export interface ModuleCompletionRow {
  id: number;
  title: string;
  category: string;
  status: string;
  assigned: number;
  started: number;
  completed: number;
  completionRate: number;
  avgScore: number | null;
}

type SortKey = "title" | "status" | "assigned" | "started" | "completed" | "completionRate" | "avgScore";

const SORT_ACCESSORS: Record<SortKey, (r: ModuleCompletionRow) => string | number> = {
  title: (r) => r.title,
  status: (r) => MODULE_STATUS_LABELS[r.status] ?? r.status,
  assigned: (r) => r.assigned,
  started: (r) => r.started,
  completed: (r) => r.completed,
  completionRate: (r) => r.completionRate,
  avgScore: (r) => r.avgScore ?? -1,
};

export function ModuleCompletionTable({ rows }: { rows: ModuleCompletionRow[] }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const categories = useMemo(
    () => Array.from(new Set(rows.map((r) => r.category))).filter(Boolean).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (categoryFilter && r.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.title.toLowerCase().includes(q) && !r.category.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, categoryFilter, search]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const accessor = SORT_ACCESSORS[sortKey];
    const copy = [...filtered].sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      return typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
    });
    if (sortDir === "desc") copy.reverse();
    return copy;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-10 text-center">
        <p className="text-sm text-text-muted">
          No modules published yet. Once the L&D team publishes modules, completion rates appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <label className="block text-xs text-text-muted mb-1">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Search</label>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Module name or category..."
              className="rounded-xl border border-border bg-surface pl-8 pr-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-text-muted text-xs uppercase tracking-wide">
            <tr>
              <SortableTh label="Module" active={sortKey === "title"} dir={sortDir} onClick={() => toggleSort("title")} className="px-4 py-3" />
              <SortableTh label="Status" active={sortKey === "status"} dir={sortDir} onClick={() => toggleSort("status")} className="px-4 py-3" />
              <SortableTh label="Assigned" active={sortKey === "assigned"} dir={sortDir} onClick={() => toggleSort("assigned")} className="px-4 py-3" />
              <SortableTh label="Started" active={sortKey === "started"} dir={sortDir} onClick={() => toggleSort("started")} className="px-4 py-3" />
              <SortableTh label="Completed" active={sortKey === "completed"} dir={sortDir} onClick={() => toggleSort("completed")} className="px-4 py-3" />
              <SortableTh label="Completion Rate" active={sortKey === "completionRate"} dir={sortDir} onClick={() => toggleSort("completionRate")} className="px-4 py-3" />
              <SortableTh label="Average Score" active={sortKey === "avgScore"} dir={sortDir} onClick={() => toggleSort("avgScore")} className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/elearning/admin/modules/${r.id}`} className="text-primary-dark font-medium hover:underline">
                    {r.title}
                  </Link>
                  <p className="text-xs text-text-muted">{r.category}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full text-xs font-medium px-2 py-0.5 ${STATUS_STYLES[r.status]}`}>
                    {MODULE_STATUS_LABELS[r.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-secondary">{r.assigned}</td>
                <td className="px-4 py-3 text-text-secondary">{r.started}</td>
                <td className="px-4 py-3 text-text-secondary">{r.completed}</td>
                <td className="px-4 py-3 text-text-secondary">{r.completionRate}%</td>
                <td className="px-4 py-3 text-text-secondary">{r.avgScore != null ? `${r.avgScore}%` : "—"}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-text-muted">
                  No modules match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
