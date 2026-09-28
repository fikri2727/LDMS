"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Search, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { deleteOjt } from "@/app/(app)/training/ojt/actions";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { SortableTh, type SortDir } from "@/components/ui/SortableTh";
import { ParticipantsModal, type ParticipantSummary } from "@/components/training/ParticipantsModal";

type SortKey =
  | "code"
  | "title"
  | "keyInBy"
  | "startDate"
  | "endDate"
  | "startTime"
  | "endTime"
  | "days"
  | "participant"
  | "manHour";

const SORT_ACCESSORS: Record<SortKey, (r: OjtRow) => string | number> = {
  code: (r) => r.trainingCode,
  title: (r) => r.title,
  keyInBy: (r) => r.keyInBy,
  startDate: (r) => r.startDate,
  endDate: (r) => r.endDate,
  startTime: (r) => r.startTime,
  endTime: (r) => r.endTime,
  days: (r) => r.totalHour,
  participant: (r) => r.par,
  manHour: (r) => r.totalManHour,
};

export interface OjtRow {
  id: number;
  trainingCode: string;
  title: string;
  trainerName: string;
  keyInBy: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  totalDay: number;
  totalHour: number;
  totalManHour: number;
  par: number;
  comp: number;
  participants: ParticipantSummary[];
}

export function OjtRecordsTable({ rows }: { rows: OjtRow[] }) {
  const [trainerFilter, setTrainerFilter] = useState("");
  const [startFilter, setStartFilter] = useState("");
  const [endFilter, setEndFilter] = useState("");
  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [activeRowId, setActiveRowId] = useState<number | null>(null);

  const trainers = useMemo(
    () => Array.from(new Set(rows.map((r) => r.trainerName))).filter(Boolean).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (trainerFilter && r.trainerName !== trainerFilter) return false;
      if (appliedStart && r.startDate < appliedStart) return false;
      if (appliedEnd && r.endDate > appliedEnd) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.title.toLowerCase().includes(q) && !r.trainingCode.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, trainerFilter, appliedStart, appliedEnd, search]);

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

  const totalManHours = useMemo(() => filtered.reduce((sum, r) => sum + r.totalManHour, 0), [filtered]);
  const activeRow = rows.find((r) => r.id === activeRowId) ?? null;
  const confirm = useConfirm();

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

  return (
    <div>
      {error && (
        <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-end gap-2">
          <select
            value={trainerFilter}
            onChange={(e) => setTrainerFilter(e.target.value)}
            className="rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">-- Select Trainer --</option>
            {trainers.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <div>
            <input
              type="date"
              value={startFilter}
              onChange={(e) => setStartFilter(e.target.value)}
              placeholder="Insert Start Date"
              className="rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <input
              type="date"
              value={endFilter}
              onChange={(e) => setEndFilter(e.target.value)}
              placeholder="Insert End Date"
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
              setTrainerFilter("");
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

      <div className="bg-surface rounded-2xl border border-border">
        <table className="w-full text-xs table-fixed">
          <thead className="bg-gray-50 text-left text-text-muted text-[11px] uppercase tracking-wide">
            <tr>
              <th className="px-2 py-2 font-medium w-6">No</th>
              <SortableTh label="Code" active={sortKey === "code"} dir={sortDir} onClick={() => toggleSort("code")} className="px-2 py-2 w-28" />
              <SortableTh label="Title" active={sortKey === "title"} dir={sortDir} onClick={() => toggleSort("title")} className="px-2 py-2 w-32 break-words" />
              <SortableTh label="Key In By" active={sortKey === "keyInBy"} dir={sortDir} onClick={() => toggleSort("keyInBy")} className="px-2 py-2 w-24 break-words" />
              <SortableTh label="Start Date" active={sortKey === "startDate"} dir={sortDir} onClick={() => toggleSort("startDate")} className="px-2 py-2 w-20" />
              <SortableTh label="End Date" active={sortKey === "endDate"} dir={sortDir} onClick={() => toggleSort("endDate")} className="px-2 py-2 w-20" />
              <SortableTh label="Start Time" active={sortKey === "startTime"} dir={sortDir} onClick={() => toggleSort("startTime")} className="px-2 py-2 w-12" />
              <SortableTh label="End Time" active={sortKey === "endTime"} dir={sortDir} onClick={() => toggleSort("endTime")} className="px-2 py-2 w-12" />
              <SortableTh label="Days / Hours" active={sortKey === "days"} dir={sortDir} onClick={() => toggleSort("days")} className="px-2 py-2 w-16" />
              <SortableTh label="Participant" active={sortKey === "participant"} dir={sortDir} onClick={() => toggleSort("participant")} className="px-2 py-2 w-20" />
              <SortableTh label="Man Hour" active={sortKey === "manHour"} dir={sortDir} onClick={() => toggleSort("manHour")} className="px-2 py-2 w-14" />
              <th className="px-2 py-2 font-medium w-20">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((r, i) => {
              const per = r.par > 0 ? Math.round((r.comp / r.par) * 100) : 0;
              return (
                <tr key={r.id} className="hover:bg-gray-50 align-top">
                  <td className="px-2 py-2 text-text-muted">{i + 1}</td>
                  <td className="px-2 py-2 font-mono whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setActiveRowId(r.id)}
                      title="View participants & evaluation status"
                      className="text-primary-dark hover:underline"
                    >
                      {r.trainingCode}
                    </button>
                  </td>
                  <td className="px-2 py-2 break-words">
                    <Link href={`/training/ojt/${r.id}`} className="text-primary-dark font-medium hover:underline">
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-text-secondary break-words">{r.keyInBy}</td>
                  <td className="px-2 py-2 text-text-secondary">{format(new Date(r.startDate), "dd/MM/yyyy")}</td>
                  <td className="px-2 py-2 text-text-secondary">{format(new Date(r.endDate), "dd/MM/yyyy")}</td>
                  <td className="px-2 py-2 text-text-secondary">{r.startTime}</td>
                  <td className="px-2 py-2 text-text-secondary">{r.endTime}</td>
                  <td className="px-2 py-2 text-text-secondary">
                    {r.totalDay}d / {r.totalHour.toFixed(2)}h
                  </td>
                  <td className="px-2 py-2 text-text-secondary">
                    {r.comp} / {r.par} ({per} %)
                  </td>
                  <td className="px-2 py-2 text-text-secondary">{r.totalManHour.toFixed(2)}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/training/ojt/${r.id}/edit`}
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
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-10 text-center text-text-muted">
                  No OJT records found.
                </td>
              </tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-border bg-gray-50 font-semibold">
                <td colSpan={10} className="px-2 py-2 text-right text-text-secondary">
                  Total Hours
                </td>
                <td className="px-2 py-2 text-text-primary">{totalManHours.toFixed(2)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {activeRow && (
        <ParticipantsModal
          title={activeRow.title}
          code={activeRow.trainingCode}
          participants={activeRow.participants}
          onClose={() => setActiveRowId(null)}
        />
      )}
    </div>
  );
}
