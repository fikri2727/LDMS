import { redirect } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { canManageElearning } from "@/lib/rbac";

export default async function ElearningIndexPage() {
  const session = await requireSession();
  redirect(canManageElearning(session) ? "/elearning/admin" : "/elearning/learner");
}
