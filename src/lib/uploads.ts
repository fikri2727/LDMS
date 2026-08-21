import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { isOfficeSlideFile, convertToPdf } from "@/lib/office-convert";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

/** Saves an uploaded File under uploads/<subdir>/ with a random-prefixed name, returns the relative path. */
export async function saveUpload(subdir: string, file: File): Promise<string> {
  const dir = path.join(UPLOADS_ROOT, subdir);
  await mkdir(dir, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${safeName}`;
  const fullPath = path.join(dir, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buffer);

  return path.join(subdir, fileName);
}

export async function deleteUpload(relativePath: string) {
  try {
    await unlink(path.join(UPLOADS_ROOT, relativePath));
  } catch {
    // File already gone — nothing to do.
  }
}

export function uploadFullPath(relativePath: string) {
  return path.join(UPLOADS_ROOT, relativePath);
}

const EXTENSION_MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".ogg": "video/ogg",
};

/** Guesses a MIME type from a file name's extension — used when the browser-supplied `file.type` is empty. */
export function guessMimeType(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  return EXTENSION_MIME_TYPES[ext] ?? "application/octet-stream";
}

/**
 * Saves an uploaded slide attachment. PowerPoint files are converted to PDF so learners
 * get an inline preview the same way a directly-uploaded PDF does — browsers can't render
 * .ppt/.pptx natively. Falls back to storing the original PowerPoint file (served as a
 * download) if the conversion isn't available or fails.
 */
export async function saveSlideFile(
  file: File
): Promise<{ slideFileName: string; slideFilePath: string; slideFileType: string }> {
  const filePath = await saveUpload("elearning-slides", file);

  if (isOfficeSlideFile(file.name)) {
    try {
      const pdfFullPath = await convertToPdf(uploadFullPath(filePath));
      await deleteUpload(filePath);
      const pdfRelativePath = path.relative(UPLOADS_ROOT, pdfFullPath);
      return {
        slideFileName: `${path.parse(file.name).name}.pdf`,
        slideFilePath: pdfRelativePath,
        slideFileType: "application/pdf",
      };
    } catch {
      // LibreOffice unavailable or conversion failed — keep the original PowerPoint file.
    }
  }

  return { slideFileName: file.name, slideFilePath: filePath, slideFileType: file.type || guessMimeType(file.name) };
}
