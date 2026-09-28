import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canManageOjt } from "@/lib/rbac";
import { api } from "@/lib/api";
import { OjtSurveyForm } from "@/components/training/OjtSurveyForm";
import { OjtSurveyResults } from "@/components/training/OjtSurveyResults";
import { submitOjtSurvey } from "@/app/(app)/training/ojt/actions";
import type { Ojt, ParticipateOjt, StaffOption } from "@/lib/db-types";

export default async function OjtSurveyPage({
  params,
}: {
  params: Promise<{ id: string; participationId: string }>;
}) {
  const session = await requireSession();
  const { id, participationId } = await params;
  const ojtId = Number(id);

  // Only returned to the participant themself or an OJT manager.
  const participation = await api.get<ParticipateOjt & { ojt: Ojt; user: StaffOption }>(
    `/api/ojt/${ojtId}/participations/${Number(participationId)}`,
    undefined,
    { on403: `/training/ojt/${ojtId}` }
  );

  const isOwner = participation.userId === session.userId;
  const manage = canManageOjt(session);
  if (!isOwner && !manage) redirect(`/training/ojt/${ojtId}`);

  const backHref = manage ? `/training/ojt/${ojtId}` : "/training";
  const backLabel = manage ? "Back to OJT" : "Back to My Training";

  if (participation.attendance === "COMPLETED") {
    return (
      <div>
        <Link href={backHref} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4">
          <ArrowLeft size={15} /> {backLabel}
        </Link>
        <h2 className="text-xl font-semibold text-text-primary mb-1">OJT Skill Evaluation</h2>
        <p className="text-sm text-text-secondary mb-6">
          {participation.ojt.title}
          {!isOwner && ` — ${participation.user.staffName} (${participation.user.staffNo})`}
        </p>
        <OjtSurveyResults answers={participation} />
      </div>
    );
  }

  if (!isOwner) redirect(`/training/ojt/${ojtId}`);

  return (
    <div>
      <Link href={backHref} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4">
        <ArrowLeft size={15} /> {backLabel}
      </Link>
      <h2 className="text-xl font-semibold text-text-primary mb-1">OJT Skill Evaluation</h2>
      <p className="text-sm text-text-secondary mb-6">{participation.ojt.title}</p>
      <OjtSurveyForm action={submitOjtSurvey.bind(null, ojtId, participation.id)} />
    </div>
  );
}
