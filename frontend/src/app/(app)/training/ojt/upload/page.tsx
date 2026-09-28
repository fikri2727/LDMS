import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canManageOjt } from "@/lib/rbac";
import { OjtUploadForm } from "@/components/training/OjtUploadForm";
import { createOjtFromExcel } from "@/app/(app)/training/ojt/actions";

export default async function OjtUploadPage() {
  const session = await requireSession();
  if (!canManageOjt(session)) redirect("/training");

  return (
    <div>
      <Link
        href="/training/ojt"
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4"
      >
        <ArrowLeft size={15} /> Back to OJT Records
      </Link>
      <h2 className="text-xl font-semibold text-text-primary mb-2">Upload OJT via Excel</h2>
      <p className="text-sm text-text-secondary mb-6 max-w-xl">
        Download the template, fill in the OJT session details and participant staff numbers, then upload it here
        to create the session and add everyone in one step. Each participant later fills in their own before/after
        skill survey from their Training record.
      </p>
      <OjtUploadForm action={createOjtFromExcel} />
    </div>
  );
}
