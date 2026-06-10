"use client";

// ============================================================================
// PolisAI — Landing hero: a live miniature city simulation
// ----------------------------------------------------------------------------
// A glowing isometric skyline with twinkling building windows, cars streaming
// the avenues, citizens strolling, and ambient particles rising. Pure SVG +
// Framer Motion, deterministic (SSR-safe), self-contained.
// ============================================================================

import { motion } from "framer-motion";

type P = { x: number; y: number };

const TW = 58;
const TH = 29;
const OX = 450;
const OY = 116;
const giso = (c: number, r: number): P => ({ x: OX + (c - r) * (TW / 2), y: OY + (c + r) * (TH / 2) });
const attr = (pts: P[]) => pts.map((p) => `${Math.round(p.x * 10) / 10},${Math.round(p.y * 10) / 10}`).join(" ");

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GRID = 8;
const ACCENTS = ["#2DE0D6", "#4D7CFF", "#9D7BFF", "#FFD27A", "#34E5A0"];

type Lot = { c: number; r: number; h: number; accent: string; depth: number; twinkle: boolean; phase: number };

const LOTS: Lot[] = (() => {
  const rng = mulberry32(0xc1771a);
  const mid = (GRID - 1) / 2;
  const out: Lot[] = [];
  for (let c = 0; c < GRID; c++) {
    for (let r = 0; r < GRID; r++) {
      if (rng() < 0.1) continue; // plaza gap
      const dist = Math.hypot(c - mid, r - mid);
      const tall = rng() < 0.18;
      const h = Math.max(26, (tall ? 120 + rng() * 80 : 32 + rng() * 64) * (1 - dist * 0.045));
      out.push({ c, r, h, accent: ACCENTS[Math.floor(rng() * ACCENTS.length)], depth: c + r, twinkle: rng() < 0.5, phase: rng() * 6.28 });
    }
  }
  return out.sort((a, b) => a.depth - b.depth);
})();

const carPath = (fixed: number, axis: "row" | "col"): P[] => {
  const pts: P[] = [];
  for (let k = 0; k <= GRID; k += 0.5) pts.push(axis === "row" ? giso(k, fixed + 0.5) : giso(fixed + 0.5, k));
  return pts;
};

const CARS = [
  { id: 0, pts: carPath(2, "row"), color: "#2DE0D6", dur: 7, delay: 0 },
  { id: 1, pts: carPath(5, "row"), color: "#FFD27A", dur: 9, delay: 1.4 },
  { id: 2, pts: carPath(2, "col"), color: "#4D7CFF", dur: 8, delay: 0.7 },
  { id: 3, pts: carPath(5, "col"), color: "#9D7BFF", dur: 10, delay: 2.1 },
  { id: 4, pts: carPath(4, "row"), color: "#34E5A0", dur: 8.5, delay: 1.1 },
];

const CITIZENS = (() => {
  const rng = mulberry32(0x5ad12);
  return Array.from({ length: 16 }, (_, i) => {
    const onRow = rng() < 0.5;
    const lane = 1 + Math.floor(rng() * (GRID - 1));
    const a = rng() * GRID;
    const b = rng() * GRID;
    const pts = onRow ? [giso(a, lane + 0.5), giso(b, lane + 0.5)] : [giso(lane + 0.5, a), giso(lane + 0.5, b)];
    return { id: i, pts, color: ACCENTS[i % ACCENTS.length], dur: 9 + rng() * 8, delay: rng() * 6 };
  });
})();

const PARTICLES = (() => {
  const rng = mulberry32(0x9f2c);
  return Array.from({ length: 18 }, (_, i) => ({ id: i, x: 120 + rng() * 660, y: 120 + rng() * 320, dur: 8 + rng() * 8, delay: rng() * 8, r: 0.8 + rng() * 1.6 }));
})();

function Building({ lot }: { lot: Lot }) {
  const A = giso(lot.c, lot.r);
  const B = giso(lot.c + 1, lot.r);
  const C = giso(lot.c + 1, lot.r + 1);
  const D = giso(lot.c, lot.r + 1);
  const up = (p: P): P => ({ x: p.x, y: p.y - lot.h });

  // windows on the front-right face
  const floors = Math.min(9, Math.floor(lot.h / 15));
  const cols = 2;
  const edge = (fx: number): P => ({ x: B.x + (C.x - B.x) * fx, y: B.y + (C.y - B.y) * fx });
  const pt = (fx: number, yf: number): P => ({ x: edge(fx).x, y: edge(fx).y - yf * lot.h });
  const windows: P[][] = [];
  for (let f = 0; f < floors; f++) {
    for (let k = 0; k < cols; k++) {
      const fx0 = (k + 0.22) / cols;
      const fx1 = (k + 0.78) / cols;
      const yb = (f + 0.22) / floors;
      const yt = (f + 0.74) / floors;
      windows.push([pt(fx0, yb), pt(fx1, yb), pt(fx1, yt), pt(fx0, yt)]);
    }
  }

  return (
    <g>
      <polygon points={attr([D, C, up(C), up(D)])} fill="#070E1B" />
      <polygon points={attr([B, C, up(C), up(B)])} fill="#0B1426" />
      <polygon points={attr([up(A), up(B), up(C), up(D)])} fill="#14223C" stroke={lot.accent} strokeOpacity={0.5} strokeWidth={0.8} />
      {/* neon top ridge */}
      <line x1={up(B).x} y1={up(B).y} x2={up(C).x} y2={up(C).y} stroke={lot.accent} strokeWidth={1.4} strokeOpacity={0.9} />
      {/* glowing windows */}
      <motion.g
        fill={lot.accent}
        animate={lot.twinkle ? { opacity: [0.55, 0.95, 0.4, 0.85, 0.55] } : undefined}
        transition={lot.twinkle ? { duration: 5 + (lot.phase % 3), repeat: Infinity, ease: "easeInOut", delay: lot.phase * 0.4 } : undefined}
        style={{ opacity: lot.twinkle ? undefined : 0.78 }}
      >
        {windows.map((w, i) => (
          <polygon key={i} points={attr(w)} />
        ))}
      </motion.g>
    </g>
  );
}

export function MiniCity({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 900 620" className={className} preserveAspectRatio="xMidYMax meet">
      <defs>
        <radialGradient id="mc-floor" cx="50%" cy="58%" r="46%">
          <stop offset="0%" stopColor="#1BE3D6" stopOpacity="0.4" />
          <stop offset="55%" stopColor="#2F6BFF" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#2F6BFF" stopOpacity="0" />
        </radialGradient>
        <filter id="mc-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="mc-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* ground glow / reflection */}
      <ellipse cx={450} cy={380} rx={400} ry={150} fill="url(#mc-floor)" />

      {/* ambient particles */}
      <g fill="#9FE9F0">
        {PARTICLES.map((p) => (
          <motion.circle
            key={p.id}
            cx={p.x}
            r={p.r}
            initial={{ y: p.y, opacity: 0 }}
            animate={{ y: p.y - 120, opacity: [0, 0.7, 0] }}
            transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "easeOut" }}
          />
        ))}
      </g>

      {/* road glow lines */}
      <g stroke="#1E2C49" strokeWidth={6} strokeLinecap="round" opacity={0.7}>
        {[2, 5].map((k) => (
          <g key={k}>
            <line x1={giso(0, k + 0.5).x} y1={giso(0, k + 0.5).y} x2={giso(GRID, k + 0.5).x} y2={giso(GRID, k + 0.5).y} />
            <line x1={giso(k + 0.5, 0).x} y1={giso(k + 0.5, 0).y} x2={giso(k + 0.5, GRID).x} y2={giso(k + 0.5, GRID).y} />
          </g>
        ))}
      </g>

      {/* skyline (bright windows glow against the dark; no per-frame filter) */}
      <g>
        {LOTS.map((lot) => (
          <Building key={`${lot.c}-${lot.r}`} lot={lot} />
        ))}
      </g>

      {/* citizens */}
      <g filter="url(#mc-glow)">
        {CITIZENS.map((cz) => (
          <motion.circle
            key={cz.id}
            r={1.8}
            fill={cz.color}
            initial={{ cx: cz.pts[0].x, cy: cz.pts[0].y }}
            animate={{ cx: cz.pts.map((p) => p.x), cy: cz.pts.map((p) => p.y) }}
            transition={{ duration: cz.dur, delay: cz.delay, repeat: Infinity, repeatType: "mirror", ease: "linear" }}
          />
        ))}
      </g>

      {/* cars streaming the avenues */}
      <g filter="url(#mc-glow)">
        {CARS.map((car) => (
          <motion.g
            key={car.id}
            initial={{ x: car.pts[0].x, y: car.pts[0].y }}
            animate={{ x: car.pts.map((p) => p.x), y: car.pts.map((p) => p.y) }}
            transition={{ duration: car.dur, delay: car.delay, repeat: Infinity, repeatType: "mirror", ease: "linear" }}
          >
            <circle r={5} fill={car.color} opacity={0.25} />
            <circle r={2.2} fill="#ffffff" />
            <circle r={2.2} fill={car.color} opacity={0.7} />
          </motion.g>
        ))}
      </g>
    </svg>
  );
}
