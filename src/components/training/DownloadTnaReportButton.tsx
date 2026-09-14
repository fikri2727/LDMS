"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { TNA_STATUS_LABELS } from "@/lib/labels";
import {
  TNA_SECTION_SHORT_LABELS,
  TNA_TRAINING_TYPE_LABELS,
  TNA_SKILL_LEVELS,
  type TnaSectionKey,
} from "@/lib/tna-options";

function skillLevelLabel(value: number) {
  return TNA_SKILL_LEVELS.find((l) => l.value === value)?.label ?? String(value);
}

export interface TnaDeptSummaryRow {
  department: string;
  hodStaffNo: string | null;
  hodName: string | null;
  status: string;
  itemsCount: number;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedByName: string | null;
}

export interface TnaDetailRow {
  year: number;
  department: string;
  hodStaffNo: string;
  hodName: string;
  status: string;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedByName: string | null;
  section: string;
  problemStatement: string;
  training: string;
  currentSkill: number;
  targetSkill: number;
  trainingType: string;
  monthApply: string;
}

const SUMMARY_COLUMNS: { header: string; width: number }[] = [
  { header: "No", width: 6 },
  { header: "Department", width: 30 },
  { header: "HOD Staff No", width: 14 },
  { header: "HOD Name", width: 28 },
  { header: "Status", width: 18 },
  { header: "Training Needs", width: 14 },
  { header: "Submitted Date", width: 16 },
  { header: "Approved Date", width: 16 },
  { header: "Approved By", width: 24 },
];

const DETAIL_COLUMNS: { header: string; width: number }[] = [
  { header: "No", width: 6 },
  { header: "Year", width: 8 },
  { header: "Department", width: 26 },
  { header: "HOD Staff No", width: 14 },
  { header: "HOD Name", width: 26 },
  { header: "TNA Status", width: 18 },
  { header: "Submitted Date", width: 16 },
  { header: "Approved Date", width: 16 },
  { header: "Approved By", width: 22 },
  { header: "Section", width: 22 },
  { header: "Problem Statement", width: 34 },
  { header: "Training Title", width: 30 },
  { header: "Current Skill Level", width: 26 },
  { header: "Target Skill Level", width: 26 },
  { header: "Skills Gap", width: 12 },
  { header: "Training Type", width: 20 },
  { header: "Estimated Month", width: 15 },
];

export function DownloadTnaReportButton({
  year,
  summaryRows,
  detailRows,
}: {
  year: number;
  summaryRows: TnaDeptSummaryRow[];
  detailRows: TnaDetailRow[];
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();

      const summarySheet = workbook.addWorksheet("Completion by Department");
      summarySheet.columns = SUMMARY_COLUMNS.map((c) => ({ header: c.header, width: c.width }));
      summarySheet.getRow(1).font = { bold: true };
      summaryRows.forEach((r, i) => {
        summarySheet.addRow([
          i + 1,
          r.department,
          r.hodStaffNo ?? "—",
          r.hodName ?? "—",
          r.status === "NO_HOD" ? "No HOD Assigned" : (TNA_STATUS_LABELS[r.status] ?? r.status),
          r.itemsCount,
          r.submittedAt ? format(new Date(r.submittedAt), "dd/MM/yyyy") : "—",
          r.approvedAt ? format(new Date(r.approvedAt), "dd/MM/yyyy") : "—",
          r.approvedByName ?? "—",
        ]);
      });

      const detailSheet = workbook.addWorksheet("Training Needs Detail");
      detailSheet.columns = DETAIL_COLUMNS.map((c) => ({ header: c.header, width: c.width }));
      detailSheet.getRow(1).font = { bold: true };
      detailRows.forEach((r, i) => {
        detailSheet.addRow([
          i + 1,
          r.year,
          r.department,
          r.hodStaffNo,
          r.hodName,
          TNA_STATUS_LABELS[r.status] ?? r.status,
          r.submittedAt ? format(new Date(r.submittedAt), "dd/MM/yyyy") : "—",
          r.approvedAt ? format(new Date(r.approvedAt), "dd/MM/yyyy") : "—",
          r.approvedByName ?? "—",
          TNA_SECTION_SHORT_LABELS[r.section as TnaSectionKey] ?? r.section,
          r.problemStatement,
          r.training,
          skillLevelLabel(r.currentSkill),
          skillLevelLabel(r.targetSkill),
          r.targetSkill - r.currentSkill,
          TNA_TRAINING_TYPE_LABELS[r.trainingType] ?? r.trainingType,
          r.monthApply,
        ]);
        detailSheet.getRow(i + 2).alignment = { wrapText: true, vertical: "top" };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tna-report-${year}-${format(new Date(), "yyyyMMdd")}.xlsx`;
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
      <Download size={16} /> {downloading ? "Preparing..." : "Download Report"}
    </button>
  );
}
