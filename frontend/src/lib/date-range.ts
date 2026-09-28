import { format, isSameDay } from "date-fns";

export function formatDateRange(start: Date, end: Date | null | undefined) {
  if (!end || isSameDay(start, end)) return format(start, "d MMM yyyy");
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  return sameMonth
    ? `${format(start, "d")} – ${format(end, "d MMM yyyy")}`
    : `${format(start, "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`;
}
