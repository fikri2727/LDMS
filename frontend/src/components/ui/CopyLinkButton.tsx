"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyLinkButton({ text, label = "Copy link" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API can be unavailable (e.g. insecure context) — fall back to
      // a hidden textarea + execCommand so the button still works.
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-xl border border-border text-sm font-medium px-3 py-1.5 text-text-secondary hover:bg-gray-50 transition-colors"
    >
      {copied ? (
        <>
          <Check size={14} className="text-primary-dark" /> Copied!
        </>
      ) : (
        <>
          <Copy size={14} /> {label}
        </>
      )}
    </button>
  );
}
