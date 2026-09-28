import type { ModuleTheme } from "@/lib/module-theme";

export function CategoryBadge({ category, theme }: { category: string | null | undefined; theme: ModuleTheme }) {
  return (
    <span className={`inline-flex rounded-full text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 ${theme.badgeClass}`}>
      {category ?? "General"}
    </span>
  );
}
