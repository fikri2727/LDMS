import { GraduationCap, Clock, CheckCircle2, Timer } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";

export function MyTrainingStats({
  total,
  pending,
  completed,
  totalHours,
}: {
  total: number;
  pending: number;
  completed: number;
  totalHours: number;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard icon={GraduationCap} label="Total Trainings" value={total} accent="#46bea2" />
        <StatCard icon={Clock} label="Pending" value={pending} accent="#6d3ecd" />
        <StatCard icon={CheckCircle2} label="Completed" value={completed} accent="#1d8e72" />
        <StatCard icon={Timer} label="Hours Done" value={Math.round(totalHours)} suffix="h" accent="#c2ace3" />
      </div>

      {total > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-text-muted shrink-0">{pct}% complete</span>
        </div>
      )}
    </div>
  );
}
