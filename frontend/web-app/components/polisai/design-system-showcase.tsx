"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  Building2,
  ChevronRight,
  CircleDot,
  Command,
  Download,
  Gauge,
  Layers3,
  Menu,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  SunMedium,
  TrafficCone,
  TrendingUp,
  Wifi,
  Zap
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from "@/components/ui/navigation-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const palette = [
  { name: "Mist", value: "#F6FAFA", className: "bg-city-mist", usage: "Canvas" },
  { name: "Graphite", value: "#101824", className: "bg-city-graphite", usage: "Text" },
  { name: "Civic", value: "#009E9D", className: "bg-city-civic", usage: "Primary" },
  { name: "Aqua", value: "#13C8C3", className: "bg-city-aqua", usage: "Signals" },
  { name: "Signal", value: "#2F6BFF", className: "bg-city-signal", usage: "AI states" },
  { name: "Transit", value: "#775CFF", className: "bg-city-transit", usage: "Mobility" },
  { name: "Solar", value: "#F6B73C", className: "bg-city-solar", usage: "Energy" },
  { name: "Coral", value: "#F45D6B", className: "bg-city-coral", usage: "Critical" },
  { name: "Park", value: "#2FB36D", className: "bg-city-park", usage: "Healthy" }
];

const typeScale = [
  { token: "display-xl", className: "text-display-xl", sample: "Civic Intelligence" },
  { token: "display-lg", className: "text-display-lg", sample: "Smart City OS" },
  { token: "display-md", className: "text-display-md", sample: "Operations Overview" },
  { token: "title-lg", className: "text-title-lg", sample: "District Performance" },
  { token: "title-md", className: "text-title-md", sample: "Sensor Health" },
  { token: "body-lg", className: "text-body-lg", sample: "Predictive routing balances safety, energy, and commute time." },
  { token: "body", className: "text-body", sample: "Active incidents are ranked by impact and confidence." },
  { token: "caption", className: "text-caption", sample: "Updated 18 seconds ago" }
];

const spacing = [
  { token: "1", value: "4px", width: "1rem" },
  { token: "2", value: "8px", width: "2rem" },
  { token: "3", value: "12px", width: "3rem" },
  { token: "4", value: "16px", width: "4rem" },
  { token: "6", value: "24px", width: "6rem" },
  { token: "8", value: "32px", width: "8rem" },
  { token: "12", value: "48px", width: "12rem" },
  { token: "section", value: "80px", width: "14rem" }
];

const chartData = [
  { hour: "06", flow: 42, energy: 38, safety: 82 },
  { hour: "09", flow: 68, energy: 44, safety: 88 },
  { hour: "12", flow: 61, energy: 57, safety: 91 },
  { hour: "15", flow: 74, energy: 63, safety: 89 },
  { hour: "18", flow: 86, energy: 71, safety: 93 },
  { hour: "21", flow: 59, energy: 66, safety: 95 }
];

const districts = [
  { name: "North Loop", status: "Optimized", load: "72%", confidence: "96%", owner: "Mobility" },
  { name: "Harbor Edge", status: "Watch", load: "81%", confidence: "88%", owner: "Energy" },
  { name: "Civic Core", status: "Stable", load: "54%", confidence: "94%", owner: "Safety" },
  { name: "Greenline", status: "Critical", load: "93%", confidence: "91%", owner: "Transit" }
];

const shadows = [
  { name: "polis-xs", className: "shadow-polis-xs" },
  { name: "polis-sm", className: "shadow-polis-sm" },
  { name: "polis-md", className: "shadow-polis-md" },
  { name: "polis-lg", className: "shadow-polis-lg" },
  { name: "glass", className: "shadow-glass bg-glass-sheen backdrop-blur-xl" }
];

const navGroups = [
  {
    label: "Platform",
    items: ["Command Center", "District Graph", "Prediction Studio"]
  },
  {
    label: "Systems",
    items: ["Mobility", "Energy", "Safety"]
  },
  {
    label: "Governance",
    items: ["Audit Trail", "Roles", "Public Briefs"]
  }
];

function statusVariant(status: string): "danger" | "warning" | "success" | "glass" {
  if (status === "Critical") return "danger";
  if (status === "Watch") return "warning";
  if (status === "Optimized") return "success";
  return "glass";
}

export function PolisDesignSystem() {
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    setChartsReady(true);
  }, []);

  return (
    <main className="min-h-screen overflow-hidden">
      <Header />

      <section className="px-page pb-10 pt-5 lg:pb-14">
        <div className="mx-auto grid max-w-[1440px] gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
          <div className="glass-card city-map min-h-[470px] rounded-lg p-5 sm:p-6 lg:p-8">
            <div className="relative z-[1] flex h-full flex-col justify-between gap-10">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="glass" className="gap-1.5">
                  <Sparkles className="size-3.5 text-city-civic" />
                  PolisAI System 01
                </Badge>
                <Badge variant="success">Light Mode</Badge>
                <Badge variant="secondary">Premium SaaS</Badge>
              </div>

              <div className="grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(280px,0.58fr)] lg:items-end">
                <div className="max-w-3xl">
                  <p className="mb-4 text-caption font-bold uppercase text-city-civic">
                    Futuristic smart city design system
                  </p>
                  <h1 className="max-w-[900px] text-display-md text-foreground sm:text-display-lg lg:text-display-xl">
                    PolisAI civic intelligence layer.
                  </h1>
                  <p className="mt-5 max-w-2xl text-body-lg text-muted-foreground">
                    A crisp, glassy, data-dense interface language for city operations,
                    predictive infrastructure, and accountable AI workflows.
                  </p>
                </div>

                <CitySignalCanvas />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric icon={Route} label="Transit flow" value="86%" delta="+4.8%" />
                <Metric icon={ShieldCheck} label="Safety confidence" value="93" delta="+2.1" />
                <Metric icon={Zap} label="Grid load" value="71%" delta="-8.4%" />
                <Metric icon={Wifi} label="Sensor uptime" value="99.2" delta="+0.6" />
              </div>
            </div>
          </div>

          <CommandPanel />
        </div>
      </section>

      <section className="border-y border-border/70 bg-white/[0.58] px-page py-10 backdrop-blur-xl">
        <div className="mx-auto grid max-w-[1440px] gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <SystemCard title="Color Palette" description="Semantic roles with city-domain accents.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {palette.map((color) => (
                <div key={color.name} className="rounded-lg border border-border/70 bg-white/[0.78] p-3 shadow-polis-xs">
                  <div className={cn("mb-3 h-16 rounded-md", color.className)} />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-body-sm font-semibold text-foreground">{color.name}</p>
                      <p className="token-label mt-1">{color.usage}</p>
                    </div>
                    <code className="rounded bg-muted px-1.5 py-1 font-mono text-[11px] text-muted-foreground">
                      {color.value}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </SystemCard>

          <SystemCard title="Typography Scale" description="System fonts, zero letter spacing, tight hierarchy.">
            <div className="grid gap-3">
              {typeScale.map((type) => (
                <div
                  key={type.token}
                  className="grid gap-3 rounded-lg border border-border/70 bg-white/[0.76] p-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center"
                >
                  <div>
                    <p className="token-label">{type.token}</p>
                  </div>
                  <p className={cn("truncate text-foreground", type.className)}>{type.sample}</p>
                </div>
              ))}
            </div>
          </SystemCard>
        </div>
      </section>

      <section className="px-page py-10 lg:py-14">
        <div className="mx-auto grid max-w-[1440px] gap-5 xl:grid-cols-3">
          <SystemCard title="Spacing System" description="4px base with page and section layout tokens.">
            <div className="grid gap-3">
              {spacing.map((item) => (
                <div key={item.token} className="grid grid-cols-[5rem_minmax(0,1fr)_4rem] items-center gap-3">
                  <p className="token-label">space-{item.token}</p>
                  <div className="h-3 rounded-full bg-muted">
                    <div className="h-3 rounded-full bg-city-civic" style={{ width: item.width }} />
                  </div>
                  <p className="text-right font-mono text-[11px] text-muted-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </SystemCard>

          <SystemCard title="Shadows" description="Soft elevation tuned for translucent light surfaces.">
            <div className="grid grid-cols-2 gap-3">
              {shadows.map((shadow) => (
                <div
                  key={shadow.name}
                  className={cn(
                    "flex h-24 items-end rounded-lg border border-border/70 bg-white/[0.86] p-3",
                    shadow.className
                  )}
                >
                  <p className="token-label">{shadow.name}</p>
                </div>
              ))}
            </div>
          </SystemCard>

          <SystemCard title="Glassmorphism Cards" description="Blurred, bordered, layered, never muddy.">
            <div className="grid gap-3">
              <div className="glass-card rounded-lg p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <Badge variant="glass">Sensor Mesh</Badge>
                  <Activity className="size-4 text-city-civic" />
                </div>
                <p className="text-metric text-foreground">1,284</p>
                <p className="mt-1 text-body-sm text-muted-foreground">Active civic telemetry streams</p>
              </div>
              <div className="rounded-lg border border-white/70 bg-white/[0.54] p-4 shadow-glass backdrop-blur-2xl">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-md bg-city-signal/10 text-city-signal">
                    <Gauge className="size-5" />
                  </div>
                  <div>
                    <p className="text-body-sm font-semibold text-foreground">Predictive mode</p>
                    <p className="text-caption text-muted-foreground">High confidence</p>
                  </div>
                </div>
              </div>
            </div>
          </SystemCard>
        </div>
      </section>

      <section className="border-y border-border/70 bg-white/[0.58] px-page py-10 backdrop-blur-xl">
        <div className="mx-auto grid max-w-[1440px] gap-5 xl:grid-cols-[0.72fr_1.28fr]">
          <SystemCard title="Buttons" description="Primary, signal, premium, secondary, outline, ghost, destructive.">
            <div className="flex flex-wrap gap-3">
              <Button>Deploy model</Button>
              <Button variant="signal">
                <Command />
                Run scan
              </Button>
              <Button variant="premium">
                <Sparkles />
                Premium
              </Button>
              <Button variant="secondary">Assign</Button>
              <Button variant="outline">
                <Download />
                Export
              </Button>
              <Button variant="ghost">Cancel</Button>
              <Button variant="destructive">Escalate</Button>
              <Button variant="icon" size="icon" aria-label="Open notifications">
                <Bell />
              </Button>
            </div>
          </SystemCard>

          <SystemCard title="Inputs" description="Crisp borders, hover affordance, visible focus, compact density.">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="district">District</Label>
                <Input id="district" defaultValue="Civic Core" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="query">Search</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="query" className="pl-9" placeholder="Find sensor, route, incident" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="threshold">Threshold</Label>
                <Input id="threshold" type="number" defaultValue="88" />
              </div>
            </div>
          </SystemCard>
        </div>
      </section>

      <section className="px-page py-10 lg:py-14">
        <div className="mx-auto grid max-w-[1440px] gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <SystemCard title="Tables and Badges" description="Operational scanning with semantic status pills.">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>District</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Load</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Owner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {districts.map((district) => (
                  <TableRow key={district.name}>
                    <TableCell className="font-semibold text-foreground">{district.name}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(district.status)}>{district.status}</Badge>
                    </TableCell>
                    <TableCell>{district.load}</TableCell>
                    <TableCell>{district.confidence}</TableCell>
                    <TableCell className="text-muted-foreground">{district.owner}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SystemCard>

          <SystemCard title="Modals" description="Glass overlay, compact form layout, decisive actions.">
            <div className="rounded-lg border border-border/70 bg-white/[0.76] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-title-md text-foreground">Incident briefing</p>
                  <p className="mt-1 text-body-sm text-muted-foreground">
                    Review predicted impact before dispatch.
                  </p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="premium">
                      <ShieldCheck />
                      Open brief
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Harbor Edge energy anomaly</DialogTitle>
                      <DialogDescription>
                        PolisAI predicts a 14 minute overload window across three feeder nodes.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3 rounded-lg border border-border/70 bg-white/[0.72] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-body-sm text-muted-foreground">Confidence</span>
                        <Badge variant="success">88%</Badge>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-body-sm text-muted-foreground">Impact</span>
                        <Badge variant="warning">Medium</Badge>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-body-sm text-muted-foreground">SLA</span>
                        <Badge variant="glass">12 min</Badge>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline">Dismiss</Button>
                      <Button>Dispatch crew</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </SystemCard>
        </div>
      </section>

      <section className="border-t border-border/70 bg-white/[0.58] px-page py-10 backdrop-blur-xl lg:py-14">
        <div className="mx-auto grid max-w-[1440px] gap-5 xl:grid-cols-2">
          <SystemCard title="Charts Styling" description="Low-noise grid, semantic hues, precise tooltips.">
            <div className="h-[320px] min-w-0">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: -12, right: 8, top: 16, bottom: 8 }}>
                    <defs>
                      <linearGradient id="flow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#009E9D" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#009E9D" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="safety" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2F6BFF" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#2F6BFF" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#DDE8EA" strokeDasharray="3 6" vertical={false} />
                    <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                    <Area type="monotone" dataKey="flow" stroke="#009E9D" strokeWidth={3} fill="url(#flow)" />
                    <Area type="monotone" dataKey="safety" stroke="#2F6BFF" strokeWidth={3} fill="url(#safety)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ChartSkeleton />
              )}
            </div>
          </SystemCard>

          <SystemCard title="System Bars" description="Comparison bars for service load and district demand.">
            <div className="h-[320px] min-w-0">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: -12, right: 8, top: 16, bottom: 8 }}>
                    <CartesianGrid stroke="#DDE8EA" strokeDasharray="3 6" vertical={false} />
                    <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
                    <Tooltip cursor={{ fill: "rgba(0, 158, 157, 0.06)" }} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                    <Bar dataKey="energy" fill="#F6B73C" radius={[6, 6, 2, 2]} />
                    <Bar dataKey="flow" fill="#13C8C3" radius={[6, 6, 2, 2]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ChartSkeleton bars />
              )}
            </div>
          </SystemCard>
        </div>
      </section>
    </main>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/[0.76] px-page py-3 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-city-graphite text-white shadow-polis-sm">
            <Building2 className="size-5" />
          </div>
          <div>
            <p className="text-body-sm font-bold text-foreground">PolisAI</p>
            <p className="text-caption text-muted-foreground">Civic intelligence</p>
          </div>
        </div>

        <div className="hidden lg:block">
          <NavigationMenu>
            <NavigationMenuList>
              {navGroups.map((group) => (
                <NavigationMenuItem key={group.label}>
                  <NavigationMenuTrigger>{group.label}</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[280px] gap-1 p-2">
                      {group.items.map((item) => (
                        <NavigationMenuLink key={item} asChild>
                          <a
                            href="#"
                            className="flex items-center justify-between rounded-md px-3 py-2 text-body-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            {item}
                            <ChevronRight className="size-3.5" />
                          </a>
                        </NavigationMenuLink>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="icon" size="icon-sm" aria-label="Search">
            <Search />
          </Button>
          <Button variant="icon" size="icon-sm" aria-label="Notifications">
            <Bell />
          </Button>
          <Button className="hidden sm:inline-flex" variant="premium">
            <Command />
            Command
          </Button>
          <Button className="lg:hidden" variant="icon" size="icon-sm" aria-label="Open menu">
            <Menu />
          </Button>
        </div>
      </div>
    </header>
  );
}

function CommandPanel() {
  return (
    <aside className="surface-card rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-caption font-bold uppercase text-city-civic">Live console</p>
          <h2 className="mt-1 text-title-lg text-foreground">City pulse</h2>
        </div>
        <Badge variant="success">Online</Badge>
      </div>

      <div className="grid gap-3">
        <ConsoleItem icon={TrafficCone} title="Route intervention" value="3 corridors" tone="signal" />
        <ConsoleItem icon={SunMedium} title="Solar microgrid" value="71% yield" tone="solar" />
        <ConsoleItem icon={ShieldCheck} title="Safety agents" value="93 confidence" tone="park" />
      </div>

      <div className="my-5 h-px bg-border/80" />

      <div className="rounded-lg border border-border/70 bg-city-mist p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-body-sm font-semibold text-foreground">Network load</p>
          <Badge variant="glass">Adaptive</Badge>
        </div>
        <div className="grid h-28 grid-cols-12 items-end gap-1.5">
          {[44, 58, 37, 62, 71, 53, 76, 69, 82, 64, 74, 88].map((height, index) => (
            <div
              key={`showcase-meter-${index}`}
              className="origin-bottom rounded-t bg-city-civic/80 animate-meter-rise"
              style={{ height: `${height}%`, animationDelay: `${index * 40}ms` }}
            />
          ))}
        </div>
      </div>

      <Button className="mt-5 w-full" variant="signal">
        <TrendingUp />
        Optimize district plan
      </Button>
    </aside>
  );
}

function CitySignalCanvas() {
  return (
    <div className="relative min-h-[280px] overflow-hidden rounded-lg border border-white/70 bg-white/[0.52] shadow-glass backdrop-blur-2xl">
      <div className="absolute inset-0 bg-city-grid [background-size:22px_22px]" />
      <div className="absolute left-8 top-8 h-36 w-20 rounded-md border border-city-civic/30 bg-white/80 shadow-polis-sm" />
      <div className="absolute bottom-8 left-24 h-44 w-24 rounded-md border border-city-signal/30 bg-white/[0.82] shadow-polis-md" />
      <div className="absolute right-9 top-12 h-48 w-28 rounded-md border border-city-transit/30 bg-white/80 shadow-polis-sm" />
      <div className="absolute bottom-10 right-24 h-28 w-20 rounded-md border border-city-solar/30 bg-white/[0.78] shadow-polis-sm" />
      <div className="absolute left-8 right-8 top-1/2 h-1 rounded-full bg-city-civic/35" />
      <div className="absolute bottom-20 left-14 right-20 h-1 rotate-[-9deg] rounded-full bg-city-signal/30" />
      <div className="absolute left-[30%] top-[38%] size-4 rounded-sm bg-city-civic shadow-polis-sm" />
      <div className="absolute right-[26%] top-[48%] size-4 rounded-sm bg-city-signal shadow-polis-sm" />
      <div className="absolute bottom-[27%] left-[48%] size-4 rounded-sm bg-city-solar shadow-polis-sm" />
      <div className="absolute inset-x-5 bottom-5 grid grid-cols-4 gap-2">
        {["Mobility", "Safety", "Energy", "Climate"].map((label) => (
          <div key={label} className="rounded-md border border-white/70 bg-white/[0.76] px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground shadow-polis-xs">
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  delta
}: {
  icon: typeof Route;
  label: string;
  value: string;
  delta: string;
}) {
  return (
    <div className="rounded-lg border border-white/70 bg-white/70 p-4 shadow-polis-xs backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="grid size-9 place-items-center rounded-md bg-city-civic/10 text-city-civic">
          <Icon className="size-4" />
        </div>
        <span className="font-mono text-[11px] font-semibold text-city-park">{delta}</span>
      </div>
      <p className="text-metric text-foreground">{value}</p>
      <p className="mt-1 text-caption font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}

function ConsoleItem({
  icon: Icon,
  title,
  value,
  tone
}: {
  icon: typeof TrafficCone;
  title: string;
  value: string;
  tone: "signal" | "solar" | "park";
}) {
  const toneClass = {
    signal: "bg-city-signal/10 text-city-signal",
    solar: "bg-city-solar/[0.16] text-[#8A5A00]",
    park: "bg-city-park/10 text-city-park"
  }[tone];

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-white/80 p-3 shadow-polis-xs">
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn("grid size-10 shrink-0 place-items-center rounded-md", toneClass)}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-body-sm font-semibold text-foreground">{title}</p>
          <p className="truncate text-caption text-muted-foreground">{value}</p>
        </div>
      </div>
      <CircleDot className="size-4 shrink-0 text-city-civic" />
    </div>
  );
}

function SystemCard({
  title,
  description,
  children,
  className
}: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("h-full rounded-lg", className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="grid size-9 shrink-0 place-items-center rounded-md bg-city-civic/10 text-city-civic">
            <Layers3 className="size-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ChartSkeleton({ bars = false }: { bars?: boolean }) {
  return (
    <div className="flex h-full items-end gap-2 rounded-lg border border-border/70 bg-city-mist p-4">
      {[42, 58, 46, 70, 62, 84, 76, 90, 64, 78, 72, 88].map((height, index) => (
        <div
          key={`showcase-skeleton-${index}`}
          className={cn(
            "w-full rounded-t-md",
            bars ? "bg-city-solar/70" : "bg-city-civic/40"
          )}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

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
