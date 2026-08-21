"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface Slice {
  name: string;
  value: number;
  color: string;
}

export function TnaSummaryPie({ data }: { data: Slice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-text-muted">
        No data yet.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mb-2 text-xs text-text-secondary">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
            {d.name}
          </div>
        ))}
      </div>
      <div className="h-64">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={95}
              labelLine={false}
              isAnimationActive={false}
              label={({ percent }) => `${((percent ?? 0) * 100).toFixed(2)}%`}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} stroke="#fff" strokeWidth={1} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value} (${((Number(value) / total) * 100).toFixed(2)}%)`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
