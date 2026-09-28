"use client";

import { X, Users } from "lucide-react";
import { ATTENDANCE_LABELS, PME_STATUS_LABELS } from "@/lib/labels";

export interface ParticipantSummary {
  staffNo: string;
  staffName: string;
  department: string;
  attendance: string;
  /** Public/Inhouse only — omitted (undefined) for OJT, which has no PME. */
  pmeStatus?: string | null;
}

const ATTENDANCE_BADGE: Record<string, string> = {
  COMPLETED: "bg-primary/10 text-primary-dark",
  PENDING: "bg-purple/10 text-purple",
  ABSENT: "bg-rose-50 text-rose-600",
};

const PME_BADGE: Record<string, string> = {
  VERIFIED: "bg-primary/10 text-primary-dark",
  PENDING: "bg-purple/10 text-purple",
};

/** Lightweight "who's in this session, and where they stand" popup — shared by
 * the OJT and Public/Inhouse training-code columns. Staff No / Name /
 * Department / Status, plus a PME column when the caller opts in (Public/
 * Inhouse only — OJT has no PME). */
export function ParticipantsModal({
  title,
  code,
  participants,
  showPme = false,
  onClose,
}: {
  title: string;
  code: string;
  participants: ParticipantSummary[];
  showPme?: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl max-h-[80vh] flex flex-col"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-1 pr-6">
          <Users size={14} className="text-primary-dark shrink-0" />
          <h3 className="text-sm font-semibold text-text-primary truncate">{title}</h3>
        </div>
        <p className="text-[11px] text-text-muted font-mono mb-4">{code}</p>

        <div className="overflow-y-auto -mx-1 px-1">
          {participants.length === 0 ? (
            <p className="text-sm text-text-muted">No participants added yet.</p>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-left text-text-muted text-[10px] uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-1.5 font-medium">Staff No</th>
                    <th className="px-3 py-1.5 font-medium">Name</th>
                    <th className="px-3 py-1.5 font-medium">Department</th>
                    <th className="px-3 py-1.5 font-medium">Status</th>
                    {showPme && <th className="px-3 py-1.5 font-medium">PME</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {participants.map((p) => (
                    <tr key={p.staffNo}>
                      <td className="px-3 py-1.5 text-text-secondary whitespace-nowrap">{p.staffNo}</td>
                      <td className="px-3 py-1.5 text-text-primary font-medium">{p.staffName}</td>
                      <td className="px-3 py-1.5 text-text-secondary whitespace-nowrap">{p.department}</td>
                      <td className="px-3 py-1.5">
                        <span
                          className={`inline-flex rounded-full text-[10px] font-medium px-2 py-0.5 whitespace-nowrap ${
                            ATTENDANCE_BADGE[p.attendance] ?? "bg-gray-100 text-text-secondary"
                          }`}
                        >
                          {ATTENDANCE_LABELS[p.attendance] ?? p.attendance}
                        </span>
                      </td>
                      {showPme && (
                        <td className="px-3 py-1.5">
                          {p.pmeStatus ? (
                            <span
                              className={`inline-flex rounded-full text-[10px] font-medium px-2 py-0.5 whitespace-nowrap ${
                                PME_BADGE[p.pmeStatus] ?? "bg-gray-100 text-text-secondary"
                              }`}
                            >
                              {PME_STATUS_LABELS[p.pmeStatus] ?? p.pmeStatus}
                            </span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
