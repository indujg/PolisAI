"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import {
  Activity,
  Ambulance,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Brain,
  Building2,
  Car,
  CircleDot,
  Command,
  Cpu,
  Factory,
  Gauge,
  Globe2,
  HeartPulse,
  Landmark,
  LineChart,
  RadioTower,
  Satellite,
  ShieldCheck,
  Smile,
  Sparkles,
  TrendingUp,
  UsersRound,
  Wind,
  Zap
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type KpiId = "population" | "gdp" | "happiness" | "traffic" | "pollution" | "healthcare";

type Kpi = {
  id: KpiId;
  label: string;
  value: number;
  suffix: string;
  delta: number;
  icon: LucideIcon;
  tone: "civic" | "signal" | "solar" | "park" | "coral" | "transit";
  detail: string;
};

const baseKpis: Kpi[] = [
  {
    id: "population",
    label: "Population",
    value: 8.42,
    suffix: "M",
    delta: 1.8,
    icon: UsersRound,
    tone: "signal",
    detail: "Residents modeled across 42 civic districts"
  },
  {
    id: "gdp",
    label: "GDP",
    value: 684,
    suffix: "B",
    delta: 3.4,
    icon: Landmark,
    tone: "civic",
    detail: "Real-time economic output forecast"
  },
  {
    id: "happiness",
    label: "Happiness",
    value: 78,
    suffix: "%",
    delta: 2.1,
    icon: Smile,
    tone: "park",
    detail: "Citizen sentiment and service satisfaction"
  },
  {
    id: "traffic",
    label: "Traffic",
    value: 64,
    suffix: "%",
    delta: -7.8,
    icon: Car,
    tone: "transit",
    detail: "Congestion pressure after signal optimization"
  },
  {
    id: "pollution",
    label: "Pollution",
    value: 38,
    suffix: "AQI",
    delta: -4.6,
    icon: Wind,
    tone: "solar",
    detail: "Air-quality index across industrial corridors"
  },
  {
    id: "healthcare",
    label: "Healthcare",
    value: 91,
    suffix: "%",
    delta: 5.2,
    icon: HeartPulse,
    tone: "coral",
    detail: "Emergency capacity and response readiness"
  }
];

const telemetryData = [
  { time: "00", population: 76, gdp: 68, happiness: 72, traffic: 64, pollution: 42, healthcare: 82 },
  { time: "04", population: 78, gdp: 70, happiness: 74, traffic: 48, pollution: 39, healthcare: 84 },
  { time: "08", population: 84, gdp: 78, happiness: 70, traffic: 82, pollution: 51, healthcare: 86 },
  { time: "12", population: 88, gdp: 82, happiness: 76, traffic: 69, pollution: 47, healthcare: 89 },
  { time: "16", population: 91, gdp: 86, happiness: 79, traffic: 74, pollution: 44, healthcare: 91 },
  { time: "20", population: 86, gdp: 80, happiness: 82, traffic: 58, pollution: 37, healthcare: 93 },
  { time: "24", population: 82, gdp: 77, happiness: 81, traffic: 52, pollution: 35, healthcare: 92 }
];

const heatmapCells = [
  44, 52, 63, 71, 38, 46, 57, 80, 68, 36, 42, 55,
  73, 84, 61, 49, 34, 40, 66, 78, 91, 72, 53, 47,
  39, 45, 58, 69, 76, 88, 67, 54, 41, 37, 50, 62
];

const districts = [
  { name: "Civic Core", status: "Nominal", metric: "96%", icon: Building2, tone: "civic" },
  { name: "Harbor Works", status: "Grid watch", metric: "71%", icon: Factory, tone: "solar" },
  { name: "Northline Health", status: "Surge-ready", metric: "91%", icon: Ambulance, tone: "coral" },
  { name: "Greenline Transit", status: "Optimized", metric: "86%", icon: Car, tone: "transit" }
] as const;

const liveEvents = [
  "Traffic AI cleared a 7 minute delay on Greenline Corridor.",
  "Healthcare model shifted ambulance standby to Northline.",
  "GDP forecast updated after port logistics normalization.",
  "Pollution watch reduced after industrial load smoothing.",
  "Citizen sentiment improved in Civic Core service cluster."
];

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid rgba(221, 232, 234, 0.9)",
  boxShadow: "0 18px 50px rgba(17, 37, 62, 0.12)",
  background: "rgba(255, 255, 255, 0.92)",
  backdropFilter: "blur(18px)"
};

const tooltipLabelStyle = {
  color: "#101824",
  fontWeight: 700
};

export function MissionControlDashboard() {
  const [tick, setTick] = useState(0);
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    setChartsReady(true);
    const interval = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 2200);

    return () => window.clearInterval(interval);
  }, []);

  const kpis = useMemo(
    () =>
      baseKpis.map((kpi, index) => {
        const wave = Math.sin((tick + index * 1.7) / 2.8);
        const drift = kpi.id === "traffic" || kpi.id === "pollution" ? -wave : wave;
        const scale = kpi.id === "gdp" ? 2.6 : kpi.id === "population" ? 0.02 : 1.1;

        return {
          ...kpi,
          value: kpi.value + drift * scale
        };
      }),
    [tick]
  );

  const activeEvent = liveEvents[tick % liveEvents.length];

  return (
    <div className="grid gap-5">
      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="glass-card city-map overflow-hidden rounded-lg p-4 sm:p-5 lg:p-6">
          <div className="relative z-[1] grid gap-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-4xl">
                <Badge variant="glass" className="mb-3 gap-1.5">
                  <Satellite className="size-3.5 text-city-civic" />
                  Mission Control / Live civic telemetry
                </Badge>
                <h1 className="text-display-md text-foreground">PolisAI Mission Control</h1>
                <p className="mt-3 max-w-3xl text-body-lg text-muted-foreground">
                  A NASA-grade operating view for population, GDP, happiness, traffic, pollution, and healthcare readiness.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline">
                  <LineChart />
                  Executive brief
                </Button>
                <Button variant="signal">
                  <Command />
                  Run city scan
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              {kpis.map((kpi, index) => (
                <KpiCard key={kpi.id} kpi={kpi} index={index} />
              ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <MissionMap tick={tick} />
              <LiveUpdatePanel activeEvent={activeEvent} tick={tick} />
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          <ControlRoomPanel />
          <SystemsPanel />
        </div>
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="grid gap-5 xl:grid-cols-2">
          <ChartCard title="City Vital Signs" description="Composite signal across core civic systems.">
            <div className="h-[310px] min-w-0">
              {chartsReady ? <VitalSignsChart /> : <ChartSkeleton />}
            </div>
          </ChartCard>

          <ChartCard title="Economic and Service Load" description="GDP momentum compared with system pressure.">
            <div className="h-[310px] min-w-0">
              {chartsReady ? <LoadChart /> : <ChartSkeleton bars />}
            </div>
          </ChartCard>
        </div>

        <HeatmapPanel />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.55fr)]">
        <OperationsTable />
        <ForecastPanel chartsReady={chartsReady} />
      </section>
    </div>
  );
}

function KpiCard({ kpi, index }: { kpi: Kpi; index: number }) {
  const Icon = kpi.icon;
  const positive = kpi.delta >= 0;
  const displayValue = kpi.id === "population" ? kpi.value.toFixed(2) : Math.round(kpi.value).toLocaleString();

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.045, duration: 0.38 }}
      className="rounded-lg border border-white/75 bg-white/[0.74] p-4 shadow-polis-sm backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.9] hover:shadow-polis-md"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className={cn("grid size-10 place-items-center rounded-md", toneClass(kpi.tone))}>
          <Icon className="size-4" />
        </div>
        <span className={cn("flex items-center gap-1 font-mono text-[11px] font-bold", positive ? "text-city-park" : "text-city-civic")}>
          <ArrowUpRight className={cn("size-3.5", !positive && "rotate-90")} />
          {positive ? "+" : ""}
          {kpi.delta.toFixed(1)}%
        </span>
      </div>
      <div className="flex items-end gap-1">
        <motion.p
          key={`${kpi.id}-${displayValue}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-metric text-foreground"
        >
          {displayValue}
        </motion.p>
        <span className="pb-0.5 text-body-sm font-bold text-muted-foreground">{kpi.suffix}</span>
      </div>
      <p className="mt-1 text-body-sm font-semibold text-foreground">{kpi.label}</p>
      <p className="mt-2 text-caption text-muted-foreground">{kpi.detail}</p>
    </motion.article>
  );
}

function MissionMap({ tick }: { tick: number }) {
  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-lg border border-white/75 bg-white/[0.56] shadow-glass backdrop-blur-2xl">
      <div className="absolute inset-0 bg-city-grid [background-size:30px_30px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_24%,rgba(19,200,195,0.16),transparent_24%),radial-gradient(circle_at_77%_18%,rgba(47,107,255,0.12),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.72))]" />

      <div className="absolute left-[8%] top-[48%] h-1.5 w-[84%] rounded-full bg-city-civic/35 shadow-[0_0_0_4px_rgba(255,255,255,0.48)]" />
      <div className="absolute left-[18%] top-[22%] h-[63%] w-1.5 rounded-full bg-city-signal/30 shadow-[0_0_0_4px_rgba(255,255,255,0.48)]" />
      <div className="absolute left-[38%] top-[16%] h-[72%] w-1.5 rounded-full bg-city-graphite/[0.16] shadow-[0_0_0_4px_rgba(255,255,255,0.48)]" />
      <div className="absolute left-[12%] top-[70%] h-1.5 w-[74%] -rotate-[9deg] rounded-full bg-city-solar/[0.32] shadow-[0_0_0_4px_rgba(255,255,255,0.48)]" />
      <div className="absolute left-[15%] top-[31%] h-1.5 w-[68%] rotate-[14deg] rounded-full bg-city-transit/25 shadow-[0_0_0_4px_rgba(255,255,255,0.48)]" />

      {districts.map((district, index) => {
        const Icon = district.icon;
        const positions = [
          "left-[16%] top-[22%]",
          "right-[12%] top-[56%]",
          "right-[15%] top-[17%]",
          "left-[31%] bottom-[16%]"
        ];

        return (
          <motion.div
            key={district.name}
            className={cn("absolute w-[12rem] rounded-lg border border-white/75 bg-white/[0.82] p-3 shadow-polis-sm backdrop-blur-2xl", positions[index])}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 5 + index, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className={cn("grid size-9 place-items-center rounded-md", toneClass(district.tone))}>
                <Icon className="size-4" />
              </div>
              <Badge variant="glass">{district.metric}</Badge>
            </div>
            <p className="truncate text-body-sm font-bold text-foreground">{district.name}</p>
            <p className="mt-1 text-caption text-muted-foreground">{district.status}</p>
          </motion.div>
        );
      })}

      {[12, 28, 41, 56, 70, 83].map((left, index) => (
        <motion.div
          key={left}
          className="absolute top-[47%] grid size-8 place-items-center rounded-full border border-white/80 bg-white text-city-civic shadow-polis-md"
          animate={{ left: [`${left}%`, `${Math.min(left + 18, 88)}%`, `${left}%`], y: [0, index % 2 ? 10 : -10, 0] }}
          transition={{ duration: 8 + index * 0.7, repeat: Infinity, ease: "linear" }}
        >
          <Car className="size-3.5" />
        </motion.div>
      ))}

      <motion.div
        className="absolute left-5 top-5 rounded-lg border border-white/75 bg-white/[0.84] px-4 py-3 shadow-glass backdrop-blur-2xl"
        animate={{ opacity: [0.84, 1, 0.84] }}
        transition={{ duration: 2.2, repeat: Infinity }}
      >
        <div className="flex items-center gap-2">
          <CircleDot className="size-4 text-city-park" />
          <p className="text-body-sm font-bold text-foreground">Live city twin</p>
        </div>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">T+{String(tick).padStart(4, "0")} telemetry packets</p>
      </motion.div>
    </div>
  );
}

function LiveUpdatePanel({ activeEvent, tick }: { activeEvent: string; tick: number }) {
  return (
    <aside className="rounded-lg border border-white/75 bg-white/[0.76] p-5 shadow-glass backdrop-blur-2xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="token-label">Live updates</p>
          <h2 className="text-title-lg text-foreground">Mission feed</h2>
        </div>
        <Badge variant="success">Streaming</Badge>
      </div>

      <motion.div
        key={activeEvent}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 rounded-lg border border-city-civic/20 bg-city-civic/10 p-4"
      >
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="size-4 text-city-civic" />
          <p className="text-body-sm font-bold text-foreground">AI recommendation</p>
        </div>
        <p className="text-body-sm text-muted-foreground">{activeEvent}</p>
      </motion.div>

      <div className="grid gap-3">
        {[
          ["Population model", "42 districts synced", UsersRound],
          ["Economic graph", "GDP forecast refreshed", BarChart3],
          ["Healthcare mesh", "ER readiness stable", HeartPulse],
          ["Air quality", "Industrial plume reduced", Wind]
        ].map(([label, meta, Icon], index) => (
          <div key={String(label)} className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-white/[0.78] p-3 shadow-polis-xs">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-md bg-city-signal/10 text-city-signal">
                <Icon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-body-sm font-semibold text-foreground">{String(label)}</p>
                <p className="truncate text-caption text-muted-foreground">{String(meta)}</p>
              </div>
            </div>
            <motion.span
              className="size-2 rounded-full bg-city-park"
              animate={{ scale: tick % 4 === index ? [1, 1.7, 1] : 1 }}
              transition={{ duration: 0.45 }}
            />
          </div>
        ))}
      </div>
    </aside>
  );
}

function ControlRoomPanel() {
  return (
    <div className="surface-card rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="token-label">Control center</p>
          <h2 className="text-title-lg text-foreground">Command authority</h2>
        </div>
        <Badge variant="glass">Level 4</Badge>
      </div>
      <div className="grid gap-3">
        <ControlRow icon={Satellite} label="Orbital telemetry" value="Online" />
        <ControlRow icon={Brain} label="AI inference" value="14 models" />
        <ControlRow icon={ShieldCheck} label="Governance guardrails" value="Enforced" />
      </div>
    </div>
  );
}

function SystemsPanel() {
  return (
    <div className="glass-card rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="token-label">System readiness</p>
          <h2 className="text-title-lg text-foreground">Tesla-style ops</h2>
        </div>
        <Gauge className="size-5 text-city-civic" />
      </div>
      <div className="grid gap-4">
        {[
          ["Compute grid", 94, "bg-city-civic"],
          ["Sensor mesh", 99, "bg-city-park"],
          ["Traffic actuators", 86, "bg-city-signal"],
          ["Healthcare routing", 91, "bg-city-coral"]
        ].map(([label, value, color]) => (
          <div key={String(label)}>
            <div className="mb-2 flex items-center justify-between text-body-sm">
              <span className="font-semibold text-foreground">{String(label)}</span>
              <span className="font-mono text-[11px] font-bold text-muted-foreground">{Number(value)}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <motion.div
                className={cn("h-2 rounded-full", String(color))}
                initial={{ width: 0 }}
                animate={{ width: `${Number(value)}%` }}
                transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="surface-card rounded-lg p-5">
      <div className="mb-4">
        <h2 className="text-title-lg text-foreground">{title}</h2>
        <p className="mt-1 text-body-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function VitalSignsChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={telemetryData} margin={{ left: -12, right: 8, top: 16, bottom: 8 }}>
        <defs>
          <linearGradient id="mission-happiness" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2FB36D" stopOpacity={0.24} />
            <stop offset="95%" stopColor="#2FB36D" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="mission-healthcare" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#F45D6B" stopOpacity={0.20} />
            <stop offset="95%" stopColor="#F45D6B" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#DDE8EA" strokeDasharray="3 6" vertical={false} />
        <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Area type="monotone" dataKey="happiness" stroke="#2FB36D" strokeWidth={3} fill="url(#mission-happiness)" />
        <Area type="monotone" dataKey="healthcare" stroke="#F45D6B" strokeWidth={3} fill="url(#mission-healthcare)" />
        <Line type="monotone" dataKey="population" stroke="#2F6BFF" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function LoadChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={telemetryData} margin={{ left: -12, right: 8, top: 16, bottom: 8 }}>
        <CartesianGrid stroke="#DDE8EA" strokeDasharray="3 6" vertical={false} />
        <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <Tooltip cursor={{ fill: "rgba(0, 158, 157, 0.06)" }} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Bar dataKey="gdp" fill="#009E9D" radius={[6, 6, 2, 2]} />
        <Bar dataKey="traffic" fill="#775CFF" radius={[6, 6, 2, 2]} />
        <Bar dataKey="pollution" fill="#F6B73C" radius={[6, 6, 2, 2]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function HeatmapPanel() {
  return (
    <section className="surface-card rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="token-label">Heatmaps</p>
          <h2 className="text-title-lg text-foreground">District pressure</h2>
        </div>
        <Badge variant="warning">Live risk</Badge>
      </div>

      <div className="grid grid-cols-6 gap-2">
        {heatmapCells.map((value, index) => (
          <motion.div
            key={`${value}-${index}`}
            className={cn("aspect-square rounded-md border border-white/70 shadow-polis-xs", heatColor(value))}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.015, duration: 0.25 }}
            title={`District ${index + 1}: ${value}% pressure`}
          />
        ))}
      </div>

      <div className="mt-5 grid gap-2">
        {[
          ["Low", "bg-city-park"],
          ["Watch", "bg-city-solar"],
          ["Critical", "bg-city-coral"]
        ].map(([label, color]) => (
          <div key={String(label)} className="flex items-center gap-2 text-caption font-semibold text-muted-foreground">
            <span className={cn("size-2.5 rounded-sm", String(color))} />
            {String(label)}
          </div>
        ))}
      </div>
    </section>
  );
}

function OperationsTable() {
  const rows = [
    ["Population growth", "Stable", "Planning", "8.42M", "96%"],
    ["GDP forecast", "Accelerating", "Finance", "$684B", "92%"],
    ["Happiness index", "Improving", "Services", "78%", "89%"],
    ["Traffic pressure", "Optimized", "Mobility", "64%", "94%"],
    ["Pollution watch", "Reducing", "Climate", "38 AQI", "91%"],
    ["Healthcare readiness", "Surge-ready", "Health", "91%", "93%"]
  ];

  return (
    <section className="surface-card rounded-lg p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-title-lg text-foreground">Mission objectives</h2>
          <p className="mt-1 text-body-sm text-muted-foreground">Palantir-style civic facts connected to operational owners.</p>
        </div>
        <Button variant="outline" size="sm">
          <Activity />
          Audit trail
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/70 bg-white/[0.78]">
        <div className="grid min-w-[760px] grid-cols-[1.4fr_1fr_1fr_0.8fr_0.8fr] border-b border-border/70 px-4 py-3 text-caption font-bold uppercase text-muted-foreground">
          <span>Signal</span>
          <span>Status</span>
          <span>Owner</span>
          <span>Value</span>
          <span>Confidence</span>
        </div>
        <div className="overflow-x-auto">
          {rows.map(([signal, status, owner, value, confidence]) => (
            <div key={signal} className="grid min-w-[760px] grid-cols-[1.4fr_1fr_1fr_0.8fr_0.8fr] border-b border-border/60 px-4 py-3 text-body-sm last:border-b-0">
              <span className="font-semibold text-foreground">{signal}</span>
              <span className="text-muted-foreground">{status}</span>
              <span className="text-muted-foreground">{owner}</span>
              <span className="font-semibold text-foreground">{value}</span>
              <span className="font-mono text-[11px] font-bold text-city-civic">{confidence}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ForecastPanel({ chartsReady }: { chartsReady: boolean }) {
  return (
    <section className="glass-card rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="token-label">Forecast</p>
          <h2 className="text-title-lg text-foreground">Next 6 hours</h2>
        </div>
        <Cpu className="size-5 text-city-civic" />
      </div>
      <div className="h-[240px] min-w-0">
        {chartsReady ? (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={telemetryData} margin={{ left: -12, right: 8, top: 16, bottom: 8 }}>
              <CartesianGrid stroke="#DDE8EA" strokeDasharray="3 6" vertical={false} />
              <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
              <Line type="monotone" dataKey="traffic" stroke="#775CFF" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="pollution" stroke="#F6B73C" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="healthcare" stroke="#F45D6B" strokeWidth={3} dot={false} />
            </RechartsLineChart>
          </ResponsiveContainer>
        ) : (
          <ChartSkeleton />
        )}
      </div>
      <div className="mt-4 rounded-lg border border-white/70 bg-white/[0.72] p-4">
        <p className="text-body-sm font-semibold text-foreground">Recommended action</p>
        <p className="mt-1 text-body-sm text-muted-foreground">
          Keep adaptive traffic timing active while shifting mobile health teams toward Northline.
        </p>
      </div>
    </section>
  );
}

function ControlRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-white/[0.78] p-3 shadow-polis-xs">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-md bg-city-civic/10 text-city-civic">
          <Icon className="size-4" />
        </div>
        <span className="truncate text-body-sm font-semibold text-foreground">{label}</span>
      </div>
      <Badge variant="glass">{value}</Badge>
    </div>
  );
}

function ChartSkeleton({ bars = false }: { bars?: boolean }) {
  return (
    <div className="flex h-full items-end gap-2 rounded-lg border border-border/70 bg-city-mist p-4">
      {[42, 58, 46, 70, 62, 84, 76, 90, 64, 78, 72, 88].map((height, index) => (
        <div
          key={`mission-skeleton-${index}`}
          className={cn("w-full rounded-t-md", bars ? "bg-city-solar/70" : "bg-city-civic/40")}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

function heatColor(value: number) {
  if (value > 82) return "bg-city-coral/80";
  if (value > 66) return "bg-city-solar/75";
  if (value > 50) return "bg-city-civic/[0.55]";
  return "bg-city-park/40";
}

function toneClass(tone: Kpi["tone"] | (typeof districts)[number]["tone"]) {
  return {
    civic: "bg-city-civic/10 text-city-civic",
    signal: "bg-city-signal/10 text-city-signal",
    solar: "bg-city-solar/[0.16] text-[#8A5A00]",
    park: "bg-city-park/10 text-city-park",
    coral: "bg-city-coral/10 text-city-coral",
    transit: "bg-city-transit/10 text-city-transit"
  }[tone];
}
