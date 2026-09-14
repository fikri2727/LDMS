import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canManageOjt } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { OjtForm } from "@/components/training/OjtForm";
import { createOjt } from "@/app/(app)/training/ojt/actions";

export default async function NewOjtPage({
  searchParams,
}: {
  searchParams: Promise<{ self?: string }>;
}) {
  const session = await requireSession();
  const { self } = await searchParams;
  // "Add My OJT" (from My Training) always means the self-service, one-shot
  // flow — even for a Clerk, who otherwise keys in OJT sessions for others.
  const forSelf = self === "1";
  const canKeyInForOthers = canManageOjt(session) && !forSelf;
  const backHref = canKeyInForOthers ? "/training/ojt" : "/training";
  const backLabel = canKeyInForOthers ? "Back to OJT Records" : "Back to My Training";

  const trainerStaffOptions = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: { staffName: true, staffNo: true },
    orderBy: { staffName: "asc" },
  });

  return (
    <div>
      <Link href={backHref} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4">
        <ArrowLeft size={15} /> {backLabel}
      </Link>
      <h2 className="text-xl font-semibold text-text-primary mb-6">Add OJT</h2>
      <OjtForm
        action={createOjt}
        submitLabel="Submit OJT"
        isNew
        canKeyInForOthers={canKeyInForOthers}
        trainerStaffOptions={trainerStaffOptions.map((s) => `${s.staffName} (${s.staffNo})`)}
      />
    </div>
  );
}
