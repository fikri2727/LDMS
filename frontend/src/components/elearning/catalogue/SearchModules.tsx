"use client";

import { Search } from "lucide-react";

export function SearchModules({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative flex-1 min-w-[180px]">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search modules..."
        className="w-full rounded-xl border border-border bg-surface/80 backdrop-blur-sm pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow"
      />
    </div>
  );
}
