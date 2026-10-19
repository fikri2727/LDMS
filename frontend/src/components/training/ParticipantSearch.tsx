"use client";

import { createContext, useContext, useState } from "react";
import { Search, X } from "lucide-react";

/**
 * Search for a training's Participants table. The rows stay server-rendered; each row is wrapped in
 * <ParticipantRow> which hides itself when it doesn't match what's typed in <ParticipantSearchInput>.
 */
const SearchContext = createContext<{ query: string; setQuery: (q: string) => void; items: string[] }>({
  query: "",
  setQuery: () => {},
  items: [],
});

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const matches = (text: string, query: string) => !query || norm(text).includes(query);

/** `items` = the search text of every row (name, staff no, department), used for the "x of y" count. */
export function ParticipantSearchProvider({ items, children }: { items: string[]; children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  return <SearchContext.Provider value={{ query: norm(query), setQuery, items }}>{children}</SearchContext.Provider>;
}

export function ParticipantSearchInput() {
  const { query, setQuery, items } = useContext(SearchContext);
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

export function ParticipantRow({ search, children }: { search: string; children: React.ReactNode }) {
  const { query } = useContext(SearchContext);
  if (!matches(search, query)) return null;
  return <tr className="hover:bg-gray-50">{children}</tr>;
}

/** "No participants match" row - only while a search hides every row. */
export function NoMatchRow({ colSpan }: { colSpan: number }) {
  const { query, items } = useContext(SearchContext);
  if (!query || items.length === 0 || items.some((t) => matches(t, query))) return null;
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-text-muted">
        No participants match your search.
      </td>
    </tr>
  );
}
