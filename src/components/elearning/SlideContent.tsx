import { PdfSlideViewer } from "@/components/elearning/PdfSlideViewer";

export function SlideContent({
  content,
  fileUrl,
  fileType,
  fileName,
  onReachLastPage,
}: {
  content: string | null;
  fileUrl?: string | null;
  fileType?: string | null;
  fileName?: string | null;
  onReachLastPage?: () => void;
}) {
  const lines = (content ?? "").split("\n");

  return (
    <div className="space-y-2">
      {content &&
        lines.map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={i} className="h-2" />;
          if (trimmed.startsWith("# ")) {
            return (
              <h3 key={i} className="text-lg font-semibold text-text-primary mt-4 first:mt-0">
                {trimmed.slice(2)}
              </h3>
            );
          }
          if (trimmed.startsWith("- ")) {
            return (
              <li key={i} className="ml-5 list-disc text-sm text-text-secondary">
                {trimmed.slice(2)}
              </li>
            );
          }
          return (
            <p key={i} className="text-sm text-text-secondary">
              {trimmed}
            </p>
          );
        })}

      {fileUrl &&
        (fileType?.startsWith("image/") ? (
          // eslint-disable-next-line @next/next/no-img-element -- dynamic API-served file, not a static asset
          <img
            src={fileUrl}
            alt={fileName ?? "Slide attachment"}
            className="mt-4 max-w-full rounded-xl border border-border"
          />
        ) : fileType === "application/pdf" ? (
          <PdfSlideViewer fileUrl={fileUrl} fileName={fileName} onReachLastPage={onReachLastPage} />
        ) : (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-3 rounded-xl border border-border px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-dark font-semibold text-xs">
              PPT
            </span>
            <span>
              <span className="block text-sm font-medium text-primary-dark">{fileName ?? "Download slides"}</span>
              <span className="block text-xs text-text-muted">Click to download and open in PowerPoint</span>
            </span>
          </a>
        ))}
    </div>
  );
}
