import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { requireSession } from "@/lib/guard";
import { canViewAllPme } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PME_STATUS_LABELS, RATING_BAND_SHORT_LABELS } from "@/lib/labels";
import { getPmeDueDate, isPmeDue, getEvaluationPeriod } from "@/lib/pme";
import { PmeEvaluationForm } from "@/components/training/PmeEvaluationForm";
import { evaluatePme } from "@/app/(app)/training/pme/actions";

function RatingSummary({
  title,
  rating,
  percent,
  remark,
}: {
  title: string;
  rating: string | null;
  percent: string | null;
  remark: string | null;
}) {
  return (
    <div className="border border-border rounded-xl p-4">
      <h4 className="text-sm font-semibold text-text-primary mb-1">{title}</h4>
      <p className="text-sm text-text-secondary">
        {rating ? RATING_BAND_SHORT_LABELS[rating] : "—"} {percent && `— ${percent}`}
      </p>
      {remark && <p className="text-sm text-text-muted mt-1">{remark}</p>}
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
        <div className="space-y-4 max-w-2xl">
          {(pme.fromDate || pme.toDate) && (
            <p className="text-sm text-text-secondary">
              Evaluation period: {pme.fromDate ? format(pme.fromDate, "d MMM yyyy") : "—"} –{" "}
              {pme.toDate ? format(pme.toDate, "d MMM yyyy") : "—"}
            </p>
          )}
          <RatingSummary
            title="1. Knowledge Sharing / OJT"
            rating={pme.levelRating}
            percent={pme.levelPercent}
            remark={pme.levelRemark}
          />
          {pme.ojtConducted != null && (
            <p className="text-sm text-text-secondary">
              OJT conducted: {pme.ojtConducted ? "Yes" : "No"}
              {pme.ojtDetails && ` — ${pme.ojtDetails}`}
            </p>
          )}
          <RatingSummary
            title="2. Learning"
            rating={pme.levelRating2}
            percent={pme.levelPercent2}
            remark={pme.levelRemark2}
          />
          <RatingSummary
            title="3. Behavior"
            rating={pme.behavioralRating}
            percent={pme.behavioralPercent}
            remark={pme.behavioralRemark}
          />
          <RatingSummary
            title="4. Results"
            rating={pme.resultRating}
            percent={pme.resultPercent}
            remark={pme.resultRemark}
          />

          {pme.totalMark != null && (
            <p className="text-sm text-text-secondary font-medium">
              Total Mark: {pme.totalMark} &middot; Average: {pme.averageMark?.toFixed(1)}%
            </p>
          )}

          <p className="text-sm text-text-muted">
            Evaluated by {pme.supervisor?.staffName ?? "supervisor"}
            {pme.evaluatedAt && ` on ${format(pme.evaluatedAt, "d MMM yyyy")}`}.
          </p>
        </div>
      )}
    </div>
  );
}
