"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronDown, ChevronRight, ClipboardCheck, Layers, Users, BadgeCheck, Clock } from "lucide-react";
import { format } from "date-fns";
import { PME_STATUS_LABELS } from "@/lib/labels";

export interface PmeRecordRow {
  id: number;
  staffName: string;
  staffNo: string;
  trainingTitle: string;
  status: string;
  createdAt: string;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

const STATUS_STYLE: Record<string, { badge: string; avatar: string; bar: string }> = {
  VERIFIED: { badge: "bg-primary/10 text-primary-dark", avatar: "bg-primary/15 text-primary-dark", bar: "#46bea2" },
  PENDING: { badge: "bg-purple/10 text-purple", avatar: "bg-purple/15 text-purple", bar: "#6d3ecd" },
};

function SummaryChip({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  label: string;
  value: number;
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

function RecordCard({ r }: { r: PmeRecordRow }) {
  const style = STATUS_STYLE[r.status] ?? STATUS_STYLE.PENDING;
  return (
    <Link
      href={`/training/pme/${r.id}`}
      className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-3 hover:border-primary hover:shadow-[var(--shadow-card)] transition-all"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${style.avatar}`}>
        {initials(r.staffName)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary truncate group-hover:text-primary-dark">{r.staffName}</p>
        <p className="text-xs text-text-muted">{r.staffNo}</p>
        <div className="flex items-center justify-between mt-2 gap-2">
          <span className={`inline-flex rounded-full text-[10px] font-medium px-2 py-0.5 whitespace-nowrap ${style.badge}`}>
            {PME_STATUS_LABELS[r.status]}
          </span>
          <span className="text-[10px] text-text-muted whitespace-nowrap">
            {format(new Date(r.createdAt), "d MMM yyyy")}
          </span>
        </div>
      </div>
    </Link>
  );
}

function GroupCard({ title, recs, defaultOpen }: { title: string; recs: PmeRecordRow[]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const verifiedCount = recs.filter((r) => r.status === "VERIFIED").length;
  const percent = recs.length ? Math.round((verifiedCount / recs.length) * 100) : 0;

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-[var(--shadow-card)]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
      >
        {open ? (
          <ChevronDown size={16} className="shrink-0 text-text-muted" />
        ) : (
          <ChevronRight size={16} className="shrink-0 text-text-muted" />
        )}
        <ClipboardCheck size={15} className="shrink-0 text-primary-dark" />
        <span className="text-sm font-semibold text-text-primary truncate">{title}</span>
        <span className="shrink-0 text-xs text-text-muted">({recs.length})</span>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 w-24">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, background: "#46bea2" }} />
            </div>
          </div>
          <span className="whitespace-nowrap text-xs text-text-muted">
            {verifiedCount}/{recs.length} verified
          </span>
        </div>
      </button>

      {open && (
        <div className="grid grid-cols-1 gap-3 border-t border-border bg-gray-50/60 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {recs.map((r) => (
            <RecordCard key={r.id} r={r} />
          ))}
        </div>
      )}
    </div>
  );
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

  const verifiedTotal = filtered.filter((r) => r.status === "VERIFIED").length;
  const pendingTotal = filtered.length - verifiedTotal;

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
    <div className="max-w-4xl mb-8">
      <div className="flex flex-wrap gap-3 mb-4">
        <SummaryChip icon={Layers} label="Trainings" value={groups.length} accent="#6d3ecd" />
        <SummaryChip icon={Users} label="Records" value={filtered.length} accent="#1b75bc" />
        <SummaryChip icon={BadgeCheck} label="Verified" value={verifiedTotal} accent="#1d8e72" />
        <SummaryChip icon={Clock} label="Pending" value={pendingTotal} accent="#d97706" />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-3.5 mb-4 flex flex-wrap items-end justify-between gap-3">
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
        <div className="space-y-3">
          {groups.map(([title, recs]) => (
            <GroupCard key={title} title={title} recs={recs} defaultOpen />
          ))}
        </div>
      )}
    </div>
  );
}
