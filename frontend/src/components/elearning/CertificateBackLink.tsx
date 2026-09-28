"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * The certificate page is reachable from both "My Learning" (elearning catalogue)
 * and "My Training" (the combined training list) — a hardcoded destination would
 * send half of those visitors somewhere they didn't come from, so this goes back
 * to whichever page actually linked here.
 */
export function CertificateBackLink() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-4 print:hidden"
    >
      <ArrowLeft size={15} /> Back
    </button>
  );
}
