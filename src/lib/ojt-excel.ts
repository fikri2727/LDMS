import ExcelJS from "exceljs";
import { TRAINER_TYPE_LABELS } from "@/lib/labels";

/**
 * Matches the company's existing "template upload OJT.xlsx" layout: a single
 * sheet with OJT detail labels merged across columns A:B (rows 3-10) and
 * their values in column C, and a participant Staff No list in column B
 * starting row 13 (column A there is just a 1, 2, 3... row-number guide).
 */
const CELL = {
  title: "C3",
  venue: "C4",
  trainerType: "C5",
  trainerName: "C6",
  startDate: "C7",
  endDate: "C8",
  startTime: "C9",
  endTime: "C10",
} as const;

const FIRST_PARTICIPANT_ROW = 13;
const PARTICIPANT_COLUMN = "B";

export interface ParsedOjtExcel {
  fields: {
    title: string;
    venue: string;
    trainerType: "INTERNAL" | "EXTERNAL";
    trainerName: string;
    startDate: Date;
    endDate: Date;
    startTime: string;
    endTime: string;
  };
  staffNos: string[];
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "richText" in value) {
    return (value as { richText: { text: string }[] }).richText.map((r) => r.text).join("").trim();
  }
  if (typeof value === "object" && "text" in value) return String((value as { text: unknown }).text ?? "").trim();
  if (typeof value === "object" && "result" in value) return String((value as { result: unknown }).result ?? "").trim();
  return String(value).trim();
}

// Excel date/time serials carry no timezone — exceljs converts them to JS
// Date objects by treating the serial as a UTC wall-clock value, so the UTC
// fields (not local) are the ones that match what's visually in the cell.
const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);

function excelSerialToDate(serial: number): Date {
  return new Date(EXCEL_EPOCH_UTC_MS + Math.round(serial * 86400000));
}

// A cell can come back as a real Date (when it has a date/time number format)
// or a bare number (Excel serial, when the format wasn't applied — e.g. a
// cell a user typed into without Excel auto-detecting it as a date) — treat
// both as the same underlying value.
function asExcelDate(value: ExcelJS.CellValue): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "number") return excelSerialToDate(value);
  return null;
}

function parseDateCell(value: ExcelJS.CellValue, label: string): Date {
  const asDate = asExcelDate(value);
  if (asDate) {
    return new Date(Date.UTC(asDate.getUTCFullYear(), asDate.getUTCMonth(), asDate.getUTCDate()));
  }
  const text = cellText(value);
  const match = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!match) throw new Error(`${label} must be in dd/mm/yyyy format, got "${text}".`);
  const [, dd, mm, yyyy] = match;
  const date = new Date(`${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T00:00:00`);
  if (isNaN(date.getTime())) throw new Error(`${label}: invalid date "${text}".`);
  return date;
}

function parseTimeCell(value: ExcelJS.CellValue, label: string): string {
  const asDate = asExcelDate(value);
  if (asDate) {
    return `${String(asDate.getUTCHours()).padStart(2, "0")}:${String(asDate.getUTCMinutes()).padStart(2, "0")}`;
  }
  const text = cellText(value).toUpperCase();
  const match = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) throw new Error(`${label} must be in hh:mm AM/PM format, got "${text}".`);
  let hours = Number(match[1]);
  const minutes = match[2];
  const ampm = match[3];
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

export async function parseOjtExcel(buffer: Buffer): Promise<ParsedOjtExcel> {
  const workbook = new ExcelJS.Workbook();
  // exceljs ships its own ambient `Buffer` type that doesn't structurally match
  // newer @types/node's generic Buffer — cast to bypass the false mismatch.
  await workbook.xlsx.load(buffer as never);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("The uploaded file has no sheets. Please use the provided template.");

  const title = cellText(sheet.getCell(CELL.title).value).toUpperCase();
  const venue = cellText(sheet.getCell(CELL.venue).value).toUpperCase();
  const trainerTypeRaw = cellText(sheet.getCell(CELL.trainerType).value).toUpperCase();
  const trainerName = cellText(sheet.getCell(CELL.trainerName).value).toUpperCase();

  if (!title || !venue || !trainerName) {
    throw new Error(`Title (${CELL.title}), Venue (${CELL.venue}), and Trainer Name (${CELL.trainerName}) are required.`);
  }

  const trainerType = Object.entries(TRAINER_TYPE_LABELS).find(
    ([key, label]) => key === trainerTypeRaw || label.toUpperCase() === trainerTypeRaw
  )?.[0] as "INTERNAL" | "EXTERNAL" | undefined;
  if (!trainerType) {
    throw new Error(`Trainer Type (${CELL.trainerType}) must be "Internal" or "External", got "${trainerTypeRaw}".`);
  }

  const startDate = parseDateCell(sheet.getCell(CELL.startDate).value, `Start Date (${CELL.startDate})`);
  const endDate = parseDateCell(sheet.getCell(CELL.endDate).value, `End Date (${CELL.endDate})`);
  const startTime = parseTimeCell(sheet.getCell(CELL.startTime).value, `Start Time (${CELL.startTime})`);
  const endTime = parseTimeCell(sheet.getCell(CELL.endTime).value, `End Time (${CELL.endTime})`);

  const staffNos: string[] = [];
  const lastRow = Math.max(sheet.rowCount, FIRST_PARTICIPANT_ROW);
  for (let row = FIRST_PARTICIPANT_ROW; row <= lastRow; row++) {
    const staffNo = cellText(sheet.getCell(`${PARTICIPANT_COLUMN}${row}`).value).toUpperCase();
    if (staffNo) staffNos.push(staffNo);
  }

  if (staffNos.length === 0) {
    throw new Error(
      `No participants found — list each Staff No in column ${PARTICIPANT_COLUMN} starting row ${FIRST_PARTICIPANT_ROW}.`
    );
  }

  return {
    fields: { title, venue, trainerType, trainerName, startDate, endDate, startTime, endTime },
    staffNos: [...new Set(staffNos)],
  };
}
