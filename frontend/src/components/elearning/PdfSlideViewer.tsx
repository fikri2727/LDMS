"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PdfSlideViewer({
  fileUrl,
  fileName,
  onReachLastPage,
}: {
  fileUrl: string;
  fileName?: string | null;
  onReachLastPage?: () => void;
}) {
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadPageCount() {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();
        const doc = await pdfjsLib.getDocument({ url: fileUrl }).promise;
        if (!cancelled) setNumPages(doc.numPages);
      } catch {
        // Page count is a nice-to-have — the viewer below still works without it.
      }
    }

    loadPageCount();
    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  useEffect(() => {
    if (numPages > 0 && pageNum >= numPages) {
      onReachLastPage?.();
    }
  }, [pageNum, numPages, onReachLastPage]);

  const pdfSrc = `${fileUrl}#page=${pageNum}&toolbar=0&navpanes=0&statusbar=0&view=Fit`;

  return (
    <div className="mt-4">
      <div className="h-[600px] rounded-2xl border border-border bg-gray-50 overflow-hidden">
        <iframe key={pageNum} src={pdfSrc} className="w-full h-full" title={fileName ?? "Slide document"} />
      </div>

      {numPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-3">
          <button
            type="button"
            onClick={() => setPageNum((n) => Math.max(1, n - 1))}
            disabled={pageNum <= 1}
            className="flex items-center gap-1 rounded-xl border border-border text-sm font-medium px-3 py-1.5 text-text-secondary hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <button
            type="button"
            onClick={() => setPageNum((n) => Math.min(numPages, n + 1))}
            disabled={pageNum >= numPages}
            className="flex items-center gap-1 rounded-xl bg-primary-dark text-white text-sm font-medium px-3 py-1.5 hover:bg-primary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {numPages > 0 && (
        <div className="flex items-center justify-center gap-1 mt-2 text-xs text-text-muted">
          <span className="font-medium text-text-secondary">{pageNum}</span>
          <span>/</span>
          <span>{numPages}</span>
        </div>
      )}
    </div>
  );
}
