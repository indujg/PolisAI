"use client";

// ============================================================================
// PolisAI — Floating AI Insights
// ----------------------------------------------------------------------------
// World-anchored glass callouts that drift over the city and cycle, as if the
// platform is narrating itself in real time. Anchors are projected from world
// space through the live pan/zoom transform. Each card count-ups its value and
// draws a mini sparkline.
// ============================================================================

import { useEffect, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Car,
  Factory,
  GraduationCap,
  HeartPulse,
  Sparkles,
  TrainFront,
  TrendingUp,
  Users,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { CITY, iso, type Building } from "./city-model";

type View = { scale: number; x: number; y: number };

const byKind = (k: Building["kind"]) => CITY.buildings.find((b) => b.kind === k);
const ctr = (b: Building | undefined) => (b ? iso(b.col + b.w / 2, b.row + b.d / 2) : iso(CITY.size / 2, CITY.size / 2));
const CENTER = iso(CITY.size / 2, CITY.size / 2);
const RIVER = CITY.river.center[Math.floor(CITY.river.center.length / 2)] ?? CENTER;
const METRO = CITY.metroStations[0];
const METROP = METRO ? iso(METRO.col + 0.5, METRO.row + 0.5) : CENTER;

function trend(seed: number, end: number, n = 10): number[] {
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const mag = Math.abs(end) || 4;
  const out: number[] = [];
  let v = end - (mag * 0.25 + 4) * (rand() - 0.2);
  for (let i = 0; i < n; i++) {
    v += (rand() - 0.45) * (mag * 0.14 + 2);
    out.push(v);
  }
  out[n - 1] = end;
  return out;
}

type Insight = {
  id: string;
  x: number;
  y: number;
  icon: LucideIcon;
  accent: string;
  label: string;
  value: number;
  decimals: number;
  unit: string;
  sign: "+" | "-" | "";
  data: number[];
};

const mk = (
  id: string,
  p: { x: number; y: number },
  icon: LucideIcon,
  accent: string,
  label: string,
  value: number,
  unit: string,
  sign: "+" | "-" | "",
  decimals = 0,
): Insight => ({ id, x: p.x, y: p.y, icon, accent, label, value, decimals, unit, sign, data: trend(id.length * 7919 + value * 31, value) });

const INSIGHTS: Insight[] = [
  mk("approval", ctr(byKind("government")), Users, "#13C8C3", "Citizen approval", 78, "%", "+"),
  mk("traffic", CENTER, Car, "#2F6BFF", "Traffic easing", 12, "%", "-"),
  mk("er", ctr(byKind("hospital")), HeartPulse, "#F45D6B", "ER capacity", 91, "%", ""),
  mk("load", ctr(byKind("factory")), Factory, "#F6B73C", "Industrial load", 71, "%", ""),
  mk("transit", METROP, TrainFront, "#775CFF", "Transit demand", 9, "%", "+"),
  mk("air", RIVER, Wind, "#2FB36D", "Air quality", 38, " AQI", "-"),
  mk("housing", ctr(byKind("apartment")), Building2, "#13C8C3", "Housing occupancy", 96, "%", ""),
  mk("education", ctr(byKind("school")), GraduationCap, "#F6B73C", "Education uptake", 4, "%", "+"),
  mk("grid", { x: CENTER.x - 120, y: CENTER.y + 80 }, Zap, "#34E5A0", "Grid uptime", 99, "%", ""),
  mk("policy", { x: CENTER.x + 120, y: CENTER.y - 70 }, Sparkles, "#9D7BFF", "Policy sim", 2.4, "% mobility", "+", 1),
];

export function AiInsights({ view, containerRef }: { view: View; containerRef: RefObject<HTMLDivElement | null> }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => i + 1), 4200);
    return () => clearInterval(t);
  }, []);

  const el = containerRef.current;
  const W = el?.clientWidth ?? 1280;
  const H = el?.clientHeight ?? 760;
  const B = CITY.bounds;
  const shown = [0, 1, 2].map((k) => INSIGHTS[(idx + k) % INSIGHTS.length]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[15] overflow-hidden">
      <AnimatePresence>
        {shown.map((ins) => {
          const sx = view.x + (ins.x - B.minX) * view.scale;
          const sy = view.y + (ins.y - B.minY) * view.scale;
          if (sx < 90 || sx > W - 90 || sy < 130 || sy > H - 150) return null;
          return <InsightCard key={ins.id} ins={ins} x={sx} y={sy} />;
        })}
      </AnimatePresence>
    </div>
  );
}

function InsightCard({ ins, x, y }: { ins: Insight; x: number; y: number }) {
  const Icon = ins.icon;
  return (
    <motion.div
      className="absolute"
      style={{ left: x, top: y, transform: "translate(-50%,-100%)" }}
      initial={{ opacity: 0, scale: 0.82 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="flex flex-col items-center">
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-[12.5rem] rounded-xl border border-white/15 bg-[#0B1322]/72 p-2.5 shadow-[0_10px_40px_rgba(5,10,20,0.45)] backdrop-blur-xl"
        >
          <div className="flex items-center gap-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg" style={{ background: `${ins.accent}26`, color: ins.accent }}>
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/55">{ins.label}</p>
              <p className="flex items-center gap-1 font-mono text-[14px] font-bold leading-tight" style={{ color: ins.accent }}>
                <span>
                  {ins.sign}
                  <CountUp value={ins.value} decimals={ins.decimals} />
                  {ins.unit}
                </span>
                {ins.sign ? <TrendingUp className={`size-3 ${ins.sign === "-" ? "rotate-180" : ""}`} /> : null}
              </p>
            </div>
          </div>
          <div className="mt-2">
            <Spark id={ins.id} data={ins.data} color={ins.accent} />
          </div>
        </motion.div>
        <span className="h-4 w-px" style={{ background: `linear-gradient(${ins.accent}, transparent)` }} />
        <span className="relative grid place-items-center">
          <motion.span
            className="absolute size-3 rounded-full"
            style={{ background: ins.accent }}
            animate={{ opacity: [0.6, 0], scale: [0.6, 2.2] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          />
          <span className="size-1.5 rounded-full ring-2 ring-white/40" style={{ background: ins.accent }} />
        </span>
      </div>
    </motion.div>
  );
}

function CountUp({ value, decimals }: { value: number; decimals: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const k = Math.min(1, (t - start) / 700);
      const e = 1 - Math.pow(1 - k, 3);
      setN(value * e);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n.toFixed(decimals)}</>;
}

function Spark({ id, data, color }: { id: string; data: number[]; color: string }) {
  const W = 178;
  const H = 26;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = Math.max(1, max - min);
  const r = (v: number) => Math.round(v * 10) / 10;
  const pts = data.map((v, i) => ({ x: (i / (data.length - 1)) * W, y: H - 3 - ((v - min) / span) * (H - 6) }));
  const line = "M " + pts.map((p) => `${r(p.x)} ${r(p.y)}`).join(" L ");
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;
  const gid = `spark-${id}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.32} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <motion.path d={line} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, ease: "easeOut" }} />
    </svg>
  );
}
