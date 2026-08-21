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
    <div className="mt-4 pt-4 border-t border-border">
      <p className="text-sm font-semibold text-text-primary mb-2">Department {departmentName}</p>
      <div className="space-y-1 text-sm">
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
