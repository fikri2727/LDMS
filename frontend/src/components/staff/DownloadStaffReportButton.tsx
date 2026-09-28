"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { GENDER_LABELS, DESIGNATION_LABELS, ROLE_LABELS, STATUS_LABELS } from "@/lib/labels";

export interface StaffReportRow {
  staffNo: string;
  staffName: string;
  email: string | null;
  gender: string;
  designation: string;
  nationality: string | null;
  divisionName: string | null;
  departmentName: string | null;
  sectionName: string | null;
  supervisorStaffNo: string | null;
  supervisorName: string | null;
  roleType: string;
  isHod: boolean;
  status: string;
  dateResign: string | null;
}

const COLUMNS: { header: string; width: number }[] = [
  { header: "No", width: 6 },
  { header: "Staff No", width: 12 },
  { header: "Staff Name", width: 28 },
  { header: "Email", width: 26 },
  { header: "Gender", width: 10 },
  { header: "Designation", width: 16 },
  { header: "Nationality", width: 14 },
  { header: "Division", width: 18 },
  { header: "Department", width: 26 },
  { header: "Section", width: 20 },
  { header: "Supervisor Staff No", width: 16 },
  { header: "Supervisor Name", width: 28 },
  { header: "System Role", width: 12 },
  { header: "Head of Department", width: 16 },
  { header: "Status", width: 10 },
  { header: "Date Resigned", width: 14 },
];

export function DownloadStaffReportButton({ staffRows }: { staffRows: StaffReportRow[] }) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();

      const sheet = workbook.addWorksheet("Staff List");
      sheet.columns = COLUMNS.map((c) => ({ header: c.header, width: c.width }));
      sheet.getRow(1).font = { bold: true };

      staffRows.forEach((r, i) => {
        sheet.addRow([
          i + 1,
          r.staffNo,
          r.staffName,
          r.email ?? "—",
          GENDER_LABELS[r.gender] ?? r.gender,
          DESIGNATION_LABELS[r.designation] ?? r.designation,
          r.nationality ?? "—",
          r.divisionName ?? "—",
          r.departmentName ?? "—",
          r.sectionName ?? "—",
          r.supervisorStaffNo ?? "—",
          r.supervisorName ?? "—",
          ROLE_LABELS[r.roleType] ?? r.roleType,
          r.isHod ? "Yes" : "No",
          STATUS_LABELS[r.status] ?? r.status,
          r.dateResign ? format(new Date(r.dateResign), "dd/MM/yyyy") : "—",
        ]);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `staff-list-${format(new Date(), "yyyyMMdd")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      className="flex items-center gap-1.5 rounded-xl border border-border bg-surface text-sm font-medium px-4 py-2 text-text-secondary hover:bg-gray-50 disabled:opacity-60 transition-colors"
    >
      <Download size={16} /> {downloading ? "Preparing..." : "Download Excel"}
    </button>
  );
}
