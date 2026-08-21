import { format } from "date-fns";

export function generateTrainingCode(program: "EXT" | "INTX" | "INTI", id: number, date = new Date()) {
  const prefix = program === "EXT" ? "PB" : "IN";
  return `${prefix}${format(date, "ddMMyy")}${String(id).padStart(5, "0")}`;
}

export function generateOjtCode(id: number, date = new Date()) {
  return `OJ${format(date, "ddMMyy")}${String(id).padStart(5, "0")}`;
}

export function computeDays(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

export function computeHours(startTime: string, endTime: string) {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const hours = eh + em / 60 - (sh + sm / 60);
  return Math.round(hours * 100) / 100;
}
