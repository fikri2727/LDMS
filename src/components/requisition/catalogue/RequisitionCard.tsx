"use client";

import { useRef, useState, type MouseEvent } from "react";
import { ArrowRight, CalendarDays, MapPin, Users, BadgeCheck, CalendarCheck2 } from "lucide-react";
import { formatDateRange } from "@/lib/date-range";
import { resolveRequisitionTheme } from "@/lib/requisition-theme";
import { RequisitionVisual } from "@/components/requisition/catalogue/RequisitionVisual";
import { RequisitionStatusBadge } from "@/components/requisition/catalogue/RequisitionStatusBadge";
import type { RequisitionCardData } from "@/components/requisition/catalogue/types";

const MAX_TILT_X = 4;
const MAX_TILT_Y = 6;

export function RequisitionCard({
  requisition: r,
  index,
  showApplicant,
  onOpen,
}: {
  requisition: RequisitionCardData;
  index: number;
  showApplicant?: boolean;
  onOpen: (r: RequisitionCardData) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [hovering, setHovering] = useState(false);
  const theme = resolveRequisitionTheme(r.status);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    const rotateY = (px - 0.5) * 2 * MAX_TILT_Y;
    const rotateX = (0.5 - py) * 2 * MAX_TILT_X;

    setStyle({
      transform: `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`,
      "--mx": `${px * 100}%`,
      "--my": `${py * 100}%`,
    } as React.CSSProperties);
  }

  function handleLeave() {
    setHovering(false);
    setStyle({ transform: "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)" });
  }

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(r)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(r)}
      onMouseEnter={() => setHovering(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleLeave}
      className="group relative rounded-2xl border border-border bg-surface p-3.5 text-left shadow-[var(--shadow-card)] transition-shadow duration-300 ease-out will-change-transform cursor-pointer opacity-0 animate-[count-up-fade_0.5s_ease-out_forwards]"
      style={{
        ...style,
        animationDelay: `${Math.min(index, 12) * 60}ms`,
        boxShadow: hovering ? `0 20px 40px -18px ${theme.accentHex}55, 0 1px 2px rgba(16,24,40,0.06)` : undefined,
        borderColor: hovering ? `${theme.accentHex}55` : undefined,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(280px circle at var(--mx, 50%) var(--my, 50%), ${theme.accentSoftHex}33, transparent 60%)`,
        }}
      />

      <div className="relative flex items-start justify-between mb-2.5 gap-2">
        <div className="min-w-0">
          {showApplicant && r.applicantName && (
            <p className="text-[11px] text-text-secondary truncate">
              {r.applicantName} <span className="text-text-muted">({r.applicantNo})</span>
            </p>
          )}
        </div>
        <RequisitionStatusBadge status={r.status} />
      </div>

      <div className="relative flex justify-center mb-2.5">
        <RequisitionVisual status={r.status} size="sm" />
      </div>

      <h3 className="relative text-sm text-text-primary font-semibold leading-snug mb-2 line-clamp-2 min-h-[2.25rem]">
        {r.title}
      </h3>

      <div className="relative text-[11px] text-text-secondary space-y-1 mb-2.5">
        <p className="flex items-center gap-1">
          <CalendarDays size={11} /> {formatDateRange(new Date(r.trainingDate), r.trainingEndDate ? new Date(r.trainingEndDate) : null)}
        </p>
        <p className="flex items-center gap-1 truncate">
          <MapPin size={11} /> {r.venue}
        </p>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Users size={11} /> {r.participantCount}
          </span>
          <span className="font-medium text-text-primary">RM {r.fees.toFixed(2)}</span>
        </div>
        {r.hrdcClaimable && (
          <p className="flex items-center gap-1 text-primary-dark">
            <BadgeCheck size={11} /> HRDC Claimable
          </p>
        )}
        {r.underAtp && (
          <p className="flex items-center gap-1 text-purple">
            <CalendarCheck2 size={11} /> Under ATP
          </p>
        )}
      </div>

      <div
        className="relative flex items-center justify-start gap-1 text-xs font-medium text-primary-dark transition-all duration-300 group-hover:gap-2"
        style={{ color: hovering ? theme.accentHex : undefined }}
      >
        View Details <ArrowRight size={13} />
      </div>
    </div>
  );
}
