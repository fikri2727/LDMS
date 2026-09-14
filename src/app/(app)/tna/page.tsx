import Link from "next/link";
import { requireSession } from "@/lib/guard";
import { canManageTna, canSubmitTna } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { TNA_STATUS_LABELS } from "@/lib/labels";
import { TnaForm } from "@/components/training/TnaForm";
import { TnaFilters } from "@/components/training/TnaFilters";
import { emptyTnaFormState, defaultTnaFormState, buildTrainingOptionsMap, type TnaFormState } from "@/lib/tna-options";
import { DownloadTnaReportButton, type TnaDeptSummaryRow, type TnaDetailRow } from "@/components/training/DownloadTnaReportButton";
import { saveTna } from "./actions";

function statusBadgeClass(status: string) {
  if (status === "APPROVED") return "inline-flex rounded-full bg-primary/10 text-primary-dark text-xs font-medium px-2.5 py-1";
  if (status === "PENDING") return "inline-flex rounded-full bg-purple/10 text-purple text-xs font-medium px-2.5 py-1";
  if (status === "NO_HOD") return "inline-flex rounded-full bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-1";
  return "inline-flex rounded-full bg-gray-100 text-text-secondary text-xs font-medium px-2.5 py-1";
}

function statusLabel(status: string) {
  if (status === "NO_HOD") return "No HOD Assigned";
  return TNA_STATUS_LABELS[status] ?? status;
}

function ringColor(percent: number) {
  if (percent >= 80) return "#1D8E72";
  if (percent >= 40) return "#6D3ECD";
  if (percent > 0) return "#e11d48";
  return "#E5EAEC";
}

const RING_RADIUS = 30;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function DepartmentCard({
  id,
  name,
  total,
  submitted,
  approved,
  percent,
  active,
}: {
  id: number;
  name: string;
  total: number;
  submitted: number;
  approved: number;
  percent: number;
  active: boolean;
}) {
  const offset = RING_CIRCUMFERENCE * (1 - percent / 100);
  return (
    <Link
      href={`/tna?departmentId=${id}#staff-list`}
      className={`flex flex-col items-center gap-3 rounded-2xl border bg-surface p-4 text-center shadow-[var(--shadow-card)] transition-all hover:border-primary ${
        active ? "border-primary-dark ring-1 ring-primary bg-primary/5" : "border-border"
      }`}
    >
      <div className="relative h-20 w-20">
        <svg viewBox="0 0 72 72" className="h-20 w-20 -rotate-90">
          <circle cx="36" cy="36" r={RING_RADIUS} fill="none" stroke="#f1f5f9" strokeWidth="7" />
          <circle
            cx="36"
            cy="36"
            r={RING_RADIUS}
            fill="none"
            stroke={ringColor(percent)}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-text-primary">{percent}%</span>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-text-primary leading-tight line-clamp-2" title={name}>
          {name}
        </p>
        <p className="text-[11px] text-text-muted mt-1">
          {submitted}/{total} submitted{approved > 0 ? ` · ${approved} approved` : ""}
        </p>
      </div>
    </Link>
  );
}

export default async function TnaIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; departmentId?: string; status?: string }>;
}) {
  const session = await requireSession();
  const manage = canManageTna(session);

  if (manage) {
    const { q, departmentId, status } = await searchParams;
    const year = new Date().getFullYear();

    const [allStaff, departments, yearTnas, reportItems] = await Promise.all([
      prisma.user.findMany({
        where: { status: "ACTIVE" },
        include: { department: true },
        orderBy: { staffName: "asc" },
      }),
      prisma.department.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          hodUserId: true,
          hod: { select: { id: true, staffNo: true, staffName: true } },
        },
      }),
      prisma.tna.findMany({
        where: { year },
        select: {
          id: true,
          userId: true,
          status: true,
          createdAt: true,
          approvedAt: true,
          approvedBy: { select: { staffName: true } },
          _count: { select: { items: true } },
        },
      }),
      // Full item-level detail for the Excel report — includes any TNA submitted
      // this year even if its owner is no longer the current HOD of their
      // department, so a past submission is never silently dropped from the export.
      prisma.tnaItem.findMany({
        where: { tna: { year } },
        orderBy: [{ tnaId: "asc" }, { order: "asc" }],
        include: {
          tna: {
            select: {
              year: true,
              status: true,
              createdAt: true,
              approvedAt: true,
              approvedBy: { select: { staffName: true } },
              user: { select: { staffNo: true, staffName: true, department: { select: { name: true } } } },
            },
          },
        },
      }),
    ]);

    const tnaByUserId = new Map(yearTnas.map((t) => [t.userId, t]));

    // Department completion rollup (unaffected by the filters below).
    const deptStats = departments.map((d) => {
      const staffInDept = allStaff.filter((s) => s.departmentId === d.id);
      const submitted = staffInDept.filter((s) => tnaByUserId.has(s.id));
      const approved = submitted.filter((s) => tnaByUserId.get(s.id)?.status === "APPROVED");
      return {
        id: d.id,
        name: d.name,
        total: staffInDept.length,
        submitted: submitted.length,
        approved: approved.length,
        percent: staffInDept.length ? Math.round((submitted.length / staffInDept.length) * 100) : 0,
      };
    });
    const unassigned = allStaff.filter((s) => !s.departmentId);
    if (unassigned.length > 0) {
      const submitted = unassigned.filter((s) => tnaByUserId.has(s.id));
      const approved = submitted.filter((s) => tnaByUserId.get(s.id)?.status === "APPROVED");
      deptStats.push({
        id: 0,
        name: "Unassigned",
        total: unassigned.length,
        submitted: submitted.length,
        approved: approved.length,
        percent: unassigned.length ? Math.round((submitted.length / unassigned.length) * 100) : 0,
      });
    }
    const overall = {
      total: allStaff.length,
      submitted: yearTnas.length,
      percent: allStaff.length ? Math.round((yearTnas.length / allStaff.length) * 100) : 0,
    };

    // TNA is submitted by the assigned HOD on behalf of their whole department —
    // staff never key in their own TNA — so this list is one row per department
    // (its HOD and their submission status), not one row per staff member.
    let rows = departments.map((d) => {
      const hod = d.hod;
      const tna = hod ? tnaByUserId.get(hod.id) : undefined;
      return {
        departmentId: d.id,
        department: d.name,
        userId: hod?.id ?? null,
        staffNo: hod?.staffNo ?? null,
        staffName: hod?.staffName ?? null,
        tnaId: tna?.id ?? null,
        status: hod ? (tna?.status ?? "NOT_SUBMITTED") : "NO_HOD",
      };
    });
    if (departmentId) rows = rows.filter((r) => r.departmentId === Number(departmentId));
    if (status) rows = rows.filter((r) => r.status === status);
    if (q) {
      const needle = q.toUpperCase();
      rows = rows.filter(
        (r) => (r.staffName?.includes(needle) ?? false) || (r.staffNo?.toUpperCase().includes(needle) ?? false),
      );
    }

    const filteredDeptName = departmentId
      ? (deptStats.find((d) => d.id === Number(departmentId))?.name ?? null)
      : null;

    // Excel report — the full HOD list (unaffected by the on-page filters) plus
    // every training-need item submitted this year.
    const reportSummaryRows: TnaDeptSummaryRow[] = departments.map((d) => {
      const hod = d.hod;
      const tna = hod ? tnaByUserId.get(hod.id) : undefined;
      return {
        department: d.name,
        hodStaffNo: hod?.staffNo ?? null,
        hodName: hod?.staffName ?? null,
        status: hod ? (tna?.status ?? "NOT_SUBMITTED") : "NO_HOD",
        itemsCount: tna?._count.items ?? 0,
        submittedAt: tna?.createdAt.toISOString() ?? null,
        approvedAt: tna?.approvedAt?.toISOString() ?? null,
        approvedByName: tna?.approvedBy?.staffName ?? null,
      };
    });
    const reportDetailRows: TnaDetailRow[] = reportItems.map((item) => ({
      year: item.tna.year,
      department: item.tna.user.department?.name ?? "—",
      hodStaffNo: item.tna.user.staffNo,
      hodName: item.tna.user.staffName,
      status: item.tna.status,
      submittedAt: item.tna.createdAt.toISOString(),
      approvedAt: item.tna.approvedAt?.toISOString() ?? null,
      approvedByName: item.tna.approvedBy?.staffName ?? null,
      section: item.section,
      problemStatement: item.problemStatement,
      training: item.training,
      currentSkill: item.currentSkill,
      targetSkill: item.targetSkill,
      trainingType: item.trainingType,
      monthApply: item.monthApply,
    }));

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Training Need Analysis</h1>
            <p className="text-text-secondary text-sm mt-1">
              {year} — {overall.submitted} of {overall.total} staff submitted ({overall.percent}%)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <DownloadTnaReportButton year={year} summaryRows={reportSummaryRows} detailRows={reportDetailRows} />
            <Link
              href="/tna/summary"
              className="rounded-xl bg-primary-dark hover:bg-primary text-white text-sm font-medium px-4 py-2 transition-colors"
            >
              TNA Summary
            </Link>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
          Completion by Department
        </h3>
        <p className="text-xs text-text-muted mb-3">Click a department to see its staff below.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-8">
          {deptStats.map((d) => (
            <DepartmentCard key={d.id} {...d} active={departmentId === String(d.id)} />
          ))}
        </div>

        <h3 id="staff-list" className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3 scroll-mt-4">
          TNA List (by HOD){filteredDeptName ? ` — ${filteredDeptName}` : ""}
        </h3>
        <p className="text-xs text-text-muted mb-3">
          Only the assigned Head of Department keys in a TNA, on behalf of their whole department.
        </p>
        <div className="mb-4">
          <TnaFilters departments={departments} />
        </div>
        <p className="text-text-secondary text-sm mb-3">{rows.length} department(s)</p>
        <div className="bg-surface rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">HOD Staff No.</th>
                <th className="px-4 py-3 font-medium">HOD Name</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.departmentId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-text-primary">{r.department}</td>
                  <td className="px-4 py-3 text-text-secondary">{r.staffNo ?? "—"}</td>
                  <td className="px-4 py-3 text-text-secondary">{r.staffName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={statusBadgeClass(r.status)}>{statusLabel(r.status)}</span>
                  </td>
                  <td className="px-4 py-3">
                    {r.tnaId ? (
                      <Link
                        href={`/tna/${r.tnaId}`}
                        className="rounded-xl bg-primary-dark hover:bg-primary text-white text-xs font-medium px-3 py-1.5 transition-colors"
                      >
                        View TNA
                      </Link>
                    ) : (
                      <span className="text-xs text-text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-text-muted">
                    No departments match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!canSubmitTna(session)) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <h1 className="text-xl font-semibold text-text-primary mb-2">Training Need Analysis</h1>
        <p className="text-sm text-text-secondary">
          Only Heads of Department submit a Training Need Analysis. Speak to your HOD if you have training needs to
          raise.
        </p>
      </div>
    );
  }

  const year = new Date().getFullYear();
  const [tna, trainingOptionRows] = await Promise.all([
    prisma.tna.findUnique({
      where: { userId_year: { userId: session.userId, year } },
      include: { items: { orderBy: { order: "asc" } } },
    }),
    prisma.tnaTrainingOption.findMany({ orderBy: { order: "asc" } }),
  ]);
  const trainingOptions = buildTrainingOptionsMap(trainingOptionRows);

  // A brand-new TNA starts with one blank task row per section (matching the legacy
  // form); once a submission exists, its saved items replace those blanks entirely.
  const initial: TnaFormState = tna ? emptyTnaFormState() : defaultTnaFormState();
  if (tna) {
    for (const item of tna.items) {
      initial[item.section].push({
        problem: item.problemStatement,
        training: item.training,
        trainingOther: "",
        target: item.targetSkill,
        current: item.currentSkill,
        type: item.trainingType,
        month: item.monthApply,
      });
    }
  }

  const readOnly = tna?.status === "APPROVED";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Training Need Analysis — {year}</h1>
          <p className="text-xs text-text-muted mt-1">
            To be filled in consultation with your immediate supervisor.
          </p>
        </div>
        {tna && (
          <span
            className={
              readOnly
                ? "inline-flex rounded-full bg-primary/10 text-primary-dark text-xs font-medium px-3 py-1.5"
                : "inline-flex rounded-full bg-purple/10 text-purple text-xs font-medium px-3 py-1.5"
            }
          >
            {TNA_STATUS_LABELS[tna.status]}
          </span>
        )}
      </div>

      <TnaForm
        action={async (fd) => {
          "use server";
          fd.set("year", String(year));
          await saveTna(fd);
        }}
        initial={initial}
        readOnly={!!readOnly}
        submitLabel={tna ? "Save Changes" : "Submit TNA"}
        trainingOptions={trainingOptions}
      />
    </div>
  );
}
