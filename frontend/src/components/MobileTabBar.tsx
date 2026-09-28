"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { FileText, GraduationCap, House, Laptop } from "lucide-react";

const TABS = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/training", label: "Training", icon: GraduationCap },
  { href: "/elearning", label: "E-Learning", icon: Laptop },
  { href: "/requisition", label: "Requisition", icon: FileText },
];

/**
 * Phone navigation: a floating pill at the bottom centre (Instagram-style).
 * Four main sections + the profile button, which opens the full menu sheet.
 * Hidden on desktop (lg+), where the sidebar is used.
 */
export function MobileTabBar({
  initials,
  menuOpen,
  onMenu,
}: {
  initials: string;
  menuOpen: boolean;
  onMenu: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      // Below page pop-ups (z-50) normally; above the menu sheet while it's open so the
      // profile button can close it again.
      className={clsx(
        "lg:hidden fixed inset-x-0 flex justify-center pointer-events-none",
        menuOpen ? "z-[60]" : "z-30"
      )}
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border/70 bg-surface/85 px-2 py-1.5 shadow-[0_8px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = !menuOpen && (pathname === href || pathname.startsWith(href + "/"));
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex h-11 items-center justify-center rounded-full transition-all duration-200",
                active ? "bg-primary/12 px-4 text-primary-dark" : "w-12 text-text-secondary active:scale-90"
              )}
            >
              <Icon size={22} className={clsx(active && "stroke-[2.4]")} />
              {active && <span className="ml-1.5 text-xs font-semibold">{label}</span>}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMenu}
          aria-label="Menu and profile"
          aria-expanded={menuOpen}
          className="flex h-11 w-12 items-center justify-center rounded-full active:scale-90 transition-transform"
        >
          <span
            className={clsx(
              "flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold transition-shadow",
              menuOpen
                ? "bg-primary-dark text-white ring-2 ring-primary/30 ring-offset-2 ring-offset-surface"
                : "bg-primary-soft text-primary-dark"
            )}
          >
            {initials}
          </span>
        </button>
      </div>
    </nav>
  );
}
