"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, KeyRound } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

export function UserMenu({
  staffName,
  staffNo,
  roleLabel,
  openUpward,
}: {
  staffName: string;
  staffNo: string;
  roleLabel: string;
  /** The mobile drawer's copy sits pinned to the bottom of the sidebar, with
   * no room below it — opening downward gets clipped by the sidebar's own
   * scroll container and is invisible. Opens above the button instead. */
  openUpward?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary-soft text-primary-dark text-xs font-semibold shrink-0">
          {initials(staffName)}
        </span>
        <span className="hidden sm:block text-left">
          <span className="block text-sm font-medium text-text-primary leading-tight">{staffName}</span>
          <span className="block text-xs text-text-muted leading-tight">{roleLabel}</span>
        </span>
        <ChevronDown size={15} className={`hidden sm:block text-text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className={`absolute right-0 w-56 rounded-xl border border-border bg-surface shadow-[var(--shadow-card)] p-1.5 z-20 ${
            openUpward ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          <div className="px-2.5 py-2">
            <p className="text-sm font-medium text-text-primary truncate">{staffName}</p>
            <p className="text-xs text-text-muted">
              {staffNo} &middot; {roleLabel}
            </p>
          </div>
          <div className="h-px bg-border my-1" />
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-text-secondary hover:bg-gray-50 hover:text-text-primary transition-colors"
          >
            <KeyRound size={15} /> Change Password
          </Link>
          <LogoutButton className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left text-text-secondary hover:bg-gray-50 hover:text-text-primary transition-colors" />
        </div>
      )}
    </div>
  );
}
