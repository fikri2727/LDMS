import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canManageStaff } from "@/lib/rbac";
import { StaffUploadForm } from "@/components/staff/StaffUploadForm";
import { StaffCompareForm } from "@/components/staff/StaffCompareForm";
import { bulkResignStaff, bulkUploadStaff, compareStaffIds, previewStaffUpload } from "@/app/(app)/staff/actions";

export default async function StaffUploadPage() {
  const session = await requireSession();
  if (!canManageStaff(session)) redirect("/staff");

  return (
    <div>
      <Link href="/staff" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4">
        <ArrowLeft size={15} /> Back to Staff List
      </Link>
      <h2 className="text-xl font-semibold text-text-primary mb-2">Check Staff IDs</h2>
      <p className="text-sm text-text-secondary mb-4 max-w-xl">
        Upload an Excel file with one Staff ID per row to see who is not registered in LDMS yet. Comparing saves
        nothing. You can then tick staff who are missing from your file and mark them as Resigned.
      </p>
      <StaffCompareForm action={compareStaffIds} resignAction={bulkResignStaff} />

      <hr className="border-border my-8" />

      <h2 className="text-xl font-semibold text-text-primary mb-2">Upload Staff via Excel</h2>
      <p className="text-sm text-text-secondary mb-6 max-w-xl">
        Download the template and fill in one row per staff member. A Staff No that already exists updates that
        profile — blank cells leave the existing value unchanged. A Staff No that doesn&apos;t exist yet creates a
        new staff record with the default password. See the Instructions sheet in the template for the accepted
        values in each column.
        Tick the box below when the file is your full current staff list, to also detect who has left. You
        will see every change before anything is saved.
      </p>
      <StaffUploadForm action={bulkUploadStaff} previewAction={previewStaffUpload} />
    </div>
  );
}
