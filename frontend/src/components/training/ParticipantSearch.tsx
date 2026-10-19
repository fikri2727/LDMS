"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { SortableTh, type SortDir } from "@/components/ui/SortableTh";

/**
 * Search + sort for a training's Participants table. The cells stay server-rendered; the page hands
 * each row's cells to <ParticipantRows>, which filters (by <ParticipantSearchInput>) and orders them
 * (by the clicked <ParticipantSortTh>) and numbers them in the order shown.
 */
export type ParticipantSortKey = "staff" | "department" | "attendance" | "days" | "evaluation" | "pme";

export interface ParticipantRowData {
  id: number;
  search: string;
  sort: Record<ParticipantSortKey, string | number>;
  cells: React.ReactNode;
}

type Ctx = {
  query: string;
  setQuery: (q: string) => void;
  items: string[];
  sortKey: ParticipantSortKey | null;
  sortDir: SortDir;
  toggleSort: (key: ParticipantSortKey) => void;
};

const TableContext = createContext<Ctx>({
  query: "",
  setQuery: () => {},
  items: [],
  sortKey: null,
  sortDir: "asc",
  toggleSort: () => {},
});

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const matches = (text: string, query: string) => !query || norm(text).includes(query);

/** `items` = the search text of every row (name, staff no, department), used for the "x of y" count. */
export function ParticipantSearchProvider({ items, children }: { items: string[]; children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<ParticipantSortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  function toggleSort(key: ParticipantSortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }
  return (
    <TableContext.Provider value={{ query: norm(query), setQuery, items, sortKey, sortDir, toggleSort }}>
      {children}
    </TableContext.Provider>
  );
}

export function ParticipantSearchInput() {
  const { query, setQuery, items } = useContext(TableContext);
  const [text, setText] = useState("");
  if (items.length === 0) return null;
  const shown = items.filter((t) => matches(t, query)).length;
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setQuery(e.target.value);
          }}
          placeholder="Search name, staff no, department..."
          className="w-56 sm:w-72 rounded-xl border border-border bg-surface py-1.5 pl-8 pr-7 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {text && (
          <button
            type="button"
            onClick={() => {
              setText("");
              setQuery("");
            }}
            title="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {query && (
        <span className="text-xs text-text-muted whitespace-nowrap">
          {shown} of {items.length}
        </span>
      )}
    </div>
  );
}

/** A clickable column header: first click sorts A→Z, the next Z→A. */
export function ParticipantSortTh({
  sortKey,
  label,
  className = "px-4 py-3",
}: {
  sortKey: ParticipantSortKey;
  label: string;
  className?: string;
}) {
  const ctx = useContext(TableContext);
  return (
    <SortableTh
      label={label}
      active={ctx.sortKey === sortKey}
      dir={ctx.sortDir}
      onClick={() => ctx.toggleSort(sortKey)}
      className={className}
    />
  );
}

function compare(a: string | number, b: string | number) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

/** The table body: rows filtered by the search, ordered by the chosen column, numbered as shown. */
export function ParticipantRows({ rows, colSpan }: { rows: ParticipantRowData[]; colSpan: number }) {
  const { query, sortKey, sortDir } = useContext(TableContext);
  const shown = useMemo(() => {
    const list = rows.filter((r) => matches(r.search, query));
    if (sortKey) {
      list.sort((a, b) => {
        const c = compare(a.sort[sortKey], b.sort[sortKey]) || compare(a.sort.staff, b.sort.staff);
        return sortDir === "asc" ? c : -c;
      });
    }
    return list;
  }, [rows, query, sortKey, sortDir]);

  if (rows.length > 0 && shown.length === 0) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-4 py-8 text-center text-text-muted">
          No participants match your search.
        </td>
      </tr>
    );
  }
  return (
    <>
      {shown.map((r, i) => (
        <tr key={r.id} className="hover:bg-gray-50">
          <td className="px-4 py-3 text-text-muted">{i + 1}</td>
          {r.cells}
        </tr>
      ))}
    </>
  );
}
