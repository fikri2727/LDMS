import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canManageStaff } from "@/lib/rbac";
import { StaffUploadForm } from "@/components/staff/StaffUploadForm";
import { bulkUploadStaff } from "@/app/(app)/staff/actions";

export default async function StaffUploadPage() {
  const session = await requireSession();
  if (!canManageStaff(session)) redirect("/staff");

  return (
    <div>
      <Link href="/staff" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4">
        <ArrowLeft size={15} /> Back to Staff List
      </Link>
      <h2 className="text-xl font-semibold text-text-primary mb-2">Upload Staff via Excel</h2>
      <p className="text-sm text-text-secondary mb-6 max-w-xl">
        Download the template and fill in one row per staff member. A Staff No that already exists updates that
        profile — blank cells leave the existing value unchanged. A Staff No that doesn&apos;t exist yet creates a
        new staff record with the default password. See the Instructions sheet in the template for the accepted
        values in each column.
      </p>
      <StaffUploadForm action={bulkUploadStaff} />
    </div>
  );
}
