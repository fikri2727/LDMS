import { addDays, format } from "date-fns";

/**
 * Multi-day Public/Inhouse trainings: Participation.attendedDays lists the day numbers
 * (1 = start date) a participant attended; null = every day. Mirrors backend services/attendance.py.
 */
export function attendedDayNumbers(attendedDays: number[] | null | undefined, totalDays: number): number[] {
  const all = Array.from({ length: totalDays }, (_, i) => i + 1);
  if (!attendedDays) return all;
  const days = [...new Set(attendedDays)].filter((d) => d >= 1 && d <= totalDays).sort((a, b) => a - b);
  return days.length ? days : all;
}

export function attendedDayCount(attendedDays: number[] | null | undefined, totalDays: number): number {
  return attendedDayNumbers(attendedDays, totalDays).length;
}

/** "All 2 days", "Day 2 only", "Day 1, 3" */
export function attendedDaysLabel(attendedDays: number[] | null | undefined, totalDays: number): string {
  const days = attendedDayNumbers(attendedDays, totalDays);
  if (days.length === totalDays) return totalDays === 1 ? "1 day" : `All ${totalDays} days`;
  return days.length === 1 ? `Day ${days[0]} only` : `Day ${days.join(", ")}`;
}

export function dayDate(startDate: Date, day: number): string {
  return format(addDays(startDate, day - 1), "d MMM");
}
