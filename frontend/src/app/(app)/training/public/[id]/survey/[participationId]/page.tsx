import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canEvaluateOnBehalf, canManageTraining } from "@/lib/rbac";
import { api } from "@/lib/api";
import { SurveyForm } from "@/components/training/SurveyForm";
import { SurveyResults } from "@/components/training/SurveyResults";
import { OnBehalfBanner } from "@/components/training/OnBehalfBanner";
import { submitSurvey, submitSurveyOnBehalf } from "@/app/(app)/training/public/actions";
import type { Participation, StaffOption, Training } from "@/lib/db-types";

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ id: string; participationId: string }>;
}) {
  const session = await requireSession();
  const { id, participationId } = await params;
  const trainingId = Number(id);

  // The backend only returns this to the participant themself or a training admin.
  const participation = await api.get<
    Participation & { training: Training; user: StaffOption }
  >(
    `/api/training/public/${trainingId}/participations/${Number(participationId)}`,
    undefined,
    { on403: `/training/public/${trainingId}` }
  );

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

  if (!isOwner) {
    // An admin may fill in a pending participant's survey on their behalf.
    if (!canEvaluateOnBehalf(session) || participation.attendance !== "PENDING") {
      redirect(`/training/public/${trainingId}`);
    }
    return (
      <div>
        <Link href={backHref} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4">
          <ArrowLeft size={15} /> {backLabel}
        </Link>
        <h2 className="text-xl font-semibold text-text-primary mb-1">Post-Training Survey</h2>
        <p className="text-sm text-text-secondary mb-4">{participation.training.title}</p>
        <OnBehalfBanner>
          You are filling in this survey <strong>on behalf of {participation.user.staffName} ({participation.user.staffNo})</strong>.
          It will count as their evaluation.
        </OnBehalfBanner>
        <SurveyForm action={submitSurveyOnBehalf.bind(null, trainingId, participation.id)} />
      </div>
    );
  }

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
