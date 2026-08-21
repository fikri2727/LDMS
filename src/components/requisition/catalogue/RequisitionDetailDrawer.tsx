"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, CalendarDays, Clock, MapPin, Users, BadgeCheck, ArrowRight, FileText } from "lucide-react";
import { format } from "date-fns";
import { formatDateRange } from "@/lib/date-range";
import { resolveRequisitionTheme } from "@/lib/requisition-theme";
import { RequisitionVisual } from "@/components/requisition/catalogue/RequisitionVisual";
import { RequisitionStatusBadge } from "@/components/requisition/catalogue/RequisitionStatusBadge";
import type { RequisitionCardData } from "@/components/requisition/catalogue/types";

export function RequisitionDetailDrawer({
  requisition: r,
  onClose,
}: {
  requisition: RequisitionCardData | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!r) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [r, onClose]);

  if (!r) return null;
  const theme = resolveRequisitionTheme(r.status);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-text-primary/30 backdrop-blur-sm animate-[count-up-fade_0.25s_ease-out_forwards]"
        onClick={onClose}
      />
      <div className="relative h-full w-full max-w-md bg-surface shadow-2xl overflow-y-auto animate-[drawer-in_0.35s_cubic-bezier(0.16,1,0.3,1)_forwards]">
        <div className={`relative px-6 pt-6 pb-8 bg-gradient-to-br ${theme.gradient} text-white overflow-hidden`}>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-white/15 p-1.5 hover:bg-white/25 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
          <div className="flex items-center justify-between mb-4">
            {r.applicantName && (
              <span className="inline-flex rounded-full bg-white/15 text-[11px] font-semibold px-2.5 py-1">
                {r.applicantName} ({r.applicantNo})
              </span>
            )}
            <RequisitionStatusBadge status={r.status} />
          </div>
          <div className="flex justify-center mb-4">
            <RequisitionVisual status={r.status} />
          </div>
          <h2 className="text-lg font-semibold text-center leading-snug">{r.title}</h2>
        </div>

        <div className="px-6 py-6 space-y-6">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-text-secondary">
              <CalendarDays size={14} className="text-text-muted" />
              {formatDateRange(new Date(r.trainingDate), r.trainingEndDate ? new Date(r.trainingEndDate) : null)}
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <Clock size={14} className="text-text-muted" /> {r.startTime} – {r.endTime}
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <MapPin size={14} className="text-text-muted" /> {r.venue}
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <Users size={14} className="text-text-muted" /> {r.participantCount} participant
              {r.participantCount === 1 ? "" : "s"}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-gray-50 p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Training Provider</span>
              <span className="font-medium text-text-primary">{r.trainingProvider}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Fees</span>
              <span className="font-medium text-text-primary">RM {r.fees.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">HRDC Claimable</span>
              <span className={`font-medium ${r.hrdcClaimable ? "text-primary-dark" : "text-text-muted"}`}>
                {r.hrdcClaimable ? (
                  <span className="flex items-center gap-1">
                    <BadgeCheck size={13} /> Yes
                  </span>
                ) : (
                  "No"
                )}
              </span>
            </div>
            {r.grantId && (
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Grant ID</span>
                <span className="font-medium text-text-primary">{r.grantId}</span>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">Objective</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{r.objective}</p>
          </div>

          {r.remarks && (
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">Remarks</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{r.remarks}</p>
            </div>
          )}

          {r.brochureFileName && (
            <a
              href={`/api/requisition-brochures/${r.id}`}
              className="flex items-center gap-2 text-sm text-primary-dark hover:underline"
            >
              <FileText size={14} /> {r.brochureFileName}
            </a>
          )}

          {r.reviewedByName && (
            <p className="text-xs text-text-muted">
              {r.status === "APPROVED" ? "Approved" : "Rejected"} by {r.reviewedByName}
              {r.reviewedAt ? ` · ${format(new Date(r.reviewedAt), "d MMM yyyy")}` : ""}
            </p>
          )}

          <Link
            href={`/requisition/${r.id}`}
            className="flex items-center justify-center gap-2 rounded-xl text-white font-medium py-3 transition-transform hover:scale-[1.02]"
            style={{ background: `linear-gradient(135deg, var(--color-text-primary), ${theme.accentHex})` }}
          >
            View Full Details <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
