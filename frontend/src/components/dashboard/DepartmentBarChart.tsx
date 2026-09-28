"use client";

import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from "recharts";

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
  let yDomain: [number, number] | undefined;
  let yTicks: number[] | undefined;
  if (target != null) {
    const dataMax = data.reduce((m, d) => Math.max(m, d[metric]), 0);
    const topValue = Math.max(target, dataMax);
    const maxTick = Math.max(TICK_STEP * 4, Math.ceil(topValue / TICK_STEP) * TICK_STEP);
    yDomain = [0, maxTick];
    yTicks = Array.from({ length: maxTick / TICK_STEP + 1 }, (_, i) => i * TICK_STEP);
  }

  return (
    <div className="h-full min-h-[220px]">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5EAEC" vertical={false} />
          <XAxis
            dataKey="department"
            tick={{ fontSize: 11, fill: "#8A8D94" }}
            axisLine={{ stroke: "#E5EAEC" }}
            tickLine={false}
            angle={-45}
            textAnchor="end"
            interval={0}
            height={60}
          />
          <YAxis
            type="number"
            tick={{ fontSize: 11, fill: "#8A8D94" }}
            axisLine={false}
            tickLine={false}
            domain={yDomain}
            ticks={yTicks}
          />
          <Tooltip formatter={(value) => `${Number(value).toLocaleString()}h`} cursor={{ fill: "rgba(70,190,162,0.06)" }} />
          {target != null && (
            <ReferenceLine
              y={target}
              stroke="#6D3ECD"
              strokeDasharray="5 4"
              strokeWidth={1.5}
              label={{ value: `Target ${target}h`, position: "insideTopRight", fill: "#6D3ECD", fontSize: 11 }}
            />
          )}
          <Bar
            dataKey={metric}
            radius={[6, 6, 0, 0]}
            maxBarSize={36}
            minPointSize={2}
            isAnimationActive={false}
            background={{ fill: "#F2F6F8", radius: 6 }}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={target != null ? (d[metric] >= target ? "#1D8E72" : "#dc2626") : "#46BEA2"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
