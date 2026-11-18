"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import type { MasterPreview } from "@/app/(app)/staff/master/actions";
import { useConfirm } from "@/components/ui/ConfirmProvider";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-gray-50/60 px-3 py-2">
      <p className="text-lg font-semibold text-text-primary leading-tight">{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  );
}

function Changes({ preview }: { preview: MasterPreview }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const rows = q
    ? preview.updates.filter(
        (u) =>
          u.staffNo.includes(q) ||
          u.staffName.toLowerCase().includes(q) ||
          u.changes.some((c) => c.field.toLowerCase().includes(q)),
      )
    : preview.updates;
  if (preview.updates.length === 0) return null;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2 mb-1">
        <p className="text-sm font-semibold text-text-primary">LDMS staff to update ({preview.updates.length})</p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ID, name or field"
          className="rounded-lg border border-border px-2 py-1 text-xs w-48"
        />
      </div>
      <div className="max-h-80 overflow-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-50 text-left text-text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Staff</th>
              <th className="px-3 py-2 font-medium">Field</th>
              <th className="px-3 py-2 font-medium">Now in LDMS</th>
              <th className="px-3 py-2 font-medium">From master</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.flatMap((u) =>
              u.changes.map((c, i) => (
                <tr key={`${u.staffNo}-${c.field}`}>
                  {i === 0 && (
                    <td className="px-3 py-1.5 align-top" rowSpan={u.changes.length}>
                      <span className="text-text-muted">{u.staffNo}</span>{" "}
                      <span className="font-medium text-text-primary">{u.staffName}</span>
                    </td>
                  )}
                  <td className="px-3 py-1.5 text-text-secondary">{c.field}</td>
                  <td className="px-3 py-1.5 text-text-muted break-all">{c.from ?? "(blank)"}</td>
                  <td className="px-3 py-1.5 font-medium text-primary-dark break-all">{c.to}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EmployeeMasterUpload({
  previewAction,
  applyAction,
}: {
  previewAction: (fd: FormData) => Promise<{ preview?: MasterPreview; error?: string }>;
  applyAction: (fd: FormData) => Promise<{ result?: MasterPreview; error?: string }>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [preview, setPreview] = useState<MasterPreview | null>(null);
  const [upload, setUpload] = useState<FormData | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  function cancel() {
    setPreview(null);
    setUpload(null);
  }

  async function apply() {
    if (!upload || !preview) return;
    const ok = await confirm(
      `Save this file as the Employee Master and update LDMS? ${preview.updates.length} staff will be updated and ${preview.newStaff.length} new staff added.`,
    );
    if (!ok) return;
    startTransition(async () => {
      const r = await applyAction(upload);
      cancel();
      if (r.error) setError(r.error);
      else {
        const p = r.result!;
        setDone(
          `Employee Master saved (${p.fileRows} employees). LDMS: ${p.updates.length} staff updated, ${p.newStaff.length} new staff added.`,
        );
        setFormKey((k) => k + 1);
      }
    });
  }

  const nothingForLdms = preview && preview.updates.length === 0 && preview.newStaff.length === 0;

  return (
    <div>
      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 mb-4 whitespace-pre-wrap">
          {error}
        </p>
      )}
      {done && <p className="text-sm text-primary-dark bg-primary/10 rounded-xl px-3 py-2 mb-4">{done}</p>}

      {preview ? (
        <div className="space-y-5 rounded-2xl border border-border bg-surface p-4">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Check before applying</h3>
            <p className="text-xs text-text-muted">Nothing has been saved yet.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Employees in file" value={preview.fileRows} />
            <Stat label="Working" value={preview.active} />
            <Stat label="Resigned" value={preview.resigned} />
            <Stat label="In Appraisal" value={preview.inAppraisal} />
          </div>
          <p className="text-xs text-text-muted">
            Master: {preview.masterNew} new, {preview.masterChanged} changed, {preview.masterUnchanged} unchanged since the
            last upload. Appraisal includes everyone working except interns and Factory contract staff.
          </p>

          {preview.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 space-y-1">
              {preview.warnings.map((w) => (
                <p key={w} className="flex gap-1.5">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {w}
                </p>
              ))}
            </div>
          )}

          {nothingForLdms ? (
            <p className="text-sm text-text-secondary">LDMS already matches this file. Only the master will be saved.</p>
          ) : (
            <>
              {preview.newStaff.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-primary-dark mb-1">
                    New staff to add to LDMS ({preview.newStaff.length})
                  </p>
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                    {preview.newStaff.map((p) => (
                      <div key={p.staffNo} className="flex flex-wrap gap-x-2 px-3 py-1.5 text-xs">
                        <span className="text-text-muted">{p.staffNo}</span>
                        <span className="font-medium text-text-primary">{p.staffName}</span>
                        {p.department && <span className="text-text-muted">{p.department}</span>}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    They get the default password and the Staff role. Check their Designation on the Staff List.
                  </p>
                </div>
              )}
              <Changes preview={preview} />
            </>
          )}

          <p className="text-xs text-text-muted">
            LDMS only takes fields that changed in the master. Edits made in LDMS are never copied back to the master.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={apply}
              disabled={pending}
              className="rounded-xl bg-primary-dark hover:bg-primary disabled:opacity-60 text-white text-sm font-medium px-4 py-2 transition-colors"
            >
              {pending ? "Applying..." : "Confirm & Apply"}
            </button>
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
            const fd = new FormData(e.currentTarget);
            const file = fd.get("file") as File | null;
            if (!file || file.size === 0) {
              setError("Please choose the employee report to upload.");
              return;
            }
            setError(null);
            setDone(null);
            startTransition(async () => {
              const r = await previewAction(fd);
              if (r.preview) {
                setPreview(r.preview);
                setUpload(fd);
              } else setError(r.error ?? "Something went wrong.");
            });
          }}
          className="flex flex-wrap items-end gap-3 max-w-xl"
        >
          <div className="flex-1 min-w-56">
            <label className="block text-sm font-medium text-text-secondary mb-1">HR employee report (.xlsx)</label>
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
            {pending ? "Checking..." : "Check File"}
          </button>
        </form>
      )}
    </div>
  );
}
