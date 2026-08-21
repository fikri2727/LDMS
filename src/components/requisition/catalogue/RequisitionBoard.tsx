"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { resolveRequisitionTheme } from "@/lib/requisition-theme";
import { RequisitionCard } from "@/components/requisition/catalogue/RequisitionCard";
import { RequisitionDetailDrawer } from "@/components/requisition/catalogue/RequisitionDetailDrawer";
import type { RequisitionCardData } from "@/components/requisition/catalogue/types";

const STATUS_ORDER = ["PENDING", "APPROVED", "REJECTED"] as const;

export function RequisitionBoard({
  title,
  requisitions,
  showApplicant,
  emptyLabel,
}: {
  title: string;
  requisitions: RequisitionCardData[];
  showApplicant?: boolean;
  emptyLabel: string;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RequisitionCardData | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requisitions;
    return requisitions.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.venue.toLowerCase().includes(q) ||
        r.trainingProvider.toLowerCase().includes(q) ||
        (r.applicantName?.toLowerCase().includes(q) ?? false) ||
        r.status.toLowerCase().includes(q)
    );
  }, [requisitions, search]);

  const sections = useMemo(() => {
    const byStatus = new Map<string, RequisitionCardData[]>();
    for (const r of filtered) {
      const list = byStatus.get(r.status) ?? [];
      list.push(r);
      byStatus.set(r.status, list);
    }
    return STATUS_ORDER.filter((s) => byStatus.has(s)).map((s) => [s, byStatus.get(s)!] as const);
  }, [filtered]);

  if (requisitions.length === 0) {
    return (
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">{title}</h3>
        <p className="text-sm text-text-muted">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
          {title} <span className="normal-case text-text-muted">({requisitions.length})</span>
        </h3>
        <div className="relative w-56">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-xl border border-border bg-surface/80 pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-text-muted">No applications match your search.</p>
      ) : (
        <div className="space-y-6">
          {sections.map(([status, rows]) => {
            const theme = resolveRequisitionTheme(status);
            return (
              <div
                key={status}
                className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: theme.accentHex }} />
                  <h4 className="text-xs font-semibold text-text-primary">{theme.label}</h4>
                  <span className="text-[11px] text-text-muted">{rows.length}</span>
                  <div
                    className="flex-1 h-px"
                    style={{ background: `linear-gradient(to right, ${theme.accentHex}33, transparent)` }}
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3" style={{ perspective: "1200px" }}>
                  {rows.map((r, i) => (
                    <RequisitionCard
                      key={r.id}
                      requisition={r}
                      index={i}
                      showApplicant={showApplicant}
                      onOpen={setSelected}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RequisitionDetailDrawer requisition={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
