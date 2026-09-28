"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#46BEA2", "#6D3ECD", "#8A8D94"];

export function PublicOjtPie({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center justify-center gap-8 h-full py-2">
      <div className="w-32 h-32 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={32} outerRadius={58} strokeWidth={2} stroke="#fff">
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${Number(value).toLocaleString()} man-hours`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-text-secondary">{d.name}</span>
            <span className="text-text-muted tabular-nums">
              {d.value.toLocaleString()}h{total > 0 && ` (${Math.round((d.value / total) * 100)}%)`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
