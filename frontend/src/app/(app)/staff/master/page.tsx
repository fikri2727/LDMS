import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { requireSession } from "@/lib/guard";
import { canManageStaff } from "@/lib/rbac";
import { EmployeeMasterUpload } from "@/components/staff/EmployeeMasterUpload";
import { EmployeeMasterTable, type MasterRow } from "@/components/staff/EmployeeMasterTable";
import { applyEmployeeMaster, previewEmployeeMaster } from "./actions";

interface MasterData {
  lastImport: {
    fileName: string | null;
    uploadedAt: Date;
    uploadedBy: string | null;
    summary: { fileRows?: number } | null;
  } | null;
  rows: MasterRow[];
}

export default async function EmployeeMasterPage() {
  const session = await requireSession();
  if (!canManageStaff(session)) redirect("/staff");
  const data = await api.get<MasterData>("/api/employee-master");
  const last = data.lastImport;

  return (
    <div>
      <Link href="/staff" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4">
        <ArrowLeft size={15} /> Back to Staff List
      </Link>
      <h1 className="text-2xl font-semibold text-text-primary">Employee Master</h1>
      <p className="text-sm text-text-secondary mt-1 mb-1 max-w-2xl">
        HR&apos;s employee list, shared by LDMS and Appraisal. Upload the latest employee report from the HR system:
        new joiners are added to LDMS, resigned staff become Resigned, and changed details (name, department,
        supervisor, email...) are copied to LDMS. Edit Staff in LDMS never changes the master.
      </p>
      <p className="text-xs text-text-muted mb-6">
        {last
          ? `Last upload: ${last.fileName ?? "file"} by ${last.uploadedBy ?? "unknown"}, ${new Date(last.uploadedAt).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuala_Lumpur" })}.`
          : "Not uploaded yet."}{" "}
        Only work details are kept. IC, passport, date of birth, phone and personal details in the report are ignored.
      </p>

      <EmployeeMasterUpload previewAction={previewEmployeeMaster} applyAction={applyEmployeeMaster} />

      <hr className="border-border my-8" />
      <EmployeeMasterTable rows={data.rows} />
    </div>
  );
}
