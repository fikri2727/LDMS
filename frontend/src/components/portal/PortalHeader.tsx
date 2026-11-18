import Image from "next/image";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";

/** Top bar for the TAMCO home screen and the HR Master (pages outside LDMS). */
export function PortalHeader({
  title,
  staffName,
  staffNo,
  showApps = true,
}: {
  title: string;
  staffName: string;
  staffNo: string;
  showApps?: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/home" aria-label="TAMCO home" className="shrink-0">
          <Image src="/tamco-logo.png" alt="TAMCO" width={1024} height={305} priority unoptimized className="h-7 w-auto" />
        </Link>
        <span className="hidden sm:block h-6 w-px bg-border" />
        <span className="text-sm font-medium text-text-primary truncate">{title}</span>
        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          {showApps && (
            <Link
              href="/home"
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-gray-50"
            >
              <LayoutGrid size={14} /> All apps
            </Link>
          )}
          <span className="hidden md:block text-right leading-tight">
            <span className="block text-sm font-medium text-text-primary">{staffName}</span>
            <span className="block text-xs text-text-muted">{staffNo}</span>
          </span>
          <LogoutButton className="text-sm text-rose-600 hover:text-rose-700" />
        </div>
      </div>
    </header>
  );
}
