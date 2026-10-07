import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, Pencil } from "lucide-react";
import { format } from "date-fns";
import QRCode from "qrcode";
import { requireSession } from "@/lib/guard";
import { canEvaluateOnBehalf, canManageTraining, canViewAllPme } from "@/lib/rbac";
import { api } from "@/lib/api";
import {
  PROGRAM_LABELS,
  PLATFORM_LABELS,
  FUNCTION_LABELS,
  ATTENDANCE_LABELS,
  PME_STATUS_LABELS,
} from "@/lib/labels";
import { AddParticipantForm } from "@/components/training/AddParticipantForm";
import { ParticipantActionsWrapper } from "@/components/training/ParticipantActionsWrapper";
import { CertificatePanel } from "@/components/training/CertificatePanel";
import { CopyLinkButton } from "@/components/ui/CopyLinkButton";
import {
  addParticipant,
  removeParticipant,
  markAbsent,
  uploadCertificate,
  deleteCertificate,
} from "@/app/(app)/training/public/actions";
import type { Certificate, Department, Participation, Pme, StaffOption, Training, User } from "@/lib/db-types";

type TrainingDetail = Training & {
  participations: (Participation & { user: User & { department: Department | null }; pme: Pme | null })[];
  certificates: (Certificate & { uploadedBy: StaffOption | null })[];
};

function StatusBadge({ attendance }: { attendance: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-gray-100 text-text-secondary",
    COMPLETED: "bg-primary/10 text-primary-dark",
    ABSENT: "bg-rose-50 text-rose-600",
  };
  return (
    <span className={`inline-flex rounded-full text-xs font-medium px-2 py-0.5 ${styles[attendance]}`}>
      {ATTENDANCE_LABELS[attendance]}
    </span>
  );
}

export default async function TrainingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const trainingId = Number(id);

  // Staff only receive their own participation row; admins get the full roster + staff options.
  const { training, staffOptions } = await api.get<{ training: TrainingDetail; staffOptions: StaffOption[] }>(
    `/api/training/public/${trainingId}`
  );

  const manage = canManageTraining(session);
  const viewPme = canViewAllPme(session);
  const onBehalf = canEvaluateOnBehalf(session);
  const backHref = manage ? "/training/public" : "/training";
  const backLabel = manage ? "Back to Training Records" : "Back to My Training";

  const myParticipation = training.participations.find((p) => p.userId === session.userId);

  let qrDataUrl: string | null = null;
  let checkinUrl: string | null = null;
  if (manage) {
    const hdrs = await headers();
    const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
    const proto = hdrs.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
    checkinUrl = `${proto}://${host}/checkin/${training.id}`;
    qrDataUrl = await QRCode.toDataURL(checkinUrl, { width: 240, margin: 1 });
  }

  // Regular staff only see their own participation row — not the full roster.
  const visibleParticipations = manage
    ? training.participations
    : training.participations.filter((p) => p.userId === session.userId);

  return (
    <div>
      <Link
        href={backHref}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4"
      >
        <ArrowLeft size={15} /> {backLabel}
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs text-text-muted font-mono mb-1">{training.trainingCode}</p>
          <h2 className="text-xl font-semibold text-text-primary">{training.title}</h2>
        </div>
        {manage && (
          <Link
            href={`/training/public/${training.id}/edit`}
            className="flex items-center gap-1.5 rounded-xl border border-border text-sm font-medium px-3 py-2 text-text-secondary hover:bg-gray-50"
          >
            <Pencil size={15} /> Edit
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 text-sm">
        <div>
          <p className="text-text-muted">Program</p>
          <p className="text-text-primary">{PROGRAM_LABELS[training.program]}</p>
        </div>
        <div>
          <p className="text-text-muted">Platform</p>
          <p className="text-text-primary">{PLATFORM_LABELS[training.platform]}</p>
        </div>
        <div>
          <p className="text-text-muted">Function</p>
          <p className="text-text-primary">{FUNCTION_LABELS[training.function]}</p>
        </div>
        <div>
          <p className="text-text-muted">Dates</p>
          <p className="text-text-primary">
            {format(training.startDate, "d MMM yyyy")} – {format(training.endDate, "d MMM yyyy")}
          </p>
        </div>
        <div>
          <p className="text-text-muted">Time</p>
          <p className="text-text-primary">
            {training.startTime} – {training.endTime}
          </p>
        </div>
        <div>
          <p className="text-text-muted">Venue</p>
          <p className="text-text-primary">{training.venue}</p>
        </div>
        <div>
          <p className="text-text-muted">Trainer</p>
          <p className="text-text-primary">{training.trainer}</p>
        </div>
        <div>
          <p className="text-text-muted">Training Provider</p>
          <p className="text-text-primary">{training.trainingProvider || "—"}</p>
        </div>
        <div>
          <p className="text-text-muted">Cost</p>
          <p className="text-text-primary">RM {training.cost.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-text-muted">HRDC Claimable</p>
          <p className="text-text-primary">{training.hrdcClaimable ? "Yes" : "No"}</p>
        </div>
        {training.hrdcClaimable && (
          <>
            <div>
              <p className="text-text-muted">HRDC Allowance</p>
              <p className="text-text-primary">
                {training.hrdcAllowance != null ? `RM ${training.hrdcAllowance.toFixed(2)}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-text-muted">HRDC Grant ID</p>
              <p className="text-text-primary">{training.hrdcGrantId || "—"}</p>
            </div>
          </>
        )}
      </div>

      {manage && qrDataUrl && checkinUrl && (
        <div className="mb-8 rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)] p-5 flex flex-col sm:flex-row sm:items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URL, next/image doesn't support this */}
          <img
            src={qrDataUrl}
            alt="Check-in QR code"
            width={140}
            height={140}
            className="rounded-lg border border-border"
          />
          <div>
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-1">
              Self Check-in QR Code
            </h3>
            <p className="text-sm text-text-secondary mb-3">
              Staff scan this, enter their Staff ID, and go straight to their evaluation form — no login needed.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={qrDataUrl}
                download={`checkin-qr-${training.trainingCode}.png`}
                className="rounded-xl border border-border text-sm font-medium px-3 py-1.5 text-text-secondary hover:bg-gray-50"
              >
                Download QR
              </a>
              <a
                href={checkinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-border text-sm font-medium px-3 py-1.5 text-text-secondary hover:bg-gray-50"
              >
                Open link
              </a>
              <CopyLinkButton text={checkinUrl} />
            </div>
          </div>
        </div>
      )}

      {myParticipation && myParticipation.attendance === "PENDING" && (
        <div className="mb-8 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-primary-dark">You attended this training. Please complete your feedback survey.</p>
          <Link
            href={`/training/public/${training.id}/survey/${myParticipation.id}`}
            className="rounded-xl bg-primary-dark text-white text-sm font-medium px-3 py-1.5 hover:bg-primary transition-colors"
          >
            Fill Survey
          </Link>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Participants</h3>
          {manage && <AddParticipantForm staffOptions={staffOptions} onAdd={addParticipant.bind(null, training.id)} />}
        </div>

        <div className="bg-surface rounded-2xl border border-border shadow-[var(--shadow-card)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 font-medium w-12">No.</th>
                <th className="px-4 py-3 font-medium">Staff</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Attendance</th>
                {manage && <th className="px-4 py-3 font-medium">Evaluation</th>}
                {viewPme && <th className="px-4 py-3 font-medium">PME</th>}
                {manage && <th className="px-4 py-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleParticipations.map((p, i) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-text-muted">{i + 1}</td>
                  <td className="px-4 py-3 text-text-primary">
                    {p.user.staffName}
                    <span className="text-text-muted ml-1">({p.user.staffNo})</span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{p.user.department?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge attendance={p.attendance} />
                  </td>
                  {manage && (
                    <td className="px-4 py-3 text-text-secondary">
                      {p.attendance === "COMPLETED" ? (
                        <Link
                          href={`/training/public/${training.id}/survey/${p.id}`}
                          className="text-primary-dark hover:underline text-xs"
                        >
                          View
                        </Link>
                      ) : p.attendance === "PENDING" && onBehalf ? (
                        <Link
                          href={`/training/public/${training.id}/survey/${p.id}`}
                          title="Fill in the survey on this participant's behalf"
                          className="inline-flex rounded-xl bg-primary-dark text-white text-xs font-medium px-2.5 py-1 hover:bg-primary transition-colors"
                        >
                          Evaluate
                        </Link>
                      ) : (
                        <span className="text-text-muted text-xs">—</span>
                      )}
                    </td>
                  )}
                  {viewPme && (
                    <td className="px-4 py-3 text-text-secondary">
                      {p.pme ? (
                        <Link href={`/training/pme/${p.pme.id}`} className="text-primary-dark hover:underline text-xs">
                          {PME_STATUS_LABELS[p.pme.status]}
                        </Link>
                      ) : (
                        <span className="text-text-muted text-xs">—</span>
                      )}
                    </td>
                  )}
                  {manage && (
                    <td className="px-4 py-3">
                      <ParticipantActionsWrapper
                        trainingId={training.id}
                        participationId={p.id}
                        attendance={p.attendance}
                        onRemove={removeParticipant}
                        onMarkAbsent={markAbsent}
                      />
                    </td>
                  )}
                </tr>
              ))}
              {visibleParticipations.length === 0 && (
                <tr>
                  <td
                    colSpan={4 + (viewPme ? 1 : 0) + (manage ? 2 : 0)}
                    className="px-4 py-10 text-center text-text-muted"
                  >
                    No participants added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Certificates</h3>
        <CertificatePanel
          certificates={training.certificates}
          canManage={manage}
          onUpload={uploadCertificate.bind(null, training.id)}
          onDelete={deleteCertificate.bind(null, training.id)}
        />
      </div>
    </div>
  );
}
