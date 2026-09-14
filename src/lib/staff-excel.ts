import ExcelJS from "exceljs";

/**
 * Bulk staff import/update format: a plain table, header row 1, one staff
 * member per row from row 2 onward. Column order doesn't matter — headers
 * are matched by name (case-insensitive) against the aliases below — but the
 * column names must match those in staff-upload-template.xlsx.
 */
export interface StaffExcelRow {
  rowNumber: number;
  staffNo: string;
  staffName: string;
  email: string;
  gender: string;
  designation: string;
  nationality: string;
  division: string;
  department: string;
  section: string;
  supervisorStaffNo: string;
  roleType: string;
  status: string;
}

type Field = keyof Omit<StaffExcelRow, "rowNumber">;

const HEADER_ALIASES: Record<Field, string[]> = {
  staffNo: ["staff no", "staff no.", "staffno"],
  staffName: ["staff name", "full name", "name"],
  email: ["email"],
  gender: ["gender"],
  designation: ["designation"],
  nationality: ["nationality"],
  division: ["division"],
  department: ["department"],
  section: ["section"],
  supervisorStaffNo: ["supervisor staff no", "supervisor staff no.", "supervisor"],
  roleType: ["system role", "role"],
  status: ["status"],
};

/**
 * Excel silently drops leading zeros when a staff number like "001622" is
 * typed into a numeric cell, leaving "1622". Pad any all-digit value back out
 * to the 6-digit form the database uses so it still matches. Values with
 * letters (e.g. ADMIN01) or already 6+ digits are left as-is.
 */
export function normalizeStaffNo(raw: string): string {
  const v = raw.trim().toUpperCase();
  return /^\d{1,5}$/.test(v) ? v.padStart(6, "0") : v;
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

export async function parseStaffExcel(buffer: Buffer): Promise<StaffExcelRow[]> {
  const workbook = new ExcelJS.Workbook();
  // exceljs ships its own ambient `Buffer` type that doesn't structurally match
  // newer @types/node's generic Buffer — cast to bypass the false mismatch.
  await workbook.xlsx.load(buffer as never);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("The uploaded file has no sheets. Please use the provided template.");

  const columnIndex: Partial<Record<Field, number>> = {};
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const text = cellText(cell.value).toLowerCase();
    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [Field, string[]][]) {
      if (aliases.includes(text)) columnIndex[field] = colNumber;
    }
  });

  if (!columnIndex.staffNo) {
    throw new Error('Could not find a "Staff No" column in row 1. Please use the provided template.');
  }

  function field(row: ExcelJS.Row, key: Field): string {
    const idx = columnIndex[key];
    return idx ? cellText(row.getCell(idx).value) : "";
  }

  const rows: StaffExcelRow[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const staffNo = normalizeStaffNo(field(row, "staffNo"));
    if (!staffNo) continue; // skip blank rows

    rows.push({
      rowNumber: r,
      staffNo,
      staffName: field(row, "staffName"),
      email: field(row, "email"),
      gender: field(row, "gender"),
      designation: field(row, "designation"),
      nationality: field(row, "nationality"),
      division: field(row, "division"),
      department: field(row, "department"),
      section: field(row, "section"),
      supervisorStaffNo: normalizeStaffNo(field(row, "supervisorStaffNo")),
      roleType: field(row, "roleType"),
      status: field(row, "status"),
    });
  }

  if (rows.length === 0) {
    throw new Error("No staff rows found. Add at least one row below the header, with a Staff No in each.");
  }

  return rows;
}
