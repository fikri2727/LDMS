function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "T";
}

export function TopTrainersTable({ data }: { data: { trainer: string; totalHour: number }[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-text-muted text-xs uppercase tracking-wide">
        <tr>
          <th className="pb-2.5 font-medium">Trainer</th>
          <th className="pb-2.5 font-medium text-right">Total Hours</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {data.map((d, i) => (
          <tr key={d.trainer}>
            <td className="py-2.5">
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex items-center justify-center h-7 w-7 rounded-full text-white text-[10px] font-semibold shrink-0 ${
                    i % 2 === 0 ? "bg-primary-dark" : "bg-purple"
                  }`}
                >
                  {initials(d.trainer)}
                </span>
                <span className="text-text-primary font-medium">{d.trainer}</span>
              </div>
            </td>
            <td className="py-2.5 text-right text-text-secondary tabular-nums">{d.totalHour}</td>
          </tr>
        ))}
        {data.length === 0 && (
          <tr>
            <td colSpan={2} className="py-8 text-center text-text-muted">
              No data for this period.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
