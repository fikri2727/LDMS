export function DepartmentHourSummary({
  departmentName,
  staffCount,
  totalNeeded,
  currentHours,
}: {
  departmentName: string;
  staffCount: number;
  totalNeeded: number;
  currentHours: number;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-text-primary mb-1">{departmentName}</p>
      <div className="space-y-0.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-text-muted">Total Staff</span>
          <span className="font-medium text-text-primary">{staffCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-muted">Total Hours Needed by Department</span>
          <span className="font-medium text-text-primary">{totalNeeded} Hours</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-muted">Balance Hours Needed by Department</span>
          <span className="font-medium text-text-primary">{Math.max(0, totalNeeded - currentHours)} Hours</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-muted">Current Total Hours</span>
          <span className="font-medium text-text-primary">{currentHours} hours</span>
        </div>
      </div>
    </div>
  );
}
