import Link from "next/link";
import { requireSession } from "@/lib/guard";
import { canManageOjt } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Plus, Upload, Download } from "lucide-react";
import { format } from "date-fns";
import { OjtRecordsTable, type OjtRow } from "@/components/training/OjtRecordsTable";

export default async function OjtListPage() {
  const session = await requireSession();
  const manage = canManageOjt(session);

  const ojts = await prisma.ojt.findMany({
    where: manage ? undefined : { participants: { some: { userId: session.userId } } },
    orderBy: { startDate: "desc" },
    include: {
      participants: true,
      createdBy: { select: { staffName: true } },
      _count: { select: { participants: true } },
    },
  });

  if (manage) {
    const rows: OjtRow[] = ojts.map((o) => {
      const par = o.participants.length;
      const comp = o.participants.filter((p) => p.attendance === "COMPLETED").length;

      return {
        id: o.id,
        trainingCode: o.trainingCode,
        title: o.title,
        trainerName: o.trainerName,
        keyInBy: o.createdBy?.staffName ?? "—",
        startDate: o.startDate.toISOString(),
        endDate: o.endDate.toISOString(),
        startTime: o.startTime,
        endTime: o.endTime,
        totalDay: o.totalDay,
        totalHour: o.totalHour,
        totalManHour: Math.round(o.totalDay * o.totalHour * par * 100) / 100,
        par,
        comp,
      };
    });

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-text-muted text-sm">{ojts.length} OJT record(s)</p>
          <div className="flex items-center gap-2">
            <a
              href="/ojt-upload-template.xlsx"
              download
              className="flex items-center gap-1.5 rounded-xl border border-border bg-surface text-sm font-medium px-4 py-2 text-text-secondary hover:bg-gray-50 transition-colors"
            >
              <Download size={16} /> Download Template
            </a>
            <Link
              href="/training/ojt/upload"
              className="flex items-center gap-1.5 rounded-xl border border-border bg-surface text-sm font-medium px-4 py-2 text-text-secondary hover:bg-gray-50 transition-colors"
            >
              <Upload size={16} /> Upload Excel
            </Link>
            <Link
              href="/training/ojt/new"
              className="flex items-center gap-1.5 rounded-xl bg-primary-dark hover:bg-primary text-white text-sm font-medium px-4 py-2 transition-colors"
            >
              <Plus size={16} /> Add OJT
            </Link>
          </div>
        </div>
        <OjtRecordsTable rows={rows} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-text-muted text-sm">{ojts.length} OJT record(s)</p>
        <Link
          href="/training/ojt/new"
          className="flex items-center gap-1.5 rounded-xl bg-primary-dark hover:bg-primary text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          <Plus size={16} /> Add OJT
        </Link>
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-text-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Trainer</th>
              <th className="px-4 py-3 font-medium">Dates</th>
              <th className="px-4 py-3 font-medium">Venue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ojts.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-text-muted font-mono text-xs">{o.trainingCode}</td>
                <td className="px-4 py-3">
                  <Link href={`/training/ojt/${o.id}`} className="text-primary-dark font-medium hover:underline">
                    {o.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-secondary">{o.trainerName}</td>
                <td className="px-4 py-3 text-text-secondary">
                  {format(o.startDate, "d MMM yyyy")} – {format(o.endDate, "d MMM yyyy")}
                </td>
                <td className="px-4 py-3 text-text-secondary">{o.venue}</td>
              </tr>
            ))}
            {ojts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-text-muted">
                  No OJT records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
