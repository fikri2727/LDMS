import Link from "next/link";
import { ClipboardCheck, Database, GraduationCap, type LucideIcon } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canManageMaster } from "@/lib/rbac";
import { PortalHeader } from "@/components/portal/PortalHeader";

interface Tile {
  href: string | null;
  title: string;
  text: string;
  icon: LucideIcon;
  tone: string;
  badge?: string;
}

/** After login: one screen to pick HR Master, LDMS or Appraisal. One login for all three. */
export default async function PortalHome() {
  const session = await requireSession();
  const appraisalUrl = process.env.NEXT_PUBLIC_APPRAISAL_URL || null;

  const tiles: Tile[] = [
    ...(canManageMaster(session)
      ? [
          {
            href: "/master",
            title: "HR Master",
            text: "Employee master data shared by LDMS and Appraisal. Upload the HR employee report.",
            icon: Database,
            tone: "bg-sky-50 text-sky-700",
            badge: "HR only",
          },
        ]
      : []),
    {
      href: "/dashboard",
      title: "LDMS",
      text: "Learning & Development: training, OJT, E-Learning, TNA and your training record.",
      icon: GraduationCap,
      tone: "bg-primary/10 text-primary-dark",
    },
    {
      href: appraisalUrl,
      title: "Appraisal",
      text: "Yearly performance appraisal, using the same employee master.",
      icon: ClipboardCheck,
      tone: "bg-emerald-50 text-emerald-700",
      badge: appraisalUrl ? undefined : "Coming soon",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <PortalHeader title="TAMCO Staff Portal" staffName={session.staffName} staffNo={session.staffNo} showApps={false} />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary">Welcome, {session.staffName}</h1>
        <p className="text-sm text-text-secondary mt-1 mb-8">Choose where you want to go. One login works for all of them.</p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t) => {
            const Icon = t.icon;
            const body = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${t.tone}`}>
                    <Icon size={24} />
                  </span>
                  {t.badge && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-text-muted">
                      {t.badge}
                    </span>
                  )}
                </div>
                <h2 className="mt-5 text-lg font-semibold text-text-primary">{t.title}</h2>
                <p className="mt-1 text-sm text-text-secondary">{t.text}</p>
                <span className="mt-5 block text-sm font-medium text-primary-dark">
                  {t.href ? "Open →" : "Not available yet"}
                </span>
              </>
            );
            const cls = "block rounded-3xl border border-border bg-surface p-6 transition-all";
            return t.href ? (
              <Link
                key={t.title}
                href={t.href}
                className={`${cls} hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
              >
                {body}
              </Link>
            ) : (
              <div key={t.title} aria-disabled="true" className={`${cls} opacity-70`}>
                {body}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
