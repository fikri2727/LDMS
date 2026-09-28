"use client";

import { useEffect, useRef, useState } from "react";

export function ProgressRing({
  percent,
  size = 56,
  strokeWidth = 5,
  color = "#46bea2",
  trackColor = "#e5eaec",
  label,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(0);
  const target = Math.max(0, Math.min(100, Math.round(percent)));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      const id = window.setTimeout(() => setAnimated(target), 0);
      return () => window.clearTimeout(id);
    }

    let started = false;
    function animate() {
      if (started) return;
      started = true;
      const start = performance.now();
      const duration = 1200;
      function tick(now: number) {
        const elapsed = now - start;
        const t = Math.min(1, elapsed / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setAnimated(Math.round(eased * target));
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);

    // Safety net: some environments (or elements already in view before the
    // observer attaches) never fire a callback — guarantee the value still
    // reaches its target instead of staying frozen at 0.
    const fallback = window.setTimeout(animate, 600);

    // Hard guarantee independent of rAF/IntersectionObserver ever firing at
    // all — some environments suspend both, which would otherwise leave the
    // ring permanently stuck at 0.
    const hardGuarantee = window.setTimeout(() => setAnimated(target), 2200);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
      window.clearTimeout(hardGuarantee);
    };
  }, [target]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animated / 100) * circumference;

  return (
    <div ref={ref} className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 120ms linear" }}
        />
      </svg>
      <span className="absolute text-xs font-semibold text-text-secondary">{label ?? `${animated}%`}</span>
    </div>
  );
}
