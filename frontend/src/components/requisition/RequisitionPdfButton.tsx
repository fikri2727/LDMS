"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { FileDown } from "lucide-react";

interface ParticipantRow {
  staffName: string;
  position: string;
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 13,
        height: 13,
        border: "1.3px solid #111",
        marginRight: 5,
        flexShrink: 0,
      }}
    >
      {checked && <span style={{ fontSize: 10, lineHeight: 1, fontWeight: 700 }}>✕</span>}
    </span>
  );
}

function FieldLine({
  label,
  value,
  minWidth = 90,
}: {
  label: string;
  value: React.ReactNode;
  minWidth?: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, marginBottom: 9 }}>
      <span style={{ minWidth, fontWeight: 700, flexShrink: 0 }}>{label}</span>
      <span>:</span>
      <span style={{ flex: 1, borderBottom: "1px solid #111", paddingBottom: 1, minHeight: 15 }}>{value}</span>
    </div>
  );
}

const cellStyle: React.CSSProperties = { border: "1px solid #111", padding: "5px 8px", textAlign: "left" };
const cellStyleHeader: React.CSSProperties = { ...cellStyle, fontWeight: 700, background: "#f0f0f0" };

export function RequisitionPdfButton({
  title,
  applicantName,
  applicantDept,
  dateApply,
  participants,
  trainingDateRange,
  time,
  venue,
  fees,
  hrdcClaimable,
  grantId,
  underAtp,
  remarks,
  trainingProvider,
  objective,
  approverName,
  approverRoleLabel,
  approvedDate,
}: {
  title: string;
  applicantName: string;
  applicantDept: string;
  dateApply: string;
  participants: ParticipantRow[];
  trainingDateRange: string;
  time: string;
  venue: string;
  fees: string;
  hrdcClaimable: boolean;
  grantId: string | null;
  underAtp: boolean;
  remarks: string | null;
  trainingProvider: string;
  objective: string;
  approverName: string | null;
  approverRoleLabel: string | null;
  approvedDate: string | null;
}) {
  const docRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!docRef.current) return;
    setDownloading(true);
    try {
      const [{ domToCanvas }, { default: jsPDF }] = await Promise.all([import("modern-screenshot"), import("jspdf")]);
      const canvas = await domToCanvas(docRef.current, { scale: 2, backgroundColor: "#ffffff" });
      // This is a flat text/lines document, not a photo — JPEG at high quality is visually
      // indistinguishable here but a small fraction of PNG's size for a page this dense.
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height);
      pdf.save(`Staff Training Requisition - ${title} - ${applicantName}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="flex items-center gap-1.5 rounded-xl border border-border bg-surface text-sm font-medium px-4 py-2 text-text-secondary hover:bg-gray-50 disabled:opacity-60 transition-colors"
      >
        <FileDown size={16} /> {downloading ? "Preparing..." : "Download PDF"}
      </button>

      {/* Off-screen printable document — captured to canvas on download, never shown to the user. */}
      <div
        ref={docRef}
        style={{
          position: "fixed",
          left: -9999,
          top: 0,
          width: 794,
          background: "#ffffff",
          color: "#111111",
          padding: "48px 56px",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: 12.5,
          lineHeight: 1.4,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <Image
            src="/tamco-logo.png"
            alt="TAMCO"
            width={1024}
            height={305}
            unoptimized
            style={{ height: 46, width: "auto", margin: "0 auto 10px" }}
          />
          <div style={{ fontWeight: 700, fontSize: 15 }}>TAMCO SWITCHGEAR (MALAYSIA) SDN. BHD</div>
          <div style={{ fontWeight: 700, fontSize: 13, marginTop: 3 }}>STAFF TRAINING REQUISITION</div>
        </div>

        <table style={{ width: "100%", marginBottom: 14, borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ width: "55%", verticalAlign: "top", paddingBottom: 5 }}>
                <b>FROM</b>&nbsp;&nbsp;: &nbsp;{applicantName} ({applicantDept})
              </td>
              <td style={{ width: "45%", verticalAlign: "top", paddingBottom: 5 }}>
                <b>TO</b>&nbsp;&nbsp;&nbsp;&nbsp;: &nbsp;HUMAN RESOURCES DEPT
              </td>
            </tr>
            <tr>
              <td style={{ verticalAlign: "top" }}>
                <b>DATE</b>&nbsp;: &nbsp;{dateApply}
              </td>
              <td style={{ verticalAlign: "top" }}>
                <b>COPY</b>&nbsp;: &nbsp;ACCOUNTS DEPARTMENT
              </td>
            </tr>
          </tbody>
        </table>

        <p style={{ marginBottom: 10 }}>
          This is to advise that the following staff below has been nominated to attend the under mentioned
          Talk/Course/Seminar/Lecture/Film Meeting: -
        </p>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 18 }}>
          <thead>
            <tr>
              <th style={{ ...cellStyleHeader, width: 30 }}>No</th>
              <th style={cellStyleHeader}>Staff Name</th>
              <th style={{ ...cellStyleHeader, width: 180 }}>Position</th>
            </tr>
          </thead>
          <tbody>
            {participants.length > 0 ? (
              participants.map((p, i) => (
                <tr key={i}>
                  <td style={cellStyle}>{i + 1}.</td>
                  <td style={cellStyle}>{p.staffName}</td>
                  <td style={cellStyle}>{p.position}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td style={cellStyle}>1.</td>
                <td style={cellStyle}>—</td>
                <td style={cellStyle}>—</td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ marginLeft: 26 }}>
          <FieldLine label="TITLE" value={title} />
          <FieldLine label="DATE" value={trainingDateRange} />
          <FieldLine label="TIME" value={time} />
          <FieldLine label="VENUE" value={venue} />
          <div style={{ height: 6 }} />
          <FieldLine label="FEES" value={fees} />
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 9 }}>
            <span style={{ fontWeight: 700 }}>HRDC CLAIMABLE:</span>
            <span style={{ display: "flex", alignItems: "center" }}>
              <Checkbox checked={!hrdcClaimable} /> No
            </span>
            <span style={{ display: "flex", alignItems: "center" }}>
              <Checkbox checked={hrdcClaimable} /> Yes
            </span>
            {hrdcClaimable && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontWeight: 700 }}>HRDC Grant id:</span>
                <span style={{ borderBottom: "1px solid #111", minWidth: 120, paddingBottom: 1 }}>
                  {grantId ?? "—"}
                </span>
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 9 }}>
            <span style={{ fontWeight: 700 }}>UNDER ATP (ANNUAL TRAINING PLAN):</span>
            <span style={{ display: "flex", alignItems: "center" }}>
              <Checkbox checked={!underAtp} /> No
            </span>
            <span style={{ display: "flex", alignItems: "center" }}>
              <Checkbox checked={underAtp} /> Yes
            </span>
          </div>
        </div>

        <div style={{ marginTop: 4 }}>
          <FieldLine label="Remarks (if any)" value={remarks ?? "—"} minWidth={155} />
          <FieldLine label="Organised by" value={trainingProvider} minWidth={155} />
          <FieldLine label="Reasons for recommendation" value={objective} minWidth={155} />
        </div>

        <div style={{ borderTop: "3px solid #000", marginTop: 18, marginBottom: 26 }} />

        <table style={{ width: "100%", textAlign: "center", fontSize: 11.5 }}>
          <tbody>
            <tr>
              <td style={{ width: "33%" }}>
                <div style={{ borderBottom: "1px dashed #000", height: 34 }} />
                <div style={{ marginTop: 4 }}>Verified by</div>
                <div style={{ fontWeight: 700 }}>Human Resources</div>
              </td>
              <td style={{ width: "33%" }}>
                <div style={{ borderBottom: "1px dashed #000", height: 34 }} />
                <div style={{ marginTop: 4 }}>Approved by</div>
                <div style={{ fontWeight: 700 }}>Head of Division</div>
              </td>
              <td style={{ width: "33%" }}>
                <div style={{ borderBottom: "1px dashed #000", height: 34 }} />
                <div style={{ marginTop: 4 }}>Approved by</div>
                <div style={{ fontWeight: 700 }}>Chief Executive Officer</div>
              </td>
            </tr>
          </tbody>
        </table>

        {approverName && (
          <p style={{ marginTop: 18, fontSize: 11, color: "#333" }}>
            <b>Approved in TAMCO LDMS</b> by {approverName}
            {approverRoleLabel ? ` (${approverRoleLabel})` : ""} on {approvedDate}.
          </p>
        )}

        <div style={{ borderTop: "3px solid #000", marginTop: 22, marginBottom: 16 }} />

        <div style={{ textAlign: "center", fontWeight: 700, marginBottom: 12 }}>STAFF TRAINING NOTIFICATION</div>
        <table style={{ width: "100%", marginBottom: 10 }}>
          <tbody>
            <tr>
              <td>
                <b>FROM</b>&nbsp;: &nbsp;DIRECTOR, HUMAN RESOURCES
              </td>
              <td style={{ textAlign: "right" }}>
                <b>DATE</b>&nbsp;: &nbsp;{approvedDate ?? dateApply}
              </td>
            </tr>
          </tbody>
        </table>
        <p style={{ marginBottom: 40 }}>
          We are pleased to advise that you have been nominated to attend the above-mentioned training and you are
          required to fill up the evaluation form after you have attended the training.
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ borderBottom: "1px solid #000", width: 220, height: 20 }} />
            <div style={{ marginTop: 4 }}>DIRECTOR, HUMAN RESOURCES</div>
          </div>
          <div style={{ fontSize: 10, color: "#555" }}>TCH/HRD/TR-002</div>
        </div>
      </div>
    </>
  );
}
