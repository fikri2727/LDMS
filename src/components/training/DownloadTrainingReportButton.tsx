"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { format } from "date-fns";
import {
  PROGRAM_LABELS,
  PLATFORM_LABELS,
  FUNCTION_LABELS,
  TRAINER_TYPE_LABELS,
  DESIGNATION_LABELS,
  ATTENDANCE_LABELS,
  PME_STATUS_LABELS,
  RATING_BAND_SHORT_LABELS,
} from "@/lib/labels";

export interface PublicParticipantRow {
  trainingCode: string;
  trainingTitle: string;
  program: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  totalDays: number;
  platform: string;
  function: string;
  cost: number;
  staffNo: string;
  staffName: string;
  department: string;
  designation: string;
  attendance: string;
  courseRelevance: number | null;
  practicalExercises: number | null;
  sufficientTime: number | null;
  trainerEffectiveness: number | null;
  courseEffectiveness: number | null;
  whatLearnt: string | null;
  actionPlan: string | null;
  commentSuggestions: string | null;
  pmeStatus: string | null;
  pmeLevelRating: string | null;
  pmeBehavioralRating: string | null;
  pmeResultRating: string | null;
  pmeTotalMark: number | null;
  pmeAverageMark: number | null;
}

export interface OjtReportRow {
  /** The training's serial number — only set on the first participant row of each
   * OJT session, left null on the rest so it doesn't repeat down the column. */
  ojtGroupNo: number | null;
  trainingCode: string;
  title: string;
  trainerType: string;
  trainerName: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  totalDay: number;
  totalHour: number;
  totalManHour: number;
  par: number;
  comp: number;
  pend: number;
  abs: number;
  avgSkillBefore: number | null;
  avgSkillAfter: number | null;
  avgSkillImprovement: number | null;
  participantName: string;
}

const PARTICIPANT_COLUMNS: { header: string; width: number }[] = [
  { header: "No", width: 6 },
  { header: "Training Code", width: 18 },
  { header: "Training Title", width: 30 },
  { header: "Program", width: 20 },
  { header: "Start Date", width: 12 },
  { header: "End Date", width: 12 },
  { header: "Start Time", width: 10 },
  { header: "End Time", width: 10 },
  { header: "Days", width: 8 },
  { header: "Platform", width: 14 },
  { header: "Function", width: 16 },
  { header: "Cost (RM)", width: 12 },
  { header: "Staff No", width: 12 },
  { header: "Staff Name", width: 24 },
  { header: "Department", width: 20 },
  { header: "Designation", width: 16 },
  { header: "Attendance", width: 12 },
  { header: "Course Relevance", width: 14 },
  { header: "Practical Exercises", width: 14 },
  { header: "Sufficient Time", width: 14 },
  { header: "Trainer Effectiveness", width: 16 },
  { header: "Course Effectiveness", width: 16 },
  { header: "What Learnt", width: 32 },
  { header: "Action Plan", width: 32 },
  { header: "Comments / Suggestions", width: 32 },
  { header: "PME Status", width: 16 },
  { header: "PME Level Rating", width: 16 },
  { header: "PME Behavioral Rating", width: 16 },
  { header: "PME Result Rating", width: 16 },
  { header: "PME Total Mark", width: 14 },
  { header: "PME Average Mark", width: 14 },
];

const OJT_COLUMNS: { header: string; width: number }[] = [
  { header: "No", width: 6 },
  { header: "Code", width: 18 },
  { header: "Title", width: 32 },
  { header: "Trainer Type", width: 14 },
  { header: "Trainer Name", width: 20 },
  { header: "Start Date", width: 12 },
  { header: "End Date", width: 12 },
  { header: "Start Time", width: 10 },
  { header: "End Time", width: 10 },
  { header: "Days", width: 8 },
  { header: "Hours/Day", width: 10 },
  { header: "Participant Names", width: 28 },
  { header: "Completed", width: 12 },
  { header: "Pending", width: 10 },
  { header: "Absent", width: 10 },
  { header: "Attendance %", width: 12 },
  { header: "Total Man Hours", width: 14 },
  { header: "Avg Skill Before", width: 14 },
  { header: "Avg Skill After", width: 14 },
  { header: "Avg Skill Improvement", width: 16 },
];

export function DownloadTrainingReportButton({
  participantRows,
  ojtRows,
}: {
  participantRows: PublicParticipantRow[];
  ojtRows: OjtReportRow[];
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();

      const participantSheet = workbook.addWorksheet("Public-Inhouse Training");
      participantSheet.columns = PARTICIPANT_COLUMNS.map((c) => ({ header: c.header, width: c.width }));
      participantSheet.getRow(1).font = { bold: true };

      participantRows.forEach((r, i) => {
        participantSheet.addRow([
          i + 1,
          r.trainingCode,
          r.trainingTitle,
          PROGRAM_LABELS[r.program] ?? r.program,
          format(new Date(r.startDate), "dd/MM/yyyy"),
          format(new Date(r.endDate), "dd/MM/yyyy"),
          r.startTime,
          r.endTime,
          r.totalDays,
          PLATFORM_LABELS[r.platform] ?? r.platform,
          FUNCTION_LABELS[r.function] ?? r.function,
          r.cost,
          r.staffNo,
          r.staffName,
          r.department,
          DESIGNATION_LABELS[r.designation] ?? r.designation,
          ATTENDANCE_LABELS[r.attendance] ?? r.attendance,
          r.courseRelevance ?? "—",
          r.practicalExercises ?? "—",
          r.sufficientTime ?? "—",
          r.trainerEffectiveness ?? "—",
          r.courseEffectiveness ?? "—",
          r.whatLearnt ?? "—",
          r.actionPlan ?? "—",
          r.commentSuggestions ?? "—",
          r.pmeStatus ? PME_STATUS_LABELS[r.pmeStatus] ?? r.pmeStatus : "—",
          r.pmeLevelRating ? RATING_BAND_SHORT_LABELS[r.pmeLevelRating] ?? r.pmeLevelRating : "—",
          r.pmeBehavioralRating ? RATING_BAND_SHORT_LABELS[r.pmeBehavioralRating] ?? r.pmeBehavioralRating : "—",
          r.pmeResultRating ? RATING_BAND_SHORT_LABELS[r.pmeResultRating] ?? r.pmeResultRating : "—",
          r.pmeTotalMark ?? "—",
          r.pmeAverageMark ?? "—",
        ]);
      });

      const ojtSheet = workbook.addWorksheet("OJT Training");
      ojtSheet.columns = OJT_COLUMNS.map((c) => ({ header: c.header, width: c.width }));
      ojtSheet.getRow(1).font = { bold: true };

      ojtRows.forEach((r) => {
        const perAttendance = r.par > 0 ? Math.round((r.comp / r.par) * 100) : 0;
        ojtSheet.addRow([
          r.ojtGroupNo ?? "",
          r.trainingCode,
          r.title,
          TRAINER_TYPE_LABELS[r.trainerType] ?? r.trainerType,
          r.trainerName,
          format(new Date(r.startDate), "dd/MM/yyyy"),
          format(new Date(r.endDate), "dd/MM/yyyy"),
          r.startTime,
          r.endTime,
          r.totalDay,
          r.totalHour,
          r.participantName,
          r.comp,
          r.pend,
          r.abs,
          perAttendance,
          r.totalManHour,
          r.avgSkillBefore ?? "—",
          r.avgSkillAfter ?? "—",
          r.avgSkillImprovement ?? "—",
        ]);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `training-report-${format(new Date(), "yyyyMMdd")}.xlsx`;
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
