"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { TutorialStep } from "@/components/tutorial/steps";

/** How long to wait for a page to open, then for its highlighted item, before showing the step in the middle. */
const PAGE_WAIT_MS = 8000;
const ITEM_WAIT_MS = 1500;
const POPUP_WIDTH = 340;
const POPUP_HEIGHT = 250; // room to keep free when choosing a side; the real height varies a little
const GAP = 12;
const EDGE = 16;

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface View {
  index: number;
  box: Box | null;
  width: number;
  height: number;
}

const currentPage = () => window.location.pathname + window.location.search;

/** The menu exists twice (sidebar and phone sheet), so take the copy that is actually on show. */
function findTarget(target: string) {
  return (
    [...document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)].find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && !el.closest('[role="dialog"]');
    }) ?? null
  );
}

/**
 * The app can be zoomed by CSS on short screens. Measuring against the full-screen layer gives the
 * highlight the right position whichever way the browser reports zoomed sizes.
 */
function measure(el: HTMLElement, layer: HTMLElement): Box {
  const r = el.getBoundingClientRect();
  const l = layer.getBoundingClientRect();
  const scale = layer.offsetWidth / l.width;
  const top = Math.max(8, (r.top - l.top) * scale - 6);
  const left = Math.max(8, (r.left - l.left) * scale - 6);
  const bottom = Math.min(layer.offsetHeight - 8, (r.bottom - l.top) * scale + 6);
  const right = Math.min(layer.offsetWidth - 8, (r.right - l.left) * scale + 6);
  return { top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

function sameView(a: View | null, b: View) {
  return (
    !!a &&
    a.index === b.index &&
    a.width === b.width &&
    a.height === b.height &&
    a.box?.top === b.box?.top &&
    a.box?.left === b.box?.left &&
    a.box?.width === b.box?.width &&
    a.box?.height === b.box?.height
  );
}

function popupStyle({ box, width, height }: View): React.CSSProperties {
  const popupWidth = Math.min(POPUP_WIDTH, width - EDGE * 2);
  if (!box) {
    return { width: popupWidth, left: (width - popupWidth) / 2, top: "50%", transform: "translateY(-50%)" };
  }
  const left = Math.min(Math.max(box.left, EDGE), width - popupWidth - EDGE);
  const right = box.left + box.width;
  const bottom = box.top + box.height;

  // Menu items sit on the far left, so the popup goes beside them.
  if (right < 300 && width > right + popupWidth + GAP * 2) {
    return {
      width: popupWidth,
      left: right + GAP,
      top: Math.max(EDGE, Math.min(box.top - 8, height - POPUP_HEIGHT - EDGE)),
    };
  }
  if (height - bottom >= POPUP_HEIGHT) return { width: popupWidth, left, top: bottom + GAP };
  if (box.top >= POPUP_HEIGHT) return { width: popupWidth, left, bottom: height - box.top + GAP };
  // The item fills the screen: keep the popup in the corner.
  return { width: popupWidth, right: EDGE, bottom: EDGE };
}

export function TutorialTour({ steps, onClose }: { steps: TutorialStep[]; onClose: () => void }) {
  const router = useRouter();
  const layerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [view, setView] = useState<View | null>(null);

  const step = steps[index];
  const isLast = index === steps.length - 1;
  const ready = view?.index === index ? view : null;
  const { page, target } = step;

  // Nothing behind the tutorial can be clicked, typed in or reached with the Tab key.
  useEffect(() => {
    const root = document.querySelector("[data-app-root]");
    root?.setAttribute("inert", "");
    return () => root?.removeAttribute("inert");
  }, []);

  useEffect(() => {
    if (page && currentPage() !== page) router.push(page);

    const started = Date.now();
    let arrived = 0;
    let scrolled = false;
    const timer = setInterval(() => {
      const layer = layerRef.current;
      if (!layer) return;
      if (page && currentPage() !== page && Date.now() - started < PAGE_WAIT_MS) return;
      arrived ||= Date.now();

      const el = target ? findTarget(target) : null;
      if (target && !el && Date.now() - arrived < ITEM_WAIT_MS) return;

      if (el && !scrolled) {
        scrolled = true;
        const tall = el.getBoundingClientRect().height > layer.getBoundingClientRect().height * 0.6;
        el.scrollIntoView({ block: tall ? "start" : "center", inline: "nearest" });
      }
      const next: View = {
        index,
        box: el ? measure(el, layer) : null,
        width: layer.offsetWidth,
        height: layer.offsetHeight,
      };
      setView((prev) => (sameView(prev, next) ? prev : next));
    }, 120);
    return () => clearInterval(timer);
  }, [index, page, target, router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function goNext() {
    if (isLast) {
      onClose();
      router.push("/dashboard");
    } else {
      setIndex((i) => i + 1);
    }
  }

  return createPortal(
    <div ref={layerRef} className="fixed inset-0 z-[70]">
      {/* Dims the page. With a highlight, its shadow does the dimming and leaves the item bright. */}
      {ready?.box ? (
        <div
          className="pointer-events-none absolute rounded-xl border-2 border-primary-dark shadow-[0_0_0_9999px_rgba(15,23,42,0.55)] transition-[top,left,width,height] duration-200"
          style={ready.box}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgba(15,23,42,0.55)]" />
      )}

      <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center px-4">
        <p className="rounded-xl border border-primary/30 bg-surface px-3 py-1.5 text-xs text-text-secondary shadow-[var(--shadow-card)]">
          <span className="font-semibold text-primary-dark">Tutorial Mode</span> · Buttons are locked. Nothing will be saved.
        </p>
      </div>

      {ready ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={step.title}
          className="absolute rounded-2xl border border-border bg-surface p-5 shadow-xl"
          style={popupStyle(ready)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-dark">
                Tutorial {index + 1} / {steps.length}
              </p>
              <h2 className="mt-1 text-base font-semibold text-text-primary">{step.title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-gray-50"
            >
              Exit Tutorial
            </button>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary">{step.text}</p>
          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-gray-50 disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={goNext}
              className="rounded-xl bg-primary-dark px-5 py-2 text-sm font-semibold text-white hover:bg-primary"
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      ) : (
        <p className="absolute inset-x-0 top-1/2 text-center text-sm font-medium text-white">Loading...</p>
      )}
    </div>,
    document.body
  );
}
