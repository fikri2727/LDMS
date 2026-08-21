"use client";

import { BarChart, Bar, Cell, LabelList, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from "recharts";

export function DepartmentBarChart({
  data,
  metric,
  target,
}: {
  data: { department: string; manHour: number; avgHour: number }[];
  metric: "manHour" | "avgHour";
  /** Renders a dashed reference line + colors bars green/red against this value (e.g. the annual per-department hour target). */
  target?: number;
}) {
  // Fixed step-of-8 ticks (8/16/24/32...) instead of recharts' auto-scale,
  // which produced degenerate ticks (e.g. a stray ~1e8 tick) once the target
  // reference line sat far above the actual bar values.
  const TICK_STEP = 8;
  let xDomain: [number, number] | undefined;
  let xTicks: number[] | undefined;
  if (target != null) {
    const dataMax = data.reduce((m, d) => Math.max(m, d[metric]), 0);
    const topValue = Math.max(target, dataMax);
    const maxTick = Math.max(TICK_STEP * 4, Math.ceil(topValue / TICK_STEP) * TICK_STEP);
    xDomain = [0, maxTick];
    xTicks = Array.from({ length: maxTick / TICK_STEP + 1 }, (_, i) => i * TICK_STEP);
  }

  return (
    <div style={{ height: Math.max(220, data.length * 44) }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 36, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5EAEC" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#8A8D94" }}
            axisLine={false}
            tickLine={false}
            domain={xDomain}
            ticks={xTicks}
          />
          <YAxis
            type="category"
            dataKey="department"
            tick={{ fontSize: 11, fill: "#4E5057" }}
            axisLine={false}
            tickLine={false}
            width={110}
          />
          <Tooltip formatter={(value) => `${Number(value).toLocaleString()}h`} cursor={{ fill: "rgba(70,190,162,0.06)" }} />
          {target != null && (
            <ReferenceLine
              x={target}
              stroke="#6D3ECD"
              strokeDasharray="5 4"
              strokeWidth={1.5}
              label={{ value: `Target ${target}h`, position: "insideTopRight", fill: "#6D3ECD", fontSize: 11 }}
            />
          )}
          <Bar dataKey={metric} radius={[0, 10, 10, 0]} maxBarSize={18} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={target != null ? (d[metric] >= target ? "#1D8E72" : "#dc2626") : "#46BEA2"} />
            ))}
            <LabelList
              dataKey={metric}
              position="right"
              formatter={(value: unknown) => `${value ?? 0}h`}
              style={{ fontSize: 11, fill: "#4E5057", fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
