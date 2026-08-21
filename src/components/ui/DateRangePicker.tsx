"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format } from "date-fns";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function DateRangePicker({
  startName,
  endName,
  initialStart,
  initialEnd,
}: {
  startName: string;
  endName: string;
  initialStart?: string;
  initialEnd?: string;
}) {
  const seed = initialStart ? parseDateKey(initialStart) : new Date();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(seed.getFullYear());
  const [viewMonth, setViewMonth] = useState(seed.getMonth());
  const [start, setStart] = useState<Date | null>(initialStart ? parseDateKey(initialStart) : null);
  const [end, setEnd] = useState<Date | null>(initialEnd ? parseDateKey(initialEnd) : null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleDayClick(day: Date) {
    if (!start || end) {
      setStart(day);
      setEnd(null);
    } else if (day.getTime() < start.getTime()) {
      setStart(day);
      setEnd(null);
    } else {
      setEnd(day);
      setOpen(false);
    }
  }

  function changeMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  }

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const total = daysInMonth(viewYear, viewMonth);
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(new Date(viewYear, viewMonth, d));

  const todayKey = toDateKey(new Date());
  const startKey = start ? toDateKey(start) : null;
  const endKey = end ? toDateKey(end) : null;
  const effectiveEndKey = endKey ?? startKey;

  const displayText = start
    ? end
      ? `${format(start, "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`
      : `${format(start, "d MMM yyyy")} — select end date`
    : "Click to select date";

  return (
    <div ref={containerRef} className="relative max-w-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <Calendar size={15} className="text-text-muted shrink-0" />
        <span className={start ? "text-text-primary" : "text-text-muted"}>{displayText}</span>
      </button>

      <input type="hidden" name={startName} value={startKey ?? ""} />
      <input type="hidden" name={endName} value={effectiveEndKey ?? ""} />

      {open && (
        <div className="absolute z-20 mt-1 w-72 rounded-xl border border-border bg-surface p-3 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => changeMonth(-1)} className="p-1 rounded hover:bg-gray-100 text-text-secondary">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-text-secondary">
              {MONTH_LABELS[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={() => changeMonth(1)} className="p-1 rounded hover:bg-gray-100 text-text-secondary">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-xs text-text-muted font-medium py-1">
                {d}
              </div>
            ))}
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const key = toDateKey(day);
              const isStart = key === startKey;
              const isEnd = key === endKey;
              const inRange = startKey && effectiveEndKey && key > startKey && key < effectiveEndKey;
              const isToday = key === todayKey;
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => handleDayClick(day)}
                  className={[
                    "h-8 text-sm rounded-xl transition-colors",
                    isStart || isEnd
                      ? "bg-primary-dark text-white font-semibold"
                      : inRange
                        ? "bg-primary/10 text-primary-dark"
                        : isToday
                          ? "bg-gray-100 text-text-primary"
                          : "text-text-secondary hover:bg-gray-100",
                  ].join(" ")}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-text-muted mt-2">
            {start ? (end ? `${startKey} → ${endKey}` : `${startKey} — click end date (or same day)`) : "Click a date to start"}
          </p>
        </div>
      )}
    </div>
  );
}
