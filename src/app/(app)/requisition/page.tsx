import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canReviewRequisitions, canViewAllRequisitions } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { RequisitionStats } from "@/components/requisition/catalogue/RequisitionStats";
import { RequisitionBoard } from "@/components/requisition/catalogue/RequisitionBoard";
import type { RequisitionCardData } from "@/components/requisition/catalogue/types";
import { deriveRequisitionDisplayStatus } from "@/lib/requisition-status";

function toCardData(
  r: {
    id: number;
    title: string;
    status: string;
    trainingDate: Date;
    trainingEndDate: Date | null;
    startTime: string;
    endTime: string;
    venue: string;
    trainingProvider: string;
    objective: string;
    remarks: string | null;
    fees: number;
    hrdcClaimable: boolean;
    underAtp: boolean;
    grantId: string | null;
    brochureFileName: string | null;
    createdAt: Date;
    reviewedAt: Date | null;
    _count?: { participants: number };
  },
  extra: {
    applicantName?: string | null;
    applicantNo?: string | null;
    department?: string | null;
    reviewedByName?: string | null;
  } = {}
): RequisitionCardData {
  return {
    id: r.id,
    title: r.title,
    status: deriveRequisitionDisplayStatus(r.status, r.trainingDate, r.trainingEndDate),
    trainingDate: r.trainingDate.toISOString(),
    trainingEndDate: r.trainingEndDate ? r.trainingEndDate.toISOString() : null,
    startTime: r.startTime,
    endTime: r.endTime,
    venue: r.venue,
    trainingProvider: r.trainingProvider,
    objective: r.objective,
    remarks: r.remarks,
    fees: r.fees,
    hrdcClaimable: r.hrdcClaimable,
    underAtp: r.underAtp,
    grantId: r.grantId,
    brochureFileName: r.brochureFileName,
    createdAt: r.createdAt.toISOString(),
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    participantCount: r._count?.participants ?? 0,
    applicantName: extra.applicantName ?? null,
    applicantNo: extra.applicantNo ?? null,
    department: extra.department ?? null,
    reviewedByName: extra.reviewedByName ?? null,
  };
}

export default async function RequisitionIndexPage() {
  const session = await requireSession();
  const isHodReviewer = canReviewRequisitions(session);
  const viewAll = canViewAllRequisitions(session);

  const [myApplications, pendingForReview, allApplications] = await Promise.all([
    prisma.trainingRequisition.findMany({
      where: { userId: session.userId },
      include: { _count: { select: { participants: true } } },
      orderBy: { createdAt: "desc" },
    }),
    isHodReviewer
      ? prisma.trainingRequisition.findMany({
          where: { user: { hodId: session.userId }, status: "PENDING" },
          include: { user: { include: { department: true } }, _count: { select: { participants: true } } },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    viewAll
      ? prisma.trainingRequisition.findMany({
          include: {
            user: { include: { department: true } },
            reviewedBy: true,
            _count: { select: { participants: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        })
      : Promise.resolve([]),
  ]);

  const myCards = myApplications.map((r) => toCardData(r));

  const pendingCards = pendingForReview.map((r) =>
    toCardData(r, {
      applicantName: r.user.staffName,
      applicantNo: r.user.staffNo,
      department: r.user.department?.name ?? null,
    })
  );

  const allCards = allApplications.map((r) =>
    toCardData(r, {
      applicantName: r.user.staffName,
      applicantNo: r.user.staffNo,
      department: r.user.department?.name ?? null,
      reviewedByName: r.reviewedBy?.staffName ?? null,
    })
  );

  // Admins see the org-wide "All Applications" board below, so the stat tiles
  // summarize that same dataset — not just their own submissions, which would
  // show 0 for an admin who's never personally applied even though the board
  // right underneath lists dozens of requisitions. Everyone else only ever
  // sees their own "My Applications" board, so the tiles summarize that.
  const statsSource = viewAll ? allCards : myCards;
  const stats = {
    total: statsSource.length,
    pending: statsSource.filter((r) => r.status === "PENDING").length,
    approved: statsSource.filter((r) => r.status === "APPROVED").length,
    completed: statsSource.filter((r) => r.status === "COMPLETED").length,
    rejected: statsSource.filter((r) => r.status === "REJECTED").length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Staff Training Requisition</h1>
          <p className="text-text-secondary text-sm mt-1">Apply for and track training/course requests.</p>
        </div>
        <Link
          href="/requisition/new"
          className="flex items-center gap-1.5 rounded-xl bg-primary-dark text-white text-sm font-medium px-4 py-2 hover:bg-primary transition-colors"
        >
          <Plus size={16} /> New Application
        </Link>
      </div>

      <div className="mb-8">
        <p className="text-xs text-text-muted mb-2">{viewAll ? "Organization-wide totals" : "Your applications"}</p>
        <RequisitionStats {...stats} />
      </div>

      {isHodReviewer && (
        <RequisitionBoard
          title="Pending Your Approval"
          requisitions={pendingCards}
          showApplicant
          emptyLabel="Nothing pending your approval right now."
        />
      )}

      <RequisitionBoard
        title="My Applications"
        requisitions={myCards}
        emptyLabel="You haven't submitted any training requisitions yet."
      />

      {viewAll && (
        <RequisitionBoard
          title="All Applications (view only)"
          requisitions={allCards}
          showApplicant
          emptyLabel="No training requisitions yet."
        />
      )}
    </div>
  );
}
