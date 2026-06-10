"use client";

// ============================================================================
// PolisAI — Cinematic Future Prediction Timeline
// ----------------------------------------------------------------------------
// Scrub (drag / click a year / press play) and a purpose-built isometric city
// morphs: population rises, buildings grow & new towers sprout, traffic thins,
// pollution haze clears, greenery spreads, and the sky is colour-graded across
// the decades. Frontend only, deterministic mock data, fully animated.
// ============================================================================

import { memo, useCallback, useEffect, useRef, useState, type PointerEvent as RPE } from "react";
import * as d3 from "d3";
import { motion } from "framer-motion";
import { Pause, Play, RotateCcw, Sparkles, TrendingDown, TrendingUp, Users, Wind } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// --- Year keyframes -------------------------------------------------------

const YEARS = [2026, 2028, 2030, 2035, 2040] as const;
const SPAN = YEARS[YEARS.length - 1] - YEARS[0];
const POS = YEARS.map((y) => (y - YEARS[0]) / SPAN); // normalized track positions
const PHASES = ["Baseline", "Near term", "Acceleration", "Projection", "Long-range vision"] as const;

// metric series aligned to the 5 years (optimistic smart-city trajectory)
const M = {
  population: [8.4, 9.1, 10.2, 12.6, 15.3], // millions
  buildScale: [1.0, 1.18, 1.42, 1.78, 2.16], // height multiplier
  traffic: [64, 60, 54, 47, 39], // congestion index
  pollution: [38, 34, 28, 20, 12], // AQI (lower is better)
  green: [28, 35, 44, 56, 70], // % green cover
};

const SKY_TOP = ["#AFC4DA", "#A9CBDE", "#A6D2E4", "#A6DCEC", "#A7E6EE"];
const SKY_LOW = ["#E9DAC2", "#E6DEC8", "#DCE7D6", "#D2EEE2", "#CFF3EC"];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function interp(values: readonly number[], p: number): number {
  for (let i = 0; i < POS.length - 1; i++) {
    if (p <= POS[i + 1]) {
      const f = clamp((p - POS[i]) / (POS[i + 1] - POS[i] || 1), 0, 1);
      return values[i] + (values[i + 1] - values[i]) * f;
    }
  }
  return values[values.length - 1];
}
function interpColor(arr: string[], p: number): string {
  for (let i = 0; i < POS.length - 1; i++) {
    if (p <= POS[i + 1]) {
      const f = clamp((p - POS[i]) / (POS[i + 1] - POS[i] || 1), 0, 1);
      return d3.interpolateRgb(arr[i], arr[i + 1])(f);
    }
  }
  return arr[arr.length - 1];
}

// --- Isometric diorama geometry -------------------------------------------

const GRID = 8;
const T_W = 62;
const T_H = 31;
const ORIGIN = { x: 500, y: 120 };
const iso = (col: number, row: number) => ({ x: ORIGIN.x + (col - row) * (T_W / 2), y: ORIGIN.y + (col + row) * (T_H / 2) });
const ptsAttr = (pts: { x: number; y: number }[]) => pts.map((p) => `${Math.round(p.x * 10) / 10},${Math.round(p.y * 10) / 10}`).join(" ");

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Lot = {
  col: number;
  row: number;
  kind: "building" | "park";
  baseH: number;
  future: boolean;
  appearAt: number;
  top: string;
  left: string;
  right: string;
  depth: number;
  treePts: { x: number; y: number; s: number }[];
};

const LOTS: Lot[] = (() => {
  const rng = mulberry32(0xf0a51);
  const palettes = [
    ["#8FBED6", "#5C92B4", "#3F6E90"],
    ["#A3B8E2", "#6E8AD2", "#4D67B0"],
    ["#7FD0CB", "#3FB6B0", "#2C8E89"],
    ["#C7D2DC", "#9AAAB8", "#73828F"],
  ];
  const out: Lot[] = [];
  for (let c = 0; c < GRID; c++) {
    for (let r = 0; r < GRID; r++) {
      const isPark = rng() < 0.22;
      const future = !isPark && rng() < 0.4;
      const pal = palettes[Math.floor(rng() * palettes.length)];
      const trees = Array.from({ length: 5 }, () => ({
        x: c + 0.2 + rng() * 0.6,
        y: r + 0.2 + rng() * 0.6,
        s: 0.7 + rng() * 0.5,
      }));
      out.push({
        col: c,
        row: r,
        kind: isPark ? "park" : "building",
        baseH: 16 + Math.floor(rng() * 58),
        future,
        appearAt: future ? 0.15 + rng() * 0.6 : 0,
        top: pal[0],
        left: pal[1],
        right: pal[2],
        depth: c + r,
        treePts: trees,
      });
    }
  }
  return out.sort((a, b) => a.depth - b.depth);
})();

// citizen dots scattered on the ground
const DOTS = (() => {
  const rng = mulberry32(0x2bc17);
  const colors = ["#0FA7A2", "#2F6BFF", "#F6B73C", "#F45D6B", "#2FB36D"];
  return Array.from({ length: 90 }, (_, i) => {
    const p = iso(rng() * GRID, rng() * GRID);
    return { x: p.x, y: p.y, c: colors[i % colors.length] };
  }).sort((a, b) => a.y - b.y);
})();

// vehicle routes (memoized, always moving)
const carPath = (fixed: number, axis: "row" | "col") => {
  const pts: { x: number; y: number }[] = [];
  for (let k = 0; k <= GRID; k += 0.5) pts.push(axis === "row" ? iso(k, fixed) : iso(fixed, k));
  return pts;
};
const VEHICLES = [
  { id: "v1", pts: carPath(2.5, "row"), color: "#1F2A3D", dur: 9, delay: 0 },
  { id: "v2", pts: carPath(5.5, "row"), color: "#3B4A66", dur: 11, delay: 1.2 },
  { id: "v3", pts: carPath(2.5, "col"), color: "#2F6BFF", dur: 10, delay: 0.6 },
  { id: "v4", pts: carPath(5.5, "col"), color: "#0FA7A2", dur: 12, delay: 2.1 },
  { id: "v5", pts: carPath(4, "row"), color: "#1F2A3D", dur: 10.5, delay: 1.6 },
];

// ============================================================================
// Component
// ============================================================================

export function FutureTimeline() {
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number>(0);
  const draggingRef = useRef(false);
  const progressRef = useRef(0);
  progressRef.current = progress;

  const stopRaf = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  };

  // play loop
  useEffect(() => {
    if (!playing) return;
    let last = 0;
    const step = (t: number) => {
      if (!last) last = t;
      const dt = (t - last) / 1000;
      last = t;
      setProgress((p) => {
        const next = p + dt / 13; // ~13s end-to-end
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return stopRaf;
  }, [playing]);

  const tweenTo = useCallback((target: number) => {
    setPlaying(false);
    stopRaf();
    const start = performance.now();
    const from = progressRef.current;
    const dur = 900;
    const step = (t: number) => {
      const k = clamp((t - start) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - k, 3);
      setProgress(from + (target - from) * eased);
      if (k < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  const setFromPointer = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setProgress(clamp((clientX - rect.left) / rect.width, 0, 1));
  }, []);

  const onTrackDown = (e: RPE<HTMLDivElement>) => {
    setPlaying(false);
    stopRaf();
    draggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setFromPointer(e.clientX);
  };
  const onTrackMove = (e: RPE<HTMLDivElement>) => {
    if (draggingRef.current) setFromPointer(e.clientX);
  };
  const onTrackUp = () => {
    draggingRef.current = false;
  };

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (progressRef.current >= 0.999) setProgress(0);
    stopRaf();
    setPlaying(true);
  };

  // --- derived state ---
  const year = Math.round(interp(YEARS as unknown as number[], progress));
  const pop = interp(M.population, progress);
  const scale = interp(M.buildScale, progress);
  const traffic = interp(M.traffic, progress);
  const pollution = interp(M.pollution, progress);
  const green = interp(M.green, progress);
  const skyTop = interpColor(SKY_TOP, progress);
  const skyLow = interpColor(SKY_LOW, progress);

  const popFrac = clamp(0.42 + ((pop - 8.4) / (15.3 - 8.4)) * 0.58, 0, 1);
  const trafficOpacity = clamp(0.5 + ((traffic - 39) / (64 - 39)) * 0.5, 0.4, 1);
  const hazeOpacity = clamp((pollution / 38) * 0.5, 0, 0.5);
  const greenFrac = clamp((green - 28) / (70 - 28), 0, 1);
  const phaseIdx = POS.reduce((acc, p, i) => (progress >= p - 0.02 ? i : acc), 0);

  const visibleDots = Math.floor(DOTS.length * popFrac);

  return (
    <div className="grid gap-5">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="glass" className="mb-3 gap-1.5">
            <Sparkles className="size-3.5 text-city-civic" />
            Predictive digital twin
          </Badge>
          <h1 className="text-display-md text-foreground">Future Timeline</h1>
          <p className="mt-3 max-w-2xl text-body-lg text-muted-foreground">
            Scrub through the decades — watch the city grow, densify and decarbonize in real time.
          </p>
        </div>
        <Badge variant={playing ? "success" : "glass"} className="gap-1.5">
          <span className={cn("size-1.5 rounded-full", playing ? "bg-current" : "bg-muted-foreground")} />
          {playing ? "Simulating" : "Interactive"}
        </Badge>
      </header>

      {/* cinematic stage */}
      <div className="relative aspect-[16/9] overflow-hidden rounded-3xl border border-white/15 shadow-glass">
        <svg viewBox="0 0 1000 620" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="ft-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={skyTop} />
              <stop offset="100%" stopColor={skyLow} />
            </linearGradient>
            <radialGradient id="ft-sun" cx="68%" cy="20%" r="40%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.7 - progress * 0.2} />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="ft-haze" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#8C7A55" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#8C7A55" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="ft-vignette" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0A1018" stopOpacity="0.28" />
              <stop offset="18%" stopColor="#0A1018" stopOpacity="0" />
              <stop offset="82%" stopColor="#0A1018" stopOpacity="0" />
              <stop offset="100%" stopColor="#0A1018" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="1000" height="620" fill="url(#ft-sky)" />
          <rect x="0" y="0" width="1000" height="620" fill="url(#ft-sun)" />
          <Clouds />

          {/* ground */}
          <polygon points={ptsAttr([iso(0, 0), iso(GRID, 0), iso(GRID, GRID), iso(0, GRID)])} fill="#C7D6C5" opacity={0.5 + greenFrac * 0.35} />

          {/* diorama */}
          <g>
            {LOTS.map((lot) => (
              <LotShape key={`${lot.col}-${lot.row}`} lot={lot} t={progress} scale={scale} greenFrac={greenFrac} />
            ))}
          </g>

          {/* citizens */}
          <g>
            {DOTS.slice(0, visibleDots).map((d, i) => (
              <g key={i}>
                <ellipse cx={d.x} cy={d.y + 1.4} rx={2.6} ry={1.2} fill="#11253E" opacity={0.16} />
                <circle cx={d.x} cy={d.y - 2.4} r={2.2} fill={d.c} />
              </g>
            ))}
          </g>

          {/* traffic (memoized movers, opacity tied to congestion) */}
          <motion.g animate={{ opacity: trafficOpacity }} transition={{ duration: 0.5 }}>
            <Vehicles />
          </motion.g>

          {/* pollution haze */}
          <motion.g pointerEvents="none" style={{ mixBlendMode: "multiply" }} animate={{ opacity: hazeOpacity }} transition={{ duration: 0.5 }}>
            <ellipse cx={500} cy={300} rx={420} ry={210} fill="url(#ft-haze)" />
          </motion.g>

          <rect x="0" y="0" width="1000" height="620" fill="url(#ft-vignette)" pointerEvents="none" />
        </svg>

        {/* cinematic year HUD */}
        <div className="pointer-events-none absolute left-6 top-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70 drop-shadow">{PHASES[phaseIdx]}</p>
          <p className="font-mono text-[3.2rem] font-black leading-none text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.5)] tabular-nums">{year}</p>
        </div>

        {/* KPI overlay */}
        <div className="pointer-events-none absolute right-5 top-5 grid w-[12.5rem] gap-2">
          <Kpi icon={Users} label="Population" value={`${pop.toFixed(1)}M`} dir="up" tone="#2F6BFF" />
          <Kpi icon={TrendingUp} label="Skyline" value={`${scale.toFixed(2)}×`} dir="up" tone="#775CFF" />
          <Kpi icon={TrendingDown} label="Congestion" value={`${Math.round(traffic)}`} dir="down" tone="#0FA7A2" />
          <Kpi icon={Wind} label="Air quality" value={`${Math.round(pollution)} AQI`} dir="down" tone="#2FB36D" />
          <Kpi icon={Sparkles} label="Green cover" value={`${Math.round(green)}%`} dir="up" tone="#2FB36D" />
        </div>
      </div>

      {/* timeline scrubber */}
      <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-glass backdrop-blur-2xl">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={togglePlay}
            className="focus-ring grid size-11 shrink-0 place-items-center rounded-full bg-city-graphite text-white shadow-polis-sm transition-transform hover:scale-105"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="size-5" /> : <Play className="size-5 translate-x-0.5" />}
          </button>
          <button
            type="button"
            onClick={() => tweenTo(0)}
            className="focus-ring grid size-9 shrink-0 place-items-center rounded-full border border-border/70 bg-white text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Reset"
          >
            <RotateCcw className="size-4" />
          </button>

          {/* track */}
          <div className="relative flex-1 select-none py-4">
            <div
              ref={trackRef}
              className="relative h-1.5 cursor-pointer rounded-full bg-muted"
              onPointerDown={onTrackDown}
              onPointerMove={onTrackMove}
              onPointerUp={onTrackUp}
              onPointerCancel={onTrackUp}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${progress * 100}%`, background: "linear-gradient(90deg,#2F6BFF,#0FA7A2)" }}
              />
              {/* year nodes */}
              {YEARS.map((y, i) => {
                const active = progress >= POS[i] - 0.01;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => tweenTo(POS[i])}
                    className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${POS[i] * 100}%` }}
                    aria-label={`Jump to ${y}`}
                  >
                    <span
                      className={cn(
                        "block size-3 rounded-full border-2 transition-all duration-200 group-hover:scale-125",
                        active ? "border-city-civic bg-city-civic" : "border-border bg-white",
                      )}
                    />
                    <span
                      className={cn(
                        "absolute left-1/2 top-4 -translate-x-1/2 font-mono text-[11px] font-bold transition-colors",
                        active ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {y}
                    </span>
                  </button>
                );
              })}
              {/* playhead */}
              <motion.div
                className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-city-graphite shadow-polis-md"
                style={{ left: `${progress * 100}%` }}
              />
            </div>
          </div>

          <div className="hidden shrink-0 text-right sm:block">
            <p className="font-mono text-title-md font-bold leading-none text-foreground tabular-nums">{year}</p>
            <p className="text-caption text-muted-foreground">{PHASES[phaseIdx]}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- pieces ---------------------------------------------------------------

function LotShape({ lot, t, scale, greenFrac }: { lot: Lot; t: number; scale: number; greenFrac: number }) {
  const A = iso(lot.col, lot.row);
  const B = iso(lot.col + 1, lot.row);
  const C = iso(lot.col + 1, lot.row + 1);
  const D = iso(lot.col, lot.row + 1);

  if (lot.kind === "park") {
    const treeCount = Math.max(1, Math.round(1 + greenFrac * (lot.treePts.length - 1)));
    return (
      <g>
        <polygon points={ptsAttr([A, B, C, D])} fill="#7FC892" stroke="#65B47D" strokeWidth={0.6} />
        {lot.treePts.slice(0, treeCount).map((tp, i) => {
          const p = iso(tp.x, tp.y);
          return (
            <g key={i} transform={`translate(${p.x}, ${p.y})`}>
              <rect x={-1.2 * tp.s} y={-2 * tp.s} width={2.4 * tp.s} height={7 * tp.s} fill="#7A5A38" />
              <circle cx={0} cy={-6 * tp.s} r={6 * tp.s} fill="#2FB36D" />
              <circle cx={-2.5 * tp.s} cy={-3 * tp.s} r={4 * tp.s} fill="#3CC07D" />
            </g>
          );
        })}
      </g>
    );
  }

  // building height morphs with the scrub
  const grow = lot.future ? clamp((t - lot.appearAt) / 0.08, 0, 1) : 1;
  const h = lot.baseH * scale * grow;
  if (h < 1) return <polygon points={ptsAttr([A, B, C, D])} fill="#B9C6BE" opacity={0.5} />;

  const up = (p: { x: number; y: number }) => ({ x: p.x, y: p.y - h });
  return (
    <g opacity={lot.future ? 0.3 + grow * 0.7 : 1}>
      <polygon points={ptsAttr([D, C, up(C), up(D)])} fill={lot.right} />
      <polygon points={ptsAttr([B, C, up(C), up(B)])} fill={lot.left} />
      <polygon points={ptsAttr([up(A), up(B), up(C), up(D)])} fill={lot.top} stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={0.6} />
    </g>
  );
}

const Vehicles = memo(function Vehicles() {
  return (
    <g pointerEvents="none">
      {VEHICLES.map((v) => {
        const xs = v.pts.map((p) => p.x);
        const ys = v.pts.map((p) => p.y);
        return (
          <motion.g
            key={v.id}
            initial={{ x: xs[0], y: ys[0] }}
            animate={{ x: xs, y: ys }}
            transition={{ duration: v.dur, repeat: Infinity, repeatType: "mirror", ease: "linear", delay: v.delay }}
          >
            <ellipse cx={0} cy={2} rx={5} ry={2.2} fill="#11253E" opacity={0.18} />
            <polygon points="-5,0 0,-3 5,0 0,3" fill={v.color} />
            <polygon points="-5,0 0,-3 0,-7 -5,-4" fill="#1a2333" opacity={0.5} />
          </motion.g>
        );
      })}
    </g>
  );
});

const Clouds = memo(function Clouds() {
  return (
    <g opacity={0.85}>
      {[
        { x: -200, y: 70, s: 1, dur: 70 },
        { x: -400, y: 130, s: 0.7, dur: 90 },
        { x: -300, y: 40, s: 1.3, dur: 110 },
      ].map((c, i) => (
        <motion.g
          key={i}
          initial={{ x: c.x }}
          animate={{ x: 1300 }}
          transition={{ duration: c.dur, repeat: Infinity, ease: "linear", delay: i * 6 }}
          transform={`translate(0, ${c.y}) scale(${c.s})`}
          fill="#FFFFFF"
          opacity={0.85}
        >
          <ellipse cx={0} cy={0} rx={44} ry={20} />
          <ellipse cx={36} cy={8} rx={34} ry={16} />
          <ellipse cx={-32} cy={9} rx={28} ry={15} />
        </motion.g>
      ))}
    </g>
  );
});

function Kpi({ icon: Icon, label, value, dir, tone }: { icon: typeof Users; label: string; value: string; dir: "up" | "down"; tone: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/40 bg-black/25 px-3 py-2 backdrop-blur-md">
      <div className="grid size-7 shrink-0 place-items-center rounded-lg" style={{ background: `${tone}33`, color: "#fff" }}>
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold uppercase tracking-wider text-white/55">{label}</p>
        <p className="font-mono text-[15px] font-bold leading-tight text-white tabular-nums">{value}</p>
      </div>
      {dir === "up" ? <TrendingUp className="size-3.5 text-[#5CE0A0]" /> : <TrendingDown className="size-3.5 text-[#5CE0A0]" />}
    </div>
  );
}
