"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-8">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 mb-3 text-sm font-semibold text-text-muted uppercase tracking-wide hover:text-text-secondary"
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {title}
      </button>
      {open && children}
    </div>
  );
}
