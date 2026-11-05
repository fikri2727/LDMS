"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import type { StaffSyncPerson, StaffSyncPreview } from "@/app/(app)/staff/actions";

export function PeopleList({ title, tone, people }: { title: string; tone: string; people: StaffSyncPerson[] }) {
  if (people.length === 0) return null;
  return (
    <div>
      <p className={`text-sm font-semibold mb-1 ${tone}`}>
        {title} ({people.length})
      </p>
      <div className="max-h-56 overflow-y-auto rounded-xl border border-border divide-y divide-border">
        {people.map((p) => (
          <div key={p.staffNo} className="flex flex-wrap items-center gap-x-2 px-3 py-1.5 text-xs">
            <span className="text-text-muted">{p.staffNo}</span>
            <span className="text-text-primary font-medium">{p.staffName}</span>
            {p.department && <span className="text-text-muted">{p.department}</span>}
            {p.isHod && (
              <span className="rounded-full bg-amber-50 text-amber-700 text-[10px] font-medium px-2 py-0.5">HOD</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StaffUploadForm({
  action,
  previewAction,
}: {
  action: (formData: FormData) => Promise<{ error?: string }>;
  previewAction: (formData: FormData) => Promise<{ preview?: StaffSyncPreview; error?: string }>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [preview, setPreview] = useState<StaffSyncPreview | null>(null);
  const [upload, setUpload] = useState<FormData | null>(null);
  const [formKey, setFormKey] = useState(0); // bumped to clear the chosen file
  const [pending, startTransition] = useTransition();

  function cancel() {
    setPreview(null);
    setUpload(null);
  }

  function apply() {
    if (!upload) return;
    startTransition(async () => {
      const result = await action(upload);
      cancel();
      if (result.error) setError(result.error);
      else {
        setDone(true);
        setFormKey((k) => k + 1);
      }
    });
  }

  const nothingToDo =
    preview &&
    preview.new.length === 0 &&
    preview.updated === 0 &&
    preview.reactivated.length === 0 &&
    preview.toResign.length === 0;

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
      {done && (
        <p className="text-sm text-primary-dark bg-primary/10 rounded-xl px-3 py-2 mb-4">Staff list updated.</p>
      )}

      {preview ? (
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-4">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Check before applying</h3>
            <p className="text-xs text-text-muted">Nothing has been changed yet.</p>
          </div>
          {nothingToDo ? (
            <p className="text-sm text-text-secondary">The staff list already matches this file.</p>
          ) : (
            <>
              {preview.updated > 0 && (
                <p className="text-sm text-text-secondary">
                  <span className="font-semibold">{preview.updated}</span> existing staff will be updated.
                </p>
              )}
              <PeopleList title="New staff to add" tone="text-primary-dark" people={preview.new} />
              <PeopleList title="Back to Active" tone="text-primary-dark" people={preview.reactivated} />
              <PeopleList title="Not in this file: will be marked Resigned" tone="text-rose-600" people={preview.toResign} />
              {preview.toResign.length > 0 && (
                <p className="text-xs text-text-muted">
                  Date Resigned is set to today. You can correct it on each staff profile.
                </p>
              )}
            </>
          )}
          <div className="flex gap-2">
            {!nothingToDo && (
              <button
                type="button"
                onClick={apply}
                disabled={pending}
                className="rounded-xl bg-primary-dark hover:bg-primary disabled:opacity-60 text-white text-sm font-medium px-4 py-2 transition-colors"
              >
                {pending ? "Applying..." : "Confirm & Apply"}
              </button>
            )}
            <button
              type="button"
              onClick={cancel}
              disabled={pending}
              className="rounded-xl border border-border text-sm font-medium px-4 py-2 text-text-secondary hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <form
          key={formKey}
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const file = formData.get("file") as File | null;
            if (!file || file.size === 0) {
              setError("Please choose a file to upload.");
              return;
            }
            setError(null);
            setDone(false);
            startTransition(async () => {
              const result = await previewAction(formData);
              if (result.preview) {
                setPreview(result.preview);
                setUpload(formData);
              } else setError(result.error ?? "Something went wrong.");
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
          <label className="flex items-start gap-2 text-sm text-text-secondary">
            <input type="checkbox" name="syncResign" value="1" className="mt-0.5" />
            <span>
              This is the <span className="font-semibold">full list of current staff</span>. Anyone not in this file
              will be marked Resigned, and resigned staff who are in it become Active. Admin accounts are not affected.
            </span>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-primary-dark hover:bg-primary disabled:opacity-60 text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            {pending ? "Checking..." : "Check File"}
          </button>
        </form>
      )}
    </div>
  );
}
