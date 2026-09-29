import { Sparkles, PieChart as PieChartIcon, TrendingUp, BarChart3, Trophy, History, Building2 } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { hasOrgWideView } from "@/lib/rbac";
import { api } from "@/lib/api";
import { defaultYearRange, departmentHourTargetForRange, type DashboardData } from "@/lib/dashboard";
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

  // The backend decides org-wide vs. personal figures from the signed-in user.
  const { overview, split, monthlyCost, monthlyHours, topTrainers, departmentData, recentRecords, myDepartmentData } =
    await api.get<DashboardData>("/api/dashboard", {
      start: range.start.toISOString().slice(0, 10),
      end: range.end.toISOString().slice(0, 10),
    });

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

      <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            Welcome back, {session.staffName.split(" ")[0]} <span aria-hidden>👋</span>
          </h1>
          <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-1.5">
            <Sparkles size={12} className="text-primary" /> Here&apos;s your training overview.
          </p>
        </div>
        <DateRangeFilter start={range.start.toISOString().slice(0, 10)} end={range.end.toISOString().slice(0, 10)} />
      </div>

      <div className="mb-3">
        <OverviewTiles overview={overview} showStaffTrained={orgWide} balanceHours={balanceHours} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
        <DashboardCard
          title={orgWide ? "Department Avg. Training Hours / Staff" : "My Monthly Hours"}
          icon={BarChart3}
          accent="#46BEA2"
          className="lg:col-span-2"
        >
          {/* On laptops the chart shrinks with the screen height (between 10rem and 16rem) so the
              whole dashboard fits without scrolling; on very small screens the page still just
              scrolls - nothing is forced to fit (that caused overlapping before). */}
          <div className="h-64 lg:h-[clamp(10rem,calc(100dvh/var(--app-zoom)_-_34rem),16rem)] shrink-0">
            {orgWide ? (
              <DepartmentBarChart data={departmentData!} metric="avgHour" target={hourTarget} />
            ) : (
              <MonthlyHoursChart data={monthlyHours!} />
            )}
          </div>
        </DashboardCard>
        <div className="flex flex-col gap-3">
          {!orgWide && myDepartment && (
            <DashboardCard title="My Department" icon={Building2} accent="#46BEA2">
              <DepartmentHourSummary
                departmentName={myDepartment.departmentFullName}
                staffCount={myDepartment.staffCount}
                totalNeeded={Math.round(myDepartment.staffCount * hourTarget)}
                currentHours={myDepartment.manHour}
              />
            </DashboardCard>
          )}
          <DashboardCard title={orgWide ? "Top 5 Trainers" : "My Top Trainers"} icon={Trophy} accent="#6D3ECD">
            <TopTrainersTable data={topTrainers} />
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
