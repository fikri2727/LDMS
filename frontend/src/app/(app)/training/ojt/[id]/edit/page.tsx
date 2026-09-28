
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canManageOjt } from "@/lib/rbac";
import { api } from "@/lib/api";
import { OjtForm } from "@/components/training/OjtForm";
import { updateOjt } from "@/app/(app)/training/ojt/actions";
import type { Ojt } from "@/lib/db-types";

export default async function EditOjtPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  // Managers or the creator only; anyone else goes back to the OJT page.
  const [ojt, trainerStaffOptions] = await Promise.all([
    api.get<Ojt>(`/api/ojt/${Number(id)}/basic`, undefined, { on403: `/training/ojt/${Number(id)}` }),
    api.get<string[]>("/api/ojt/trainer-options"),
  ]);

  const manage = canManageOjt(session);
  const backHref = manage ? `/training/ojt/${ojt.id}` : "/training";
  const backLabel = manage ? "Back to OJT" : "Back to My Training";

  return (
    <div>
      <Link
        href={backHref}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4"
      >
        <ArrowLeft size={15} /> {backLabel}
      </Link>
      <h2 className="text-xl font-semibold text-text-primary mb-6">Edit OJT</h2>
      <OjtForm
        action={updateOjt.bind(null, ojt.id)}
        submitLabel="Save Changes"
        isNew={false}
        initial={{
          title: ojt.title,
          venue: ojt.venue,
          trainerType: ojt.trainerType,
          trainerName: ojt.trainerName,
          startDate: ojt.startDate.toISOString().slice(0, 10),
          endDate: ojt.endDate.toISOString().slice(0, 10),
          startTime: ojt.startTime,
          endTime: ojt.endTime,
        }}
        trainerStaffOptions={trainerStaffOptions}
      />
    </div>
  );
}
