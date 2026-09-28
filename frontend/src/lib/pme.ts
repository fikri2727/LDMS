import { addMonths, addDays } from "date-fns";

/** PME becomes actionable by the supervisor this many months after the training ends. */
export const PME_WAIT_MONTHS = 3;

/** Due 3 months after the day following the training's completion date. */
export function getPmeDueDate(trainingEndDate: Date) {
  return addMonths(addDays(trainingEndDate, 1), PME_WAIT_MONTHS);
}

/** The evaluation observation window: day after training ends → due date. */
export function getEvaluationPeriod(trainingEndDate: Date) {
  return { start: addDays(trainingEndDate, 1), end: getPmeDueDate(trainingEndDate) };
}

export function isPmeDue(trainingEndDate: Date, now: Date = new Date()) {
  return now >= getPmeDueDate(trainingEndDate);
}
