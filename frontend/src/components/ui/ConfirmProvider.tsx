"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { X } from "lucide-react";

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

type ConfirmFn = (message: string, options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}

interface PendingConfirm extends ConfirmOptions {
  message: string;
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback<ConfirmFn>((message, options) => {
    return new Promise((resolve) => {
      setPending({ message, resolve, ...options });
    });
  }, []);

  function settle(value: boolean) {
    pending?.resolve(value);
    setPending(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={() => settle(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-2xl bg-surface shadow-[var(--shadow-card)] border border-border p-6"
          >
            <button
              type="button"
              onClick={() => settle(false)}
              className="absolute right-4 top-4 text-text-muted hover:text-text-secondary"
            >
              <X size={18} />
            </button>

            <h2 className="text-base font-semibold text-text-primary mb-1 pr-6">
              {pending.title ?? "Please confirm"}
            </h2>
            <p className="text-sm text-text-secondary mb-5">{pending.message}</p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => settle(false)}
                className="flex-1 rounded-xl border border-border text-text-secondary text-sm font-medium py-2.5 hover:bg-gray-50 transition-colors"
              >
                {pending.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => settle(true)}
                className="flex-1 rounded-xl bg-primary-dark hover:bg-primary text-white text-sm font-semibold py-2.5 transition-colors"
              >
                {pending.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
