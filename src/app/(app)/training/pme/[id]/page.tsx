import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Users, BookOpen, Target, TrendingUp, CheckCircle2, XCircle, Award } from "lucide-react";
import { format } from "date-fns";
import { requireSession } from "@/lib/guard";
import { canViewAllPme } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PME_STATUS_LABELS, RATING_BAND_LABELS, RATING_BAND_SHORT_LABELS } from "@/lib/labels";
import { getPmeDueDate, isPmeDue, getEvaluationPeriod } from "@/lib/pme";
import { PME_QUESTIONS, PME_OJT_QUESTION } from "@/lib/pme-questions";
import { PmeEvaluationForm } from "@/components/training/PmeEvaluationForm";
import { evaluatePme } from "@/app/(app)/training/pme/actions";

/** Colour per rating band — drives the score ring, question accents, and progress bars below. */
const RATING_BAND_COLORS: Record<string, string> = {
  EXCELLENT: "#1d8e72",
  VERY_GOOD: "#46bea2",
  GOOD: "#6d3ecd",
  SATISFACTORY: "#d97706",
  FAIR: "#ea580c",
  POOR: "#e11d48",
};

/** Icon per fixed question, matched by Pme field prefix. */
const QUESTION_ICONS = {
  level: Users,
  level2: BookOpen,
  behavioral: Target,
  result: TrendingUp,
} as const;

function overallAccent(percent: number) {
  if (percent >= 90) return RATING_BAND_COLORS.EXCELLENT;
  if (percent >= 80) return RATING_BAND_COLORS.VERY_GOOD;
  if (percent >= 70) return RATING_BAND_COLORS.GOOD;
  if (percent >= 60) return RATING_BAND_COLORS.SATISFACTORY;
  if (percent >= 50) return RATING_BAND_COLORS.FAIR;
  return RATING_BAND_COLORS.POOR;
}

function ScoreRing({ percent, color, size = 100 }: { percent: number; color: string; size?: number }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - clamped / 100);
  const center = size / 2;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" style={{ width: size, height: size }}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-text-primary">{clamped.toFixed(1)}%</span>
      </div>
    </div>
  );
}

function QuestionCard({
  number,
  icon: Icon,
  section,
  question,
  rating,
  percent,
  remark,
  children,
}: {
  number: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  section: string;
  question: string;
  rating: string | null;
  percent: string | null;
  remark: string | null;
  children?: React.ReactNode;
}) {
  const accent = rating ? RATING_BAND_COLORS[rating] : "#8a8d94";
  const barPercent = Math.max(0, Math.min(100, Number(percent) || 0));

  return (
    <div className="relative flex gap-4">
      <div
        className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
        style={{ background: accent }}
      >
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-card)] mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: accent }}>
          {section}
        </p>
        <h4 className="text-sm font-medium text-text-primary mt-0.5 mb-3">
          {number}. {question}
        </h4>

        {rating ? (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                style={{ background: accent }}
              >
                {RATING_BAND_SHORT_LABELS[rating]}
              </span>
              {percent && <span className="text-sm font-semibold text-text-primary">{percent}</span>}
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${barPercent}%`, background: accent }}
              />
            </div>
            <p className="text-xs text-text-muted">{RATING_BAND_LABELS[rating]}</p>
          </>
        ) : (
          <p className="text-sm text-text-muted">—</p>
        )}

        {remark && (
          <div className="mt-3 rounded-xl bg-gray-50 border-l-2 pl-3 py-2 pr-3" style={{ borderColor: accent }}>
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-0.5">Remarks</p>
            <p className="text-sm text-text-secondary">{remark}</p>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

export default async function PmeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const pmeId = Number(id);

  const pme = await prisma.pme.findUnique({
    where: { id: pmeId },
    include: { training: true, supervisor: true },
  });

  if (!pme) notFound();

  const isSupervisor = pme.supervisorId === session.userId;
  const isAdminViewer = !isSupervisor && canViewAllPme(session);

  // Only the assigned supervisor (who can evaluate) or an admin (read-only,
  // for monitoring) may view this PME record — no one else, including the
  // employee it's about.
  if (!isSupervisor && !isAdminViewer) {
    redirect("/training/pme");
  }

  const due = isPmeDue(pme.training.endDate);
  const dueDate = getPmeDueDate(pme.training.endDate);
  const period = getEvaluationPeriod(pme.training.endDate);

  return (
    <div>
      <Link href="/training/pme" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4">
        <ArrowLeft size={15} /> Back to PME
      </Link>

      <h2 className="text-base font-semibold text-text-primary mb-1">{pme.trainingTitle}</h2>
      <p className="text-xs text-text-secondary mb-4">
        {pme.staffName} ({pme.staffNo}) &middot; {pme.department}
      </p>

      <div className="mb-4">
        <span className="inline-flex rounded-full bg-primary/10 text-primary-dark text-xs font-medium px-2.5 py-1">
          {PME_STATUS_LABELS[pme.status]}
        </span>
      </div>

      {pme.status === "PENDING" && !due && (
        <p className="text-sm text-text-muted">
          Not yet due — this evaluation opens on {format(dueDate, "d MMM yyyy")} (3 months after the day after the
          training ends).
        </p>
      )}

      {pme.status === "PENDING" && due && isSupervisor && (
        <div className="mb-4">
          <p className="text-xs text-text-secondary mb-3">
            Please complete the Performance Monitoring Evaluation for this staff member.
          </p>
          <PmeEvaluationForm
            action={evaluatePme.bind(null, pme.id)}
            employee={{
              staffName: pme.staffName,
              staffNo: pme.staffNo,
              department: pme.department,
              trainingTitle: pme.trainingTitle,
              periodStart: format(period.start, "d MMM yyyy"),
              periodEnd: format(period.end, "d MMM yyyy"),
            }}
          />
        </div>
      )}

      {pme.status === "PENDING" && due && isAdminViewer && (
        <p className="text-sm text-text-muted">
          Due, but not yet evaluated — waiting on {pme.supervisor?.staffName ?? "the assigned supervisor"}.
        </p>
      )}

      {pme.status === "VERIFIED" && (
        <div className="max-w-3xl">
          {/* Overview panel — overall score ring + key facts at a glance */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)] mb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-6">
              <div className="flex flex-col items-center justify-center shrink-0">
                <ScoreRing
                  percent={pme.averageMark ?? 0}
                  color={overallAccent(pme.averageMark ?? 0)}
                />
                <p className="text-[11px] text-text-muted mt-2 flex items-center gap-1">
                  <Award size={12} /> Overall Average
                </p>
              </div>
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4 content-center">
                <div>
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-1">Total Mark</p>
                  <p className="text-lg font-semibold text-text-primary">{pme.totalMark ?? "—"}</p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-1">
                    Evaluation Period
                  </p>
                  <p className="text-sm font-medium text-text-primary">
                    {pme.fromDate ? format(pme.fromDate, "d MMM yyyy") : "—"} –{" "}
                    {pme.toDate ? format(pme.toDate, "d MMM yyyy") : "—"}
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-1">
                    Evaluated By
                  </p>
                  <p className="text-sm font-medium text-text-primary">{pme.supervisor?.staffName ?? "Supervisor"}</p>
                  {pme.evaluatedAt && (
                    <p className="text-xs text-text-muted">{format(pme.evaluatedAt, "d MMM yyyy")}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Question timeline */}
          <div className="relative">
            <div className="absolute left-[17px] top-2 bottom-7 w-px bg-border" aria-hidden />

            <QuestionCard
              number={PME_QUESTIONS.level.number}
              icon={QUESTION_ICONS.level}
              section={PME_QUESTIONS.level.section}
              question={PME_QUESTIONS.level.question}
              rating={pme.levelRating}
              percent={pme.levelPercent}
              remark={pme.levelRemark}
            >
              {pme.ojtConducted != null && (
                <div className="mt-3 rounded-xl border border-border bg-gray-50 p-3">
                  <p className="text-xs font-medium text-text-secondary mb-1.5">{PME_OJT_QUESTION}</p>
                  <div className="flex items-center gap-1.5">
                    {pme.ojtConducted ? (
                      <CheckCircle2 size={14} className="text-primary-dark" />
                    ) : (
                      <XCircle size={14} className="text-rose-500" />
                    )}
                    <span className="text-sm font-semibold text-text-primary">
                      {pme.ojtConducted ? "Yes" : "No"}
                    </span>
                  </div>
                  {pme.ojtDetails && <p className="text-xs text-text-muted mt-1">{pme.ojtDetails}</p>}
                </div>
              )}
            </QuestionCard>

            <QuestionCard
              number={PME_QUESTIONS.level2.number}
              icon={QUESTION_ICONS.level2}
              section={PME_QUESTIONS.level2.section}
              question={PME_QUESTIONS.level2.question}
              rating={pme.levelRating2}
              percent={pme.levelPercent2}
              remark={pme.levelRemark2}
            />

            <QuestionCard
              number={PME_QUESTIONS.behavioral.number}
              icon={QUESTION_ICONS.behavioral}
              section={PME_QUESTIONS.behavioral.section}
              question={PME_QUESTIONS.behavioral.question}
              rating={pme.behavioralRating}
              percent={pme.behavioralPercent}
              remark={pme.behavioralRemark}
            />

            <QuestionCard
              number={PME_QUESTIONS.result.number}
              icon={QUESTION_ICONS.result}
              section={PME_QUESTIONS.result.section}
              question={PME_QUESTIONS.result.question}
              rating={pme.resultRating}
              percent={pme.resultPercent}
              remark={pme.resultRemark}
            />
          </div>
        </div>
      )}
    </div>
  );
}
