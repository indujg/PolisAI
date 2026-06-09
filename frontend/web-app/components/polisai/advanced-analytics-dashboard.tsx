"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { interpolateRgb, linkHorizontal, scaleLinear } from "d3";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Brain,
  Building2,
  CircleDollarSign,
  Factory,
  GraduationCap,
  HeartPulse,
  Layers3,
  RadioTower,
  Route,
  ShieldCheck,
  Sparkles,
  Wind
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MetricKey = "gdp" | "carbon" | "traffic" | "education" | "healthcare";

type MetricConfig = {
  key: MetricKey;
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  icon: LucideIcon;
  tone: "civic" | "signal" | "solar" | "park" | "coral" | "transit";
  detail: string;
};

type HeatCell = {
  id: string;
  district: string;
  metric: MetricKey;
  value: number;
};

type SankeyNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
};

type SankeyLink = {
  id: string;
  source: SankeyNode;
  target: SankeyNode;
  value: number;
  color: string;
};

const metrics: MetricConfig[] = [
  {
    key: "gdp",
    label: "GDP Growth",
    value: "+4.8%",
    delta: "+0.9%",
    trend: "up",
    icon: CircleDollarSign,
    tone: "civic",
    detail: "Quarterly growth forecast across commercial districts"
  },
  {
    key: "carbon",
    label: "Carbon Emissions",
    value: "31.4 Mt",
    delta: "-6.2%",
    trend: "down",
    icon: Wind,
    tone: "solar",
    detail: "Industrial and mobility emissions after policy offsets"
  },
  {
    key: "traffic",
    label: "Traffic",
    value: "62%",
    delta: "-8.1%",
    trend: "down",
    icon: Route,
    tone: "transit",
    detail: "Congestion pressure after adaptive signal timing"
  },
  {
    key: "education",
    label: "Education",
    value: "88",
    delta: "+3.4",
    trend: "up",
    icon: GraduationCap,
    tone: "park",
    detail: "Composite readiness across schools and workforce skills"
  },
  {
    key: "healthcare",
    label: "Healthcare",
    value: "92%",
    delta: "+4.1%",
    trend: "up",
    icon: HeartPulse,
    tone: "coral",
    detail: "Care access, emergency capacity, and prevention coverage"
  }
];

const trendData = [
  { month: "Jan", gdp: 2.8, carbon: 42, traffic: 74, education: 76, healthcare: 81 },
  { month: "Feb", gdp: 3.1, carbon: 40, traffic: 71, education: 78, healthcare: 83 },
  { month: "Mar", gdp: 3.4, carbon: 39, traffic: 69, education: 79, healthcare: 84 },
  { month: "Apr", gdp: 3.8, carbon: 36, traffic: 66, education: 82, healthcare: 86 },
  { month: "May", gdp: 4.2, carbon: 34, traffic: 64, education: 84, healthcare: 89 },
  { month: "Jun", gdp: 4.8, carbon: 31, traffic: 62, education: 88, healthcare: 92 }
];

const districtData = [
  { district: "Civic Core", gdp: 92, carbon: 34, traffic: 58, education: 91, healthcare: 94 },
  { district: "North Loop", gdp: 84, carbon: 41, traffic: 62, education: 87, healthcare: 89 },
  { district: "Harbor Edge", gdp: 78, carbon: 68, traffic: 71, education: 76, healthcare: 82 },
  { district: "Greenline", gdp: 81, carbon: 47, traffic: 76, education: 83, healthcare: 85 },
  { district: "East Habitat", gdp: 73, carbon: 39, traffic: 54, education: 79, healthcare: 88 },
  { district: "Factory Belt", gdp: 88, carbon: 74, traffic: 69, education: 72, healthcare: 80 },
  { district: "University Row", gdp: 86, carbon: 29, traffic: 49, education: 96, healthcare: 90 },
  { district: "Solar Ward", gdp: 80, carbon: 25, traffic: 51, education: 84, healthcare: 87 }
];

const sankeyNodes: SankeyNode[] = [
  { id: "inputs", label: "City Data", x: 24, y: 132, color: "#101824" },
  { id: "economy", label: "Economy", x: 220, y: 56, color: "#009E9D" },
  { id: "climate", label: "Climate", x: 220, y: 146, color: "#F6B73C" },
  { id: "mobility", label: "Mobility", x: 220, y: 236, color: "#775CFF" },
  { id: "education", label: "Education", x: 420, y: 88, color: "#2FB36D" },
  { id: "healthcare", label: "Healthcare", x: 420, y: 200, color: "#F45D6B" },
  { id: "decision", label: "Policy Decision", x: 640, y: 142, color: "#2F6BFF" }
];

const sankeyLinks = makeSankeyLinks();

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

export function AdvancedAnalyticsDashboard() {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("gdp");
  const [chartsReady, setChartsReady] = useState(false);
  const heatmap = useMemo(() => buildHeatmap(selectedMetric), [selectedMetric]);
  const selectedMetricConfig = metrics.find((metric) => metric.key === selectedMetric) ?? metrics[0];

  useEffect(() => {
    setChartsReady(true);
  }, []);

  return (
    <div className="grid gap-5">
      <section className="glass-card city-map overflow-hidden rounded-lg p-4 sm:p-5 lg:p-6">
        <div className="relative z-[1] flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <Badge variant="glass" className="mb-3 gap-1.5">
              <Brain className="size-3.5 text-city-civic" />
              Advanced analytics / Recharts + D3.js
            </Badge>
            <h1 className="text-display-md text-foreground">Advanced Analytics Dashboard</h1>
            <p className="mt-3 max-w-3xl text-body-lg text-muted-foreground">
              Analyze GDP growth, carbon emissions, traffic, education, and healthcare through forecast charts, district heatmaps, and D3-powered civic flow diagrams.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success" className="gap-1.5">
              <RadioTower className="size-3.5" />
              Live telemetry
            </Badge>
            <Button variant="outline">
              <ShieldCheck />
              Audit model
            </Button>
            <Button variant="signal">
              <Sparkles />
              Generate brief
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric, index) => (
          <MetricCard
            key={metric.key}
            metric={metric}
            active={selectedMetric === metric.key}
            index={index}
            onClick={() => setSelectedMetric(metric.key)}
          />
        ))}
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="grid gap-5 xl:grid-cols-2">
          <ChartPanel title="City Performance Lines" description="GDP, traffic, education, and healthcare trend lines.">
            <div className="h-[330px] min-w-0">
              {chartsReady ? <LinePerformanceChart /> : <ChartSkeleton />}
            </div>
          </ChartPanel>

          <ChartPanel title="Carbon and Traffic Area" description="Pressure reduction from climate and mobility interventions.">
            <div className="h-[330px] min-w-0">
              {chartsReady ? <AreaPressureChart /> : <ChartSkeleton />}
            </div>
          </ChartPanel>
        </div>

        <HeatmapPanel metric={selectedMetricConfig} cells={heatmap} />
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_28rem]">
        <SankeyPanel />
        <InsightsPanel selectedMetric={selectedMetricConfig} />
      </section>
    </div>
  );
}

function MetricCard({
  metric,
  active,
  index,
  onClick
}: {
  metric: MetricConfig;
  active: boolean;
  index: number;
  onClick: () => void;
}) {
  const Icon = metric.icon;
  const TrendIcon = metric.trend === "up" ? ArrowUpRight : ArrowDownRight;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.045, duration: 0.35 }}
      className={cn(
        "rounded-lg border p-4 text-left shadow-polis-sm backdrop-blur-2xl transition-all hover:-translate-y-1 hover:shadow-polis-md",
        active ? "border-city-civic/45 bg-white/[0.92]" : "border-white/75 bg-white/[0.76]"
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className={cn("grid size-10 place-items-center rounded-md", toneClass(metric.tone))}>
          <Icon className="size-4" />
        </div>
        <Badge variant={metric.trend === "up" ? "success" : "warning"} className="gap-1">
          <TrendIcon className="size-3.5" />
          {metric.delta}
        </Badge>
      </div>
      <p className="text-metric text-foreground">{metric.value}</p>
      <p className="mt-1 text-body-sm font-bold text-foreground">{metric.label}</p>
      <p className="mt-2 text-caption text-muted-foreground">{metric.detail}</p>
    </motion.button>
  );
}

function ChartPanel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="surface-card rounded-lg p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-title-lg text-foreground">{title}</h2>
          <p className="mt-1 text-body-sm text-muted-foreground">{description}</p>
        </div>
        <BarChart3 className="size-5 shrink-0 text-city-civic" />
      </div>
      {children}
    </section>
  );
}

function LinePerformanceChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={trendData} margin={{ left: -12, right: 8, top: 16, bottom: 8 }}>
        <CartesianGrid stroke="#DDE8EA" strokeDasharray="3 6" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Line type="monotone" dataKey="gdp" stroke="#009E9D" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="education" stroke="#2FB36D" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="healthcare" stroke="#F45D6B" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="traffic" stroke="#775CFF" strokeWidth={3} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function AreaPressureChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={trendData} margin={{ left: -12, right: 8, top: 16, bottom: 8 }}>
        <defs>
          <linearGradient id="analytics-carbon" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#F6B73C" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#F6B73C" stopOpacity={0.03} />
          </linearGradient>
          <linearGradient id="analytics-traffic" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#775CFF" stopOpacity={0.22} />
            <stop offset="95%" stopColor="#775CFF" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#DDE8EA" strokeDasharray="3 6" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Area type="monotone" dataKey="carbon" stroke="#F6B73C" strokeWidth={3} fill="url(#analytics-carbon)" />
        <Area type="monotone" dataKey="traffic" stroke="#775CFF" strokeWidth={3} fill="url(#analytics-traffic)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function HeatmapPanel({ metric, cells }: { metric: MetricConfig; cells: HeatCell[] }) {
  const Icon = metric.icon;

  return (
    <section className="surface-card rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="token-label">D3 heatmap</p>
          <h2 className="text-title-lg text-foreground">{metric.label} by district</h2>
        </div>
        <div className={cn("grid size-10 place-items-center rounded-md", toneClass(metric.tone))}>
          <Icon className="size-4" />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {cells.map((cell, index) => (
          <motion.div
            key={cell.id}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.014, duration: 0.24 }}
            className="aspect-square rounded-md border border-white/70 shadow-polis-xs"
            style={{ backgroundColor: cellColor(cell.value, metric.key) }}
            title={`${cell.district}: ${cell.value}`}
          />
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-border/70 bg-white/[0.76] p-4">
        <p className="text-body-sm font-bold text-foreground">Selected metric</p>
        <p className="mt-1 text-body-sm text-muted-foreground">{metric.detail}</p>
      </div>
    </section>
  );
}

function SankeyPanel() {
  const sankeyPath = useMemo(() => {
    return linkHorizontal<SankeyLink, [number, number]>()
      .source((link) => [link.source.x + 112, link.source.y])
      .target((link) => [link.target.x, link.target.y]);
  }, []);

  return (
    <section className="glass-card rounded-lg p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="token-label">D3 Sankey diagram</p>
          <h2 className="text-title-lg text-foreground">Civic decision flow</h2>
          <p className="mt-1 text-body-sm text-muted-foreground">
            Data sources flow through analytic domains into policy decisions.
          </p>
        </div>
        <Badge variant="secondary">D3 paths</Badge>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-white/70 bg-white/[0.64] p-3 shadow-glass">
        <svg viewBox="0 0 780 310" className="h-[360px] w-full">
          {sankeyLinks.map((link) => (
            <motion.path
              key={link.id}
              d={sankeyPath(link) ?? undefined}
              fill="none"
              stroke={link.color}
              strokeLinecap="round"
              strokeOpacity={0.34}
              strokeWidth={Math.max(8, link.value / 4)}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: link.value / 180 }}
            />
          ))}
          {sankeyNodes.map((node) => (
            <g key={node.id}>
              <rect x={node.x} y={node.y - 24} width="112" height="48" rx="8" fill="rgba(255,255,255,0.9)" stroke="rgba(221,232,234,0.9)" />
              <rect x={node.x} y={node.y - 24} width="7" height="48" rx="3.5" fill={node.color} />
              <text x={node.x + 16} y={node.y + 4} fill="#101824" fontSize="13" fontWeight="700">
                {node.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}

function InsightsPanel({ selectedMetric }: { selectedMetric: MetricConfig }) {
  const Icon = selectedMetric.icon;

  return (
    <aside className="grid h-fit gap-5">
      <section className="surface-card rounded-lg p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="token-label">Analytics command</p>
            <h2 className="text-title-lg text-foreground">Model insight</h2>
          </div>
          <div className={cn("grid size-11 place-items-center rounded-md", toneClass(selectedMetric.tone))}>
            <Icon className="size-5" />
          </div>
        </div>
        <div className="grid gap-3">
          <InsightRow icon={Activity} label="Signal quality" value="96%" />
          <InsightRow icon={Layers3} label="Datasets fused" value="214" />
          <InsightRow icon={Factory} label="Industrial nodes" value="38" />
          <InsightRow icon={Building2} label="District coverage" value="100%" />
        </div>
      </section>

      <section className="glass-card rounded-lg p-5">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="size-4 text-city-civic" />
          <h3 className="text-title-md text-foreground">PolisAI recommendation</h3>
        </div>
        <p className="text-body-sm text-muted-foreground">
          Prioritize {selectedMetric.label.toLowerCase()} interventions in Harbor Edge and Factory Belt while preserving education and healthcare gains in Civic Core.
        </p>
      </section>
    </aside>
  );
}

function InsightRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
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
          key={`analytics-skeleton-${index}`}
          className={cn("w-full rounded-t-md", bars ? "bg-city-solar/70" : "bg-city-civic/40")}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

function buildHeatmap(metric: MetricKey): HeatCell[] {
  return districtData.flatMap((district, districtIndex) => {
    return Array.from({ length: 5 }, (_, cellIndex) => {
      const wave = Math.sin((districtIndex + 1) * (cellIndex + 2)) * 8;
      const value = Math.round(district[metric] + wave);
      return {
        id: `${district.district}-${cellIndex}`,
        district: district.district,
        metric,
        value
      };
    });
  });
}

function makeSankeyLinks(): SankeyLink[] {
  const node = (id: string) => sankeyNodes.find((item) => item.id === id)!;
  return [
    { id: "inputs-economy", source: node("inputs"), target: node("economy"), value: 72, color: "#009E9D" },
    { id: "inputs-climate", source: node("inputs"), target: node("climate"), value: 54, color: "#F6B73C" },
    { id: "inputs-mobility", source: node("inputs"), target: node("mobility"), value: 68, color: "#775CFF" },
    { id: "economy-education", source: node("economy"), target: node("education"), value: 38, color: "#2FB36D" },
    { id: "economy-healthcare", source: node("economy"), target: node("healthcare"), value: 32, color: "#F45D6B" },
    { id: "climate-healthcare", source: node("climate"), target: node("healthcare"), value: 42, color: "#F6B73C" },
    { id: "mobility-education", source: node("mobility"), target: node("education"), value: 28, color: "#775CFF" },
    { id: "education-decision", source: node("education"), target: node("decision"), value: 64, color: "#2FB36D" },
    { id: "healthcare-decision", source: node("healthcare"), target: node("decision"), value: 58, color: "#F45D6B" }
  ];
}

function cellColor(value: number, metric: MetricKey) {
  const domain = metric === "carbon" || metric === "traffic" ? [25, 78] : [55, 98];
  const colorScale = scaleLinear<string>()
    .domain(domain)
    .range(metric === "carbon" || metric === "traffic" ? ["#2FB36D", "#F45D6B"] : ["#E8F0F1", "#009E9D"])
    .interpolate(interpolateRgb);
  return colorScale(value);
}

function toneClass(tone: MetricConfig["tone"]) {
  return {
    civic: "bg-city-civic/10 text-city-civic",
    signal: "bg-city-signal/10 text-city-signal",
    solar: "bg-city-solar/[0.16] text-[#8A5A00]",
    park: "bg-city-park/10 text-city-park",
    coral: "bg-city-coral/10 text-city-coral",
    transit: "bg-city-transit/10 text-city-transit"
  }[tone];
}
