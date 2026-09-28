"use client";

import { useRef, useTransition } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import { format } from "date-fns";
import { useConfirm } from "@/components/ui/ConfirmProvider";

interface CertificateItem {
  id: number;
  fileName: string;
  uploadedAt: Date;
  uploadedBy: { staffName: string } | null;
}

export function CertificatePanel({
  certificates,
  canManage,
  onUpload,
  onDelete,
}: {
  certificates: CertificateItem[];
  canManage: boolean;
  onUpload: (formData: FormData) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const confirm = useConfirm();

  return (
    <div className="space-y-3">
      {certificates.map((c) => (
        <div key={c.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
          <div>
            <p className="text-sm text-text-primary">{c.fileName}</p>
            <p className="text-xs text-text-muted">
              Uploaded {format(c.uploadedAt, "d MMM yyyy")} by {c.uploadedBy?.staffName ?? "unknown"}
            </p>
          </div>
          <span className="flex items-center gap-1">
            <a
              href={`/api/certificates/${c.id}`}
              className="p-1.5 text-text-muted hover:text-primary-dark"
              title="Download"
            >
              <Download size={16} />
            </a>
            {canManage && (
              <button
                disabled={pending}
                onClick={async () => {
                  if (await confirm(`Delete "${c.fileName}"?`)) startTransition(() => onDelete(c.id));
                }}
                className="p-1.5 text-text-muted hover:text-rose-600"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            )}
          </span>
        </div>
      ))}

      {certificates.length === 0 && <p className="text-sm text-text-muted">No certificates uploaded.</p>}

      {canManage && (
        <form
          ref={formRef}
          action={(fd) =>
            startTransition(async () => {
              await onUpload(fd);
              formRef.current?.reset();
            })
          }
          className="flex items-center gap-2 pt-1"
        >
          <input
            type="file"
            name="file"
            required
            className="text-sm text-text-secondary file:mr-3 file:rounded-xl file:border-0 file:bg-primary/10 file:text-primary-dark file:px-3 file:py-1.5 file:text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            onClick={async (e) => {
              e.preventDefault();
              const form = e.currentTarget.form;
              if (await confirm("Upload this certificate?")) {
                form?.requestSubmit();
              }
            }}
            className="flex items-center gap-1.5 rounded-xl bg-primary-dark text-white text-sm font-medium px-3 py-2 hover:bg-primary transition-colors disabled:opacity-60"
          >
            <Upload size={15} /> Upload
          </button>
        </form>
      )}
    </div>
  );
}
