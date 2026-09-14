/**
 * Minimal isometric illustration for the login screen — a switchgear /
 * electrical-engineering scene (monitor, switchgear cabinet, distribution
 * stack, cloud, security shield) in soft greys with light blue accents.
 * Pure SVG, no external assets.
 */

// True-isometric projection: 1 world unit → screen (px).
function iso(x: number, y: number, z: number): [number, number] {
  return [(x - y) * 0.866, (x + y) * 0.5 - z];
}
const P = (x: number, y: number, z: number, ox: number, oy: number): string => {
  const [ix, iy] = iso(x, y, z);
  return `${ix + ox},${iy + oy}`;
};

/** Three visible faces of an axis-aligned box (a×b footprint, c tall) at offset. */
function Box({
  a,
  b,
  c,
  ox,
  oy,
  top = "#F4F6F9",
  left = "#E7EBF0",
  right = "#DEE3EA",
  stroke = "#CDD4DD",
}: {
  a: number;
  b: number;
  c: number;
  ox: number;
  oy: number;
  top?: string;
  left?: string;
  right?: string;
  stroke?: string;
}) {
  const p = (x: number, y: number, z: number) => P(x, y, z, ox, oy);
  return (
    <g strokeWidth={1.2} strokeLinejoin="round">
      <polygon points={[p(0, 0, 0), p(a, 0, 0), p(a, 0, c), p(0, 0, c)].join(" ")} fill={left} stroke={stroke} />
      <polygon points={[p(a, 0, 0), p(a, b, 0), p(a, b, c), p(a, 0, c)].join(" ")} fill={right} stroke={stroke} />
      <polygon points={[p(0, 0, c), p(a, 0, c), p(a, b, c), p(0, b, c)].join(" ")} fill={top} stroke={stroke} />
    </g>
  );
}

export function LoginIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 720 540" fill="none" className={className} role="img" aria-label="TAMCO systems illustration">
      <g transform="translate(372 262) scale(1.06)">
        {/* faint ground guides */}
        <g stroke="#DDE3EA" strokeWidth={1.2} opacity={0.7}>
          <line x1={-260} y1={40} x2={40} y2={-130} />
          <line x1={-120} y1={150} x2={230} y2={-45} />
          <line x1={-230} y1={110} x2={70} y2={-60} />
        </g>

        {/* connector lines between object bases */}
        <g strokeWidth={1.6} fill="none">
          <path d="M -150 96 L -40 30 L 90 96" stroke="#D3DAE2" />
          <path d="M -40 30 L -40 -60" stroke="#2F9AEF" strokeDasharray="2 5" opacity={0.55} />
          <circle cx={-150} cy={96} r={3.4} fill="#C6CED8" />
          <circle cx={90} cy={96} r={3.4} fill="#C6CED8" />
          <circle cx={-40} cy={30} r={4} fill="#2F9AEF" />
        </g>

        {/* ---- Monitor on pedestal (centre-back) ---- */}
        <Box a={120} b={110} c={12} ox={-38} oy={-58} />
        {(() => {
          const ox = 6;
          const oy = -70;
          const xs = 6; // screen plane
          const y0 = 6;
          const y1 = 104;
          const z0 = 12;
          const z1 = 128;
          const face = [P(xs, y0, z0, ox, oy), P(xs, y1, z0, ox, oy), P(xs, y1, z1, ox, oy), P(xs, y0, z1, ox, oy)].join(" ");
          const [Ox, Oy] = iso(xs, y0, z1);
          // local (u = +y dir, v = +z dir) → screen matrix
          const m = `matrix(-0.866 0.5 0 -1 ${Ox + ox} ${Oy + oy})`;
          const bar = (u: number, h: number) =>
            [
              P(xs, y0 + u, z0 + 6, ox, oy),
              P(xs, y0 + u + 16, z0 + 6, ox, oy),
              P(xs, y0 + u + 16, z0 + 6 + h, ox, oy),
              P(xs, y0 + u, z0 + 6 + h, ox, oy),
            ].join(" ");
          return (
            <g strokeLinejoin="round">
              {/* screen depth */}
              <polygon
                points={[P(0, y0, z0, ox, oy), P(xs, y0, z0, ox, oy), P(xs, y0, z1, ox, oy), P(0, y0, z1, ox, oy)].join(" ")}
                fill="#DDE3EA"
                stroke="#CDD4DD"
                strokeWidth={1.2}
              />
              <polygon points={face} fill="#FBFCFD" stroke="#CDD4DD" strokeWidth={1.4} />
              {/* header strip */}
              <polygon
                points={[
                  P(xs, y0 + 8, z1 - 14, ox, oy),
                  P(xs, y1 - 8, z1 - 14, ox, oy),
                  P(xs, y1 - 8, z1 - 6, ox, oy),
                  P(xs, y0 + 8, z1 - 6, ox, oy),
                ].join(" ")}
                fill="#EDF1F5"
              />
              <text transform={m} x={12} y={-88} fontSize={13} fontWeight={700} letterSpacing={1.5} fill="#2F9AEF">
                TAMCO
              </text>
              {/* faint text lines */}
              <g transform={m} stroke="#DBE1E8" strokeWidth={2}>
                <line x1={12} y1={-66} x2={70} y2={-66} />
                <line x1={12} y1={-56} x2={58} y2={-56} />
              </g>
              {/* chart bars */}
              <g strokeWidth={0}>
                <polygon points={bar(20, 34)} fill="#D7DEE6" />
                <polygon points={bar(42, 58)} fill="#8CC6F4" />
                <polygon points={bar(64, 46)} fill="#2F9AEF" />
              </g>
              {/* stand */}
              <polygon
                points={[P(2, 52, 0, ox, oy), P(4, 56, 0, ox, oy), P(4, 56, 14, ox, oy), P(2, 52, 14, ox, oy)].join(" ")}
                fill="#D2D9E1"
              />
            </g>
          );
        })()}

        {/* ---- Switchgear cabinet (front-left) ---- */}
        <Box a={92} b={92} c={10} ox={-196} oy={12} />
        <Box a={64} b={58} c={112} ox={-182} oy={-2} top="#F2F5F8" left="#E4E9EF" right="#D9DFE7" />
        {(() => {
          const ox = -182;
          const oy = -2;
          const a = 64;
          const slot = (z: number) =>
            [P(a, 6, z, ox, oy), P(a, 52, z, ox, oy), P(a, 52, z + 6, ox, oy), P(a, 6, z + 6, ox, oy)].join(" ");
          return (
            <g strokeWidth={0}>
              <polygon points={slot(22)} fill="#C4CCD6" />
              <polygon points={slot(44)} fill="#C4CCD6" />
              <polygon points={slot(66)} fill="#C4CCD6" />
              <polygon points={slot(88)} fill="#C4CCD6" />
              {/* status light */}
              <circle {...(() => { const [x, y] = iso(a, 12, 100); return { cx: x + ox, cy: y + oy }; })()} r={4} fill="#2F9AEF" />
            </g>
          );
        })()}

        {/* ---- Distribution stack (right) ---- */}
        <Box a={86} b={86} c={10} ox={70} oy={8} />
        <Box a={58} b={62} c={92} ox={84} oy={-4} top="#F2F5F8" left="#E5EAF0" right="#DAE0E8" />
        {(() => {
          const ox = 84;
          const oy = -4;
          const a = 58;
          const row = (z: number, blue: boolean) => (
            <g key={z}>
              <polygon
                points={[P(a, 6, z, ox, oy), P(a, 56, z, ox, oy), P(a, 56, z + 10, ox, oy), P(a, 6, z + 10, ox, oy)].join(" ")}
                fill="#EDF1F5"
                stroke="#D2D9E1"
                strokeWidth={1}
              />
              {[0, 1, 2, 3].map((i) => {
                const [x, y] = iso(a, 12 + i * 10, z + 5);
                return <circle key={i} cx={x + ox} cy={y + oy} r={2.4} fill={blue ? "#2F9AEF" : "#C2CAD4"} />;
              })}
            </g>
          );
          return (
            <g>
              {row(12, false)}
              {row(28, true)}
              {row(44, false)}
              {row(60, true)}
              {row(76, false)}
            </g>
          );
        })()}

        {/* ---- Cloud + upload (front-centre) ---- */}
        <Box a={70} b={70} c={10} ox={-70} oy={78} />
        <g transform="translate(-52 42)">
          <path
            d="M14 34c-9 0-16-7-16-15 0-8 6-14 14-15 3-9 11-15 21-15 12 0 21 9 22 21 8 1 13 7 13 15 0 8-7 15-16 15z"
            fill="#FBFCFD"
            stroke="#CDD4DD"
            strokeWidth={1.6}
          />
          <path d="M31 30 L31 12 M23 20 L31 12 L39 20" stroke="#2F9AEF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* ---- Security shield (far front-left) ---- */}
        <Box a={56} b={56} c={10} ox={-262} oy={92} />
        <g transform="translate(-250 42)">
          <path
            d="M22 2 4 9v20c0 15 10 25 18 29 8-4 18-14 18-29V9z"
            fill="#F2F5F8"
            stroke="#CDD4DD"
            strokeWidth={1.6}
          />
          <path d="M13 27 l6 6 12-13" stroke="#2F9AEF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>

        {/* ---- Blue capacitor cylinder (accent) ---- */}
        <g transform="translate(150 34)">
          <ellipse cx={0} cy={40} rx={13} ry={7} fill="#DCE7F1" />
          <path d="M-13 40 L-13 8 A13 7 0 0 0 13 8 L13 40 A13 7 0 0 1 -13 40Z" fill="#8CC6F4" />
          <ellipse cx={0} cy={8} rx={13} ry={7} fill="#2F9AEF" />
        </g>
      </g>
    </svg>
  );
}
