import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { canManageTna } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  TNA_SECTIONS,
  TNA_SECTION_SHORT_LABELS,
  TNA_SECTION_COLORS,
  TNA_TRAINING_TYPE_SHORT_LABELS,
  TNA_TRAINING_TYPE_COLORS,
  type TnaSectionKey,
} from "@/lib/tna-options";
import { TnaSummaryPie } from "@/components/training/TnaSummaryPie";
import { TnaSummaryFilters } from "@/components/training/TnaSummaryFilters";

export default async function TnaSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ departmentId?: string }>;
}) {
  const session = await requireSession();
  if (!canManageTna(session)) redirect("/tna");

  const { departmentId } = await searchParams;
  const year = new Date().getFullYear();

  const [departments, items] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.tnaItem.findMany({
      where: {
        tna: {
          year,
          ...(departmentId ? { user: { departmentId: Number(departmentId) } } : {}),
        },
      },
      select: { section: true, trainingType: true },
    }),
  ]);

  const sectionData = TNA_SECTIONS.map((s) => ({
    name: TNA_SECTION_SHORT_LABELS[s.key as TnaSectionKey],
    value: items.filter((i) => i.section === s.key).length,
    color: TNA_SECTION_COLORS[s.key as TnaSectionKey],
  }));

  const trainingTypeData = (["EXTERNAL", "COACHING", "OJT"] as const).map((t) => ({
    name: TNA_TRAINING_TYPE_SHORT_LABELS[t],
    value: items.filter((i) => i.trainingType === t).length,
    color: TNA_TRAINING_TYPE_COLORS[t],
  }));

  const filteredDeptName = departmentId
    ? (departments.find((d) => d.id === Number(departmentId))?.name ?? null)
    : null;

  return (
    <div>
      <Link href="/tna" className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-4">
        <ArrowLeft size={15} /> Back to TNA
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">TNA Summary</h1>
          <p className="text-text-secondary text-sm mt-1">
            {year}{filteredDeptName ? ` — ${filteredDeptName}` : " — All Departments"} · {items.length} training need(s)
          </p>
        </div>
        <TnaSummaryFilters departments={departments} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-2xl border border-border p-5 shadow-[var(--shadow-card)]">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Summary of Section</h3>
          <TnaSummaryPie data={sectionData} />
        </div>
        <div className="bg-surface rounded-2xl border border-border p-5 shadow-[var(--shadow-card)]">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Summary of Training Method</h3>
          <TnaSummaryPie data={trainingTypeData} />
        </div>
      </div>
    </div>
  );
}
