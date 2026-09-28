export type ModuleGlyphFamily = "technical" | "safety" | "quality" | "people" | "business";

export interface ModuleTheme {
  /** Which icon family (see ModuleVisual) this category's glyph is picked from — subject-matter only, unrelated to color. */
  key: ModuleGlyphFamily;
  label: string;
  /** Tailwind gradient stops for the card's visual panel. */
  gradient: string;
  /** Accent used for glows, rings, and the active filter pill. */
  accentHex: string;
  accentSoftHex: string;
  badgeClass: string;
}

interface ColorSwatch {
  gradient: string;
  accentHex: string;
  accentSoftHex: string;
  badgeClass: string;
}

// A distinct color per swatch — every real category (an open-ended, user-created
// list) gets its own deterministic slot here, instead of being bucketed into a
// handful of shared colors. Two different categories only ever share a color once
// there are more categories than swatches.
const COLOR_PALETTE: ColorSwatch[] = [
  {
    gradient: "from-tamco-navy via-tamco-blue to-cyan-500",
    accentHex: "#1b75bc",
    accentSoftHex: "#67e8f9",
    badgeClass: "bg-blue-50 text-blue-700",
  },
  {
    gradient: "from-tamco-navy via-amber-600 to-yellow-400",
    accentHex: "#d97706",
    accentSoftHex: "#fcd34d",
    badgeClass: "bg-amber-50 text-amber-700",
  },
  {
    gradient: "from-tamco-navy via-teal-600 to-cyan-400",
    accentHex: "#0d9488",
    accentSoftHex: "#5eead4",
    badgeClass: "bg-teal-50 text-teal-700",
  },
  {
    gradient: "from-tamco-navy via-violet-600 to-purple-400",
    accentHex: "#7c3aed",
    accentSoftHex: "#c4b5fd",
    badgeClass: "bg-violet-50 text-violet-700",
  },
  {
    gradient: "from-tamco-navy via-sky-600 to-blue-400",
    accentHex: "#0284c7",
    accentSoftHex: "#7dd3fc",
    badgeClass: "bg-sky-50 text-sky-700",
  },
  {
    gradient: "from-tamco-navy via-rose-600 to-pink-400",
    accentHex: "#e11d48",
    accentSoftHex: "#fda4af",
    badgeClass: "bg-rose-50 text-rose-700",
  },
  {
    gradient: "from-tamco-navy via-emerald-600 to-lime-400",
    accentHex: "#059669",
    accentSoftHex: "#86efac",
    badgeClass: "bg-emerald-50 text-emerald-700",
  },
  {
    gradient: "from-tamco-navy via-orange-600 to-amber-400",
    accentHex: "#ea580c",
    accentSoftHex: "#fdba74",
    badgeClass: "bg-orange-50 text-orange-700",
  },
  {
    gradient: "from-tamco-navy via-indigo-600 to-blue-400",
    accentHex: "#4f46e5",
    accentSoftHex: "#a5b4fc",
    badgeClass: "bg-indigo-50 text-indigo-700",
  },
  {
    gradient: "from-tamco-navy via-fuchsia-600 to-pink-400",
    accentHex: "#c026d3",
    accentSoftHex: "#f0abfc",
    badgeClass: "bg-fuchsia-50 text-fuchsia-700",
  },
  {
    gradient: "from-tamco-navy via-red-600 to-orange-400",
    accentHex: "#dc2626",
    accentSoftHex: "#fca5a5",
    badgeClass: "bg-red-50 text-red-700",
  },
  {
    gradient: "from-tamco-navy via-slate-600 to-slate-400",
    accentHex: "#475569",
    accentSoftHex: "#cbd5e1",
    badgeClass: "bg-slate-100 text-slate-700",
  },
];

/** Which icon pictogram (see ModuleVisual) best fits this category — subject-matter grouping only, not color. */
function resolveGlyphFamily(categoryName: string | null | undefined): ModuleGlyphFamily {
  const name = (categoryName ?? "").trim().toLowerCase();

  if (["technical", "manufacturing", "it", "engineering"].some((k) => name.includes(k))) return "technical";
  if (["safety", "hse", "esh"].some((k) => name.includes(k))) return "safety";
  if (["quality", "compliance", "qc", "qa"].some((k) => name.includes(k))) return "quality";
  if (["hr", "human capital", "people", "leadership", "communication"].some((k) => name.includes(k)))
    return "people";

  return "business";
}

/**
 * Assigns every distinct category name its own color slot, in alphabetical order — so as long as
 * there are no more categories than swatches, no two categories ever share a color. Build this once
 * per page from the full set of categories in view, and reuse the same map everywhere on that page
 * (card grid, detail drawer, etc.) so a given category always renders in the same color.
 */
export function buildCategoryThemeMap(categoryNames: (string | null | undefined)[]): Map<string, ModuleTheme> {
  const distinct = [...new Set(categoryNames.map((c) => (c?.trim() || "General")))].sort((a, b) =>
    a.localeCompare(b)
  );

  const map = new Map<string, ModuleTheme>();
  distinct.forEach((name, i) => {
    map.set(name, {
      key: resolveGlyphFamily(name),
      label: name,
      ...COLOR_PALETTE[i % COLOR_PALETTE.length],
    });
  });
  return map;
}

/** Looks up a category's theme in a map built by buildCategoryThemeMap, falling back to the first swatch if somehow missing. */
export function themeFor(map: Map<string, ModuleTheme>, categoryName: string | null | undefined): ModuleTheme {
  const name = categoryName?.trim() || "General";
  return (
    map.get(name) ?? {
      key: resolveGlyphFamily(name),
      label: name,
      ...COLOR_PALETTE[0],
    }
  );
}
