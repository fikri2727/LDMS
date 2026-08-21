"use client";

import { Layers, Loader, CheckCircle2, Target } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";

export function ModuleStats({
  total,
  inProgress,
  completed,
  averageScore,
}: {
  total: number;
  inProgress: number;
  completed: number;
  averageScore: number | null;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <StatCard icon={Layers} label="Total Modules" value={total} accent="#46bea2" />
      <StatCard icon={Loader} label="In Progress" value={inProgress} accent="#6d3ecd" />
      <StatCard icon={CheckCircle2} label="Completed" value={completed} accent="#1d8e72" />
      <StatCard
        icon={Target}
        label="Average Score"
        value={averageScore ?? 0}
        suffix="%"
        staticValue={averageScore == null ? "—" : undefined}
        accent="#c2ace3"
      />
    </div>
  );
}
