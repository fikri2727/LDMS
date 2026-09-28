"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Crown, Trash2 } from "lucide-react";
import { DESIGNATION_LABELS } from "@/lib/labels";
import { deleteStaff } from "@/app/(app)/staff/actions";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { SortableTh, type SortDir } from "@/components/ui/SortableTh";

interface StaffRow {
  id: number;
  staffNo: string;
  staffName: string;
  isHod: boolean;
  designation: string;
  status: string;
  passwordIsDefault: boolean;
  division: { name: string } | null;
  department: { name: string } | null;
  section: { name: string } | null;
}

type SortKey = "staffNo" | "staffName" | "designation" | "orgUnit" | "status" | "password";

function orgUnitLabel(s: StaffRow) {
  return [s.division?.name, s.department?.name, s.section?.name].filter(Boolean).join(" / ") || "—";
}

const SORT_ACCESSORS: Record<SortKey, (r: StaffRow) => string | number> = {
  staffNo: (r) => r.staffNo,
  staffName: (r) => r.staffName,
  designation: (r) => DESIGNATION_LABELS[r.designation] ?? r.designation,
  orgUnit: (r) => orgUnitLabel(r),
  status: (r) => r.status,
  password: (r) => (r.passwordIsDefault ? 0 : 1),
};

export function StaffTable({ staff }: { staff: StaffRow[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const confirm = useConfirm();

  const sorted = useMemo(() => {
    if (!sortKey) return staff;
    const accessor = SORT_ACCESSORS[sortKey];
    const copy = [...staff].sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      return typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
    });
    if (sortDir === "desc") copy.reverse();
    return copy;
  }, [staff, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!(await confirm(`Permanently delete ${name}'s staff record? This cannot be undone.`))) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteStaff(id);
      } catch (e) {
        // deleteStaff redirects on success by throwing a tagged Next.js error —
        // let that propagate so the navigation actually happens.
        if (e && typeof e === "object" && "digest" in e && typeof e.digest === "string" && e.digest.startsWith("NEXT_")) {
          throw e;
        }
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div>
      {error && (
        <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-text-muted text-xs uppercase tracking-wide">
            <tr>
              <SortableTh label="Staff No." active={sortKey === "staffNo"} dir={sortDir} onClick={() => toggleSort("staffNo")} className="px-4 py-3" />
              <SortableTh label="Name" active={sortKey === "staffName"} dir={sortDir} onClick={() => toggleSort("staffName")} className="px-4 py-3" />
              <SortableTh label="Designation" active={sortKey === "designation"} dir={sortDir} onClick={() => toggleSort("designation")} className="px-4 py-3" />
              <SortableTh label="Division / Department / Section" active={sortKey === "orgUnit"} dir={sortDir} onClick={() => toggleSort("orgUnit")} className="px-4 py-3" />
              <SortableTh label="Status" active={sortKey === "status"} dir={sortDir} onClick={() => toggleSort("status")} className="px-4 py-3" />
              <SortableTh label="Password" active={sortKey === "password"} dir={sortDir} onClick={() => toggleSort("password")} className="px-4 py-3" />
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/staff/${s.id}`} className="text-primary-dark font-medium hover:underline">
                    {s.staffNo}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-primary">
                  <Link href={`/staff/${s.id}/training`} className="flex items-center gap-1.5 text-primary-dark font-medium hover:underline">
                    {s.staffName}
                    {s.isHod && <Crown size={14} className="text-amber-500" />}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-secondary">{DESIGNATION_LABELS[s.designation]}</td>
                <td className="px-4 py-3 text-text-secondary">
                  {[s.division?.name, s.department?.name, s.section?.name].filter(Boolean).join(" / ") || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      s.status === "ACTIVE"
                        ? "inline-flex rounded-full bg-primary/10 text-primary-dark text-xs font-medium px-2 py-0.5"
                        : "inline-flex rounded-full bg-rose-50 text-rose-600 text-xs font-medium px-2 py-0.5"
                    }
                  >
                    {s.status === "ACTIVE" ? "Active" : "Resigned"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      s.passwordIsDefault
                        ? "inline-flex rounded-full bg-amber-50 text-amber-700 text-xs font-medium px-2 py-0.5"
                        : "inline-flex rounded-full bg-primary/10 text-primary-dark text-xs font-medium px-2 py-0.5"
                    }
                  >
                    {s.passwordIsDefault ? "Default" : "Changed"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    disabled={pending}
                    onClick={() => handleDelete(s.id, s.staffName)}
                    title="Delete staff record"
                    className="p-1.5 text-text-muted hover:text-rose-600 disabled:opacity-60"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-text-muted">
                  No staff found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
