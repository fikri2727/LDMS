"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, ClipboardList, Search, Users } from "lucide-react";

export interface PendingItem {
  type: "training" | "ojt";
  trainingId: number;
  participationId: number;
  code: string;
  title: string;
  // ISO strings from the API (the API client turns them into Dates)
  startDate: string | Date;
  endDate: string | Date;
  daysOutstanding: number;
  href: string;
}

export interface PendingStaff {
  id: number;
  staffNo: string;
  staffName: string;
  departmentId: number | null;
  department: string | null;
  items: PendingItem[];
}

export interface PendingDepartment {
  id: number | null;
  name: string;
  staff: PendingStaff[];
  pendingCount: number;
}

export interface PendingData {
  departments: PendingDepartment[];
  totalStaff: number;
  totalPending: number;
}

function overdueStyle(days: number) {
  if (days >= 30) return "bg-rose-50 text-rose-600";
  if (days >= 7) return "bg-amber-50 text-amber-700";
  return "bg-gray-100 text-text-secondary";
}

function dateRange(start: string | Date, end: string | Date) {
  const s = new Date(start);
  const e = new Date(end);
  return format(s, "yyyy-MM-dd") === format(e, "yyyy-MM-dd")
    ? format(s, "d MMM yyyy")
    : `${format(s, "d MMM")} – ${format(e, "d MMM yyyy")}`;
}

/** Admin monitoring: staff who haven't filled in their evaluation yet, grouped by department. */
export function PendingEvaluationsView({ data }: { data: PendingData }) {
  const [department, setDepartment] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const q = query.trim().toLowerCase();
  const filtering = q !== "" || department !== "all";

  const departments = useMemo(
    () =>
      data.departments
        .filter((d) => department === "all" || String(d.id) === department)
        .map((d) => ({
          ...d,
          staff: d.staff.filter(
            (s) =>
              !q ||
              `${s.staffName} ${s.staffNo}`.toLowerCase().includes(q) ||
              s.items.some((i) => i.title.toLowerCase().includes(q))
          ),
        }))
        .filter((d) => d.staff.length > 0),
    [data.departments, department, q]
  );

  const allOpen = departments.length > 0 && departments.every((d) => open[String(d.id)]);
  const toggleAll = () =>
    setOpen(allOpen ? {} : Object.fromEntries(departments.map((d) => [String(d.id), true])));

  if (data.totalPending === 0) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/10 px-5 py-6 text-sm text-primary-dark">
        Everyone is up to date — no evaluations are pending.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wide">Evaluations pending</p>
          <p className="text-2xl font-semibold text-amber-600">{data.totalPending}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wide">Staff with pending</p>
          <p className="text-2xl font-semibold text-text-primary">{data.totalStaff}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wide">Departments</p>
          <p className="text-2xl font-semibold text-text-primary">{data.departments.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All departments ({data.departments.length})</option>
          {data.departments.map((d) => (
            <option key={String(d.id)} value={String(d.id)}>
              {d.name} ({d.staff.length})
            </option>
          ))}
        </select>
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search staff or training..."
            className="w-64 rounded-xl border border-border bg-surface py-2 pl-8 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {!filtering && (
          <button
            type="button"
            onClick={toggleAll}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-secondary hover:bg-gray-50"
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        )}
      </div>

      {departments.length === 0 && <p className="text-sm text-text-muted">Nothing matches your search.</p>}

      <div className="space-y-3">
        {departments.map((d) => {
          const key = String(d.id);
          const isOpen = filtering || !!open[key];
          const count = d.staff.reduce((n, s) => n + s.items.length, 0);
          return (
            <div key={key} className="rounded-2xl border border-border bg-surface overflow-hidden">
              <button
                type="button"
                onClick={() => setOpen((o) => ({ ...o, [key]: !o[key] }))}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
              >
                <span className="flex items-center gap-2 font-medium text-text-primary">
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  {d.name}
                </span>
                <span className="flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-text-secondary">
                    <Users size={12} /> {d.staff.length} staff
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                    <ClipboardList size={12} /> {count} pending
                  </span>
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-text-muted text-xs uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-2.5 font-medium w-12">No.</th>
                        <th className="px-4 py-2.5 font-medium">Staff</th>
                        <th className="px-4 py-2.5 font-medium">Training not yet evaluated</th>
                        <th className="px-4 py-2.5 font-medium">Date</th>
                        <th className="px-4 py-2.5 font-medium">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {d.staff.map((s, i) =>
                        s.items.map((item, j) => (
                          <tr key={`${s.id}-${item.type}-${item.participationId}`} className="align-top hover:bg-gray-50">
                            {j === 0 && (
                              <>
                                <td rowSpan={s.items.length} className="px-4 py-2.5 text-text-muted">
                                  {i + 1}
                                </td>
                                <td rowSpan={s.items.length} className="px-4 py-2.5 text-text-primary">
                                  {s.staffName}
                                  <span className="text-text-muted ml-1">({s.staffNo})</span>
                                </td>
                              </>
                            )}
                            <td className="px-4 py-2.5">
                              <Link href={item.href} className="text-primary-dark hover:underline">
                                {item.title}
                              </Link>
                              <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-text-muted">
                                {item.type === "ojt" ? "OJT" : "Public/Inhouse"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-text-secondary">
                              {dateRange(item.startDate, item.endDate)}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${overdueStyle(item.daysOutstanding)}`}>
                                {item.daysOutstanding === 0 ? "Today" : `${item.daysOutstanding} day${item.daysOutstanding === 1 ? "" : "s"}`}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
