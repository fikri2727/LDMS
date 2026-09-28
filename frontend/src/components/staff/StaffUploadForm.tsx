"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmProvider";

export function StaffUploadForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  return (
    <div className="max-w-xl">
      <a
        href="/staff-upload-template.xlsx"
        download
        className="inline-flex items-center gap-1.5 rounded-xl border border-border text-sm font-medium px-3 py-2 text-text-secondary hover:bg-gray-50 mb-6"
      >
        <Download size={15} /> Download Template
      </a>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 mb-4 whitespace-pre-wrap">
          {error}
        </p>
      )}

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const file = formData.get("file") as File | null;
          if (!file || file.size === 0) {
            setError("Please choose a file to upload.");
            return;
          }
          if (!(await confirm("Upload this Excel file? New Staff No's will be added, existing ones will be updated.")))
            return;
          setError(null);
          startTransition(async () => {
            try {
              await action(formData);
            } catch (err) {
              if (
                err &&
                typeof err === "object" &&
                "digest" in err &&
                typeof err.digest === "string" &&
                err.digest.startsWith("NEXT_")
              ) {
                throw err;
              }
              setError(err instanceof Error ? err.message : "Something went wrong.");
            }
          });
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Excel File</label>
          <input
            type="file"
            name="file"
            accept=".xlsx"
            required
            className="w-full text-sm text-text-secondary file:mr-3 file:rounded-xl file:border-0 file:bg-primary/10 file:text-primary-dark file:px-3 file:py-1.5 file:text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-primary-dark hover:bg-primary disabled:opacity-60 text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          {pending ? "Uploading..." : "Upload"}
        </button>
      </form>
    </div>
  );
}
