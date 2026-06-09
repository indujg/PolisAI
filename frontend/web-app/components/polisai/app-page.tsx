"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  BellRing,
  CircleDot,
  Command,
  Download,
  MapPinned,
  MoreHorizontal,
  RadioTower,
  Sparkles,
  TrendingUp
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { CollapsiblePanel } from "@/components/polisai/collapsible-panel";
import { pageSpecs, type Stat, type TableRow as PolisTableRow } from "@/components/polisai/page-data";
import type { PageId } from "@/components/polisai/navigation";
import { cn } from "@/lib/utils";

const chartData = [
  { hour: "06", demand: 42, forecast: 58, confidence: 84 },
  { hour: "09", demand: 68, forecast: 74, confidence: 89 },
  { hour: "12", demand: 61, forecast: 79, confidence: 92 },
  { hour: "15", demand: 74, forecast: 82, confidence: 90 },
  { hour: "18", demand: 86, forecast: 91, confidence: 94 },
  { hour: "21", demand: 59, forecast: 73, confidence: 96 }
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

export function AppPage({ pageId }: { pageId: PageId }) {
  const [chartsReady, setChartsReady] = useState(false);
  const spec = pageSpecs[pageId];
  const Icon = spec.icon;

  useEffect(() => {
    setChartsReady(true);
  }, []);

  return (
    <div className="grid gap-5">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="glass-card city-map min-h-[420px] rounded-lg p-4 sm:p-5 lg:p-6">
          <div className="relative z-[1] flex h-full flex-col gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant="glass" className="gap-1.5">
                    <Icon className="size-3.5 text-city-civic" />
                    {spec.eyebrow}
                  </Badge>
                  <Badge variant="success">Live</Badge>
                </div>
                <h1 className="text-display-md text-foreground">{spec.title}</h1>
                <p className="mt-3 max-w-2xl text-body-lg text-muted-foreground">{spec.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline">
                  <Download />
                  Export
                </Button>
                <Button variant="signal">
                  <Command />
                  {spec.primaryAction}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {spec.stats.map((stat, index) => (
                <MetricCard key={stat.label} stat={stat} index={index} />
              ))}
            </div>

            <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="relative min-h-[290px] overflow-hidden rounded-lg border border-white/70 bg-white/[0.54] shadow-glass backdrop-blur-2xl">
                <div className="absolute inset-0 bg-city-grid [background-size:24px_24px]" />
                <div className="absolute left-6 top-6 h-36 w-20 rounded-md border border-city-civic/25 bg-white/80 shadow-polis-sm" />
                <div className="absolute bottom-8 left-[28%] h-44 w-24 rounded-md border border-city-signal/25 bg-white/[0.82] shadow-polis-md" />
                <div className="absolute right-8 top-10 h-48 w-28 rounded-md border border-city-transit/25 bg-white/80 shadow-polis-sm" />
                <div className="absolute bottom-12 right-[24%] h-28 w-20 rounded-md border border-city-solar/30 bg-white/[0.78] shadow-polis-sm" />
                <div className="absolute left-8 right-8 top-1/2 h-1 rounded-full bg-city-civic/35" />
                <div className="absolute bottom-20 left-12 right-16 h-1 rotate-[-8deg] rounded-full bg-city-signal/30" />
                <div className="absolute left-[31%] top-[38%] size-4 rounded-sm bg-city-civic shadow-polis-sm" />
                <div className="absolute right-[29%] top-[49%] size-4 rounded-sm bg-city-signal shadow-polis-sm" />
                <div className="absolute bottom-[28%] left-[52%] size-4 rounded-sm bg-city-solar shadow-polis-sm" />
                <div className="absolute inset-x-4 bottom-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {["Mobility", "Energy", "Safety", "Services"].map((label) => (
                    <div key={label} className="rounded-md border border-white/70 bg-white/[0.76] px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground shadow-polis-xs">
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              <CommandStatus insight={spec.insight} />
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          <Card className="rounded-lg">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Live Forecast</CardTitle>
                  <CardDescription>Demand, confidence, and model signal.</CardDescription>
                </div>
                <Badge variant="glass">6h window</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[230px] min-w-0">
                {chartsReady ? <ForecastAreaChart /> : <ChartSkeleton />}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Load Mix</CardTitle>
                  <CardDescription>Current operational pressure.</CardDescription>
                </div>
                <Button variant="icon" size="icon-sm" aria-label="Chart options">
                  <MoreHorizontal />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[190px] min-w-0">
                {chartsReady ? <LoadBarChart /> : <ChartSkeleton bars />}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="grid gap-5">
          <div className="grid gap-5 lg:grid-cols-2">
            {spec.panels.map((panel, index) => (
              <CollapsiblePanel
                key={panel.title}
                title={panel.title}
                eyebrow={panel.eyebrow}
                status={panel.status}
                icon={panel.icon}
                defaultOpen={index === 0}
              >
                <div className="grid gap-3">
                  {panel.items.map((item) => (
                    <div key={item.title} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-white/[0.78] p-3 shadow-polis-xs">
                      <div className="min-w-0">
                        <p className="truncate text-body-sm font-semibold text-foreground">{item.title}</p>
                        <p className="truncate text-caption text-muted-foreground">{item.meta}</p>
                      </div>
                      <Badge variant="glass" className="shrink-0">{item.value}</Badge>
                    </div>
                  ))}
                </div>
              </CollapsiblePanel>
            ))}
          </div>

          <Card className="rounded-lg">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>{spec.tableTitle}</CardTitle>
                  <CardDescription>Route-aware operational records for {spec.title.toLowerCase()}.</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Activity />
                  View audit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead>Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {spec.rows.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell className="font-semibold text-foreground">{row.name}</TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.owner}</TableCell>
                      <TableCell>{row.impact}</TableCell>
                      <TableCell>{row.confidence}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <CommandRail rows={spec.rows} />
      </section>
    </div>
  );
}

function MetricCard({ stat, index }: { stat: Stat; index: number }) {
  const Icon = stat.icon;
  const toneClass = {
    civic: "bg-city-civic/10 text-city-civic",
    signal: "bg-city-signal/10 text-city-signal",
    solar: "bg-city-solar/[0.16] text-[#8A5A00]",
    park: "bg-city-park/10 text-city-park",
    coral: "bg-city-coral/10 text-city-coral",
    transit: "bg-city-transit/10 text-city-transit"
  }[stat.tone];

  return (
    <div
      className="rounded-lg border border-white/70 bg-white/70 p-4 shadow-polis-xs backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.86] hover:shadow-polis-md"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className={cn("grid size-9 place-items-center rounded-md", toneClass)}>
          <Icon className="size-4" />
        </div>
        <span className="font-mono text-[11px] font-semibold text-city-park">{stat.delta}</span>
      </div>
      <p className="text-metric text-foreground">{stat.value}</p>
      <p className="mt-1 text-caption font-semibold text-muted-foreground">{stat.label}</p>
    </div>
  );
}

function CommandStatus({ insight }: { insight: string }) {
  return (
    <aside className="rounded-lg border border-white/70 bg-white/[0.72] p-4 shadow-glass backdrop-blur-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="token-label">AI command</p>
          <h2 className="text-title-md text-foreground">Decision layer</h2>
        </div>
        <Badge variant="success">Online</Badge>
      </div>

      <div className="grid gap-3">
        <StatusLine icon={RadioTower} label="Sensor mesh" value="1,284 streams" />
        <StatusLine icon={MapPinned} label="District graph" value="14 zones synced" />
        <StatusLine icon={BellRing} label="Escalations" value="3 require review" />
      </div>

      <div className="my-4 h-px bg-border/80" />

      <div className="rounded-lg border border-border/70 bg-city-mist p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="size-4 text-city-civic" />
          <p className="text-body-sm font-semibold text-foreground">Recommended next move</p>
        </div>
        <p className="text-body-sm text-muted-foreground">{insight}</p>
      </div>
    </aside>
  );
}

function StatusLine({
  icon: Icon,
  label,
  value
}: {
  icon: typeof RadioTower;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-white/[0.78] p-3 shadow-polis-xs">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-md bg-city-civic/10 text-city-civic">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-body-sm font-semibold text-foreground">{label}</p>
          <p className="truncate text-caption text-muted-foreground">{value}</p>
        </div>
      </div>
      <CircleDot className="size-4 shrink-0 text-city-civic" />
    </div>
  );
}

function CommandRail({ rows }: { rows: PolisTableRow[] }) {
  return (
    <aside className="grid gap-5">
      <CollapsiblePanel title="Operations Timeline" eyebrow="Now" status="Live" icon={Activity}>
        <div className="grid gap-4">
          {rows.slice(0, 4).map((row, index) => (
            <div key={row.name} className="relative pl-6">
              <div className="absolute left-0 top-1.5 size-2.5 rounded-full bg-city-civic shadow-polis-xs" />
              {index < 3 ? <div className="absolute bottom-[-1rem] left-1 top-5 w-px bg-border" /> : null}
              <p className="text-body-sm font-semibold text-foreground">{row.name}</p>
              <p className="mt-1 text-caption text-muted-foreground">
                {row.owner} / {row.impact} impact / {row.confidence}
              </p>
            </div>
          ))}
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel title="Automation Health" eyebrow="Agents" status="Guarded" icon={Sparkles} defaultOpen={false}>
        <div className="grid gap-3">
          {["Human approvals enabled", "Policy gates enforced", "Audit trail recording"].map((item) => (
            <div key={item} className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-white/[0.78] p-3">
              <span className="text-body-sm font-semibold text-foreground">{item}</span>
              <Badge variant="success">On</Badge>
            </div>
          ))}
        </div>
      </CollapsiblePanel>
    </aside>
  );
}

function StatusBadge({ status }: { status: PolisTableRow["status"] }) {
  const variant = {
    Active: "success",
    Review: "warning",
    Stable: "glass",
    Critical: "danger",
    Draft: "outline"
  }[status] as "success" | "warning" | "glass" | "danger" | "outline";

  return <Badge variant={variant}>{status}</Badge>;
}

function ForecastAreaChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ left: -12, right: 8, top: 16, bottom: 8 }}>
        <defs>
          <linearGradient id="polis-demand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#009E9D" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#009E9D" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="polis-confidence" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2F6BFF" stopOpacity={0.22} />
            <stop offset="95%" stopColor="#2F6BFF" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#DDE8EA" strokeDasharray="3 6" vertical={false} />
        <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Area type="monotone" dataKey="demand" stroke="#009E9D" strokeWidth={3} fill="url(#polis-demand)" />
        <Area type="monotone" dataKey="confidence" stroke="#2F6BFF" strokeWidth={3} fill="url(#polis-confidence)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function LoadBarChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ left: -12, right: 8, top: 16, bottom: 8 }}>
        <CartesianGrid stroke="#DDE8EA" strokeDasharray="3 6" vertical={false} />
        <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <Tooltip cursor={{ fill: "rgba(0, 158, 157, 0.06)" }} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Bar dataKey="forecast" fill="#F6B73C" radius={[6, 6, 2, 2]} />
        <Bar dataKey="demand" fill="#13C8C3" radius={[6, 6, 2, 2]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ChartSkeleton({ bars = false }: { bars?: boolean }) {
  return (
    <div className="flex h-full items-end gap-2 rounded-lg border border-border/70 bg-city-mist p-4">
      {[42, 58, 46, 70, 62, 84, 76, 90, 64, 78, 72, 88].map((height, index) => (
        <div
          key={`app-page-skeleton-${index}`}
          className={cn("w-full rounded-t-md", bars ? "bg-city-solar/70" : "bg-city-civic/40")}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}
