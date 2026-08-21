import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execFileAsync = promisify(execFile);

const WINDOWS_SOFFICE_PATHS = [
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
];

function resolveSofficeBinary(): string {
  if (process.platform === "win32") {
    for (const p of WINDOWS_SOFFICE_PATHS) {
      if (fs.existsSync(p)) return p;
    }
  }
  return "soffice";
}

export function isOfficeSlideFile(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  return ext === ".ppt" || ext === ".pptx";
}

/**
 * Converts an Office document (e.g. .pptx) to PDF in place using headless LibreOffice,
 * so it can be shown inline the same way an uploaded PDF is. Returns the full path to
 * the generated PDF. Throws if LibreOffice isn't installed/reachable or conversion fails
 * — callers should fall back to storing the original file when this throws.
 */
export async function convertToPdf(inputFullPath: string): Promise<string> {
  const outDir = path.dirname(inputFullPath);
  const binary = resolveSofficeBinary();

  await execFileAsync(binary, ["--headless", "--convert-to", "pdf", "--outdir", outDir, inputFullPath], {
    timeout: 60_000,
  });

  const pdfPath = path.join(outDir, `${path.parse(inputFullPath).name}.pdf`);
  if (!fs.existsSync(pdfPath)) {
    throw new Error("PowerPoint conversion did not produce a PDF.");
  }
  return pdfPath;
}
