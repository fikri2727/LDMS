import { ClipboardList, Clock, CheckCircle2, FlagTriangleRight, XCircle } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";

export function RequisitionStats({
  total,
  pending,
  approved,
  completed,
  rejected,
}: {
  total: number;
  pending: number;
  approved: number;
  completed: number;
  rejected: number;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      <StatCard icon={ClipboardList} label="Total Applications" value={total} accent="#8A8D94" />
      <StatCard icon={Clock} label="Pending" value={pending} accent="#6D3ECD" />
      <StatCard icon={CheckCircle2} label="Approved" value={approved} accent="#1D8E72" />
      <StatCard icon={FlagTriangleRight} label="Completed" value={completed} accent="#2563EB" />
      <StatCard icon={XCircle} label="Rejected" value={rejected} accent="#e11d48" />
    </div>
  );
}
