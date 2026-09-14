"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronDown, ChevronRight, GraduationCap, Layers, Users, Timer, Trophy, ExternalLink } from "lucide-react";
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

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

function scoreAccent(score: number | null) {
  if (score == null) return "#8a8d94";
  if (score >= 80) return "#1d8e72";
  if (score >= 60) return "#6d3ecd";
  return "#d97706";
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100;
}

function SummaryChip({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${accent}1a` }}>
        <Icon size={15} className="shrink-0" style={{ color: accent }} />
      </div>
      <div>
        <p className="text-[10px] font-medium text-text-muted uppercase tracking-wide leading-none mb-1">{label}</p>
        <p className="text-sm font-semibold text-text-primary leading-none">{value}</p>
      </div>
    </div>
  );
}

function CompletionCard({ r }: { r: ElearningHoursRow }) {
  const accent = scoreAccent(r.score);
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
        style={{ background: `${accent}22`, color: accent }}
      >
        {initials(r.staffName)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary truncate">{r.staffName}</p>
        <p className="text-xs text-text-muted truncate">
          {r.staffNo} &middot; {r.department}
        </p>
        <div className="flex items-center justify-between mt-2 gap-2">
          <span
            className="inline-flex rounded-full text-[10px] font-semibold px-2 py-0.5 whitespace-nowrap"
            style={{ background: `${accent}1a`, color: accent }}
          >
            {r.score != null ? `${Math.round(r.score)}%` : "—"}
          </span>
          <span className="text-[10px] text-text-muted whitespace-nowrap">
            {format(new Date(r.completedAt), "d MMM yyyy")} &middot; {r.hours.toFixed(2)}h
          </span>
        </div>
      </div>
    </div>
  );
}

function ModuleGroup({
  moduleId,
  title,
  recs,
  defaultOpen,
}: {
  moduleId: number;
  title: string;
  recs: ElearningHoursRow[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const avgScore = average(recs.map((r) => r.score).filter((s): s is number => s != null));
  const totalHours = recs.reduce((sum, r) => sum + r.hours, 0);

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2.5 px-4 py-3.5 hover:bg-gray-50 transition-colors">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 min-w-0 items-center gap-2.5 text-left"
        >
          {open ? (
            <ChevronDown size={16} className="shrink-0 text-text-muted" />
          ) : (
            <ChevronRight size={16} className="shrink-0 text-text-muted" />
          )}
          <GraduationCap size={15} className="shrink-0 text-primary-dark" />
          <span className="text-sm font-semibold text-text-primary truncate">{title}</span>
          <span className="shrink-0 text-xs text-text-muted">({recs.length})</span>
        </button>

        <div className="flex shrink-0 items-center gap-3">
          {avgScore != null && (
            <span className="hidden sm:inline text-xs text-text-muted whitespace-nowrap">
              Avg {Math.round(avgScore)}%
            </span>
          )}
          <span className="hidden sm:inline text-xs text-text-muted whitespace-nowrap">
            {totalHours.toFixed(2)}h total
          </span>
          <Link
            href={`/elearning/admin/modules/${moduleId}`}
            className="flex items-center gap-1 text-xs font-medium text-primary-dark hover:underline whitespace-nowrap"
          >
            Open <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      {open && (
        <div className="grid grid-cols-1 gap-3 border-t border-border bg-gray-50/60 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {recs.map((r) => (
            <CompletionCard key={r.id} r={r} />
          ))}
        </div>
      )}
    </div>
  );
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

  const groups = useMemo(() => {
    const map = new Map<number, { title: string; recs: ElearningHoursRow[] }>();
    for (const r of filtered) {
      const entry = map.get(r.moduleId) ?? { title: r.moduleTitle, recs: [] };
      entry.recs.push(r);
      map.set(r.moduleId, entry);
    }
    return [...map.entries()];
  }, [filtered]);

  const totalHours = useMemo(() => filtered.reduce((sum, r) => sum + r.hours, 0), [filtered]);
  const avgScore = useMemo(
    () => average(filtered.map((r) => r.score).filter((s): s is number => s != null)),
    [filtered]
  );

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap gap-3 mb-4">
        <SummaryChip icon={Layers} label="Modules" value={String(groups.length)} accent="#6d3ecd" />
        <SummaryChip icon={Users} label="Completions" value={String(filtered.length)} accent="#1b75bc" />
        <SummaryChip icon={Timer} label="Total Hours" value={totalHours.toFixed(2)} accent="#1d8e72" />
        <SummaryChip icon={Trophy} label="Avg Score" value={avgScore != null ? `${Math.round(avgScore)}%` : "—"} accent="#d97706" />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-3.5 mb-4 flex items-center justify-end">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Staff or module..."
            className="w-full rounded-xl border border-border pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-text-muted">No completed e-learning records found.</p>
      ) : (
        <div className="space-y-3">
          {groups.map(([moduleId, { title, recs }]) => (
            <ModuleGroup key={moduleId} moduleId={moduleId} title={title} recs={recs} defaultOpen />
          ))}
        </div>
      )}
    </div>
  );
}
