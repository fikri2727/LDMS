import { requireSession } from "@/lib/guard";
import {
  canManageStaff,
  canManageOrg,
  canManageTraining,
  canManageOjt,
  canManageElearning,
  canManageTna,
} from "@/lib/rbac";
import { isSupervisor } from "@/lib/pme";
import { AppShell } from "@/components/AppShell";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  CLERK: "Clerk",
  STAFF: "Staff",
  CREATOR: "Creator",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  const roleLabel = session.isHod ? "Head of Department" : ROLE_LABELS[session.roleType];
  const manage = canManageTraining(session);
  const supervisor = manage ? false : await isSupervisor(session.userId);

  return (
    <ConfirmProvider>
      <AppShell
        canManageStaff={canManageStaff(session)}
        canManageOrg={canManageOrg(session)}
        canManageTraining={manage}
        canManageOjt={canManageOjt(session)}
        canManageElearning={canManageElearning(session)}
        canManageTna={canManageTna(session)}
        isSupervisor={supervisor}
        isElearningCreator={session.roleType === "CREATOR"}
        staffName={session.staffName}
        staffNo={session.staffNo}
        roleLabel={roleLabel}
      >
        {children}
      </AppShell>
    </ConfirmProvider>
  );
}
