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
    <div className="mt-1.5 pt-1.5 border-t border-border">
      <p className="text-sm font-semibold text-text-primary mb-1">Department {departmentName}</p>
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
          <span className="text-text-muted">Current Total Hours</span>
          <span className="font-medium text-text-primary">{currentHours} hours</span>
        </div>
      </div>
    </div>
  );
}
