import { GraduationCap, Users, CalendarDays, Clock, Target } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";

interface Overview {
  totalTraining: number;
  totalUser: number;
  totalDay: number;
  totalHour: number;
}

export function OverviewTiles({
  overview,
  showStaffTrained = true,
  balanceHours,
}: {
  overview: Overview;
  showStaffTrained?: boolean;
  /** My remaining hours to reach the per-staff/year training target — personal view only. */
  balanceHours?: number | null;
}) {
  const targetMet = balanceHours != null && balanceHours <= 0;

  return (
    <div className={`grid grid-cols-2 gap-3 ${showStaffTrained || balanceHours != null ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
      <StatCard icon={GraduationCap} label="Total Trainings" value={overview.totalTraining} accent="#46BEA2" />
      {showStaffTrained && (
        <StatCard icon={Users} label="Staff Trained" value={overview.totalUser} accent="#6D3ECD" />
      )}
      <StatCard icon={CalendarDays} label="Total Days" value={overview.totalDay} accent="#46BEA2" />
      <StatCard icon={Clock} label="Total Hours" value={overview.totalHour} accent="#1D8E72" />
      {balanceHours != null && (
        <StatCard
          icon={Target}
          label="Balance Hours to Complete"
          value={Math.max(0, balanceHours)}
          suffix="h"
          accent={targetMet ? "#1D8E72" : "#6D3ECD"}
        />
      )}
    </div>
  );
}
