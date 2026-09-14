export function DashboardCard({
  title,
  icon: Icon,
  accent = "#46BEA2",
  subtitle,
  children,
  className = "",
}: {
  title: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  accent?: string;
  /** Optional badge-like element shown to the right of the title, e.g. a target-compliance summary. */
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-surface p-3.5 shadow-[var(--shadow-card)] flex flex-col ${className}`}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-10 blur-2xl"
        style={{ backgroundColor: accent }}
      />
      <div className="relative flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          {Icon && (
            <div
              className="flex h-7 w-7 items-center justify-center rounded-xl shrink-0"
              style={{ backgroundColor: `${accent}1a`, color: accent }}
            >
              <Icon size={13} />
            </div>
          )}
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        </div>
        {subtitle}
      </div>
      <div className="relative flex-1 min-h-0">{children}</div>
    </div>
  );
}
