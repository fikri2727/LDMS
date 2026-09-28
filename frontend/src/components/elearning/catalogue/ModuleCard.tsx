"use client";

import { useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { BookOpen, Clock, Award, CheckCircle2 } from "lucide-react";
import type { ModuleTheme } from "@/lib/module-theme";
import { ModuleVisual } from "@/components/elearning/catalogue/ModuleVisual";
import { CategoryBadge } from "@/components/elearning/catalogue/CategoryBadge";
import type { LearningModuleCardData } from "@/components/elearning/catalogue/types";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "TL";
}

export function ModuleCard({
  module: m,
  theme,
  index,
  onOpen,
}: {
  module: LearningModuleCardData;
  theme: ModuleTheme;
  index: number;
  onOpen: (m: LearningModuleCardData) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [hovering, setHovering] = useState(false);
  const owner = m.owner ?? "TAMCO L&D";
  const percent = Math.max(0, Math.min(100, Math.round(m.percent)));

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    const rotateY = (px - 0.5) * 2 * 6;
    const rotateX = (0.5 - py) * 2 * 4;

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
      onClick={() => onOpen(m)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(m)}
      onMouseEnter={() => setHovering(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleLeave}
      className="group relative rounded-2xl border border-border bg-surface/70 backdrop-blur-sm p-3 text-left shadow-[var(--shadow-card)] transition-shadow duration-300 ease-out will-change-transform cursor-pointer opacity-0 animate-[count-up-fade_0.5s_ease-out_forwards]"
      style={{
        ...style,
        animationDelay: `${Math.min(index, 12) * 60}ms`,
        boxShadow: hovering
          ? `0 20px 40px -18px ${theme.accentHex}55, 0 1px 2px rgba(16,24,40,0.06)`
          : undefined,
        borderColor: hovering ? `${theme.accentHex}55` : undefined,
      }}
    >
      {/* cursor-follow light reflection */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(280px circle at var(--mx, 50%) var(--my, 50%), ${theme.accentSoftHex}33, transparent 60%)`,
        }}
      />

      {/* "photo" banner */}
      <div className={`relative h-28 rounded-xl overflow-hidden mb-2.5 bg-gradient-to-br ${theme.gradient}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <ModuleVisual theme={theme} title={m.title} size="sm" />
        </div>
        {percent > 0 && (
          <span className="absolute top-2 right-2 flex items-center justify-center h-7 w-7 rounded-full bg-surface shadow-sm">
            {m.status === "COMPLETED" ? (
              <CheckCircle2 size={15} className="text-primary-dark" />
            ) : (
              <span className="text-[10px] font-bold text-text-primary">{percent}%</span>
            )}
          </span>
        )}
      </div>

      <div className="relative flex items-center justify-between gap-2 mb-2">
        <CategoryBadge category={m.category} theme={theme} />
        <div className="flex items-center gap-2.5 text-[11px] text-text-muted shrink-0">
          <span className="flex items-center gap-1">
            <BookOpen size={12} /> {m.lessonCount}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} /> {m.estimatedHours}h
          </span>
        </div>
      </div>

      <h3 className="relative text-sm text-text-primary font-semibold leading-snug mb-2.5 line-clamp-2 min-h-[2.25rem]">
        {m.title}
      </h3>

      <div className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="flex items-center justify-center h-6 w-6 rounded-full text-white text-[10px] font-semibold shrink-0"
            style={{ backgroundColor: theme.accentHex }}
          >
            {initials(owner)}
          </span>
          <span className="text-xs font-medium truncate" style={{ color: theme.accentHex }}>
            {owner}
          </span>
        </div>
        {m.status === "COMPLETED" && m.certificateId != null && (
          <Link
            href={`/elearning/learner/certificates/${m.certificateId}`}
            onClick={(e) => e.stopPropagation()}
            title="View Certificate"
            className="shrink-0 text-primary-dark hover:text-primary"
          >
            <Award size={16} />
          </Link>
        )}
      </div>
    </div>
  );
}
