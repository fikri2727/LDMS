import { UserCog } from "lucide-react";

/** Shown above an evaluation form an admin is filling in for someone else. */
export function OnBehalfBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 max-w-2xl flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <UserCog size={18} className="mt-0.5 shrink-0 text-amber-600" />
      <div>{children}</div>
    </div>
  );
}
