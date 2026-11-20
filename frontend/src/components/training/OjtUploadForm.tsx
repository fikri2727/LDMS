"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Download, Plus, RotateCcw, X } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { FormError } from "@/components/ui/FormError";
import { isActionError, type ActionResult } from "@/lib/actionError";
import { TRAINER_TYPE_LABELS } from "@/lib/labels";
import type { OjtUploadPreview, OjtUploadRow } from "@/app/(app)/training/ojt/actions";

type Row = OjtUploadRow & {
  key: number;
  removed: boolean;
  keep: boolean; // resigned staff: add them anyway
  checking: boolean;
  edited: boolean;
};
type Show = "all" | "attention" | "ready";

const included = (r: Row) => !r.removed && !r.checking && (r.status === "ok" || (r.status === "resigned" && r.keep));
const blocking = (r: Row) => !r.removed && (r.checking || r.status === "missing" || !r.staffNo.trim());
const undecided = (r: Row) => !r.removed && r.status === "resigned" && !r.keep;

const inputCls =
  "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50";

/**
 * Upload OJT via Excel: 1) check the file, 2) review on screen (edit the details, edit or remove any
 * participant, keep or leave out resigned staff), 3) confirm. Nothing is saved before Confirm.
 */
export function OjtUploadForm({
  previewAction,
  lookupAction,
  confirmAction,
}: {
  previewAction: (formData: FormData) => Promise<ActionResult<OjtUploadPreview>>;
  lookupAction: (staffNo: string) => Promise<ActionResult<OjtUploadRow>>;
  confirmAction: (formData: FormData) => Promise<ActionResult<void>>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [fields, setFields] = useState<OjtUploadPreview["fields"] | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [show, setShow] = useState<Show>("all");
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const nextKey = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const counts = useMemo(
    () => ({
      ready: rows.filter(included).length,
      missing: rows.filter((r) => !r.removed && !r.checking && r.status === "missing").length,
      resigned: rows.filter((r) => !r.removed && r.status === "resigned").length,
      undecided: rows.filter(undecided).length,
      removed: rows.filter((r) => r.removed).length,
      blocking: rows.filter(blocking).length,
    }),
    [rows],
  );
  const shown = rows.filter((r) =>
    show === "all" ? true : show === "attention" ? blocking(r) || undecided(r) : included(r),
  );

  function check(formData: FormData) {
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) return setError("Please choose a file to upload.");
    setError(null);
    startTransition(async () => {
      const r = await previewAction(formData);
      if (isActionError(r)) return setError(r.actionError);
      setFileName(file.name);
      setFields(r.fields);
      setRows(
        r.rows.map((x) => ({ ...x, key: nextKey.current++, removed: false, keep: false, checking: false, edited: false })),
      );
      setShow(r.rows.some((x) => x.status !== "ok") ? "attention" : "all");
    });
  }

  function update(key: number, patch: Partial<Row>) {
    setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  /** A Staff No typed on screen: checked against LDMS after a short pause. */
  function editStaffNo(key: number, value: string) {
    update(key, { staffNo: value, checking: !!value.trim(), edited: true, status: "missing", name: null, department: null });
    clearTimeout(timers.current.get(key));
    if (!value.trim()) return;
    timers.current.set(
      key,
      setTimeout(async () => {
        const r = await lookupAction(value);
        setRows((all) =>
          all.map((row) =>
            row.key !== key || row.staffNo !== value
              ? row
              : isActionError(r)
                ? { ...row, checking: false, status: "missing" }
                : { ...row, ...r, staffNo: r.staffNo, checking: false, keep: false },
          ),
        );
      }, 450),
    );
  }

  function addRow() {
    const key = nextKey.current++;
    setRows((all) => [
      ...all,
      { key, staffNo: "", status: "missing", name: null, department: null, removed: false, keep: false, checking: false, edited: true },
    ]);
    setShow("all");
  }

  function setAll(test: (r: Row) => boolean, patch: Partial<Row>) {
    setRows((all) => all.map((r) => (test(r) ? { ...r, ...patch } : r)));
  }

  async function submit() {
    if (!fields) return;
    const people = rows.filter(included);
    if (counts.blocking) return setError(`Fix or remove the ${counts.blocking} row(s) marked "Not in LDMS" first.`);
    if (!people.length) return setError("Add at least one participant.");
    const left = counts.undecided ? ` ${counts.undecided} resigned staff will be left out.` : "";
    if (!(await confirm(`Create this OJT with ${people.length} participant(s)?${left}`))) return;
    setError(null);
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => fd.set(k, v));
    people.forEach((p) => fd.append("staffNo", p.staffNo));
    startTransition(async () => {
      const r = await confirmAction(fd); // redirects to the new OJT when saved
      if (isActionError(r)) setError(r.actionError);
    });
  }

  // ---------- Step 1: choose the file ----------
  if (!fields) {
    return (
      <div className="max-w-xl">
        <a
          href="/ojt-upload-template.xlsx"
          download
          className="inline-flex items-center gap-1.5 rounded-xl border border-border text-sm font-medium px-3 py-2 text-text-secondary hover:bg-gray-50 mb-6"
        >
          <Download size={15} /> Download Template
        </a>
        <div className="mb-4">
          <FormError error={error} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            check(new FormData(e.currentTarget));
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
            {pending ? "Checking..." : "Check File"}
          </button>
          <p className="text-xs text-text-muted">Nothing is saved yet: you can review and fix everything on the next screen.</p>
        </form>
      </div>
    );
  }

  // ---------- Step 2: review, fix, confirm ----------
  const field = (key: keyof typeof fields, label: string, type = "text") => (
    <label className="block">
      <span className="block text-xs font-medium text-text-secondary mb-1">{label}</span>
      <input
        type={type}
        value={fields[key]}
        disabled={pending}
        onChange={(e) => setFields({ ...fields, [key]: e.target.value })}
        className={inputCls}
      />
    </label>
  );
  const pill = (r: Row) =>
    r.removed ? (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-text-muted">Removed</span>
    ) : r.checking ? (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-text-muted">Checking...</span>
    ) : r.status === "ok" ? (
      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary-dark">✓ OK</span>
    ) : r.status === "resigned" ? (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Resigned</span>
    ) : (
      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
        {r.staffNo.trim() ? "Not in LDMS" : "Empty"}
      </span>
    );

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-text-secondary">
          Reviewing <b className="font-medium text-text-primary">{fileName}</b>. Nothing is saved until you press Confirm.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setFields(null);
            setRows([]);
            setError(null);
          }}
          className="text-sm text-text-secondary underline hover:text-text-primary"
        >
          Choose another file
        </button>
      </div>

      <FormError error={error} />

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-semibold mb-3">OJT details</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("title", "Title")}
          {field("venue", "Venue")}
          <label className="block">
            <span className="block text-xs font-medium text-text-secondary mb-1">Trainer Type</span>
            <select
              value={fields.trainerType}
              disabled={pending}
              onChange={(e) => setFields({ ...fields, trainerType: e.target.value })}
              className={inputCls}
            >
              {Object.entries(TRAINER_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          {field("trainerName", "Trainer Name")}
          {field("startDate", "Start Date", "date")}
          {field("endDate", "End Date", "date")}
          {field("startTime", "Start Time", "time")}
          {field("endTime", "End Time", "time")}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">Participants</h3>
          <p className="text-sm text-text-secondary">
            <b className="text-primary-dark">{counts.ready} ready</b>
            {counts.missing > 0 && <span className="text-rose-700"> · {counts.missing} not in LDMS</span>}
            {counts.resigned > 0 && <span className="text-amber-700"> · {counts.resigned} resigned</span>}
            {counts.removed > 0 && <span className="text-text-muted"> · {counts.removed} removed</span>}
          </p>
        </div>
        <p className="mt-1 text-xs text-text-muted">
          Edit a Staff No to fix it (it&apos;s checked again straight away), or remove the row. Resigned staff are left out
          unless you tick Keep.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-border bg-gray-50 p-0.5">
            {(
              [
                ["attention", `Needs attention (${counts.blocking + counts.undecided})`],
                ["ready", `Ready (${counts.ready})`],
                ["all", `All (${rows.length})`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={show === k}
                onClick={() => setShow(k)}
                className={`rounded-lg px-3 py-1 text-xs font-medium ${show === k ? "bg-primary-dark text-white" : "text-text-muted hover:text-text-primary"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {counts.missing > 0 && (
            <button
              type="button"
              onClick={() => setAll((r) => !r.removed && !r.checking && r.status === "missing", { removed: true })}
              className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
            >
              Remove all not in LDMS ({counts.missing})
            </button>
          )}
          {counts.resigned > 0 && (
            <>
              <button
                type="button"
                onClick={() => setAll((r) => !r.removed && r.status === "resigned", { keep: true })}
                className="rounded-lg border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
              >
                Keep all resigned
              </button>
              <button
                type="button"
                onClick={() => setAll((r) => !r.removed && r.status === "resigned", { removed: true, keep: false })}
                className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-gray-50"
              >
                Remove all resigned
              </button>
            </>
          )}
        </div>

        <div className="mt-3 max-h-[28rem] overflow-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Row</th>
                <th className="px-3 py-2 font-medium">Staff No</th>
                <th className="px-3 py-2 font-medium">Name / Department</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((r) => (
                <tr key={r.key} className={r.removed ? "bg-gray-50 text-text-muted" : blocking(r) ? "bg-rose-50/40" : undefined}>
                  <td className="px-3 py-2 tabular-nums text-text-muted">{r.row ?? "new"}</td>
                  <td className="px-3 py-2">
                    <input
                      aria-label={`Staff No${r.row ? ` on row ${r.row}` : ""}`}
                      value={r.staffNo}
                      disabled={r.removed || pending}
                      onChange={(e) => editStaffNo(r.key, e.target.value)}
                      placeholder="e.g. 001622"
                      className={`w-28 rounded-lg border px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary ${
                        r.edited ? "border-amber-300 bg-amber-50" : "border-border bg-white"
                      } disabled:bg-transparent disabled:border-transparent`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className={r.removed ? "line-through" : "font-medium"}>{r.name ?? "—"}</div>
                    {r.department && <div className="text-xs text-text-muted">{r.department}</div>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {pill(r)}
                    {!r.removed && r.status === "resigned" && (
                      <label className="ml-2 inline-flex items-center gap-1 text-xs text-amber-800">
                        <input type="checkbox" checked={r.keep} onChange={(e) => update(r.key, { keep: e.target.checked })} />
                        Keep
                      </label>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.removed ? (
                      <button
                        type="button"
                        onClick={() => update(r.key, { removed: false })}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-text-secondary hover:bg-gray-100"
                      >
                        <RotateCcw size={12} /> Undo
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Remove ${r.staffNo || "row"}`}
                        onClick={() => update(r.key, { removed: true })}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-text-secondary hover:bg-rose-50 hover:text-rose-700"
                      >
                        <X size={12} /> Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-text-muted">
                    {show === "attention" ? "Nothing needs attention. ✓" : "No participants."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="mt-3 inline-flex items-center gap-1 text-sm text-primary-dark hover:text-primary"
        >
          <Plus size={14} /> Add participant
        </button>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className={`rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60 ${
            counts.blocking ? "bg-gray-400" : "bg-primary-dark hover:bg-primary"
          }`}
        >
          {pending ? "Saving..." : `Confirm & Create OJT (${counts.ready})`}
        </button>
        <span className="text-sm text-text-muted">
          {counts.blocking
            ? `${counts.blocking} row(s) still need a valid Staff No or to be removed.`
            : counts.undecided
              ? `${counts.undecided} resigned staff will be left out unless you tick Keep.`
              : "Everything is ready."}
        </span>
      </div>
    </div>
  );
}
