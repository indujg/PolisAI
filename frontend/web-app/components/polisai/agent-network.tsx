"use client";

// ============================================================================
// PolisAI — AI Agent Network
// ----------------------------------------------------------------------------
// A LangGraph / CrewAI–style supervisor graph: a central Orchestrator wired to
// five domain agents, with animated connections and messages flowing between
// them. D3 builds the curved link geometry; Framer Motion animates the packets
// and the live message bus. Frontend only, mock data.
// ============================================================================

import { useEffect, useState } from "react";
import * as d3 from "d3";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BrainCircuit,
  CircleDollarSign,
  HeartPulse,
  Network,
  Route,
  Scale,
  Sparkles,
  Wind,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// --- Geometry / data (deterministic, module scope) ------------------------

const VIEW = { w: 960, h: 600 };
const CENTER = { x: 480, y: 296 };
const RADIUS = 205;

type Pt = { x: number; y: number };

type AgentDef = { id: string; label: string; role: string; color: string; icon: LucideIcon };

const AGENTS: AgentDef[] = [
  { id: "economy", label: "Economy", role: "GDP, jobs & trade forecasts", color: "#13C8C3", icon: CircleDollarSign },
  { id: "climate", label: "Climate", role: "Emissions & air-quality models", color: "#2FB36D", icon: Wind },
  { id: "policy", label: "Policy", role: "Drafts & scores legislation", color: "#2F6BFF", icon: Scale },
  { id: "mobility", label: "Mobility", role: "Transit & traffic optimization", color: "#775CFF", icon: Route },
  { id: "healthcare", label: "Healthcare", role: "Capacity & outcomes tracking", color: "#F45D6B", icon: HeartPulse },
];

type GraphNode = { id: string; label: string; role: string; color: string; icon: LucideIcon; x: number; y: number; r: number; hub?: boolean };

const HUB: GraphNode = {
  id: "hub",
  label: "Orchestrator",
  role: "PolisAI supervisor",
  color: "#2DE0D6",
  icon: BrainCircuit,
  x: CENTER.x,
  y: CENTER.y,
  r: 40,
  hub: true,
};

const AGENT_NODES: GraphNode[] = AGENTS.map((a, i) => {
  const ang = ((-90 + i * 72) * Math.PI) / 180;
  return { ...a, x: CENTER.x + RADIUS * Math.cos(ang), y: CENTER.y + RADIUS * Math.sin(ang), r: 32 };
});

const NODES: GraphNode[] = [HUB, ...AGENT_NODES];
const NODE_BY: Record<string, GraphNode> = Object.fromEntries(NODES.map((n) => [n.id, n]));

type EdgeDef = { a: string; b: string; ring?: boolean };

const EDGES: EdgeDef[] = [
  // supervisor spokes
  ...AGENTS.map((a) => ({ a: "hub", b: a.id })),
  // peer ring
  ...AGENTS.map((a, i) => ({ a: a.id, b: AGENTS[(i + 1) % AGENTS.length].id, ring: true })),
  // a few cross links for a true mesh
  { a: "economy", b: "policy", ring: true },
  { a: "climate", b: "mobility", ring: true },
  { a: "policy", b: "healthcare", ring: true },
];

function sampleQuad(p0: Pt, c: Pt, p1: Pt, n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push({
      x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x,
      y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y,
    });
  }
  return out;
}

function pathLen(pts: Pt[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return l;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

type EdgeGeom = { id: string; d: string; pts: Pt[]; color: string; def: EdgeDef };

const EDGE_GEOM: EdgeGeom[] = EDGES.map((e, i) => {
  const A = NODE_BY[e.a];
  const B = NODE_BY[e.b];
  const mx = (A.x + B.x) / 2;
  const my = (A.y + B.y) / 2;
  let cx = mx;
  let cy = my;
  if (e.ring) {
    let dx = mx - CENTER.x;
    let dy = my - CENTER.y;
    const L = Math.hypot(dx, dy) || 1;
    dx /= L;
    dy /= L;
    cx = mx + dx * 46;
    cy = my + dy * 46;
  }
  const p = d3.path();
  p.moveTo(A.x, A.y);
  p.quadraticCurveTo(cx, cy, B.x, B.y);
  return { id: `e-${i}`, d: p.toString(), pts: sampleQuad(A, { x: cx, y: cy }, B, 26), color: A.color, def: e };
});

type Packet = { id: string; pts: Pt[]; color: string; dur: number; delay: number };

const PACKETS: Packet[] = (() => {
  const out: Packet[] = [];
  EDGE_GEOM.forEach((g, i) => {
    const src = NODE_BY[g.def.a];
    const tgt = NODE_BY[g.def.b];
    const dur = clamp(pathLen(g.pts) / 110, 2.2, 4.4);
    const delay = (i * 0.37) % 3;
    out.push({ id: `f-${i}`, pts: g.pts, color: src.color, dur, delay });
    // supervisor links are two-way (request → response)
    if (g.def.a === "hub" || g.def.b === "hub") {
      out.push({ id: `r-${i}`, pts: [...g.pts].reverse(), color: tgt.color, dur: dur * 1.1, delay: delay + 1.1 });
    }
  });
  return out;
})();

// --- Message bus pool -----------------------------------------------------

type Msg = { from: string; to: string; text: string };
const LOG_POOL: Msg[] = [
  { from: "economy", to: "policy", text: "GDP forecast updated +3.4%" },
  { from: "climate", to: "hub", text: "AQI 38 — improving after load smoothing" },
  { from: "policy", to: "mobility", text: "congestion pricing draft v3 ready" },
  { from: "mobility", to: "economy", text: "transit ROI projected +6%" },
  { from: "healthcare", to: "policy", text: "ER capacity holding at 91%" },
  { from: "hub", to: "climate", text: "requesting emissions simulation" },
  { from: "economy", to: "hub", text: "labor market stable, 4.2% jobless" },
  { from: "mobility", to: "climate", text: "EV share up 18%, emissions ↓" },
  { from: "policy", to: "healthcare", text: "evaluating clinic expansion bill" },
  { from: "climate", to: "mobility", text: "heat advisory — reroute freight" },
  { from: "hub", to: "policy", text: "prioritize mobility + clean energy" },
  { from: "healthcare", to: "hub", text: "satisfaction index 91, trending up" },
  { from: "economy", to: "climate", text: "carbon-credit market liquidity ok" },
  { from: "policy", to: "hub", text: "2 bills scored, ready for review" },
];

// ============================================================================
// Component
// ============================================================================

export function AgentNetwork() {
  return (
    <div className="grid gap-5">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="glass" className="mb-3 gap-1.5">
            <Network className="size-3.5 text-city-civic" />
            Multi-agent orchestration
          </Badge>
          <h1 className="text-display-md text-foreground">AI Agent Network</h1>
          <p className="mt-3 max-w-2xl text-body-lg text-muted-foreground">
            A supervisor graph of specialized agents — coordinating, debating and message-passing in real time to run the
            city.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success" className="gap-1.5">
            <span className="size-1.5 rounded-full bg-current" />
            {PACKETS.length} live channels
          </Badge>
          <Badge variant="glass">Supervisor · message-passing</Badge>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <NetworkCanvas />
        <div className="grid content-start gap-5">
          <MessageBus />
          <AgentRoster />
        </div>
      </div>
    </div>
  );
}

// --- The graph canvas -----------------------------------------------------

function NetworkCanvas() {
  return (
    <div
      className="relative aspect-[16/10] overflow-hidden rounded-3xl border border-white/10 shadow-glass"
      style={{ background: "radial-gradient(120% 90% at 50% 0%, #16233A 0%, #0C1322 55%, #080C16 100%)" }}
    >
      <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="an-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0V32" fill="none" stroke="#ffffff" strokeOpacity="0.04" strokeWidth="1" />
          </pattern>
          <filter id="an-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="an-vignette" cx="50%" cy="42%" r="70%">
            <stop offset="60%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
          </radialGradient>
        </defs>

        <rect width={VIEW.w} height={VIEW.h} fill="url(#an-grid)" />

        {/* edges */}
        <g>
          {EDGE_GEOM.map((g) => (
            <g key={g.id}>
              <path d={g.d} fill="none" stroke="#ffffff" strokeOpacity={0.08} strokeWidth={2} />
              <motion.path
                d={g.d}
                fill="none"
                stroke={g.color}
                strokeOpacity={0.5}
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeDasharray="2 12"
                initial={{ strokeDashoffset: 0 }}
                animate={{ strokeDashoffset: -28 }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
              />
            </g>
          ))}
        </g>

        {/* message packets */}
        <g filter="url(#an-glow)">
          {PACKETS.map((m) => (
            <PacketDot key={m.id} m={m} />
          ))}
        </g>

        {/* nodes */}
        <g>
          {NODES.map((n) => (
            <NodeBadge key={n.id} n={n} />
          ))}
        </g>

        <rect width={VIEW.w} height={VIEW.h} fill="url(#an-vignette)" pointerEvents="none" />
      </svg>

      <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-md">
        <Sparkles className="size-3.5 text-[#2DE0D6]" />
        <span className="text-[11px] font-semibold text-white/70">CrewAI-style roles · LangGraph message routing</span>
      </div>
    </div>
  );
}

function PacketDot({ m }: { m: Packet }) {
  const xs = m.pts.map((p) => p.x);
  const ys = m.pts.map((p) => p.y);
  return (
    <motion.g
      initial={{ x: xs[0], y: ys[0], opacity: 0 }}
      animate={{ x: xs, y: ys, opacity: [0, 1, 1, 0] }}
      transition={{ duration: m.dur, delay: m.delay, repeat: Infinity, ease: "linear" }}
    >
      <circle r={6} fill={m.color} opacity={0.25} />
      <circle r={2.6} fill="#ffffff" />
      <circle r={2.6} fill={m.color} opacity={0.7} />
    </motion.g>
  );
}

function NodeBadge({ n }: { n: GraphNode }) {
  const Icon = n.icon;
  const iconSize = n.hub ? 30 : 24;
  return (
    <g>
      {/* halo + pulse */}
      <circle cx={n.x} cy={n.y} r={n.r + 12} fill={n.color} opacity={0.12} />
      <motion.circle
        cx={n.x}
        cy={n.y}
        r={n.r}
        fill="none"
        stroke={n.color}
        strokeWidth={1.5}
        initial={{ opacity: 0.5, scale: 1 }}
        animate={{ opacity: [0.5, 0], scale: [1, 1.55] }}
        transition={{ duration: n.hub ? 2 : 2.6, repeat: Infinity, ease: "easeOut" }}
        style={{ transformOrigin: `${n.x}px ${n.y}px` }}
      />
      {/* body */}
      <circle cx={n.x} cy={n.y} r={n.r} fill="#0E1726" stroke={n.color} strokeWidth={2} />
      <circle cx={n.x} cy={n.y} r={n.r} fill={n.color} opacity={0.16} />
      {/* icon (nested lucide svg inherits currentColor) */}
      <g style={{ color: n.hub ? "#EAFBFA" : "#FFFFFF" }}>
        <Icon x={n.x - iconSize / 2} y={n.y - iconSize / 2} width={iconSize} height={iconSize} strokeWidth={2} />
      </g>
      {/* label */}
      <text x={n.x} y={n.y + n.r + 18} textAnchor="middle" fill="#FFFFFF" fontSize={n.hub ? 15 : 13} fontWeight={700}>
        {n.label}
      </text>
      <text x={n.x} y={n.y + n.r + 33} textAnchor="middle" fill="#FFFFFF" fillOpacity={0.45} fontSize={10} fontWeight={600}>
        {n.hub ? "supervisor" : "agent"}
      </text>
    </g>
  );
}

// --- Live message bus -----------------------------------------------------

type BusItem = Msg & { key: number; time: string };

function MessageBus() {
  const [items, setItems] = useState<BusItem[]>(() =>
    LOG_POOL.slice(0, 4).map((m, i) => ({ ...m, key: i, time: `${(i + 1) * 3}s` })),
  );

  useEffect(() => {
    let idx = 4;
    let n = 4;
    const id = setInterval(() => {
      const m = LOG_POOL[idx % LOG_POOL.length];
      idx++;
      n++;
      setItems((prev) => [{ ...m, key: n, time: "now" }, ...prev].slice(0, 7));
    }, 1700);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="flex max-h-[26rem] flex-col overflow-hidden rounded-3xl border border-white/10 text-white shadow-glass"
      style={{ background: "linear-gradient(180deg, rgba(13,20,33,0.95), rgba(9,14,24,0.96))" }}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-[#2DE0D6]" />
          <p className="text-[13px] font-bold">Message bus</p>
        </div>
        <div className="flex items-center gap-1.5">
          <motion.span
            className="size-1.5 rounded-full bg-[#3ED598]"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
          <span className="font-mono text-[11px] font-bold text-[#3ED598]">STREAMING</span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-2">
        <AnimatePresence initial={false}>
          {items.map((m) => (
            <motion.div
              key={m.key}
              layout
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="rounded-xl px-2.5 py-2 transition-colors hover:bg-white/5">
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: labelColor(m.from) }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">{labelName(m.from)}</span>
                  <span className="text-white/30">→</span>
                  <span className="size-2 rounded-full" style={{ background: labelColor(m.to) }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">{labelName(m.to)}</span>
                  <span className="ml-auto font-mono text-[10px] text-white/35">{m.time}</span>
                </div>
                <p className="text-[12.5px] font-medium leading-snug text-white/85">{m.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AgentRoster() {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-glass backdrop-blur-2xl">
      <p className="token-label mb-3">Active agents</p>
      <div className="grid gap-2">
        {AGENTS.map((a, i) => {
          const Icon = a.icon;
          return (
            <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-white/70 p-2.5 shadow-polis-xs">
              <div className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: `${a.color}1f`, color: a.color }}>
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-bold text-foreground">{a.label} Agent</p>
                <p className="truncate text-caption text-muted-foreground">{a.role}</p>
              </div>
              <span className="flex items-center gap-1.5">
                <motion.span
                  className="size-1.5 rounded-full"
                  style={{ background: a.color }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.3 }}
                />
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: a.color }}>
                  active
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function labelName(id: string): string {
  return id === "hub" ? "Orchestrator" : (NODE_BY[id]?.label ?? id);
}
function labelColor(id: string): string {
  return NODE_BY[id]?.color ?? "#888";
}
