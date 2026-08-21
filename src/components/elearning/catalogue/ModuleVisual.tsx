import type { ModuleTheme } from "@/lib/module-theme";

type GlyphKey =
  | "blueprint"
  | "maintenance"
  | "wiring"
  | "cnc"
  | "switchgear"
  | "gear"
  | "height"
  | "fire"
  | "helmet"
  | "electricalSafety"
  | "hazard"
  | "shield"
  | "quality"
  | "people"
  | "business";

function pickGlyph(themeKey: string, title: string): GlyphKey {
  const t = title.toLowerCase();

  if (themeKey === "technical") {
    if (/(blueprint|drawing|schematic)/.test(t)) return "blueprint";
    if (/(maintenance|wrench)/.test(t)) return "maintenance";
    if (/(wiring|electrical|circuit|cable)/.test(t)) return "wiring";
    if (/(cnc|machine)/.test(t)) return "cnc";
    if (/(switchgear|panel|cabinet)/.test(t)) return "switchgear";
    return "gear";
  }
  if (themeKey === "safety") {
    if (/(height|harness|elevated)/.test(t)) return "height";
    if (/(fire|emergency)/.test(t)) return "fire";
    if (/(ppe|protective|helmet)/.test(t)) return "helmet";
    if (/(electrical)/.test(t)) return "electricalSafety";
    if (/(hazard|risk)/.test(t)) return "hazard";
    return "shield";
  }
  if (themeKey === "quality") return "quality";
  if (themeKey === "people") return "people";
  return "business";
}

function Glyph({ glyph }: { glyph: GlyphKey }) {
  const common = {
    viewBox: "0 0 48 48",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (glyph) {
    case "gear":
      return (
        <svg {...common}>
          <path d="M24 16a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z" />
          <path d="M24 5v5M24 38v5M43 24h-5M10 24H5M37.6 10.4l-3.5 3.5M13.9 34.1l-3.5 3.5M37.6 37.6l-3.5-3.5M13.9 13.9l-3.5-3.5" />
          <circle cx="24" cy="24" r="3" />
        </svg>
      );
    case "blueprint":
      return (
        <svg {...common}>
          <path d="M8 6h26l6 6v30H8V6Z" />
          <path d="M34 6v6h6" />
          <path d="M13 18h18M13 24h18M13 30h10" />
          <circle cx="30" cy="30" r="4" />
        </svg>
      );
    case "maintenance":
      return (
        <svg {...common}>
          <path d="M31 9a7 7 0 0 0-9.4 8L8 30.6V38h7.4L28.9 25a7 7 0 0 0 8-9.4l-5 5-4-4 5-5Z" />
        </svg>
      );
    case "wiring":
      return (
        <svg {...common}>
          <path d="M6 14h9v6h-9zM33 14h9v6h-9zM6 28h9v6h-9zM33 28h9v6h-9z" />
          <path d="M15 17h9a4 4 0 0 1 4 4v0a4 4 0 0 0 4 4h1" />
          <path d="M15 31h9a4 4 0 0 0 4-4v-1" />
          <circle cx="24" cy="24" r="2" />
        </svg>
      );
    case "cnc":
      return (
        <svg {...common}>
          <rect x="7" y="10" width="34" height="28" rx="2" />
          <circle cx="24" cy="24" r="8" />
          <circle cx="24" cy="24" r="2" />
          <path d="M24 16v0M24 32v0M16 24h0M32 24h0" />
        </svg>
      );
    case "switchgear":
      return (
        <svg {...common}>
          <rect x="11" y="6" width="26" height="36" rx="2" />
          <rect x="16" y="12" width="6" height="10" rx="1" />
          <rect x="26" y="12" width="6" height="10" rx="1" />
          <path d="M16 30h16M16 35h10" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M24 5 8 11v11c0 10 7 16.5 16 21 9-4.5 16-11 16-21V11L24 5Z" />
        </svg>
      );
    case "height":
      return (
        <svg {...common}>
          <path d="M24 5 8 11v11c0 10 7 16.5 16 21 9-4.5 16-11 16-21V11L24 5Z" />
          <path d="M24 30V16M18 22l6-6 6 6" />
        </svg>
      );
    case "fire":
      return (
        <svg {...common}>
          <path d="M24 5 8 11v11c0 10 7 16.5 16 21 9-4.5 16-11 16-21V11L24 5Z" />
          <path d="M24 15c3 4-3 5-2 9 1 3 4 3 5 1 1 3-1 6-4 6-4 0-6-3-6-6 0-4 3-5 3-8 0-1 2-2 4-2Z" />
        </svg>
      );
    case "helmet":
      return (
        <svg {...common}>
          <path d="M9 30a15 15 0 0 1 30 0Z" />
          <path d="M9 30h30v4a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2v-4Z" />
          <path d="M24 15V9" />
        </svg>
      );
    case "electricalSafety":
      return (
        <svg {...common}>
          <path d="M24 5 8 11v11c0 10 7 16.5 16 21 9-4.5 16-11 16-21V11L24 5Z" />
          <path d="M26 14 18 26h6l-2 8 10-13h-6l0-7Z" />
        </svg>
      );
    case "hazard":
      return (
        <svg {...common}>
          <path d="M24 6 4 40h40L24 6Z" />
          <path d="M24 20v9" />
          <circle cx="24" cy="33" r="0.5" fill="currentColor" />
        </svg>
      );
    case "quality":
      return (
        <svg {...common}>
          <circle cx="21" cy="20" r="13" />
          <path d="M15 20l4 4 8-8" />
          <path d="M30 30l8 8" />
        </svg>
      );
    case "people":
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="6" />
          <circle cx="32" cy="16" r="6" />
          <circle cx="24" cy="33" r="6" />
          <path d="M16 22c-4 0-7 3-7 7M32 22c4 0 7 3 7 7M20 29l2-2M28 29l-2-2" />
        </svg>
      );
    case "business":
    default:
      return (
        <svg {...common}>
          <path d="M8 40V22M18 40V14M28 40V26M38 40V8" />
          <path d="M8 22l10-8 10 12 10-18" />
          <path d="M32 8h6v6" />
        </svg>
      );
  }
}

export function ModuleVisual({
  theme,
  title,
  size = "md",
}: {
  theme: ModuleTheme;
  title: string;
  size?: "sm" | "md";
}) {
  const glyph = pickGlyph(theme.key, title);
  const dims = size === "sm" ? "h-9 w-9" : "h-24 w-24";
  const iconDims = size === "sm" ? "h-4 w-4" : "h-11 w-11";
  const puckRadius = size === "sm" ? "rounded-lg" : "rounded-2xl";

  return (
    <div
      className={`relative flex items-center justify-center ${size === "sm" ? "h-11 w-11" : "h-32 w-32"} shrink-0`}
      aria-hidden
    >
      {/* soft ambient glow */}
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-30"
        style={{ background: `radial-gradient(circle, ${theme.accentSoftHex}, transparent 70%)` }}
      />

      {/* rotating dashed orbit ring */}
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

      {/* the 3D "puck" holding the glyph */}
      <div
        className={`relative ${dims} ${puckRadius} bg-gradient-to-br ${theme.gradient} shadow-lg animate-float-slow flex items-center justify-center`}
        style={{ boxShadow: `0 8px 16px -8px ${theme.accentHex}66, inset 0 1px 0 rgba(255,255,255,0.35)` }}
      >
        <div className={`absolute inset-0 ${puckRadius} bg-white/10 mix-blend-overlay`} />
        <div className={`${iconDims} text-white drop-shadow-sm`}>
          <Glyph glyph={glyph} />
        </div>
      </div>

      {/* floating particles */}
      <span
        className="absolute top-1 right-2 h-1.5 w-1.5 rounded-full animate-pulse-soft"
        style={{ backgroundColor: theme.accentSoftHex }}
      />
      <span
        className="absolute bottom-2 left-1 h-1 w-1 rounded-full animate-pulse-soft [animation-delay:0.6s]"
        style={{ backgroundColor: theme.accentHex }}
      />
    </div>
  );
}
