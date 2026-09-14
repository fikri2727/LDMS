import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ArrowLeft, Pencil, Eye } from "lucide-react";
import { format } from "date-fns";
import QRCode from "qrcode";
import { requireSession } from "@/lib/guard";
import { canManageOjt } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { TRAINER_TYPE_LABELS } from "@/lib/labels";
import { AddParticipantForm } from "@/components/training/AddParticipantForm";
import { OjtParticipantActionsWrapper } from "@/components/training/OjtParticipantActionsWrapper";
import { CopyLinkButton } from "@/components/ui/CopyLinkButton";
import { addOjtParticipant, removeOjtParticipant } from "@/app/(app)/training/ojt/actions";
import type { ParticipateOjt, User } from "@/generated/prisma/client";

type ParticipantRow = ParticipateOjt & { user: User; clerk: User | null };

function ParticipantTable({
  title,
  rows,
  ojtId,
  currentUserId,
  manage,
}: {
  title: string;
  rows: ParticipantRow[];
  ojtId: number;
  currentUserId: number;
  manage: boolean;
}) {
  return (
    <div className="mb-6">
      <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">{title}</h4>
      <div className="bg-surface rounded-2xl border border-border shadow-[var(--shadow-card)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-text-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 font-medium">Staff</th>
              <th className="px-4 py-3 font-medium">Rate Before OJT</th>
              <th className="px-4 py-3 font-medium">Rate After OJT</th>
              <th className="px-4 py-3 font-medium">Key In By</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-text-primary">
                  {p.user.staffName}
                  <span className="text-text-muted ml-1">({p.user.staffNo})</span>
                </td>
                <td className="px-4 py-3 text-text-secondary">{p.q2 ?? "—"}</td>
                <td className="px-4 py-3 text-text-secondary">{p.q3 ?? "—"}</td>
                <td className="px-4 py-3 text-text-secondary">{p.clerk?.staffName ?? "Self"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {p.userId === currentUserId && p.attendance === "PENDING" && (
                      <Link
                        href={`/training/ojt/${ojtId}/survey/${p.id}`}
                        className="inline-flex rounded-xl bg-primary-dark text-white text-xs font-medium px-3 py-1.5 hover:bg-primary transition-colors"
                      >
                        Evaluate
                      </Link>
                    )}
                    {(manage || p.userId === currentUserId) && p.attendance === "COMPLETED" && (
                      <Link
                        href={`/training/ojt/${ojtId}/survey/${p.id}`}
                        title="View evaluation"
                        className="flex items-center gap-1 rounded-xl border border-border text-xs font-medium px-2.5 py-1.5 text-text-secondary hover:bg-gray-50"
                      >
                        <Eye size={13} /> View
                      </Link>
                    )}
                    {(manage || p.userId === currentUserId) && (
                      <OjtParticipantActionsWrapper
                        ojtId={ojtId}
                        participationId={p.id}
                        onRemove={removeOjtParticipant}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-muted text-sm">
                  None
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function OjtDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const ojtId = Number(id);

  const ojt = await prisma.ojt.findUnique({
    where: { id: ojtId },
    include: {
      participants: {
        include: { user: true, clerk: true },
        orderBy: { user: { staffName: "asc" } },
      },
    },
  });

  if (!ojt) notFound();

  const manage = canManageOjt(session);
  const canEdit = manage || ojt.createdByUserId === session.userId;
  const backHref = manage ? "/training/ojt" : "/training";
  const backLabel = manage ? "Back to OJT Records" : "Back to My Training";

  let qrDataUrl: string | null = null;
  let checkinUrl: string | null = null;
  if (manage) {
    const hdrs = await headers();
    const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
    const proto = hdrs.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
    checkinUrl = `${proto}://${host}/checkin/ojt/${ojt.id}`;
    qrDataUrl = await QRCode.toDataURL(checkinUrl, { width: 240, margin: 1 });
  }

  // Regular staff only see their own participation row — not the full roster.
  const visibleParticipants = manage
    ? ojt.participants
    : ojt.participants.filter((p) => p.userId === session.userId);

  const permanent = visibleParticipants.filter((p) => p.user.designation !== "CONTRACT");
  const contract = visibleParticipants.filter((p) => p.user.designation === "CONTRACT");

  const existingIds = ojt.participants.map((p) => p.userId);
  const staffOptions = manage
    ? await prisma.user.findMany({
        where: { status: "ACTIVE", id: { notIn: existingIds } },
        select: { id: true, staffNo: true, staffName: true },
        orderBy: { staffName: "asc" },
      })
    : [];

  return (
    <div>
      <Link href={backHref} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4">
        <ArrowLeft size={15} /> {backLabel}
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs text-text-muted font-mono mb-1">{ojt.trainingCode}</p>
          <h2 className="text-xl font-semibold text-text-primary">{ojt.title}</h2>
        </div>
        {canEdit && (
          <Link
            href={`/training/ojt/${ojt.id}/edit`}
            className="flex items-center gap-1.5 rounded-xl border border-border text-sm font-medium px-3 py-2 text-text-secondary hover:bg-gray-50"
          >
            <Pencil size={15} /> Edit
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
        <div>
          <p className="text-text-muted">Trainer Type</p>
          <p className="text-text-primary">{TRAINER_TYPE_LABELS[ojt.trainerType]}</p>
        </div>
        <div>
          <p className="text-text-muted">Trainer Name</p>
          <p className="text-text-primary">{ojt.trainerName}</p>
        </div>
        <div>
          <p className="text-text-muted">Venue</p>
          <p className="text-text-primary">{ojt.venue}</p>
        </div>
        <div>
          <p className="text-text-muted">Dates</p>
          <p className="text-text-primary">
            {format(ojt.startDate, "d MMM yyyy")} – {format(ojt.endDate, "d MMM yyyy")}
          </p>
        </div>
        <div>
          <p className="text-text-muted">Time</p>
          <p className="text-text-primary">
            {ojt.startTime} – {ojt.endTime}
          </p>
        </div>
        <div>
          <p className="text-text-muted">Total Days / Hours</p>
          <p className="text-text-primary">
            {ojt.totalDay} day(s) / {ojt.totalHour}h
          </p>
        </div>
      </div>

      {manage && qrDataUrl && checkinUrl && (
        <div className="mb-8 rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)] p-5 flex items-center gap-5">
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
              Staff scan this, enter their Staff ID, and go straight to their OJT evaluation — no login needed.
            </p>
            <div className="flex gap-3">
              <a
                href={qrDataUrl}
                download={`checkin-ojt-qr-${ojt.trainingCode}.png`}
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

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Participants</h3>
        {manage && <AddParticipantForm staffOptions={staffOptions} onAdd={addOjtParticipant.bind(null, ojt.id)} />}
      </div>

      <ParticipantTable title="Permanent Staff" rows={permanent} ojtId={ojtId} currentUserId={session.userId} manage={manage} />
      <ParticipantTable title="Contract Staff" rows={contract} ojtId={ojtId} currentUserId={session.userId} manage={manage} />
    </div>
  );
}
