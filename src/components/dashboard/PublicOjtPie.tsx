"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#46BEA2", "#6D3ECD", "#8A8D94"];

export function PublicOjtPie({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-6">
      <div className="flex-1 space-y-4 min-w-0">
        {data.map((d, i) => {
          const percent = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <div key={d.name}>
              <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="truncate">{d.name}</span>
              </div>
              <p className="text-xl font-semibold text-text-primary leading-tight">{percent}%</p>
              <p className="text-xs text-text-muted tabular-nums">{d.value.toLocaleString()}h</p>
            </div>
          );
        })}
      </div>
      <div className="relative w-36 h-36 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={44} outerRadius={68} strokeWidth={2} stroke="#fff">
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${Number(value).toLocaleString()} man-hours`} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-semibold text-text-primary">{total.toLocaleString()}</span>
          <span className="text-[10px] text-text-muted">Total Hours</span>
        </div>
      </div>
    </div>
  );
}
