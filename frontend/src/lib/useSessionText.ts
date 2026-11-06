"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function read(key: string) {
  try {
    return sessionStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

/** Text that survives leaving the page and coming back (e.g. a list's search box), until the tab is closed. */
export function useSessionText(key: string): [string, (value: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => ""
  );
  const setValue = useCallback(
    (next: string) => {
      try {
        sessionStorage.setItem(key, next);
      } catch {
        // storage blocked: the box just won't remember
      }
      listeners.forEach((l) => l());
    },
    [key]
  );
  return [value, setValue];
}
