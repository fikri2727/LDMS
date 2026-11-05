"use client";

import { useState, useTransition } from "react";
import type { StaffCompareResult } from "@/app/(app)/staff/actions";
import { PeopleList } from "@/components/staff/StaffUploadForm";

/** Upload a list of Staff IDs and see how it compares with LDMS. Read-only: nothing is saved. */
export function StaffCompareForm({
  action,
}: {
  action: (formData: FormData) => Promise<{ result?: StaffCompareResult; error?: string }>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StaffCompareResult | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="max-w-xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          setError(null);
          setResult(null);
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
          <PeopleList title="Active in LDMS, but not in your file" tone="text-amber-700" people={result.notInFile} />
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
