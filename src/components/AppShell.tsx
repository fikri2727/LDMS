"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import clsx from "clsx";
import { Sidebar } from "@/components/Sidebar";
import { UserMenu } from "@/components/UserMenu";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever navigation happens (link click, back/forward, etc.) —
  // adjusted during render (not an effect) per https://react.dev/learn/you-might-not-need-an-effect.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 flex items-center gap-3 bg-surface border-b border-border px-4">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="text-text-secondary p-1.5 -ml-1.5 rounded-lg hover:bg-gray-50"
        >
          <Menu size={22} />
        </button>
        <Image src="/tamco-logo.png" alt="TAMCO" width={1024} height={305} unoptimized className="h-5 w-auto" />
        <span className="text-text-primary text-sm font-medium">L&D Management</span>
      </div>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={clsx(
          "w-64 shrink-0 bg-surface border-r border-border flex flex-col overflow-y-auto",
          "fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-out",
          "lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-5 py-6 flex flex-col items-center relative">
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="lg:hidden absolute right-3 top-3 text-text-muted hover:text-text-primary p-1"
          >
            <X size={18} />
          </button>
          <Image
            src="/tamco-logo.png"
            alt="TAMCO"
            width={1024}
            height={305}
            priority
            unoptimized
            className="h-8 w-auto"
          />
          <p className="text-text-muted text-xs mt-2">L&D Management</p>
        </div>
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
        {/* On desktop this same profile access moves into the header instead — see below. */}
        <div className="lg:hidden mt-auto px-3 py-4 border-t border-border">
          <UserMenu staffName={staffName} staffNo={staffNo} roleLabel={roleLabel} />
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="hidden lg:flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-6">
          <div />
          <UserMenu staffName={staffName} staffNo={staffNo} roleLabel={roleLabel} />
        </header>
        <main className="flex-1 bg-[var(--background)] overflow-y-auto overflow-x-auto pt-14 lg:pt-0">
          <div className="p-6 sm:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
