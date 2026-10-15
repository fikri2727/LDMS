"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { MessageSquarePlus, Pencil } from "lucide-react";
import { floatingPosition, useDismissFloating, type FloatingPos } from "@/lib/floating";

const QUICK_REASONS = ["MC / sick leave", "Annual leave", "Emergency leave", "Outstation", "Work commitment"];

/** Participants table: a short remark (e.g. reason for absence). Admins can add/edit it. */
export function RemarkEditor({
  remark,
  canEdit,
  onSave,
}: {
  remark: string | null;
  canEdit: boolean;
  onSave: (remark: string) => Promise<{ error: string } | void>;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(remark ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<FloatingPos | null>(null);
  const closePopup = useCallback(() => setOpen(false), []);
  useDismissFloating(open, closePopup, box, popup);

  if (!canEdit) {
    return remark ? <span className="block mt-1 text-xs text-text-secondary">{remark}</span> : null;
  }

  function save(value: string) {
    setError(null);
    startTransition(async () => {
      const result = await onSave(value);
      if (result?.error) setError(result.error);
      else setOpen(false);
    });
  }

  return (
    <div ref={box} className="mt-1">
      <button
        type="button"
        onClick={() => {
          setText(remark ?? "");
          setError(null);
          if (!open && box.current) setPos(floatingPosition(box.current, 256, 230));
          setOpen((o) => !o);
        }}
        title={remark ? "Edit remark" : "Add a reason / remark"}
        className="group flex max-w-48 items-start gap-1 text-left text-xs"
      >
        {remark ? (
          <>
            <span className="text-text-secondary">{remark}</span>
            <Pencil size={11} className="mt-0.5 shrink-0 text-text-muted group-hover:text-primary-dark" />
          </>
        ) : (
          <span className="flex items-center gap-1 text-text-muted group-hover:text-primary-dark">
            <MessageSquarePlus size={12} /> Add reason
          </span>
        )}
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={popup}
            style={{ position: "fixed", left: pos.left, top: pos.top, bottom: pos.bottom }}
            className="z-[70] w-64 rounded-xl border border-border bg-surface p-3 shadow-lg"
          >
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Remark</p>
            <div className="flex flex-wrap gap-1 mb-2">
              {QUICK_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setText(r)}
                  className="rounded-full border border-border px-2 py-0.5 text-[11px] text-text-secondary hover:bg-gray-50"
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="e.g. MC on 14 Oct"
              className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
            <div className="mt-2 flex items-center justify-between gap-2">
              {remark ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => save("")}
                  className="text-xs text-rose-600 hover:underline disabled:opacity-60"
                >
                  Clear
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-border px-2.5 py-1 text-xs text-text-secondary hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => save(text)}
                  className="rounded-lg bg-primary-dark px-2.5 py-1 text-xs font-medium text-white hover:bg-primary disabled:opacity-60"
                >
                  {pending ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
