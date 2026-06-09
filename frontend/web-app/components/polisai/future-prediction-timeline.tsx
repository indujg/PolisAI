"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Building2,
  Car,
  CircleDollarSign,
  GitCompareArrows,
  Pause,
  Play,
  RadioTower,
  ShieldCheck,
  Smile,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UsersRound,
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

type TimelineYear = 1 | 3 | 5 | 10;
type MetricKey = "gdp" | "population" | "traffic" | "pollution" | "happiness";

type PredictionPoint = {
  year: TimelineYear;
  label: string;
  baseline: Record<MetricKey, number>;
  optimized: Record<MetricKey, number>;
  summary: string;
  confidence: number;
};

type MetricConfig = {
  key: MetricKey;
  label: string;
  icon: LucideIcon;
  suffix: string;
  prefix?: string;
  tone: "civic" | "signal" | "solar" | "park" | "coral" | "transit";
  positiveDirection: "up" | "down";
};

const timeline: PredictionPoint[] = [
  {
    year: 1,
    label: "Year 1",
    baseline: { gdp: 705, population: 8.52, traffic: 68, pollution: 44, happiness: 76 },
    optimized: { gdp: 718, population: 8.55, traffic: 61, pollution: 39, happiness: 80 },
    confidence: 94,
    summary: "Fast signal optimization and targeted service improvements create early mobility and happiness gains."
  },
  {
    year: 3,
    label: "Year 3",
    baseline: { gdp: 746, population: 8.78, traffic: 72, pollution: 49, happiness: 74 },
    optimized: { gdp: 792, population: 8.86, traffic: 58, pollution: 35, happiness: 83 },
    confidence: 91,
    summary: "Policy feedback loops compound: emissions fall, GDP expands, and commute pressure stabilizes."
  },
  {
    year: 5,
    label: "Year 5",
    baseline: { gdp: 792, population: 9.04, traffic: 77, pollution: 55, happiness: 72 },
    optimized: { gdp: 875, population: 9.21, traffic: 54, pollution: 30, happiness: 86 },
    confidence: 88,
    summary: "Metro expansion and EV adoption reshape the city’s economic center of gravity."
  },
  {
    year: 10,
    label: "Year 10",
    baseline: { gdp: 914, population: 9.72, traffic: 86, pollution: 63, happiness: 68 },
    optimized: { gdp: 1120, population: 10.18, traffic: 47, pollution: 24, happiness: 91 },
    confidence: 82,
    summary: "The optimized future becomes structurally different: cleaner growth, larger population, lower friction."
  }
];

const metrics: MetricConfig[] = [
  { key: "gdp", label: "GDP", icon: CircleDollarSign, prefix: "$", suffix: "B", tone: "civic", positiveDirection: "up" },
  { key: "population", label: "Population", icon: UsersRound, suffix: "M", tone: "signal", positiveDirection: "up" },
  { key: "traffic", label: "Traffic", icon: Car, suffix: "%", tone: "transit", positiveDirection: "down" },
  { key: "pollution", label: "Pollution", icon: Wind, suffix: " AQI", tone: "solar", positiveDirection: "down" },
  { key: "happiness", label: "Happiness", icon: Smile, suffix: "%", tone: "park", positiveDirection: "up" }
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

export function FuturePredictionTimeline() {
  const [selectedYear, setSelectedYear] = useState<TimelineYear>(1);
  const [comparisonMode, setComparisonMode] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    setChartsReady(true);
  }, []);

  useEffect(() => {
    if (!playing) return;

    const interval = window.setInterval(() => {
      setSelectedYear((current) => {
        const index = timeline.findIndex((point) => point.year === current);
        return timeline[(index + 1) % timeline.length].year;
      });
    }, 2400);

    return () => window.clearInterval(interval);
  }, [playing]);

  const selected = timeline.find((point) => point.year === selectedYear) ?? timeline[0];
  const selectedIndex = timeline.findIndex((point) => point.year === selected.year);
  const progress = (selectedIndex / (timeline.length - 1)) * 100;
  const chartData = useMemo(
    () =>
      timeline.map((point) => ({
        label: point.label,
        year: point.year,
        baselineGdp: point.baseline.gdp,
        optimizedGdp: point.optimized.gdp,
        baselineTraffic: point.baseline.traffic,
        optimizedTraffic: point.optimized.traffic,
        baselinePollution: point.baseline.pollution,
        optimizedPollution: point.optimized.pollution,
        baselineHappiness: point.baseline.happiness,
        optimizedHappiness: point.optimized.happiness,
        population: point.optimized.population
      })),
    []
  );
  const comparisonRows = metrics.map((metric) => {
    const baseline = selected.baseline[metric.key];
    const optimized = selected.optimized[metric.key];
    const delta = optimized - baseline;
    const favorable = metric.positiveDirection === "up" ? delta >= 0 : delta <= 0;

    return { metric, baseline, optimized, delta, favorable };
  });

  return (
    <div className="grid gap-5">
      <section className="glass-card city-map overflow-hidden rounded-lg p-4 sm:p-5 lg:p-6">
        <div className="relative z-[1] flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <Badge variant="glass" className="mb-3 gap-1.5">
              <Brain className="size-3.5 text-city-civic" />
              Future prediction model / civic scenario engine
            </Badge>
            <h1 className="text-display-md text-foreground">Future Prediction Timeline</h1>
            <p className="mt-3 max-w-3xl text-body-lg text-muted-foreground">
              Explore PolisAI forecasts across Year 1, Year 3, Year 5, and Year 10 for GDP, population, traffic, pollution, and happiness.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success" className="gap-1.5">
              <RadioTower className="size-3.5" />
              {selected.confidence}% confidence
            </Badge>
            <Button variant={comparisonMode ? "signal" : "outline"} onClick={() => setComparisonMode((value) => !value)}>
              <GitCompareArrows />
              Compare
            </Button>
            <Button variant="premium" onClick={() => setPlaying((value) => !value)}>
              {playing ? <Pause /> : <Play />}
              {playing ? "Pause" : "Play"}
            </Button>
          </div>
        </div>
      </section>

      <section className="surface-card rounded-lg p-4 sm:p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="token-label">Horizontal timeline</p>
            <h2 className="text-title-lg text-foreground">Prediction horizon</h2>
          </div>
          <Badge variant="glass">Animated progression</Badge>
        </div>

        <div className="relative px-2 pb-2 pt-8">
          <div className="absolute left-4 right-4 top-[3.25rem] h-1 rounded-full bg-muted" />
          <motion.div
            className="absolute left-4 top-[3.25rem] h-1 rounded-full bg-city-civic"
            animate={{ width: `calc(${progress}% - ${progress === 0 ? "0px" : "1rem"})` }}
            transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
          />
          <div className="relative grid grid-cols-4 gap-3">
            {timeline.map((point, index) => {
              const active = point.year === selected.year;
              const passed = index <= selectedIndex;

              return (
                <button
                  key={point.year}
                  type="button"
                  onClick={() => setSelectedYear(point.year)}
                  className="group flex flex-col items-center gap-3 text-center"
                >
                  <motion.span
                    className={cn(
                      "grid size-11 place-items-center rounded-full border text-body-sm font-bold shadow-polis-xs transition-colors",
                      active
                        ? "border-city-civic bg-city-civic text-white"
                        : passed
                          ? "border-city-civic/30 bg-city-civic/10 text-city-civic"
                          : "border-border bg-white text-muted-foreground"
                    )}
                    animate={active ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                    transition={{ duration: 0.9, repeat: active && playing ? Infinity : 0 }}
                  >
                    {point.year}
                  </motion.span>
                  <div className="min-w-0">
                    <p className="text-body-sm font-bold text-foreground">{point.label}</p>
                    <p className="mt-1 hidden text-caption text-muted-foreground sm:block">
                      {point.confidence}% model confidence
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="glass-card city-map rounded-lg p-5">
          <div className="relative z-[1] grid gap-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="token-label">Selected future</p>
                <h2 className="text-title-lg text-foreground">{selected.label} forecast</h2>
                <p className="mt-2 max-w-3xl text-body-sm text-muted-foreground">{selected.summary}</p>
              </div>
              <Badge variant={comparisonMode ? "secondary" : "glass"}>
                {comparisonMode ? "Baseline vs PolisAI" : "PolisAI trajectory"}
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {metrics.map((metric, index) => (
                <MetricForecastCard
                  key={metric.key}
                  metric={metric}
                  baseline={selected.baseline[metric.key]}
                  optimized={selected.optimized[metric.key]}
                  comparisonMode={comparisonMode}
                  index={index}
                />
              ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <FutureCityScene selected={selected} comparisonMode={comparisonMode} />
              <OutcomePanel selected={selected} comparisonRows={comparisonRows} />
            </div>
          </div>
        </div>

        <ComparisonPanel rows={comparisonRows} comparisonMode={comparisonMode} />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <ChartPanel title="GDP and Population Projection" description="Long-range optimized trajectory against baseline GDP.">
          <div className="h-[320px] min-w-0">
            {chartsReady ? <GdpChart data={chartData} comparisonMode={comparisonMode} /> : <ChartSkeleton />}
          </div>
        </ChartPanel>

        <ChartPanel title="Quality of Life Signals" description="Traffic, pollution, and happiness over time.">
          <div className="h-[320px] min-w-0">
            {chartsReady ? <QualityChart data={chartData} comparisonMode={comparisonMode} /> : <ChartSkeleton bars />}
          </div>
        </ChartPanel>
      </section>
    </div>
  );
}

function MetricForecastCard({
  metric,
  baseline,
  optimized,
  comparisonMode,
  index
}: {
  metric: MetricConfig;
  baseline: number;
  optimized: number;
  comparisonMode: boolean;
  index: number;
}) {
  const Icon = metric.icon;
  const delta = optimized - baseline;
  const favorable = metric.positiveDirection === "up" ? delta >= 0 : delta <= 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.045, duration: 0.35 }}
      className="rounded-lg border border-white/75 bg-white/[0.76] p-4 shadow-polis-sm backdrop-blur-2xl"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className={cn("grid size-10 place-items-center rounded-md", toneClass(metric.tone))}>
          <Icon className="size-4" />
        </div>
        {comparisonMode ? (
          <Badge variant={favorable ? "success" : "warning"}>{formatDelta(metric, delta)}</Badge>
        ) : (
          <Badge variant="glass">Forecast</Badge>
        )}
      </div>
      <motion.p
        key={`${metric.key}-${optimized}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-metric text-foreground"
      >
        {formatMetric(metric, optimized)}
      </motion.p>
      <p className="mt-1 text-body-sm font-bold text-foreground">{metric.label}</p>
      {comparisonMode ? (
        <p className="mt-2 text-caption text-muted-foreground">Baseline: {formatMetric(metric, baseline)}</p>
      ) : (
        <p className="mt-2 text-caption text-muted-foreground">PolisAI optimized projection</p>
      )}
    </motion.article>
  );
}

function FutureCityScene({ selected, comparisonMode }: { selected: PredictionPoint; comparisonMode: boolean }) {
  const pollution = selected.optimized.pollution;
  const traffic = selected.optimized.traffic;
  const happiness = selected.optimized.happiness;
  const skyline = [44, 68, 52, 80, 62, 92, 74, 58, 86, 64, 76, 50];

  return (
    <div className="relative min-h-[360px] overflow-hidden rounded-lg border border-white/75 bg-white/[0.56] shadow-glass backdrop-blur-2xl">
      <div className="absolute inset-0 bg-city-grid [background-size:28px_28px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(19,200,195,0.18),transparent_24%),radial-gradient(circle_at_82%_12%,rgba(246,183,60,0.16),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.24),rgba(255,255,255,0.74))]" />

      <div className="absolute bottom-0 left-0 right-0 grid h-[74%] grid-cols-12 items-end gap-2 px-5">
        {skyline.map((height, index) => (
          <motion.div
            key={`future-skyline-${index}`}
            className="relative rounded-t-md border border-white/75 bg-white/[0.78] shadow-polis-sm backdrop-blur-xl"
            animate={{ height: `${height + selected.year * 1.4}%` }}
            transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <span className="absolute inset-x-2 top-3 h-1 rounded-full bg-city-civic/20" />
            <span className="absolute inset-x-2 top-7 h-1 rounded-full bg-city-signal/20" />
          </motion.div>
        ))}
      </div>

      <motion.div
        className="absolute left-6 right-6 top-[55%] h-1.5 rounded-full bg-city-civic/35"
        animate={{ opacity: 1 - traffic / 140 }}
      />
      <motion.div
        className="absolute left-10 right-16 top-[72%] h-1.5 -rotate-[8deg] rounded-full bg-city-signal/30"
        animate={{ opacity: 1 - traffic / 150 }}
      />
      <motion.div
        className="absolute right-6 top-6 rounded-lg border border-white/75 bg-white/[0.82] p-3 shadow-glass backdrop-blur-2xl"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <p className="token-label">Future atmosphere</p>
        <p className="mt-1 text-title-md text-foreground">{pollution} AQI</p>
      </motion.div>
      <motion.div
        className="absolute left-6 top-6 rounded-lg border border-white/75 bg-white/[0.82] p-3 shadow-glass backdrop-blur-2xl"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <p className="token-label">Civic happiness</p>
        <p className="mt-1 text-title-md text-foreground">{happiness}%</p>
      </motion.div>

      {comparisonMode ? (
        <div className="absolute bottom-5 left-5 right-5 grid gap-2 sm:grid-cols-3">
          <SceneChip icon={Building2} label="Growth" value={formatMetric(metrics[0], selected.optimized.gdp)} />
          <SceneChip icon={Car} label="Traffic" value={`${selected.optimized.traffic}%`} />
          <SceneChip icon={Smile} label="Happiness" value={`${selected.optimized.happiness}%`} />
        </div>
      ) : null}
    </div>
  );
}

function OutcomePanel({
  selected,
  comparisonRows
}: {
  selected: PredictionPoint;
  comparisonRows: ReturnType<typeof buildComparisonRows>;
}) {
  const favorableCount = comparisonRows.filter((row) => row.favorable).length;

  return (
    <aside className="rounded-lg border border-white/75 bg-white/[0.76] p-5 shadow-glass backdrop-blur-2xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="token-label">Prediction summary</p>
          <h2 className="text-title-lg text-foreground">{selected.label} outcome</h2>
        </div>
        <Badge variant="success">{favorableCount}/5 improved</Badge>
      </div>
      <div className="grid gap-3">
        <OutcomeRow icon={TrendingUp} label="Economic expansion" value={formatDelta(metrics[0], selected.optimized.gdp - selected.baseline.gdp)} positive />
        <OutcomeRow icon={UsersRound} label="Population capacity" value={formatDelta(metrics[1], selected.optimized.population - selected.baseline.population)} positive />
        <OutcomeRow icon={TrendingDown} label="Friction reduced" value={`${selected.baseline.traffic - selected.optimized.traffic}% traffic`} positive />
        <OutcomeRow icon={ShieldCheck} label="Model confidence" value={`${selected.confidence}%`} positive={selected.confidence >= 85} />
      </div>
      <div className="mt-5 rounded-lg border border-city-civic/20 bg-city-civic/10 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="size-4 text-city-civic" />
          <p className="text-body-sm font-bold text-foreground">PolisAI readout</p>
        </div>
        <p className="text-body-sm text-muted-foreground">{selected.summary}</p>
      </div>
    </aside>
  );
}

function ComparisonPanel({
  rows,
  comparisonMode
}: {
  rows: ReturnType<typeof buildComparisonRows>;
  comparisonMode: boolean;
}) {
  return (
    <section className="surface-card rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="token-label">Comparison mode</p>
          <h2 className="text-title-lg text-foreground">Baseline vs PolisAI</h2>
        </div>
        <Badge variant={comparisonMode ? "secondary" : "glass"}>{comparisonMode ? "On" : "Off"}</Badge>
      </div>

      <div className="grid gap-3">
        {rows.map(({ metric, baseline, optimized, delta, favorable }) => {
          const Icon = metric.icon;

          return (
            <div key={metric.key} className="rounded-lg border border-border/70 bg-white/[0.78] p-3 shadow-polis-xs">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={cn("grid size-9 shrink-0 place-items-center rounded-md", toneClass(metric.tone))}>
                    <Icon className="size-4" />
                  </div>
                  <p className="truncate text-body-sm font-bold text-foreground">{metric.label}</p>
                </div>
                <Badge variant={favorable ? "success" : "warning"}>{formatDelta(metric, delta)}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-caption">
                <div className="rounded-md bg-muted/70 px-2 py-2">
                  <p className="font-bold uppercase text-muted-foreground">Baseline</p>
                  <p className="mt-1 font-mono text-[11px] font-bold text-foreground">{formatMetric(metric, baseline)}</p>
                </div>
                <div className="rounded-md bg-city-civic/10 px-2 py-2">
                  <p className="font-bold uppercase text-city-civic">PolisAI</p>
                  <p className="mt-1 font-mono text-[11px] font-bold text-foreground">{formatMetric(metric, optimized)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
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

function GdpChart({ data, comparisonMode }: { data: ForecastChartPoint[]; comparisonMode: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ left: -12, right: 8, top: 16, bottom: 8 }}>
        <CartesianGrid stroke="#DDE8EA" strokeDasharray="3 6" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        {comparisonMode ? <Line type="monotone" dataKey="baselineGdp" stroke="#94A3B8" strokeWidth={2} dot={false} strokeDasharray="6 6" /> : null}
        <Line type="monotone" dataKey="optimizedGdp" stroke="#009E9D" strokeWidth={3} dot={{ r: 4, fill: "#009E9D" }} />
        <Line type="monotone" dataKey="population" stroke="#2F6BFF" strokeWidth={3} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function QualityChart({ data, comparisonMode }: { data: ForecastChartPoint[]; comparisonMode: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: -12, right: 8, top: 16, bottom: 8 }}>
        <CartesianGrid stroke="#DDE8EA" strokeDasharray="3 6" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <Tooltip cursor={{ fill: "rgba(0, 158, 157, 0.06)" }} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        {comparisonMode ? <Bar dataKey="baselineTraffic" fill="#CBD5E1" radius={[6, 6, 2, 2]} /> : null}
        <Bar dataKey="optimizedTraffic" fill="#775CFF" radius={[6, 6, 2, 2]} />
        <Bar dataKey="optimizedPollution" fill="#F6B73C" radius={[6, 6, 2, 2]} />
        <Bar dataKey="optimizedHappiness" fill="#2FB36D" radius={[6, 6, 2, 2]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ChartSkeleton({ bars = false }: { bars?: boolean }) {
  return (
    <div className="flex h-full items-end gap-2 rounded-lg border border-border/70 bg-city-mist p-4">
      {[42, 58, 46, 70, 62, 84, 76, 90, 64, 78, 72, 88].map((height, index) => (
        <div
          key={`future-skeleton-${index}`}
          className={cn("w-full rounded-t-md", bars ? "bg-city-solar/70" : "bg-city-civic/40")}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

function SceneChip({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/70 bg-white/[0.78] p-3 shadow-polis-xs backdrop-blur-xl">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="size-3.5 text-city-civic" />
        <p className="text-caption font-bold uppercase text-muted-foreground">{label}</p>
      </div>
      <p className="text-title-md text-foreground">{value}</p>
    </div>
  );
}

function OutcomeRow({ icon: Icon, label, value, positive }: { icon: LucideIcon; label: string; value: string; positive: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-white/[0.78] p-3 shadow-polis-xs">
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn("grid size-9 shrink-0 place-items-center rounded-md", positive ? "bg-city-park/10 text-city-park" : "bg-city-solar/[0.16] text-[#8A5A00]")}>
          <Icon className="size-4" />
        </div>
        <p className="truncate text-body-sm font-semibold text-foreground">{label}</p>
      </div>
      <Badge variant={positive ? "success" : "warning"}>{value}</Badge>
    </div>
  );
}

type ForecastChartPoint = {
  label: string;
  year: number;
  baselineGdp: number;
  optimizedGdp: number;
  baselineTraffic: number;
  optimizedTraffic: number;
  baselinePollution: number;
  optimizedPollution: number;
  baselineHappiness: number;
  optimizedHappiness: number;
  population: number;
};

function buildComparisonRows(selected: PredictionPoint) {
  return metrics.map((metric) => {
    const baseline = selected.baseline[metric.key];
    const optimized = selected.optimized[metric.key];
    const delta = optimized - baseline;
    const favorable = metric.positiveDirection === "up" ? delta >= 0 : delta <= 0;

    return { metric, baseline, optimized, delta, favorable };
  });
}

function formatMetric(metric: MetricConfig, value: number) {
  const renderedValue = metric.key === "population" ? value.toFixed(2) : Math.round(value).toLocaleString();
  return `${metric.prefix ?? ""}${renderedValue}${metric.suffix}`;
}

function formatDelta(metric: MetricConfig, delta: number) {
  const sign = delta > 0 ? "+" : "";
  const value = metric.key === "population" ? delta.toFixed(2) : Math.round(delta).toLocaleString();
  return `${sign}${value}${metric.suffix}`;
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
