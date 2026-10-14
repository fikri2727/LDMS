"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { CalendarDays } from "lucide-react";
import { attendedDayNumbers, attendedDaysLabel, dayDate } from "@/lib/attendance";

/** Participants table: shows which days someone attended; admins can tick/untick days. */
export function DaysAttendedPicker({
  attendedDays,
  totalDays,
  startDate,
  canEdit,
  onSave,
}: {
  attendedDays: number[] | null;
  totalDays: number;
  startDate: string;
  canEdit: boolean;
  onSave: (days: number[]) => Promise<{ error: string } | void>;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>(() => attendedDayNumbers(attendedDays, totalDays));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  // The popup is drawn on <body> (not inside the table) so the table's scroll box can't cut it off.
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const start = new Date(startDate);
  const partial = attendedDayNumbers(attendedDays, totalDays).length < totalDays;
  const label = attendedDaysLabel(attendedDays, totalDays);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (box.current?.contains(t) || popup.current?.contains(t)) return;
      setOpen(false);
    };
    const closeNow = () => setOpen(false); // window resized: the button moved
    const closeOnScroll = (e: Event) => {
      // Page or table scrolled (the button moved) - but scrolling the day list inside the popup is fine.
      if (popup.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("resize", closeNow);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("resize", closeNow);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [open]);

  function place() {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    // The page is scaled down on smaller laptops (html { zoom }, see globals.css). The button's
    // position is measured in screen pixels but the popup is placed in page pixels, so convert.
    const zoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    const r = { left: rect.left / zoom, top: rect.top / zoom, bottom: rect.bottom / zoom };
    const vw = window.innerWidth / zoom;
    const vh = window.innerHeight / zoom;
    const width = 192; // w-48
    const left = Math.max(8, Math.min(r.left, vw - width - 8));
    const needed = 96 + Math.min(totalDays, 7) * 28; // header + day rows (scrolls after 7) + buttons
    // Open upwards when there isn't room below (e.g. the last rows, or above the phone tab bar).
    setPos(vh - r.bottom < needed + 90 && r.top > needed ? { left, bottom: vh - r.top + 4 } : { left, top: r.bottom + 4 });
  }

  if (!canEdit) {
    return <span className={partial ? "text-amber-700" : "text-text-secondary"}>{label}</span>;
  }

  function toggle(day: number) {
    setSelected((s) => (s.includes(day) ? s.filter((d) => d !== day) : [...s, day].sort((a, b) => a - b)));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await onSave(selected);
      if (result?.error) setError(result.error);
      else setOpen(false);
    });
  }

  return (
    <div ref={box} className="relative inline-block">
      <button
        type="button"
        onClick={() => {
          setSelected(attendedDayNumbers(attendedDays, totalDays));
          setError(null);
          if (!open) place();
          setOpen((o) => !o);
        }}
        title="Change which days this participant attended"
        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium whitespace-nowrap ${
          partial ? "border-amber-300 bg-amber-50 text-amber-800" : "border-border text-text-secondary hover:bg-gray-50"
        }`}
      >
        <CalendarDays size={13} /> {label}
      </button>
      {open && pos && createPortal(
        <div
          ref={popup}
          style={{ position: "fixed", left: pos.left, top: pos.top, bottom: pos.bottom }}
          className="z-[70] w-48 rounded-xl border border-border bg-surface p-3 shadow-lg"
        >
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Days attended</p>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
              <label key={day} className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={selected.includes(day)}
                  onChange={() => toggle(day)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                Day {day} <span className="text-text-muted">({dayDate(start, day)})</span>
              </label>
            ))}
          </div>
          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-border px-2.5 py-1 text-xs text-text-secondary hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending || selected.length === 0}
              onClick={save}
              className="rounded-lg bg-primary-dark px-2.5 py-1 text-xs font-medium text-white hover:bg-primary disabled:opacity-60"
            >
              {pending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
