import { requireSession } from "@/lib/guard";
import { canManageTraining, canManageOjt } from "@/lib/rbac";
import { isSupervisor as checkIsSupervisor } from "@/lib/pme";
import { TrainingTabs } from "@/components/training/TrainingTabs";

export default async function TrainingLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const manage = canManageTraining(session);
  const ojtManage = canManageOjt(session);

  const supervisor = manage ? false : await checkIsSupervisor(session.userId);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-4">
        {manage ? "Training Records" : "My Training"}
      </h1>
      <TrainingTabs manage={manage} ojtManage={ojtManage} isSupervisor={supervisor} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
