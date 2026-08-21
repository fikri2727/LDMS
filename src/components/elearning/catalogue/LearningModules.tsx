"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { SearchModules } from "@/components/elearning/catalogue/SearchModules";
import { ModuleStats } from "@/components/elearning/catalogue/ModuleStats";
import { ModuleCard } from "@/components/elearning/catalogue/ModuleCard";
import { ModuleDetailDrawer } from "@/components/elearning/catalogue/ModuleDetailDrawer";
import { buildCategoryThemeMap, themeFor } from "@/lib/module-theme";
import type { LearningModuleCardData } from "@/components/elearning/catalogue/types";

export function LearningModules({ modules }: { modules: LearningModuleCardData[] }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<LearningModuleCardData | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.status.replace("_", " ").toLowerCase().includes(q)
    );
  }, [modules, search]);

  // Built from the full, unfiltered module list so a category's color never shifts
  // while searching, and every distinct category gets its own guaranteed-unique color.
  const themeMap = useMemo(() => buildCategoryThemeMap(modules.map((m) => m.category)), [modules]);

  const sections = useMemo(() => {
    const byCategory = new Map<string, LearningModuleCardData[]>();
    for (const m of filtered) {
      const list = byCategory.get(m.category) ?? [];
      list.push(m);
      byCategory.set(m.category, list);
    }
    return [...byCategory.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const stats = useMemo(() => {
    const inProgress = modules.filter((m) => m.status === "IN_PROGRESS").length;
    const completed = modules.filter((m) => m.status === "COMPLETED").length;
    const scores = modules.filter((m) => m.score != null).map((m) => m.score as number);
    const averageScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    return { total: modules.length, inProgress, completed, averageScore };
  }, [modules]);

  return (
    <div className="relative">
      {/* subtle futuristic backdrop */}
      <div className="pointer-events-none absolute -inset-x-4 -inset-y-6 -z-10 overflow-hidden rounded-[2rem]">
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(70,190,162,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(70,190,162,0.06) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
        <div className="absolute -top-10 right-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-40 -left-16 h-72 w-72 rounded-full bg-purple/10 blur-3xl" />
        <span className="absolute top-16 left-1/3 h-1 w-1 rounded-full bg-primary/40 animate-drift" />
        <span className="absolute top-52 right-1/4 h-1.5 w-1.5 rounded-full bg-purple/40 animate-drift [animation-delay:3s]" />
        <span className="absolute bottom-10 left-1/4 h-1 w-1 rounded-full bg-primary/30 animate-drift [animation-delay:6s]" />
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div>
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-1.5">
            Learning Modules
            <Sparkles size={15} className="text-primary" />
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">Explore, learn and track your development progress.</p>
        </div>
      </div>

      <div className="mb-4">
        <ModuleStats
          total={stats.total}
          inProgress={stats.inProgress}
          completed={stats.completed}
          averageScore={stats.averageScore}
        />
      </div>

      <div className="mb-5 max-w-sm">
        <SearchModules value={search} onChange={setSearch} />
      </div>

      {sections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 backdrop-blur-sm py-14 text-center">
          <p className="text-sm text-text-secondary">
            {modules.length === 0
              ? "No modules available right now — check back soon."
              : "No modules match your search."}
          </p>
        </div>
      ) : (
        <div className="space-y-7">
          {sections.map(([categoryName, categoryModules]) => {
            const theme = themeFor(themeMap, categoryName);
            return (
              <div key={categoryName}>
                <div className="flex items-center gap-2.5 mb-3">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: theme.accentHex }}
                  />
                  <h3 className="text-sm font-semibold text-text-primary">{categoryName}</h3>
                  <span className="text-[11px] text-text-muted">
                    {categoryModules.length} module{categoryModules.length === 1 ? "" : "s"}
                  </span>
                  <div
                    className="flex-1 h-px"
                    style={{ background: `linear-gradient(to right, ${theme.accentHex}33, transparent)` }}
                  />
                </div>
                <div
                  className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  style={{ perspective: "1200px" }}
                >
                  {categoryModules.map((m, i) => (
                    <ModuleCard key={m.id} module={m} theme={theme} index={i} onOpen={setSelected} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ModuleDetailDrawer
        module={selected}
        theme={selected ? themeFor(themeMap, selected.category) : null}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
