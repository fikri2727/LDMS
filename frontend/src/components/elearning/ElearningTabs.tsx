"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const TABS = [
  { href: "/elearning/admin", label: "Module Analytics" },
  { href: "/elearning/admin/modules/new", label: "Create Module" },
];

export function ElearningTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-border">
      {TABS.map((tab) => {
        const active =
          tab.href === "/elearning/admin"
            ? pathname === "/elearning/admin" || /^\/elearning\/admin\/modules\/\d+/.test(pathname)
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              active
                ? "border-primary text-primary-dark"
                : "border-transparent text-text-muted hover:text-text-secondary"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
