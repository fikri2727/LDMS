import { resolveRequisitionTheme, type RequisitionStatusKey } from "@/lib/requisition-theme";

function Glyph({ status }: { status: RequisitionStatusKey }) {
  const common = {
    viewBox: "0 0 48 48",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (status === "APPROVED") {
    return (
      <svg {...common}>
        <path d="M24 5 8 11v11c0 10 7 16.5 16 21 9-4.5 16-11 16-21V11L24 5Z" />
        <path d="M16 24l5 5 11-11" />
      </svg>
    );
  }
  if (status === "REJECTED") {
    return (
      <svg {...common}>
        <path d="M24 5 8 11v11c0 10 7 16.5 16 21 9-4.5 16-11 16-21V11L24 5Z" />
        <path d="M19 19l10 10M29 19l-10 10" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M14 6h20M14 42h20" />
      <path d="M16 6c0 8 16 8 16 0M16 42c0-8 16-8 16 0" />
      <path d="M16 6v6c0 8 16 8 16 0V6M16 42v-6c0-8 16-8 16 0v6" />
    </svg>
  );
}

export function RequisitionVisual({ status, size = "sm" }: { status: string; size?: "sm" | "md" }) {
  const theme = resolveRequisitionTheme(status);
  const dims = size === "sm" ? "h-9 w-9" : "h-24 w-24";
  const iconDims = size === "sm" ? "h-4 w-4" : "h-11 w-11";
  const puckRadius = size === "sm" ? "rounded-lg" : "rounded-2xl";

  return (
    <div
      className={`relative flex items-center justify-center ${size === "sm" ? "h-11 w-11" : "h-32 w-32"} shrink-0`}
      aria-hidden
    >
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-30"
        style={{ background: `radial-gradient(circle, ${theme.accentSoftHex}, transparent 70%)` }}
      />

      <svg
        className={`absolute ${size === "sm" ? "h-11 w-11" : "h-28 w-28"} animate-spin-slower text-white/40`}
        viewBox="0 0 100 100"
      >
        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 6" />
      </svg>
      {size !== "sm" && (
        <svg className="absolute h-20 w-20 animate-spin-slow" viewBox="0 0 100 100" style={{ color: theme.accentSoftHex }}>
          <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1 10" />
        </svg>
      )}

      <div
        className={`relative ${dims} ${puckRadius} bg-gradient-to-br ${theme.gradient} shadow-lg animate-float-slow flex items-center justify-center`}
        style={{ boxShadow: `0 8px 16px -8px ${theme.accentHex}66, inset 0 1px 0 rgba(255,255,255,0.35)` }}
      >
        <div className={`absolute inset-0 ${puckRadius} bg-white/10 mix-blend-overlay`} />
        <div className={`${iconDims} text-white drop-shadow-sm`}>
          <Glyph status={theme.key} />
        </div>
      </div>

      <span
        className="absolute top-0 right-1 h-1.5 w-1.5 rounded-full animate-pulse-soft"
        style={{ backgroundColor: theme.accentSoftHex }}
      />
    </div>
  );
}
