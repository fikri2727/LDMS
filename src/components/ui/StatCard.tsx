import { CountUp } from "@/components/ui/CountUp";

export function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  accent,
  staticValue,
  caption,
  captionClassName = "text-text-muted",
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  suffix?: string;
  accent: string;
  /** Renders this instead of an animated count-up — for a "no data yet" state. */
  staticValue?: string;
  /** Optional secondary line below the label, e.g. "20.6h to reach target". */
  caption?: string;
  captionClassName?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
      <div
        className="absolute -right-3 -top-3 h-12 w-12 rounded-full opacity-20 blur-xl"
        style={{ backgroundColor: accent }}
      />
      <div className="relative flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
          style={{ backgroundColor: `${accent}1a`, color: accent }}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-semibold text-text-primary leading-none">
            {staticValue != null ? staticValue : <CountUp value={value} suffix={suffix} />}
          </p>
          <p className="text-xs text-text-secondary mt-1 truncate">{label}</p>
          {caption && <p className={`text-[10px] mt-0.5 truncate ${captionClassName}`}>{caption}</p>}
        </div>
      </div>
    </div>
  );
}
