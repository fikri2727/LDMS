import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canManageTraining } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { TrainingForm } from "@/components/training/TrainingForm";
import { updateTraining } from "@/app/(app)/training/public/actions";

export default async function EditTrainingPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!canManageTraining(session)) redirect("/training/public");

  const { id } = await params;
  const training = await prisma.training.findUnique({ where: { id: Number(id) } });
  if (!training) notFound();

  return (
    <div>
      <Link
        href={`/training/public/${training.id}`}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4"
      >
        <ArrowLeft size={15} /> Back to Training
      </Link>
      <h2 className="text-xl font-semibold text-text-primary mb-6">Edit Training</h2>
      <TrainingForm
        action={updateTraining.bind(null, training.id)}
        submitLabel="Save Changes"
        initial={{
          title: training.title,
          program: training.program,
          cost: training.cost,
          platform: training.platform,
          function: training.function,
          venue: training.venue,
          hrdcClaimable: training.hrdcClaimable,
          startDate: training.startDate.toISOString().slice(0, 10),
          endDate: training.endDate.toISOString().slice(0, 10),
          startTime: training.startTime,
          endTime: training.endTime,
          trainer: training.trainer,
        }}
      />
    </div>
  );
}
