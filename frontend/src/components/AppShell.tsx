"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { KeyRound } from "lucide-react";
import clsx from "clsx";
import { Sidebar } from "@/components/Sidebar";
import { UserMenu } from "@/components/UserMenu";
import { LogoutButton } from "@/components/LogoutButton";
import { MobileTabBar } from "@/components/MobileTabBar";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

export function AppShell({
  canManageStaff,
  canManageOrg,
  canManageTraining,
  canManageOjt,
  canManageElearning,
  canManageTna,
  isSupervisor,
  isElearningCreator,
  staffName,
  staffNo,
  roleLabel,
  children,
}: {
  canManageStaff: boolean;
  canManageOrg: boolean;
  canManageTraining: boolean;
  canManageOjt: boolean;
  canManageElearning: boolean;
  canManageTna: boolean;
  isSupervisor?: boolean;
  isElearningCreator?: boolean;
  staffName: string;
  staffNo: string;
  roleLabel: string;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close the phone menu sheet whenever navigation happens (link click, back/forward, etc.) —
  // adjusted during render (not an effect) per https://react.dev/learn/you-might-not-need-an-effect.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const sidebar = (
    <Sidebar
      canManageStaff={canManageStaff}
      canManageOrg={canManageOrg}
      canManageTraining={canManageTraining}
      canManageOjt={canManageOjt}
      canManageElearning={canManageElearning}
      canManageTna={canManageTna}
      isSupervisor={isSupervisor}
      isElearningCreator={isElearningCreator}
    />
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ---------- Phone: slim top bar ---------- */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 flex items-center gap-3 bg-surface/90 backdrop-blur-md border-b border-border px-4">
        <Link href="/dashboard" aria-label="Go to dashboard">
          <Image src="/tamco-logo.png" alt="TAMCO" width={1024} height={305} unoptimized className="h-5 w-auto" />
        </Link>
        <span className="text-text-primary text-sm font-medium">L&D Management</span>
      </div>

      {/* ---------- Desktop: sidebar ---------- */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-surface border-r border-border flex-col overflow-y-auto">
        <div className="px-5 py-6 flex flex-col items-center">
          <Link href="/dashboard" aria-label="Go to dashboard">
            <Image
              src="/tamco-logo.png"
              alt="TAMCO"
              width={1024}
              height={305}
              priority
              unoptimized
              className="h-12 w-auto"
            />
          </Link>
          <p className="text-text-muted text-xs mt-2">L&D Management</p>
        </div>
        {sidebar}
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="hidden lg:flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-6">
          <div />
          <UserMenu staffName={staffName} staffNo={staffNo} roleLabel={roleLabel} />
        </header>
        <main className="flex-1 bg-[var(--background)] overflow-y-auto overflow-x-auto pt-14 lg:pt-0">
          {/* Extra bottom space on phones so the floating tab bar never covers content. */}
          <div className="p-4 sm:p-5 h-full pb-[calc(env(safe-area-inset-bottom)+6.5rem)] lg:pb-5">{children}</div>
        </main>
      </div>

      {/* ---------- Phone: full menu as a bottom sheet (opened from the profile button) ---------- */}
      <div
        className={clsx(
          "lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setMenuOpen(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={clsx(
          "lg:hidden fixed inset-x-0 bottom-0 z-50 max-h-[85vh] flex flex-col rounded-t-3xl bg-surface shadow-[0_-10px_40px_rgba(15,23,42,0.18)]",
          "transition-transform duration-300 ease-out",
          menuOpen ? "translate-y-0" : "translate-y-full"
        )}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
        inert={!menuOpen}
      >
        <div className="flex justify-center pt-3 pb-1">
          <span className="h-1.5 w-10 rounded-full bg-gray-200" />
        </div>
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
          <span className="flex items-center justify-center h-10 w-10 rounded-full bg-primary-soft text-primary-dark text-sm font-semibold shrink-0">
            {initials(staffName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-text-primary leading-tight truncate">{staffName}</span>
            <span className="block text-xs text-text-muted leading-tight">
              {staffNo} · {roleLabel}
            </span>
          </span>
        </div>
        <div className="flex-1 overflow-y-auto py-3">{sidebar}</div>
        <div className="px-3 pt-2 border-t border-border">
          <Link
            href="/account"
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-text-secondary hover:bg-gray-50 hover:text-text-primary transition-colors"
          >
            <KeyRound size={16} /> Change Password
          </Link>
          <LogoutButton className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-left text-rose-600 hover:bg-rose-50 transition-colors" />
        </div>
      </div>

      <MobileTabBar initials={initials(staffName)} menuOpen={menuOpen} onMenu={() => setMenuOpen((o) => !o)} />
    </div>
  );
}
