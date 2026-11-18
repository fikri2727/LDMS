"use client";

import { useMemo, useState } from "react";

export interface MasterRow {
  employeeNo: string;
  fullName: string;
  department: string | null;
  jobPosition: string | null;
  jobGrade: string | null;
  category: string | null;
  employmentType: string | null;
  status: string | null;
  supervisorNo: string | null;
  supervisorName: string | null;
  inAppraisal: boolean;
  inLdms: boolean;
}

type Show = "working" | "appraisal" | "resigned" | "all";

const SHOW_LABELS: Record<Show, string> = {
  working: "Working",
  appraisal: "In Appraisal",
  resigned: "Resigned",
  all: "All",
};

function Badge({ on, yes, no }: { on: boolean; yes: string; no: string }) {
  return (
    <span
      className={
        on
          ? "inline-flex rounded-full bg-primary/10 text-primary-dark text-xs font-medium px-2 py-0.5"
          : "inline-flex rounded-full bg-gray-100 text-text-muted text-xs font-medium px-2 py-0.5"
      }
    >
      {on ? yes : no}
    </span>
  );
}

export function EmployeeMasterTable({ rows }: { rows: MasterRow[] }) {
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<Show>("working");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const resigned = r.status === "Resigned";
      if (show === "working" && resigned) return false;
      if (show === "resigned" && !resigned) return false;
      if (show === "appraisal" && !r.inAppraisal) return false;
      if (!q) return true;
      return [r.employeeNo, r.fullName, r.department, r.jobPosition, r.supervisorName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, query, show]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ID, name, department, position or supervisor"
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm w-full sm:w-80"
        />
        <div className="inline-flex rounded-xl border border-border bg-gray-50 p-0.5">
          {(Object.keys(SHOW_LABELS) as Show[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={show === k}
              onClick={() => setShow(k)}
              className={`rounded-lg px-3 py-1 text-xs font-medium ${
                show === k ? "bg-primary-dark text-white" : "text-text-muted hover:text-text-primary"
              }`}
            >
              {SHOW_LABELS[k]}
            </button>
          ))}
        </div>
        <span className="text-sm text-text-muted">{filtered.length} employee(s)</span>
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-text-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 font-medium">Employee No.</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Position / Grade</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Supervisor</th>
              <th className="px-4 py-3 font-medium">LDMS</th>
              <th className="px-4 py-3 font-medium">Appraisal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.slice(0, 500).map((r) => (
              <tr key={r.employeeNo} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-text-secondary">{r.employeeNo}</td>
                <td className="px-4 py-2.5 font-medium text-text-primary">{r.fullName}</td>
                <td className="px-4 py-2.5 text-text-secondary">{r.department ?? "—"}</td>
                <td className="px-4 py-2.5 text-text-secondary">
                  {[r.jobPosition, r.jobGrade].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-4 py-2.5 text-text-secondary">
                  {[r.category, r.employmentType].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={
                      r.status === "Resigned"
                        ? "inline-flex rounded-full bg-rose-50 text-rose-600 text-xs font-medium px-2 py-0.5"
                        : "inline-flex rounded-full bg-primary/10 text-primary-dark text-xs font-medium px-2 py-0.5"
                    }
                  >
                    {r.status ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-text-secondary">
                  {r.supervisorName ?? r.supervisorNo ?? "—"}
                </td>
                <td className="px-4 py-2.5">
                  <Badge on={r.inLdms} yes="Yes" no="No" />
                </td>
                <td className="px-4 py-2.5">
                  <Badge on={r.inAppraisal} yes="Yes" no="No" />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-text-muted">
                  {rows.length === 0 ? "No employee master yet. Upload HR's employee report above." : "No employees match."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 500 && (
        <p className="text-xs text-text-muted mt-2">Showing the first 500. Search to narrow the list.</p>
      )}
    </div>
  );
}
