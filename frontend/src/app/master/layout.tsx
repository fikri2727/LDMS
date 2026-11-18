import { redirect } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { canManageMaster } from "@/lib/rbac";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";

/** HR Master sits outside LDMS: its own header, no LDMS menu. HR Master access or Admin only. */
export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  if (!canManageMaster(session)) redirect("/home");
  return (
    <ConfirmProvider>
      <div className="min-h-screen bg-[var(--background)]">
        <PortalHeader title="HR Master" staffName={session.staffName} staffNo={session.staffNo} />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </div>
    </ConfirmProvider>
  );
}
