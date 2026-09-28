import { redirect } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { canManageElearning } from "@/lib/rbac";
import { ElearningTabs } from "@/components/elearning/ElearningTabs";

export default async function ElearningAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  if (!canManageElearning(session)) redirect("/elearning/learner");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-4">E-Learning</h1>
      <ElearningTabs />
      <div className="mt-6">{children}</div>
    </div>
  );
}
