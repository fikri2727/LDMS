import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import path from "path";

const BUCKET = "uploads";

const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

/** Saves an uploaded File under <subdir>/ in Supabase Storage with a random-prefixed name, returns the relative path. */
export async function saveUpload(subdir: string, file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${safeName}`;
  const relativePath = path.posix.join(subdir, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(relativePath, buffer, { contentType: file.type || guessMimeType(file.name) });
  if (error) throw new Error(`Failed to upload file: ${error.message}`);

  return relativePath;
}

export async function deleteUpload(relativePath: string) {
  await supabaseAdmin.storage.from(BUCKET).remove([relativePath]);
}

/** Reads back a previously-saved upload's bytes. */
export async function readUpload(relativePath: string): Promise<Uint8Array> {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(relativePath);
  if (error || !data) throw new Error(`Failed to read file: ${error?.message ?? "not found"}`);
  return new Uint8Array(await data.arrayBuffer());
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

/** Saves an uploaded slide attachment (image, PDF, or PowerPoint file, stored as-is). */
export async function saveSlideFile(
  file: File
): Promise<{ slideFileName: string; slideFilePath: string; slideFileType: string }> {
  const filePath = await saveUpload("elearning-slides", file);
  return { slideFileName: file.name, slideFilePath: filePath, slideFileType: file.type || guessMimeType(file.name) };
}
