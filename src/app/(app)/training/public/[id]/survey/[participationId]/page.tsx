import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canManageTraining } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { SurveyForm } from "@/components/training/SurveyForm";
import { SurveyResults } from "@/components/training/SurveyResults";
import { submitSurvey } from "@/app/(app)/training/public/actions";

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ id: string; participationId: string }>;
}) {
  const session = await requireSession();
  const { id, participationId } = await params;
  const trainingId = Number(id);

  const participation = await prisma.participation.findUnique({
    where: { id: Number(participationId) },
    include: { training: true, user: true },
  });

  if (!participation || participation.trainingId !== trainingId) {
    notFound();
  }

  const isOwner = participation.userId === session.userId;
  const manage = canManageTraining(session);
  if (!isOwner && !manage) redirect(`/training/public/${trainingId}`);

  const backHref = manage ? `/training/public/${trainingId}` : "/training";
  const backLabel = manage ? "Back to Training" : "Back to My Training";

  if (participation.attendance === "COMPLETED") {
    return (
      <div>
        <Link
          href={backHref}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4"
        >
          <ArrowLeft size={15} /> {backLabel}
        </Link>
        <h2 className="text-xl font-semibold text-text-primary mb-1">Post-Training Survey</h2>
        <p className="text-sm text-text-secondary mb-6">
          {participation.training.title}
          {!isOwner && ` — ${participation.user.staffName} (${participation.user.staffNo})`}
        </p>
        <SurveyResults answers={participation} />
      </div>
    );
  }

  if (!isOwner) redirect(`/training/public/${trainingId}`);

  return (
    <div>
      <Link
        href={backHref}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft size={15} /> {backLabel}
      </Link>
      <h2 className="text-xl font-semibold text-text-primary mb-1">Post-Training Survey</h2>
      <p className="text-sm text-text-secondary mb-6">{participation.training.title}</p>
      <SurveyForm action={submitSurvey.bind(null, trainingId, participation.id)} />
    </div>
  );
}
