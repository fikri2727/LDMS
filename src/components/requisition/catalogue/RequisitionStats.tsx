import { ClipboardList, Clock, CheckCircle2, XCircle } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";

export function RequisitionStats({
  total,
  pending,
  approved,
  rejected,
}: {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <StatCard icon={ClipboardList} label="Total Applications" value={total} accent="#8A8D94" />
      <StatCard icon={Clock} label="Pending" value={pending} accent="#6D3ECD" />
      <StatCard icon={CheckCircle2} label="Approved" value={approved} accent="#1D8E72" />
      <StatCard icon={XCircle} label="Rejected" value={rejected} accent="#e11d48" />
    </div>
  );
}
