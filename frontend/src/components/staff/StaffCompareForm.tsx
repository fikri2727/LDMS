"use client";

import { useState, useTransition } from "react";
import type { StaffCompareResult } from "@/app/(app)/staff/actions";
import { PeopleList } from "@/components/staff/StaffUploadForm";
import { useConfirm } from "@/components/ui/ConfirmProvider";

/** Upload a list of Staff IDs and see how it compares with LDMS. Nothing is saved unless the admin
 * ticks staff missing from the file and marks them Resigned. */
export function StaffCompareForm({
  action,
  resignAction,
}: {
  action: (formData: FormData) => Promise<{ result?: StaffCompareResult; error?: string }>;
  resignAction: (staffNos: string[]) => Promise<{ error?: string }>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<StaffCompareResult | null>(null);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  function toggle(staffNo: string) {
    const next = new Set(ticked);
    if (!next.delete(staffNo)) next.add(staffNo);
    setTicked(next);
  }

  async function resign() {
    const chosen = [...ticked];
    if (!(await confirm(`Mark ${chosen.length} staff as Resigned? Date Resigned will be today.`))) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const r = await resignAction(chosen);
      if (r.error) {
        setError(r.error);
        return;
      }
      setMessage(`${chosen.length} staff marked as Resigned.`);
      setTicked(new Set());
      setResult((prev) => prev && { ...prev, notInFile: prev.notInFile.filter((p) => !ticked.has(p.staffNo)) });
    });
  }

  return (
    <div className="max-w-xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          setError(null);
          setMessage(null);
          setResult(null);
          setTicked(new Set());
          startTransition(async () => {
            const r = await action(formData);
            if (r.result) setResult(r.result);
            else setError(r.error ?? "Something went wrong.");
          });
        }}
        className="flex flex-wrap items-center gap-3"
      >
        <input
          type="file"
          name="file"
          accept=".xlsx"
          required
          className="text-sm text-text-secondary file:mr-3 file:rounded-xl file:border-0 file:bg-primary/10 file:text-primary-dark file:px-3 file:py-1.5 file:text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-primary-dark hover:bg-primary disabled:opacity-60 text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          {pending ? "Comparing..." : "Compare"}
        </button>
      </form>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 mt-4 whitespace-pre-wrap">
          {error}
        </p>
      )}

      {message && <p className="text-sm text-primary-dark bg-primary/10 rounded-xl px-3 py-2 mt-4">{message}</p>}

      {result && (
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-4 mt-4">
          <p className="text-sm text-text-secondary">
            <span className="font-semibold">{result.fileCount}</span> Staff ID(s) in your file.{" "}
            <span className="font-semibold">{result.matched}</span> already registered and Active.
          </p>
          <PeopleList
            title="Not registered in LDMS yet"
            tone="text-rose-600"
            people={result.notRegistered.map((staffNo) => ({ staffNo, staffName: "" }))}
          />
          <PeopleList title="In your file, but Resigned in LDMS" tone="text-amber-700" people={result.resignedInSystem} />
          {result.notInFile.length > 0 && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <p className="text-sm font-semibold text-amber-700">
                  Active in LDMS, but not in your file ({result.notInFile.length})
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setTicked(
                      ticked.size === result.notInFile.length
                        ? new Set()
                        : new Set(result.notInFile.map((p) => p.staffNo))
                    )
                  }
                  className="text-xs font-medium text-primary-dark hover:underline"
                >
                  {ticked.size === result.notInFile.length ? "Clear all" : "Tick all"}
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                {result.notInFile.map((p) => (
                  <label key={p.staffNo} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50">
                    <input type="checkbox" checked={ticked.has(p.staffNo)} onChange={() => toggle(p.staffNo)} />
                    <span className="text-text-muted">{p.staffNo}</span>
                    <span className="text-text-primary font-medium">{p.staffName}</span>
                    {p.department && <span className="text-text-muted">{p.department}</span>}
                    {p.isHod && (
                      <span className="rounded-full bg-amber-50 text-amber-700 text-[10px] font-medium px-2 py-0.5">
                        HOD
                      </span>
                    )}
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={resign}
                disabled={pending || ticked.size === 0}
                className="mt-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 transition-colors"
              >
                {pending ? "Saving..." : `Mark ${ticked.size} as Resigned`}
              </button>
            </div>
          )}
          {result.notRegistered.length === 0 &&
            result.resignedInSystem.length === 0 &&
            result.notInFile.length === 0 && (
              <p className="text-sm text-primary-dark">Your file and LDMS match.</p>
            )}
        </div>
      )}
    </div>
  );
}
