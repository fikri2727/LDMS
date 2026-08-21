"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { Search } from "lucide-react";
import { ROLE_LABELS } from "@/lib/labels";

interface DivisionOpt {
  id: number;
  name: string;
}

interface DepartmentOpt {
  id: number;
  name: string;
  divisionId: number;
}

export function StaffFilters({
  divisions,
  departments,
}: {
  divisions: DivisionOpt[];
  departments: DepartmentOpt[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const divisionId = searchParams.get("divisionId") ?? "";
  const visibleDepartments = divisionId
    ? departments.filter((d) => d.divisionId === Number(divisionId))
    : departments;

  useEffect(() => {
    const handle = setTimeout(() => {
      updateParam("q", q);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function handleDivisionChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("divisionId", value);
    else params.delete("divisionId");
    // A department belonging to the previous division no longer applies.
    params.delete("departmentId");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[220px]">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, staff no., division, department, section, or designation"
          className="w-full rounded-xl border border-border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <select
        defaultValue={divisionId}
        onChange={(e) => handleDivisionChange(e.target.value)}
        className="rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">All divisions</option>
        {divisions.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      <select
        key={divisionId}
        defaultValue={searchParams.get("departmentId") ?? ""}
        onChange={(e) => updateParam("departmentId", e.target.value)}
        className="rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">All departments</option>
        {visibleDepartments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      <select
        defaultValue={searchParams.get("status") ?? ""}
        onChange={(e) => updateParam("status", e.target.value)}
        className="rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">All statuses</option>
        <option value="ACTIVE">Active</option>
        <option value="RESIGN">Resigned</option>
      </select>

      <select
        defaultValue={searchParams.get("role") ?? ""}
        onChange={(e) => updateParam("role", e.target.value)}
        className="rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">All roles</option>
        {Object.entries(ROLE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
