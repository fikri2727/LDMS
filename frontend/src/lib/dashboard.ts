/** Dashboard date helpers and types. The figures themselves are computed by the backend (GET /api/dashboard). */

export interface DateRange {
  start: Date;
  end: Date;
}

export function defaultYearRange(): DateRange {
  const year = new Date().getUTCFullYear();
  return { start: new Date(Date.UTC(year, 0, 1)), end: new Date(Date.UTC(year, 11, 31)) };
}

/** Company-wide L&D KPI: every department should average this many training hours per active staff member, per year. */
export const ANNUAL_DEPARTMENT_HOUR_TARGET = 24;

/** Pro-rates the annual hour target to the length of the selected date range, so a narrower filter doesn't read as "below target" unfairly. */
export function departmentHourTargetForRange(range: DateRange): number {
  const days = Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000) + 1);
  return Math.round(((ANNUAL_DEPARTMENT_HOUR_TARGET * days) / 365) * 100) / 100;
}

export interface RecentTrainingRecord {
  id: string;
  type: "training" | "ojt" | "elearning";
  program: string;
  title: string;
  date: string;
  status: "COMPLETED" | "PENDING" | "ABSENT";
  hours: number;
  href: string;
}

export interface DepartmentRow {
  department: string;
  departmentFullName: string;
  manHour: number;
  staffCount: number;
  avgHour: number;
}

export interface DashboardData {
  orgWide: boolean;
  overview: { totalTraining: number; totalUser: number; totalDay: number; totalHour: number };
  split: { name: string; value: number }[];
  monthlyCost: { month: string; cost: number }[] | null;
  monthlyHours: { month: string; hours: number }[] | null;
  topTrainers: { trainer: string; totalHour: number }[];
  departmentData: DepartmentRow[] | null;
  recentRecords: RecentTrainingRecord[] | null;
  myDepartmentData: DepartmentRow[] | null;
}
