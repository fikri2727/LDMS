"use client";

import { useEffect, useRef, useState } from "react";

export function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = window.setTimeout(() => setDisplay(value), 0);
      return () => window.clearTimeout(id);
    }
    let started = false;
    function animate() {
      if (started) return;
      started = true;
      const start = performance.now();
      const duration = 900;
      function tick(now: number) {
        const t = Math.min(1, (now - start) / duration);
        setDisplay(Math.round((1 - Math.pow(1 - t, 3)) * value));
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

    // Safety net: guarantee the count-up still resolves even if the
    // intersection callback never fires in a given environment.
    const fallback = window.setTimeout(animate, 600);

    // Hard guarantee independent of rAF/IntersectionObserver ever firing at
    // all — some environments suspend both, which would otherwise leave the
    // number permanently stuck at 0.
    const hardGuarantee = window.setTimeout(() => setDisplay(value), 1800);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
      window.clearTimeout(hardGuarantee);
    };
  }, [value]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}
