import Link from "next/link";
import { requireSession } from "@/lib/guard";
import { canManageStaff } from "@/lib/rbac";
import { api } from "@/lib/api";
import type { Department, Pme, Training, User } from "@/lib/db-types";
import { getEvaluationPeriod, isPmeDue } from "@/lib/pme";
import { CollapsibleSection } from "@/components/training/CollapsibleSection";
import { PmeGroupedTable } from "@/components/training/PmeGroupedTable";
import { PendingPmeTable } from "@/components/training/PendingPmeTable";
import { PmeCompletedTable } from "@/components/training/PmeCompletedTable";

export default async function PmeListPage() {
  const session = await requireSession();

  const { viewAll, myTeam, myPmes, completed, allRecords } = await api.get<{
    viewAll: boolean;
    myTeam: (User & { department: Department | null })[];
    myPmes: (Pme & { training: Training })[];
    completed: Pme[];
    allRecords: Pme[];
  }>("/api/pme");

  const pending = myPmes.map((p) => {
    const period = getEvaluationPeriod(p.training.endDate);
    return {
      id: p.id,
      staffName: p.staffName,
      staffNo: p.staffNo,
      trainingTitle: p.trainingTitle,
      status: p.status,
      periodStart: period.start.toISOString(),
      periodEnd: period.end.toISOString(),
      due: isPmeDue(p.training.endDate),
    };
  });

  const completedRows = completed.map((r) => ({
    id: r.id,
    staffName: r.staffName,
    trainingTitle: r.trainingTitle,
    status: r.status,
    date: r.createdAt.toISOString(),
  }));

  const canLinkStaff = canManageStaff(session);

  return (
    <div>
      {!viewAll && (
        <>
          <CollapsibleSection title={`My Team (${myTeam.length})`} defaultOpen={false}>
            {myTeam.length === 0 ? (
              <p className="text-sm text-text-muted">
                No one reports to you yet. Supervisors are assigned on each staff member&apos;s profile in Staff List.
              </p>
            ) : (
              <div className="bg-surface rounded-2xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-text-muted text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 font-medium">Staff</th>
                      <th className="px-4 py-3 font-medium">Designation</th>
                      <th className="px-4 py-3 font-medium">Department</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {myTeam.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-text-primary">
                          {canLinkStaff ? (
                            <Link href={`/staff/${s.id}`} className="text-primary-dark font-medium hover:underline">
                              {s.staffName}
                            </Link>
                          ) : (
                            s.staffName
                          )}
                          <span className="text-text-muted ml-1">({s.staffNo})</span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{s.designation}</td>
                        <td className="px-4 py-3 text-text-secondary">{s.department?.name ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CollapsibleSection>

          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
            Performance Monitoring Evaluation List
          </h3>
          <PendingPmeTable rows={pending} />

          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
            Completed Evaluations
          </h3>
          <PmeCompletedTable rows={completedRows} emptyLabel="No completed evaluations yet." />
        </>
      )}

      {viewAll && (
        <>
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
            All PME Records <span className="normal-case text-text-muted">(view only, by training title)</span>
          </h3>
          <PmeGroupedTable
            rows={allRecords.map((r) => ({
              id: r.id,
              staffName: r.staffName,
              staffNo: r.staffNo,
              trainingTitle: r.trainingTitle,
              status: r.status,
              createdAt: r.createdAt.toISOString(),
            }))}
            emptyLabel="No PME records yet."
          />
        </>
      )}
    </div>
  );
}
