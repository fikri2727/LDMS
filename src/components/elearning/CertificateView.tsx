"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Printer, Download } from "lucide-react";

export function CertificateView({
  staffName,
  moduleTitle,
  score,
  issuedAt,
  certificateNo,
  backgroundUrl,
}: {
  staffName: string;
  moduleTitle: string;
  score: number;
  issuedAt: string;
  certificateNo: string;
  backgroundUrl?: string | null;
}) {
  const certRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const background = backgroundUrl ?? "/certificate-default-bg.png";

  async function handleDownload() {
    if (!certRef.current) return;
    setDownloading(true);
    setError(null);
    try {
      const [{ domToCanvas }, { default: jsPDF }] = await Promise.all([import("modern-screenshot"), import("jspdf")]);
      const canvas = await domToCanvas(certRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`Certificate - ${moduleTitle} - ${staffName}.pdf`);
    } catch {
      setError("Couldn't generate the PDF. Please try again or use Print instead.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 print:hidden">
          {error}
        </p>
      )}
      <div className="flex items-center justify-end gap-2 mb-4 print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-xl border border-border text-sm font-medium px-3 py-2 text-text-secondary hover:bg-gray-50"
        >
          <Printer size={15} /> Print
        </button>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 rounded-xl bg-primary text-white text-sm font-medium px-3 py-2 hover:bg-primary-dark disabled:opacity-60"
        >
          <Download size={15} /> {downloading ? "Preparing..." : "Download"}
        </button>
      </div>

      <div
        ref={certRef}
        className="bg-surface bg-cover bg-center bg-no-repeat rounded-2xl p-16 text-center max-w-3xl mx-auto aspect-[3/2] flex flex-col justify-center"
        style={{ backgroundImage: `url(${background})` }}
      >
        <Image
          src="/tamco-logo.png"
          alt="TAMCO"
          width={1024}
          height={305}
          unoptimized
          className="h-12 w-auto mx-auto mb-4"
        />
        <p className="text-xs tracking-[0.15em] text-text-muted uppercase mb-2">
          TAMCO Switchgear (Malaysia) Sdn Bhd
        </p>
        <h1 className="text-3xl font-bold text-text-primary tracking-wide mb-6">CERTIFICATE OF COMPLETION</h1>
        <p className="text-sm text-text-secondary mb-2">This certificate is proudly presented to</p>
        <p className="text-2xl font-semibold text-text-primary mb-6">{staffName}</p>
        <p className="text-sm text-text-secondary mb-2">for successfully completing</p>
        <p className="text-xl font-medium text-primary-dark mb-8">{moduleTitle}</p>

        <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto text-sm mb-10">
          <div>
            <p className="text-text-muted">Completion Date</p>
            <p className="text-text-primary font-medium">{issuedAt}</p>
          </div>
          <div>
            <p className="text-text-muted">Final Score</p>
            <p className="text-text-primary font-medium">{score}%</p>
          </div>
          <div>
            <p className="text-text-muted">Certificate ID</p>
            <p className="text-text-primary font-medium">{certificateNo}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <div className="h-px w-40 bg-border" />
        </div>
        <p className="text-xs text-text-muted mt-2">L&D Administrator</p>
      </div>
    </div>
  );
}
