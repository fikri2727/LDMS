"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function DateRangeFilter({ start, end }: { start: string; end: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <label className="flex items-center gap-2 text-text-secondary">
        From
        <input
          type="date"
          defaultValue={start}
          onChange={(e) => update("start", e.target.value)}
          className="rounded-xl border border-border bg-surface px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>
      <label className="flex items-center gap-2 text-text-secondary">
        To
        <input
          type="date"
          defaultValue={end}
          onChange={(e) => update("end", e.target.value)}
          className="rounded-xl border border-border bg-surface px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>
    </div>
  );
}
