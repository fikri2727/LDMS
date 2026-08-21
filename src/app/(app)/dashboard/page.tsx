import { Sparkles, PieChart as PieChartIcon, TrendingUp, BarChart3, Trophy, History } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { hasOrgWideView } from "@/lib/rbac";
import {
  defaultYearRange,
  departmentHourTargetForRange,
  getOverview,
  getPublicVsOjtSplit,
  getMonthlyCost,
  getMonthlyHoursForUser,
  getTop5Trainers,
  getDepartmentBreakdown,
  getRecentTrainingRecords,
} from "@/lib/dashboard";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { OverviewTiles } from "@/components/dashboard/OverviewTiles";
import { PublicOjtPie } from "@/components/dashboard/PublicOjtPie";
import { MonthlyCostChart } from "@/components/dashboard/MonthlyCostChart";
import { MonthlyHoursChart } from "@/components/dashboard/MonthlyHoursChart";
import { DepartmentBarChart } from "@/components/dashboard/DepartmentBarChart";
import { TopTrainersTable } from "@/components/dashboard/TopTrainersTable";
import { RecentTrainingRecords } from "@/components/dashboard/RecentTrainingRecords";
import { DepartmentHourSummary } from "@/components/dashboard/DepartmentHourSummary";
import { DashboardCard } from "@/components/dashboard/DashboardCard";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const session = await requireSession();
  const { start, end } = await searchParams;

  const defaults = defaultYearRange();
  const range = {
    start: start ? new Date(start) : defaults.start,
    end: end ? new Date(end) : defaults.end,
  };

  const orgWide = hasOrgWideView(session);

  const [overview, split, monthlyCost, monthlyHours, topTrainers, departmentData, recentRecords, myDepartmentData] =
    await Promise.all([
      getOverview(range, orgWide ? undefined : session.userId),
      getPublicVsOjtSplit(range, orgWide ? undefined : session.userId),
      orgWide ? getMonthlyCost(range) : Promise.resolve(null),
      orgWide ? Promise.resolve(null) : getMonthlyHoursForUser(range, session.userId),
      getTop5Trainers(range, orgWide ? undefined : session.userId),
      orgWide ? getDepartmentBreakdown(range) : Promise.resolve(null),
      orgWide ? Promise.resolve(null) : getRecentTrainingRecords(session.userId, 5),
      !orgWide && session.departmentId ? getDepartmentBreakdown(range, session.departmentId) : Promise.resolve(null),
    ]);

  const hourTarget = departmentHourTargetForRange(range);
  const myDepartment = myDepartmentData?.[0] ?? null;
  const balanceHours = orgWide ? null : Math.round((hourTarget - overview.totalHour) * 100) / 100;

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

      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
            Welcome back, {session.staffName.split(" ")[0]} <span aria-hidden>👋</span>
          </h1>
          <p className="text-sm text-text-secondary mt-0.5 flex items-center gap-1.5">
            <Sparkles size={13} className="text-primary" /> Here&apos;s your training overview.
          </p>
        </div>
        <DateRangeFilter start={range.start.toISOString().slice(0, 10)} end={range.end.toISOString().slice(0, 10)} />
      </div>

      <div className="mb-6">
        <OverviewTiles overview={overview} showStaffTrained={orgWide} balanceHours={balanceHours} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <DashboardCard title="Public / Inhouse vs OJT vs E-Learning" icon={PieChartIcon} accent="#46BEA2">
          <PublicOjtPie data={split} />
        </DashboardCard>
        {orgWide && monthlyCost && (
          <DashboardCard title="Monthly Training Cost" icon={TrendingUp} accent="#6D3ECD">
            <MonthlyCostChart data={monthlyCost} />
          </DashboardCard>
        )}
        {!orgWide && recentRecords && (
          <DashboardCard title="My Recent Training Records" icon={History} accent="#6D3ECD">
            <RecentTrainingRecords records={recentRecords} />
          </DashboardCard>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <DashboardCard
          title={orgWide ? "Department Avg. Training Hours / Staff" : "My Monthly Hours"}
          icon={BarChart3}
          accent="#46BEA2"
          className="lg:col-span-2"
        >
          {orgWide ? (
            <DepartmentBarChart data={departmentData!} metric="avgHour" target={hourTarget} />
          ) : (
            <MonthlyHoursChart data={monthlyHours!} />
          )}
          {!orgWide && myDepartment && (
            <DepartmentHourSummary
              departmentName={myDepartment.departmentFullName}
              staffCount={myDepartment.staffCount}
              totalNeeded={Math.round(myDepartment.staffCount * hourTarget)}
              currentHours={myDepartment.manHour}
            />
          )}
        </DashboardCard>
        <DashboardCard title={orgWide ? "Top 5 Trainers" : "My Top Trainers"} icon={Trophy} accent="#6D3ECD">
          <TopTrainersTable data={topTrainers} />
        </DashboardCard>
      </div>
    </div>
  );
}
