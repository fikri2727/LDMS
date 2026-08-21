import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { Award } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getModuleProgress, getModuleEstimatedHours } from "@/lib/elearning";
import { LearningModules } from "@/components/elearning/catalogue/LearningModules";
import type { LearningModuleCardData } from "@/components/elearning/catalogue/types";

export default async function LearnerDashboardPage() {
  const session = await requireSession();
  // Admins manage the whole module catalogue and have no learner dashboard of
  // their own. Creators do — they build modules but can also take them like
  // any staff member, watch lessons, and earn a certificate.
  if (session.roleType === "ADMIN") redirect("/elearning/admin");

  const [assignments, completions, certificates, allPublished] = await Promise.all([
    prisma.elearningAssignment.findMany({
      where: { userId: session.userId },
      include: { module: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.elearningCompletion.findMany({
      where: { userId: session.userId },
      include: { module: true },
      orderBy: { completedAt: "desc" },
    }),
    prisma.elearningCertificate.findMany({
      where: { userId: session.userId },
      include: { module: true },
      orderBy: { issuedAt: "desc" },
    }),
    prisma.elearningModule.findMany({
      where: { status: "PUBLISHED" },
      include: { category: true, lessons: { select: { id: true } }, createdBy: { select: { staffName: true } } },
    }),
  ]);

  const completionByModuleId = new Map(completions.map((c) => [c.moduleId, c]));
  const assignmentByModuleId = new Map(assignments.map((a) => [a.moduleId, a]));
  const certificateByModuleId = new Map(certificates.map((c) => [c.moduleId, c]));

  const modules: LearningModuleCardData[] = await Promise.all(
    allPublished.map(async (m): Promise<LearningModuleCardData> => {
      const completion = completionByModuleId.get(m.id);
      const assignment = assignmentByModuleId.get(m.id);
      const estimatedHours = await getModuleEstimatedHours(m.id);

      if (completion) {
        return {
          id: m.id,
          title: m.title,
          description: m.description,
          objectives: (m.objectives ?? "").split("\n").map((s) => s.trim()).filter(Boolean),
          category: m.category?.name ?? "General",
          lessonCount: m.lessons.length,
          estimatedHours,
          status: "COMPLETED",
          percent: 100,
          score: completion.finalScore,
          dueDate: null,
          completedAt: completion.completedAt.toISOString(),
          owner: m.createdBy?.staffName ?? null,
          certificateId: certificateByModuleId.get(m.id)?.id ?? null,
        };
      }

      if (assignment) {
        const progress = await getModuleProgress(m.id, session.userId);
        return {
          id: m.id,
          title: m.title,
          description: m.description,
          objectives: (m.objectives ?? "").split("\n").map((s) => s.trim()).filter(Boolean),
          category: m.category?.name ?? "General",
          lessonCount: m.lessons.length,
          estimatedHours,
          status: "IN_PROGRESS",
          percent: progress.percent,
          score: null,
          dueDate: assignment.dueDate ? assignment.dueDate.toISOString() : null,
          completedAt: null,
          owner: m.createdBy?.staffName ?? null,
          certificateId: null,
        };
      }

      return {
        id: m.id,
        title: m.title,
        description: m.description,
        objectives: (m.objectives ?? "").split("\n").map((s) => s.trim()).filter(Boolean),
        category: m.category?.name ?? "General",
        lessonCount: m.lessons.length,
        estimatedHours,
        status: "NOT_STARTED",
        percent: 0,
        score: null,
        dueDate: null,
        completedAt: null,
        owner: m.createdBy?.staffName ?? null,
        certificateId: null,
      };
    })
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">My Learning</h1>
        <p className="text-text-secondary text-sm mt-1">Good day, {session.staffName.split(" ")[0]}.</p>
      </div>

      <div className="mb-10">
        <LearningModules modules={modules} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">My Certificates</h3>
          {certificates.length === 0 ? (
            <p className="text-sm text-text-muted">No certificates yet — complete a module to earn one.</p>
          ) : (
            <ul className="space-y-2">
              {certificates.map((c) => (
                <li key={c.id} className="bg-surface rounded-2xl border border-border p-3 flex items-center gap-3">
                  <Award size={18} className="text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/elearning/learner/certificates/${c.id}`}
                      className="text-sm font-medium text-primary-dark hover:underline truncate block"
                    >
                      {c.module.title}
                    </Link>
                    <p className="text-xs text-text-muted">{format(c.issuedAt, "d MMM yyyy")} · {c.score}%</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">Learning History</h3>
          {completions.length === 0 ? (
            <p className="text-sm text-text-muted">No completed modules yet.</p>
          ) : (
            <ul className="space-y-2">
              {completions.map((c) => (
                <li key={c.id} className="bg-surface rounded-2xl border border-border p-3">
                  <p className="text-sm text-text-primary">{c.module.title}</p>
                  <p className="text-xs text-text-muted">
                    Completed {format(c.completedAt, "d MMM yyyy")}
                    {c.finalScore != null ? ` · ${c.finalScore}%` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
