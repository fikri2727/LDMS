"use client";

import { useEffect, type RefObject } from "react";

export type FloatingPos = { left: number; top?: number; bottom?: number };

/**
 * Where to put a small popup (drawn on <body> with position: fixed) next to `anchor`, so a table's
 * scroll box can't cut it off. Opens upwards when there isn't room below.
 */
export function floatingPosition(anchor: Element, width: number, height: number): FloatingPos {
  const rect = anchor.getBoundingClientRect();
  // The page is scaled down on smaller laptops (html { zoom }, see globals.css). The anchor is
  // measured in screen pixels but the popup is placed in page pixels, so convert.
  const zoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
  const r = { left: rect.left / zoom, top: rect.top / zoom, bottom: rect.bottom / zoom };
  const vw = window.innerWidth / zoom;
  const vh = window.innerHeight / zoom;
  const left = Math.max(8, Math.min(r.left, vw - width - 8));
  // Extra 90px keeps it clear of the phone's bottom tab bar.
  return vh - r.bottom < height + 90 && r.top > height ? { left, bottom: vh - r.top + 4 } : { left, top: r.bottom + 4 };
}

/** Close the popup on a click outside it/its button, a window resize, or the page/table scrolling. */
export function useDismissFloating(
  open: boolean,
  close: () => void,
  anchor: RefObject<HTMLElement | null>,
  popup: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchor.current?.contains(t) || popup.current?.contains(t)) return;
      close();
    };
    const onScroll = (e: Event) => {
      if (popup.current?.contains(e.target as Node)) return; // scrolling inside the popup is fine
      close();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, close, anchor, popup]);
}
