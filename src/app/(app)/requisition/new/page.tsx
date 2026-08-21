import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { RequisitionForm } from "@/components/requisition/RequisitionForm";
import { createRequisition } from "../actions";

export default async function NewRequisitionPage() {
  const session = await requireSession();

  const staffOptions = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, staffNo: true, staffName: true },
    orderBy: { staffName: "asc" },
  });

  const self = staffOptions.find((s) => s.id === session.userId);

  return (
    <div>
      <Link href="/requisition" className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-4">
        <ArrowLeft size={15} /> Back to Staff Training Requisition
      </Link>
      <h2 className="text-xl font-semibold text-text-primary mb-6">New Training Requisition</h2>
      <RequisitionForm
        action={createRequisition}
        submitLabel="Submit Application"
        staffOptions={staffOptions}
        initialParticipants={self ? [self] : []}
      />
    </div>
  );
}
