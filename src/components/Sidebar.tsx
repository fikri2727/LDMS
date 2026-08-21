"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Building2,
  Laptop,
  ClipboardList,
  ClipboardCheck,
  ChevronDown,
  FileText,
} from "lucide-react";

interface NavChild {
  href: string;
  label: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children?: NavChild[];
}

export function Sidebar({
  canManageStaff,
  canManageOrg,
  canManageTraining,
  canManageOjt,
  canManageElearning,
  canManageTna,
  isSupervisor,
  isElearningCreator,
}: {
  canManageStaff: boolean;
  canManageOrg: boolean;
  canManageTraining: boolean;
  canManageOjt: boolean;
  canManageElearning: boolean;
  canManageTna: boolean;
  isSupervisor?: boolean;
  isElearningCreator?: boolean;
}) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ...(canManageStaff ? [{ href: "/staff", label: "Staff List", icon: Users }] : []),
    {
      href: "/training",
      label: canManageTraining ? "Training Records" : "My Training",
      icon: GraduationCap,
      children: canManageTraining
        ? [
            { href: "/training/public", label: "Public / Inhouse" },
            { href: "/training/ojt", label: "OJT" },
            { href: "/training/elearning-hours", label: "E-Learning Records" },
            { href: "/training/pme", label: "PME" },
          ]
        : canManageOjt
          ? [
              { href: "/training", label: "My Training" },
              { href: "/training/ojt", label: "OJT" },
              ...(isSupervisor ? [{ href: "/training/pme", label: "PME" }] : []),
            ]
          : undefined,
    },
    // A plain staff member who is also a supervisor gets PME as its own
    // top-level item (not nested under My Training) — they're two distinct
    // things to them: their own training, and evaluating their supervisees'.
    ...(!canManageTraining && !canManageOjt && isSupervisor
      ? [{ href: "/training/pme", label: "PME", icon: ClipboardCheck }]
      : []),
    {
      href: "/tna",
      label: "Training Need Analysis",
      icon: ClipboardList,
      children: canManageTna
        ? [
            { href: "/tna", label: "Completion Department" },
            { href: "/tna/customize", label: "Customize Training" },
          ]
        : undefined,
    },
    {
      href: "/elearning",
      label: "E-Learning",
      icon: Laptop,
      children: canManageElearning
        ? [
            ...(isElearningCreator ? [{ href: "/elearning/learner", label: "My Learning" }] : []),
            { href: "/elearning/admin", label: "Module Analytics" },
            { href: "/elearning/admin/modules/new", label: "Create Module" },
          ]
        : undefined,
    },
    { href: "/requisition", label: "Staff Training Requisition", icon: FileText },
    ...(canManageOrg ? [{ href: "/organization", label: "Organization", icon: Building2 }] : []),
  ];

  const [openHref, setOpenHref] = useState<string | null>(
    items.find((item) => item.children && pathname.startsWith(item.href))?.href ?? null
  );

  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;

        if (item.children) {
          const open = openHref === item.href;
          return (
            <div key={item.href}>
              <button
                type="button"
                onClick={() => setOpenHref(open ? null : item.href)}
                className={clsx(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary-dark"
                    : "text-text-secondary hover:bg-gray-50 hover:text-text-primary"
                )}
              >
                <Icon size={18} />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown size={15} className={clsx("transition-transform", open && "rotate-180")} />
              </button>
              {open && (
                <div className="mt-1 ml-4 flex flex-col gap-0.5 border-l border-border pl-4">
                  {item.children.map((child) => {
                    const childActive =
                      child.href === item.href
                        ? pathname === child.href
                        : pathname === child.href || pathname.startsWith(child.href + "/");
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={clsx(
                          "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                          childActive
                            ? "bg-primary/10 text-primary-dark"
                            : "text-text-muted hover:bg-gray-50 hover:text-text-primary"
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary-dark"
                : "text-text-secondary hover:bg-gray-50 hover:text-text-primary"
            )}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
