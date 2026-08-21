"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, BookOpen, Clock, User, ArrowRight, Award } from "lucide-react";
import { format } from "date-fns";
import { ModuleVisual } from "@/components/elearning/catalogue/ModuleVisual";
import { StatusBadge } from "@/components/elearning/catalogue/StatusBadge";
import { ProgressRing } from "@/components/elearning/catalogue/ProgressRing";
import type { ModuleTheme } from "@/lib/module-theme";
import type { LearningModuleCardData } from "@/components/elearning/catalogue/types";

const CTA_LABEL: Record<LearningModuleCardData["status"], string> = {
  NOT_STARTED: "Start Module",
  IN_PROGRESS: "Continue Module",
  COMPLETED: "Review Module",
};

export function ModuleDetailDrawer({
  module: m,
  theme,
  onClose,
}: {
  module: LearningModuleCardData | null;
  theme: ModuleTheme | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!m) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [m, onClose]);

  if (!m || !theme) return null;

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
            <span className="inline-flex rounded-full bg-white/15 text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1">
              {m.category}
            </span>
            <StatusBadge status={m.status} />
          </div>
          <div className="flex justify-center mb-4">
            <ModuleVisual theme={theme} title={m.title} />
          </div>
          <h2 className="text-lg font-semibold text-center leading-snug">{m.title}</h2>
        </div>

        <div className="px-6 py-6 space-y-6">
          <div className="flex items-center justify-around rounded-2xl border border-border bg-[var(--background)]/60 py-4">
            <ProgressRing percent={m.percent} color={theme.accentHex} size={64} />
            <div className="text-center">
              <p className="text-lg font-semibold text-text-primary">{m.score != null ? `${m.score}%` : "—"}</p>
              <p className="text-xs text-text-secondary">Score</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-text-primary">{m.lessonCount}</p>
              <p className="text-xs text-text-secondary">Lessons</p>
            </div>
          </div>

          {m.description && (
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">Description</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{m.description}</p>
            </div>
          )}

          {m.objectives.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">
                Learning Objectives
              </h3>
              <ul className="space-y-1.5">
                {m.objectives.map((o, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: theme.accentHex }} />
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-text-secondary">
              <Clock size={14} className="text-text-muted" /> ~{m.estimatedHours}h estimated
            </div>
            {m.owner && (
              <div className="flex items-center gap-2 text-text-secondary">
                <User size={14} className="text-text-muted" /> {m.owner}
              </div>
            )}
            {m.dueDate && (
              <div className="flex items-center gap-2 text-amber-600">
                <BookOpen size={14} /> Due {format(new Date(m.dueDate), "d MMM yyyy")}
              </div>
            )}
            {m.completedAt && (
              <div className="flex items-center gap-2 text-primary-dark">
                <BookOpen size={14} /> Completed {format(new Date(m.completedAt), "d MMM yyyy")}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Link
              href={`/elearning/learner/modules/${m.id}`}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl text-white font-medium py-3 transition-transform hover:scale-[1.02]"
              style={{ background: `linear-gradient(135deg, var(--color-primary-dark), ${theme.accentHex})` }}
            >
              {CTA_LABEL[m.status]} <ArrowRight size={16} />
            </Link>
            {m.status === "COMPLETED" && m.certificateId != null && (
              <Link
                href={`/elearning/learner/certificates/${m.certificateId}`}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-primary-soft text-primary-dark font-medium py-3 hover:bg-primary/10 transition-colors"
              >
                <Award size={16} /> View Certificate
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
