import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { requireSession } from "@/lib/guard";
import { canReviewRequisitions, canViewAllRequisitions } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { REQUISITION_STATUS_LABELS, DESIGNATION_LABELS } from "@/lib/labels";
import { formatDateRange } from "@/lib/date-range";
import { deriveRequisitionDisplayStatus } from "@/lib/requisition-status";
import { RequisitionReviewButtons } from "@/components/requisition/RequisitionReviewButtons";
import { DeleteRequisitionButton } from "@/components/requisition/DeleteRequisitionButton";
import { RequisitionPdfButton } from "@/components/requisition/RequisitionPdfButton";
import { GrantIdForm } from "@/components/requisition/GrantIdForm";
import { reviewRequisition, updateGrantId } from "../actions";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-purple/10 text-purple",
  APPROVED: "bg-primary/10 text-primary-dark",
  COMPLETED: "bg-blue-50 text-blue-600",
  REJECTED: "bg-rose-50 text-rose-600",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm text-text-primary">{value}</div>
    </div>
  );
}

export default async function RequisitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const requisition = await prisma.trainingRequisition.findUnique({
    where: { id: Number(id) },
    include: {
      user: { include: { department: true } },
      reviewedBy: true,
      participants: { include: { user: true } },
    },
  });
  if (!requisition) notFound();

  const isOwner = requisition.userId === session.userId;
  const isAdmin = canViewAllRequisitions(session);
  const isHodReviewer = canReviewRequisitions(session) && requisition.user.hodId === session.userId;
  const canView = isOwner || isHodReviewer || isAdmin;
  if (!canView) redirect("/requisition");

  // HODs make a one-time call while it's pending; Admins can approve/reject
  // (and revise an existing decision) at any time — see reviewRequisition.
  const canReview = isAdmin || (isHodReviewer && requisition.status === "PENDING");
  const isRevision = isAdmin && requisition.status !== "PENDING";
  const displayStatus = deriveRequisitionDisplayStatus(
    requisition.status,
    requisition.trainingDate,
    requisition.trainingEndDate
  );
  const canDownloadPdf = isAdmin && (displayStatus === "APPROVED" || displayStatus === "COMPLETED");

  return (
    <div>
      <Link href="/requisition" className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-4">
        <ArrowLeft size={15} /> Back to Staff Training Requisition
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{requisition.title}</h2>
          <p className="text-xs text-text-muted mt-1">
            {requisition.user.staffName} ({requisition.user.staffNo}) · {requisition.user.department?.name ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex rounded-full text-xs font-medium px-3 py-1.5 ${STATUS_STYLES[displayStatus]}`}>
            {REQUISITION_STATUS_LABELS[displayStatus]}
          </span>
          {canDownloadPdf && (
            <RequisitionPdfButton
              title={requisition.title}
              applicantName={requisition.user.staffName}
              applicantDept={requisition.user.department?.name ?? "—"}
              dateApply={format(requisition.createdAt, "d MMM yyyy")}
              participants={requisition.participants.map((p) => ({
                staffName: p.user.staffName,
                position: DESIGNATION_LABELS[p.user.designation] ?? p.user.designation,
              }))}
              trainingDateRange={formatDateRange(requisition.trainingDate, requisition.trainingEndDate)}
              time={`${requisition.startTime} – ${requisition.endTime}`}
              venue={requisition.venue}
              fees={`RM ${requisition.fees.toFixed(2)}`}
              hrdcClaimable={requisition.hrdcClaimable}
              grantId={requisition.grantId}
              underAtp={requisition.underAtp}
              remarks={requisition.remarks}
              trainingProvider={requisition.trainingProvider}
              objective={requisition.objective}
              approverName={requisition.reviewedBy?.staffName ?? null}
              approverRoleLabel={requisition.reviewedBy ? (requisition.reviewedBy.isHod ? "Head of Department" : "Admin") : null}
              approvedDate={requisition.reviewedAt ? format(requisition.reviewedAt, "d MMM yyyy") : null}
            />
          )}
          {isAdmin && <DeleteRequisitionButton id={requisition.id} title={requisition.title} />}
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border shadow-[var(--shadow-card)] p-6 grid grid-cols-2 gap-5 mb-6">
        <Field label="Date Apply" value={format(requisition.createdAt, "d MMM yyyy")} />
        <div className="col-span-2">
          <Field
            label="Participants"
            value={
              <ul className="space-y-1">
                {requisition.participants.map((p) => (
                  <li key={p.id}>
                    {p.user.staffName} <span className="text-text-muted">({p.user.staffNo})</span>
                  </li>
                ))}
              </ul>
            }
          />
        </div>
        <Field label="Training Date" value={formatDateRange(requisition.trainingDate, requisition.trainingEndDate)} />
        <Field label="Time" value={`${requisition.startTime} – ${requisition.endTime}`} />
        <Field label="Venue" value={requisition.venue} />
        <Field label="Training Provider" value={requisition.trainingProvider} />
        <Field label="Fees" value={`RM ${requisition.fees.toFixed(2)}`} />
        <Field label="HRDC Claimable" value={requisition.hrdcClaimable ? "Yes" : "No"} />
        <Field label="Under ATP" value={requisition.underAtp ? "Yes" : "No"} />
        {isAdmin ? (
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Grant ID</p>
            <GrantIdForm
              initialGrantId={requisition.grantId}
              onSave={async (grantId) => {
                "use server";
                await updateGrantId(requisition.id, grantId);
              }}
            />
          </div>
        ) : (
          requisition.grantId && <Field label="Grant ID" value={requisition.grantId} />
        )}
        <div className="col-span-2">
          <Field label="Objective Training" value={requisition.objective} />
        </div>
        {requisition.remarks && (
          <div className="col-span-2">
            <Field label="Remarks" value={requisition.remarks} />
          </div>
        )}
        {requisition.brochureFilePath && (
          <div className="col-span-2">
            <Field
              label="Training Brochure"
              value={
                <a
                  href={`/api/requisition-brochures/${requisition.id}`}
                  className="text-primary-dark font-medium hover:underline"
                >
                  {requisition.brochureFileName}
                </a>
              }
            />
          </div>
        )}
        {requisition.reviewedBy && (
          <div className="col-span-2 border-t border-border pt-4">
            <Field
              label={
                requisition.status === "REJECTED"
                  ? "Rejected By"
                  : requisition.status === "COMPLETED"
                    ? "Marked Completed By"
                    : "Approved By"
              }
              value={`${requisition.reviewedBy.staffName} · ${format(requisition.reviewedAt!, "d MMM yyyy")}`}
            />
          </div>
        )}
      </div>

      {canReview && (
        <div>
          {isRevision && (
            <p className="text-xs text-text-muted mb-2">
              This requisition was already reviewed — as an Admin, you can change that decision below.
            </p>
          )}
          <RequisitionReviewButtons
            onApprove={async () => {
              "use server";
              await reviewRequisition(requisition.id, "APPROVED");
            }}
            onReject={async () => {
              "use server";
              await reviewRequisition(requisition.id, "REJECTED");
            }}
            onComplete={
              isAdmin
                ? async () => {
                    "use server";
                    await reviewRequisition(requisition.id, "COMPLETED");
                  }
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
