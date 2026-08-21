"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function MonthlyHoursChart({ data }: { data: { month: string; hours: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5EAEC" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8A8D94" }} axisLine={{ stroke: "#E5EAEC" }} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#8A8D94" }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(value) => `${Number(value).toLocaleString()} hours`} cursor={{ fill: "rgba(70,190,162,0.08)" }} />
          <Bar dataKey="hours" fill="#46BEA2" radius={[6, 6, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
