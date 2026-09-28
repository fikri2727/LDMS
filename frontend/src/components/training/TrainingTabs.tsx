"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export function TrainingTabs({
  manage,
  ojtManage,
  isSupervisor,
}: {
  manage: boolean;
  ojtManage?: boolean;
  isSupervisor?: boolean;
}) {
  const pathname = usePathname();

  const tabs = manage
    ? [
        { href: "/training/public", label: "Public / Inhouse" },
        { href: "/training/ojt", label: "OJT" },
        { href: "/training/elearning-hours", label: "E-Learning Records" },
        { href: "/training/pme", label: "PME" },
      ]
    : [
        { href: "/training", label: "My Training" },
        ...(ojtManage ? [{ href: "/training/ojt", label: "OJT" }] : []),
        ...(isSupervisor ? [{ href: "/training/pme", label: "PME" }] : []),
      ];

  return (
    <div className="flex gap-1 border-b border-border">
      {tabs.map((tab) => {
        const active = tab.href === "/training" ? pathname === "/training" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              active
                ? "border-primary-dark text-primary-dark"
                : "border-transparent text-text-muted hover:text-text-primary"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
