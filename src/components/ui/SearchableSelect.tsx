"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";

export interface SearchableOption {
  value: string;
  label: string;
}

export function SearchableSelect({
  name,
  options,
  value,
  onChange,
  placeholder = "Type to search...",
  emptyLabel = "— None —",
  disabled = false,
}: {
  name: string;
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
}) {
  const allOptions = useMemo<SearchableOption[]>(
    () => [{ value: "", label: emptyLabel }, ...options],
    [options, emptyLabel]
  );
  // Empty when nothing is selected, so the native placeholder shows through —
  // emptyLabel is only used as that option's label inside the dropdown list.
  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  // `query` is the single source of truth for what's shown in the box —
  // always, whether that's the current selection or what's being typed.
  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync displayed text with the selection when it changes from outside
  // (e.g. parent clears department when division changes) — but never while
  // the dropdown is open and the user may be actively typing.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing sync-on-prop-change pattern, left untouched (presentational-only pass)
    if (!open) setQuery(selectedLabel);
  }, [selectedLabel, open]);

  const filtered = useMemo(() => {
    if (!query) return allOptions;
    const q = query.toLowerCase();
    return allOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [allOptions, query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(selectedLabel);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedLabel]);

  function selectOption(opt: SearchableOption) {
    onChange(opt.value);
    setQuery(opt.label);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        <input
          type="text"
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onFocus={(e) => {
            setOpen(true);
            setHighlight(0);
            e.target.select();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (filtered[highlight]) selectOption(filtered[highlight]);
            } else if (e.key === "Escape") {
              setOpen(false);
              setQuery(selectedLabel);
            }
          }}
          className="w-full rounded-xl border border-border pl-8 pr-3 py-2 text-sm bg-surface text-text-primary disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {open && !disabled && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border bg-surface py-1 text-sm shadow-[var(--shadow-card)]">
          {filtered.length === 0 && <li className="px-3 py-1.5 text-text-muted">No matches</li>}
          {filtered.map((opt, i) => (
            <li
              key={opt.value || "__empty__"}
              onMouseDown={(e) => {
                e.preventDefault();
                selectOption(opt);
              }}
              className={
                "cursor-pointer px-3 py-1.5 " +
                (i === highlight ? "bg-primary/10 text-primary-dark" : "text-text-secondary hover:bg-gray-50") +
                (opt.value === value ? " font-medium" : "")
              }
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
