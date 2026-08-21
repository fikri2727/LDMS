import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { ModuleCompletionTable, type ModuleCompletionRow } from "@/components/elearning/ModuleCompletionTable";

function KpiCard({ label, value, subtitle }: { label: string; value: string | number; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-4 shadow-[var(--shadow-card)]">
      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-semibold text-text-primary tabular-nums">{value}</p>
      <p className="text-xs text-text-muted mt-1">{subtitle}</p>
    </div>
  );
}

export default async function ModuleAnalyticsPage() {
  const [registeredLearners, publishedModules, certificatesIssued, avgScoreAgg, publishedModuleList, recentCertificates, allCompletions] =
    await Promise.all([
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.elearningModule.count({ where: { status: "PUBLISHED" } }),
      prisma.elearningCertificate.count(),
      prisma.elearningQuizAttempt.aggregate({ _avg: { score: true } }),
      prisma.elearningModule.findMany({
        where: { status: "PUBLISHED" },
        include: {
          category: true,
          assignments: { select: { userId: true } },
          completions: { select: { userId: true, finalScore: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.elearningCertificate.findMany({
        take: 5,
        orderBy: { issuedAt: "desc" },
        include: { user: true, module: true },
      }),
      prisma.elearningCompletion.findMany({ include: { user: true } }),
    ]);

  const avgQuizScore = avgScoreAgg._avg.score != null ? Math.round(avgScoreAgg._avg.score) : null;

  const startedByModule = new Map<number, Set<number>>();
  if (publishedModuleList.length > 0) {
    const rows = await prisma.elearningLessonProgress.findMany({
      where: { lesson: { moduleId: { in: publishedModuleList.map((m) => m.id) } } },
      select: { userId: true, lesson: { select: { moduleId: true } } },
    });
    for (const r of rows) {
      const set = startedByModule.get(r.lesson.moduleId) ?? new Set<number>();
      set.add(r.userId);
      startedByModule.set(r.lesson.moduleId, set);
    }
  }

  const topLearnersMap = new Map<number, { user: (typeof allCompletions)[number]["user"]; completed: number; scores: number[] }>();
  for (const c of allCompletions) {
    const entry = topLearnersMap.get(c.userId) ?? { user: c.user, completed: 0, scores: [] };
    entry.completed += 1;
    if (c.finalScore != null) entry.scores.push(c.finalScore);
    topLearnersMap.set(c.userId, entry);
  }
  const topLearners = [...topLearnersMap.values()]
    .map((e) => ({
      staffName: e.user.staffName,
      completed: e.completed,
      avgScore: e.scores.length ? Math.round(e.scores.reduce((a, b) => a + b, 0) / e.scores.length) : 0,
    }))
    .sort((a, b) => b.avgScore - a.avgScore || b.completed - a.completed)
    .slice(0, 5);

  const moduleRows: ModuleCompletionRow[] = publishedModuleList.map((m) => {
    const assigned = m.assignments.length;
    const started = startedByModule.get(m.id)?.size ?? 0;
    const completed = m.completions.length;
    const completionRate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
    const scores = m.completions.map((c) => c.finalScore).filter((s): s is number => s != null);
    const avgScore = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;

    return {
      id: m.id,
      title: m.title,
      category: m.category?.name ?? "Uncategorized",
      status: m.status,
      assigned,
      started,
      completed,
      completionRate,
      avgScore,
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Registered Learners"
          value={registeredLearners}
          subtitle={registeredLearners > 0 ? "Active staff accounts" : "None yet"}
        />
        <KpiCard
          label="Published Modules"
          value={publishedModules}
          subtitle={publishedModules > 0 ? "Live in the catalogue" : "None yet"}
        />
        <KpiCard
          label="Certificates Issued"
          value={certificatesIssued}
          subtitle={certificatesIssued > 0 ? "All time" : "None yet"}
        />
        <KpiCard
          label="Avg. Quiz Score"
          value={avgQuizScore != null ? `${avgQuizScore}%` : "—"}
          subtitle={avgQuizScore != null ? "Across all attempts" : "No data yet"}
        />
      </div>

      <div className="bg-surface rounded-2xl border border-border p-5 shadow-[var(--shadow-card)]">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Completion by Module</h3>
        <ModuleCompletionTable rows={moduleRows} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-surface rounded-2xl border border-border p-5 shadow-[var(--shadow-card)]">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Recently Issued Certificates</h3>
          {recentCertificates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-10 text-center">
              <p className="text-sm text-text-muted">No certificates issued yet.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {recentCertificates.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <div>
                    <Link
                      href={`/elearning/learner/certificates/${c.id}`}
                      className="text-primary-dark font-medium hover:underline"
                    >
                      {c.user.staffName}
                    </Link>
                    <p className="text-xs text-text-muted">
                      {c.module.title} · {c.certificateNo}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-text-secondary">{c.score}%</p>
                    <p className="text-xs text-text-muted">{format(c.issuedAt, "d MMM yyyy")}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-surface rounded-2xl border border-border p-5 shadow-[var(--shadow-card)]">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Top Learners</h3>
          {topLearners.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-10 text-center">
              <p className="text-sm text-text-muted">No learner activity yet.</p>
            </div>
          ) : (
            <ol className="space-y-2">
              {topLearners.map((l, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">
                    {i + 1}. {l.staffName}
                  </span>
                  <span className="text-text-muted">
                    {l.avgScore}% · {l.completed} module(s)
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
