"use client";

import { logout } from "@/app/logout/actions";

export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logout}>
      <button
        type="submit"
        className={className ?? "text-sm text-white/70 hover:text-white transition-colors"}
      >
        Sign out
      </button>
    </form>
  );
}
