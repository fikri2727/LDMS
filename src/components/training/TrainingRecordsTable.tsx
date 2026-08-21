"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Search, Eye, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { PROGRAM_LABELS, PLATFORM_LABELS, FUNCTION_LABELS } from "@/lib/labels";
import { deleteTraining } from "@/app/(app)/training/public/actions";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { SortableTh, type SortDir } from "@/components/ui/SortableTh";

type SortKey =
  | "code"
  | "title"
  | "program"
  | "startDate"
  | "endDate"
  | "startTime"
  | "endTime"
  | "hrdc"
  | "platform"
  | "function"
  | "cost"
  | "days"
  | "participants"
  | "pme"
  | "manHours";

const SORT_ACCESSORS: Record<SortKey, (r: TrainingRow) => string | number> = {
  code: (r) => r.trainingCode,
  title: (r) => r.title,
  program: (r) => PROGRAM_LABELS[r.program] ?? r.program,
  startDate: (r) => r.startDate,
  endDate: (r) => r.endDate,
  startTime: (r) => r.startTime,
  endTime: (r) => r.endTime,
  hrdc: (r) => (r.hrdcClaimable ? 1 : 0),
  platform: (r) => PLATFORM_LABELS[r.platform] ?? r.platform,
  function: (r) => FUNCTION_LABELS[r.function] ?? r.function,
  cost: (r) => r.cost,
  days: (r) => r.totalHours,
  participants: (r) => r.par,
  pme: (r) => r.pmeComp,
  manHours: (r) => r.totalManHours,
};

export interface TrainingRow {
  id: number;
  trainingCode: string;
  title: string;
  program: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  hrdcClaimable: boolean;
  platform: string;
  function: string;
  cost: number;
  totalDays: number;
  totalHours: number;
  totalManHours: number;
  par: number;
  comp: number;
  pend: number;
  abs: number;
  pmeComp: number;
  pmePend: number;
}

export function TrainingRecordsTable({ rows }: { rows: TrainingRow[] }) {
  const [startFilter, setStartFilter] = useState("");
  const [endFilter, setEndFilter] = useState("");
  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (appliedStart && r.startDate < appliedStart) return false;
      if (appliedEnd && r.endDate > appliedEnd) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.title.toLowerCase().includes(q) && !r.trainingCode.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, appliedStart, appliedEnd, search]);

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

  const totalManHours = useMemo(() => filtered.reduce((sum, r) => sum + r.totalManHours, 0), [filtered]);
  const confirm = useConfirm();

  async function handleDelete(id: number, title: string) {
    if (!(await confirm(`Permanently delete "${title}"? This cannot be undone.`))) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteTraining(id);
      } catch (e) {
        if (e && typeof e === "object" && "digest" in e && typeof e.digest === "string" && e.digest.startsWith("NEXT_")) {
          throw e;
        }
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div>
      {error && (
        <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

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
            className="flex items-center gap-1.5 rounded-xl bg-primary-dark hover:bg-primary text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            <Search size={14} /> Filter
          </button>
          <button
            onClick={() => {
              setStartFilter("");
              setEndFilter("");
              setAppliedStart("");
              setAppliedEnd("");
            }}
            className="rounded-xl border border-border bg-surface text-sm font-medium px-4 py-2 text-text-secondary hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Title or code..."
            className="rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-x-auto">
        <table className="w-full text-xs table-fixed">
          <thead className="bg-gray-50 text-left text-text-muted text-[11px] uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2.5 font-medium w-6">No</th>
              <SortableTh label="Code" active={sortKey === "code"} dir={sortDir} onClick={() => toggleSort("code")} className="px-3 py-2.5 w-16" />
              <SortableTh label="Title" active={sortKey === "title"} dir={sortDir} onClick={() => toggleSort("title")} className="px-3 py-2.5 w-36 break-words" />
              <SortableTh label="Program" active={sortKey === "program"} dir={sortDir} onClick={() => toggleSort("program")} className="px-3 py-2.5 w-16 break-words" />
              <SortableTh label="Start Date" active={sortKey === "startDate"} dir={sortDir} onClick={() => toggleSort("startDate")} className="px-3 py-2.5 w-20" />
              <SortableTh label="End Date" active={sortKey === "endDate"} dir={sortDir} onClick={() => toggleSort("endDate")} className="px-3 py-2.5 w-20" />
              <SortableTh label="Start Time" active={sortKey === "startTime"} dir={sortDir} onClick={() => toggleSort("startTime")} className="px-3 py-2.5 w-12" />
              <SortableTh label="End Time" active={sortKey === "endTime"} dir={sortDir} onClick={() => toggleSort("endTime")} className="px-3 py-2.5 w-12" />
              <SortableTh label="HRDC" active={sortKey === "hrdc"} dir={sortDir} onClick={() => toggleSort("hrdc")} className="px-3 py-2.5 w-10" />
              <SortableTh label="Platform" active={sortKey === "platform"} dir={sortDir} onClick={() => toggleSort("platform")} className="px-3 py-2.5 w-20" />
              <SortableTh label="Function" active={sortKey === "function"} dir={sortDir} onClick={() => toggleSort("function")} className="px-3 py-2.5 w-20" />
              <SortableTh label="Cost (RM)" active={sortKey === "cost"} dir={sortDir} onClick={() => toggleSort("cost")} className="px-3 py-2.5 w-14" />
              <SortableTh label="Days / Hours" active={sortKey === "days"} dir={sortDir} onClick={() => toggleSort("days")} className="px-3 py-2.5 w-14" />
              <SortableTh label="Participants" active={sortKey === "participants"} dir={sortDir} onClick={() => toggleSort("participants")} className="px-3 py-2.5 w-20" />
              <SortableTh label="PME" active={sortKey === "pme"} dir={sortDir} onClick={() => toggleSort("pme")} className="px-3 py-2.5 w-14" />
              <SortableTh label="Man Hours" active={sortKey === "manHours"} dir={sortDir} onClick={() => toggleSort("manHours")} className="px-3 py-2.5 w-10" />
              <th className="px-3 py-2.5 font-medium w-10">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((r, i) => {
              const perAttendance = r.par > 0 ? Math.round((r.comp / r.par) * 100) : 0;
              const totalPme = r.pmeComp + r.pmePend;
              const perPme = totalPme > 0 ? Math.round((r.pmeComp / totalPme) * 100) : 0;
              return (
                <tr key={r.id} className="hover:bg-gray-50 align-top">
                  <td className="px-3 py-2.5 text-text-muted">{i + 1}</td>
                  <td className="px-3 py-2.5 text-text-muted font-mono break-all">{r.trainingCode}</td>
                  <td className="px-3 py-2.5 break-words">
                    <Link href={`/training/public/${r.id}`} className="text-primary-dark font-medium hover:underline">
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-text-secondary">{PROGRAM_LABELS[r.program]}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{format(new Date(r.startDate), "dd/MM/yyyy")}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{format(new Date(r.endDate), "dd/MM/yyyy")}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{r.startTime}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{r.endTime}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{r.hrdcClaimable ? "Yes" : "No"}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{PLATFORM_LABELS[r.platform]}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{FUNCTION_LABELS[r.function]}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{r.cost.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-text-secondary">
                    {r.totalDays}d / {r.totalHours.toFixed(2)}h
                  </td>
                  <td className="px-3 py-2.5 text-text-secondary leading-tight">
                    <div>Par: {r.par}</div>
                    <div>Comp: {r.comp}</div>
                    <div>Pend: {r.pend}</div>
                    <div>Abs: {r.abs}</div>
                    <div>Per: {perAttendance} %</div>
                  </td>
                  <td className="px-3 py-2.5 text-text-secondary leading-tight">
                    <div>Comp: {r.pmeComp}</div>
                    <div>Pend: {r.pmePend}</div>
                    <div>Per: {perPme} %</div>
                  </td>
                  <td className="px-3 py-2.5 text-text-secondary">{r.totalManHours.toFixed(2)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col items-start gap-1">
                      <Link
                        href={`/training/public/${r.id}`}
                        title="View Participants / PME"
                        className="p-1.5 rounded-xl bg-sky-500 text-white hover:opacity-90"
                      >
                        <Eye size={14} />
                      </Link>
                      <Link
                        href={`/training/public/${r.id}/edit`}
                        title="Edit Training"
                        className="p-1.5 rounded-xl bg-amber-500 text-white hover:opacity-90"
                      >
                        <Pencil size={14} />
                      </Link>
                      <button
                        disabled={pending}
                        onClick={() => handleDelete(r.id, r.title)}
                        title="Delete Training"
                        className="p-1.5 rounded-xl bg-rose-600 text-white hover:opacity-90 disabled:opacity-60"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={17} className="px-4 py-10 text-center text-text-muted">
                  No training sessions found.
                </td>
              </tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-border bg-gray-50 font-semibold">
                <td colSpan={15} className="px-3 py-2.5 text-right text-text-secondary">
                  Total Hours
                </td>
                <td className="px-3 py-2.5 text-text-primary">{totalManHours.toFixed(2)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
