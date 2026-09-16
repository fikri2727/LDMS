import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canReviewRequisitions, canViewAllRequisitions } from "@/lib/rbac";
import { readUpload, guessMimeType } from "@/lib/uploads";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const requisition = await prisma.trainingRequisition.findUnique({
    where: { id: Number(id) },
    include: { user: true },
  });
  if (!requisition || !requisition.brochureFilePath || !requisition.brochureFileName) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Mirror the same visibility rule as the requisition detail page — the
  // brochure attachment must not be reachable by anyone who couldn't already
  // see the requisition itself.
  const isOwner = requisition.userId === session.userId;
  const isHodReviewer = canReviewRequisitions(session) && requisition.user.hodId === session.userId;
  const isOrphanFallback = session.roleType === "ADMIN" && requisition.user.hodId == null;
  const canView = isOwner || isHodReviewer || canViewAllRequisitions(session) || isOrphanFallback;
  if (!canView) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await readUpload(requisition.brochureFilePath);
  return new NextResponse(buffer as BodyInit, {
    headers: {
      "Content-Type": guessMimeType(requisition.brochureFileName),
      "Content-Disposition": `attachment; filename="${requisition.brochureFileName}"`,
    },
  });
}
