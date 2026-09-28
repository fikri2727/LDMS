"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function MonthlyCostChart({ data }: { data: { month: string; cost: number }[] }) {
  return (
    <div className="h-full min-h-[144px]">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5EAEC" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8A8D94" }} axisLine={{ stroke: "#E5EAEC" }} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#8A8D94" }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(value) => `RM ${Number(value).toLocaleString()}`} cursor={{ fill: "rgba(109,62,205,0.06)" }} />
          <Bar dataKey="cost" fill="#6D3ECD" radius={[6, 6, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
