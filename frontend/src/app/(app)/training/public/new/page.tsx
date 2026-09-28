import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canManageTraining } from "@/lib/rbac";
import { TrainingForm } from "@/components/training/TrainingForm";
import { createTraining } from "@/app/(app)/training/public/actions";

export default async function NewTrainingPage() {
  const session = await requireSession();
  if (!canManageTraining(session)) redirect("/training/public");

  return (
    <div>
      <Link
        href="/training/public"
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4"
      >
        <ArrowLeft size={15} /> Back to Training Records
      </Link>
      <h2 className="text-xl font-semibold text-text-primary mb-6">Add Public / Inhouse Training</h2>
      <TrainingForm action={createTraining} submitLabel="Create Training" />
    </div>
  );
}
