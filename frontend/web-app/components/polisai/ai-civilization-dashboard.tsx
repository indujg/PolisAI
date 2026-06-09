"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Brain,
  Briefcase,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Filter,
  HeartPulse,
  MapPinned,
  Search,
  ShieldCheck,
  Smile,
  Sparkles,
  TrendingUp,
  UsersRound
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
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/polisai/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Occupation =
  | "Engineer"
  | "Teacher"
  | "Doctor"
  | "Factory Worker"
  | "Artist"
  | "Civil Servant"
  | "Founder"
  | "Student"
  | "Researcher"
  | "Transit Operator";

type District =
  | "Civic Core"
  | "North Loop"
  | "Harbor Edge"
  | "Greenline"
  | "East Habitat"
  | "Solar Ward"
  | "University Row"
  | "Factory Belt";

type Citizen = {
  id: number;
  name: string;
  age: number;
  income: number;
  happiness: number;
  health: number;
  occupation: Occupation;
  district: District;
  heatX: number;
  heatY: number;
};

type GroupBy = "district" | "occupation" | "age" | "income" | "wellbeing";

const firstNames = [
  "Aarav",
  "Maya",
  "Nora",
  "Leo",
  "Isha",
  "Owen",
  "Zara",
  "Kai",
  "Mira",
  "Eli",
  "Anika",
  "Theo",
  "Lina",
  "Noah",
  "Sara",
  "Dev",
  "Mina",
  "Rohan",
  "Elena",
  "Tara"
];

const lastNames = [
  "Shah",
  "Ren",
  "Voss",
  "Cole",
  "Mehta",
  "Stone",
  "Khan",
  "Lin",
  "Rao",
  "Hart",
  "Diaz",
  "Sen",
  "Park",
  "Iyer",
  "Blake",
  "Wu",
  "Nair",
  "Reed",
  "Mori",
  "Vale"
];

const occupations: Occupation[] = [
  "Engineer",
  "Teacher",
  "Doctor",
  "Factory Worker",
  "Artist",
  "Civil Servant",
  "Founder",
  "Student",
  "Researcher",
  "Transit Operator"
];

const districts: District[] = [
  "Civic Core",
  "North Loop",
  "Harbor Edge",
  "Greenline",
  "East Habitat",
  "Solar Ward",
  "University Row",
  "Factory Belt"
];

const incomeBase: Record<Occupation, number> = {
  Engineer: 118000,
  Teacher: 68000,
  Doctor: 164000,
  "Factory Worker": 56000,
  Artist: 62000,
  "Civil Servant": 78000,
  Founder: 186000,
  Student: 18000,
  Researcher: 104000,
  "Transit Operator": 64000
};

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

const citizens = generateCitizens(1000);

export function AICivilizationDashboard() {
  const [query, setQuery] = useState("");
  const [occupation, setOccupation] = useState("All");
  const [district, setDistrict] = useState("All");
  const [ageBand, setAgeBand] = useState("All");
  const [wellbeing, setWellbeing] = useState("All");
  const [groupBy, setGroupBy] = useState<GroupBy>("district");
  const [selectedHeatCell, setSelectedHeatCell] = useState<number | null>(null);
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    setChartsReady(true);
  }, []);

  const filteredCitizens = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return citizens.filter((citizen) => {
      const matchesQuery =
        !normalizedQuery ||
        citizen.name.toLowerCase().includes(normalizedQuery) ||
        citizen.occupation.toLowerCase().includes(normalizedQuery) ||
        citizen.district.toLowerCase().includes(normalizedQuery);

      return (
        matchesQuery &&
        (occupation === "All" || citizen.occupation === occupation) &&
        (district === "All" || citizen.district === district) &&
        (ageBand === "All" || getAgeBand(citizen.age) === ageBand) &&
        (wellbeing === "All" || getWellbeingBand(citizen) === wellbeing)
      );
    });
  }, [query, occupation, district, ageBand, wellbeing]);

  const analytics = useMemo(() => buildAnalytics(filteredCitizens), [filteredCitizens]);
  const groups = useMemo(() => buildGroups(filteredCitizens, groupBy), [filteredCitizens, groupBy]);
  const heatmap = useMemo(() => buildHeatmap(filteredCitizens), [filteredCitizens]);
  const selectedCell = selectedHeatCell === null ? null : heatmap[selectedHeatCell];
  const visibleCitizens = filteredCitizens.slice(0, 80);

  return (
    <div className="grid gap-5">
      <section className="glass-card city-map overflow-hidden rounded-lg p-4 sm:p-5 lg:p-6">
        <div className="relative z-[1] flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <Badge variant="glass" className="mb-3 gap-1.5">
              <Brain className="size-3.5 text-city-civic" />
              AI civilization model / 1,000 simulated citizens
            </Badge>
            <h1 className="text-display-md text-foreground">AI Civilization Dashboard</h1>
            <p className="mt-3 max-w-3xl text-body-lg text-muted-foreground">
              Inspect a living synthetic population by demographics, wellbeing, economics, geography, and civic role.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success" className="gap-1.5">
              <Activity className="size-3.5" />
              Live model
            </Badge>
            <Button variant="premium" asChild>
              <Link href="/citizens/card">
                <CreditCard />
                NFC card
              </Link>
            </Button>
            <Button variant="outline">
              <ShieldCheck />
              Privacy safe
            </Button>
            <Button variant="signal">
              <Sparkles />
              Ask PolisAI
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="Citizens" value={filteredCitizens.length.toLocaleString()} detail="filtered population" icon={UsersRound} tone="signal" />
        <KpiCard label="Avg income" value={formatMoney(analytics.avgIncome)} detail="annual median proxy" icon={CircleDollarSign} tone="civic" />
        <KpiCard label="Happiness" value={`${analytics.avgHappiness}%`} detail="weighted sentiment" icon={Smile} tone="park" />
        <KpiCard label="Health" value={`${analytics.avgHealth}%`} detail="care readiness" icon={HeartPulse} tone="coral" />
        <KpiCard label="Workers" value={`${analytics.workerShare}%`} detail="labor participation" icon={Briefcase} tone="solar" />
        <KpiCard label="Risk flags" value={analytics.riskCount.toString()} detail="low health or happiness" icon={TrendingUp} tone="transit" />
      </section>

      <section className="surface-card rounded-lg p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="token-label">Search and filters</p>
            <h2 className="text-title-md text-foreground">Population controls</h2>
          </div>
          <Badge variant="glass">{filteredCitizens.length} matches</Badge>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_repeat(5,minmax(10rem,0.75fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, occupation, district"
            />
          </div>
          <SelectFilter label="Occupation" value={occupation} onChange={setOccupation} options={["All", ...occupations]} />
          <SelectFilter label="District" value={district} onChange={setDistrict} options={["All", ...districts]} />
          <SelectFilter label="Age" value={ageBand} onChange={setAgeBand} options={["All", "0-17", "18-34", "35-54", "55-74", "75+"]} />
          <SelectFilter label="Wellbeing" value={wellbeing} onChange={setWellbeing} options={["All", "Thriving", "Stable", "Watch", "Critical"]} />
          <SelectFilter label="Group by" value={groupBy} onChange={(value) => setGroupBy(value as GroupBy)} options={["district", "occupation", "age", "income", "wellbeing"]} />
        </div>
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="grid gap-5 xl:grid-cols-2">
          <AnalyticsPanel title="Demographic Analytics" description="Age distribution and wellbeing trajectory.">
            <div className="h-[310px] min-w-0">
              {chartsReady ? <AgeDistributionChart data={analytics.ageDistribution} /> : <ChartSkeleton />}
            </div>
          </AnalyticsPanel>
          <AnalyticsPanel title="Income by Occupation" description="Economic stratification across civic roles.">
            <div className="h-[310px] min-w-0">
              {chartsReady ? <IncomeChart data={analytics.incomeByOccupation} /> : <ChartSkeleton bars />}
            </div>
          </AnalyticsPanel>
        </div>

        <HeatmapPanel heatmap={heatmap} selectedCell={selectedCell} onSelect={setSelectedHeatCell} />
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="grid gap-5">
          <GroupingPanel groups={groups} groupBy={groupBy} />
          <CitizenTable citizens={visibleCitizens} total={filteredCitizens.length} />
        </div>

        <CohortIntelligence analytics={analytics} selectedCell={selectedCell} />
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: "civic" | "signal" | "solar" | "park" | "coral" | "transit";
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-white/75 bg-white/[0.76] p-4 shadow-polis-sm backdrop-blur-2xl"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className={cn("grid size-10 place-items-center rounded-md", toneClass(tone))}>
          <Icon className="size-4" />
        </div>
        <span className="size-2 rounded-full bg-city-park" />
      </div>
      <p className="text-metric text-foreground">{value}</p>
      <p className="mt-1 text-body-sm font-bold text-foreground">{label}</p>
      <p className="mt-1 text-caption text-muted-foreground">{detail}</p>
    </motion.article>
  );
}

function SelectFilter({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="grid gap-1.5">
      <span className="flex items-center gap-1.5 text-caption font-bold uppercase text-muted-foreground">
        <Filter className="size-3.5" />
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="focus-ring h-10 w-full appearance-none rounded-md border border-input bg-white/[0.82] px-3 pr-9 text-body-sm font-semibold text-foreground shadow-polis-xs transition-colors hover:border-primary/35"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </label>
  );
}

function AnalyticsPanel({
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

function AgeDistributionChart({ data }: { data: { band: string; count: number; happiness: number; health: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ left: -12, right: 8, top: 16, bottom: 8 }}>
        <defs>
          <linearGradient id="citizen-happiness" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2FB36D" stopOpacity={0.24} />
            <stop offset="95%" stopColor="#2FB36D" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="citizen-health" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#F45D6B" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#F45D6B" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#DDE8EA" strokeDasharray="3 6" vertical={false} />
        <XAxis dataKey="band" tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Area type="monotone" dataKey="happiness" stroke="#2FB36D" strokeWidth={3} fill="url(#citizen-happiness)" />
        <Area type="monotone" dataKey="health" stroke="#F45D6B" strokeWidth={3} fill="url(#citizen-health)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function IncomeChart({ data }: { data: { occupation: string; income: number; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: -12, right: 8, top: 16, bottom: 8 }}>
        <CartesianGrid stroke="#DDE8EA" strokeDasharray="3 6" vertical={false} />
        <XAxis dataKey="occupation" tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={64} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Bar dataKey="income" fill="#009E9D" radius={[6, 6, 2, 2]} />
        <Bar dataKey="count" fill="#F6B73C" radius={[6, 6, 2, 2]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function HeatmapPanel({
  heatmap,
  selectedCell,
  onSelect
}: {
  heatmap: HeatCell[];
  selectedCell: HeatCell | null;
  onSelect: (index: number) => void;
}) {
  return (
    <section className="surface-card rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="token-label">Population heatmap</p>
          <h2 className="text-title-lg text-foreground">Civilization grid</h2>
        </div>
        <Badge variant="warning">100 cells</Badge>
      </div>

      <div className="grid grid-cols-10 gap-1.5">
        {heatmap.map((cell, index) => (
          <button
            key={cell.id}
            type="button"
            onClick={() => onSelect(index)}
            className={cn(
              "aspect-square rounded-sm border border-white/70 shadow-polis-xs transition-transform hover:scale-110",
              heatColor(cell),
              selectedCell?.id === cell.id && "ring-2 ring-city-signal ring-offset-2"
            )}
            title={`${cell.count} citizens / ${cell.avgHappiness}% happiness / ${cell.avgHealth}% health`}
          />
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-border/70 bg-white/[0.76] p-4">
        {selectedCell ? (
          <div>
            <p className="text-body-sm font-bold text-foreground">Cell {selectedCell.id}</p>
            <p className="mt-1 text-body-sm text-muted-foreground">
              {selectedCell.count} citizens, {selectedCell.avgHappiness}% happiness, {selectedCell.avgHealth}% health.
            </p>
          </div>
        ) : (
          <p className="text-body-sm text-muted-foreground">Select a heatmap cell to inspect local population health and happiness.</p>
        )}
      </div>
    </section>
  );
}

function GroupingPanel({ groups, groupBy }: { groups: GroupSummary[]; groupBy: GroupBy }) {
  return (
    <section className="surface-card rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="token-label">Grouping</p>
          <h2 className="text-title-lg text-foreground">Grouped by {groupBy}</h2>
        </div>
        <Badge variant="glass">{groups.length} cohorts</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {groups.slice(0, 8).map((group) => (
          <div key={group.key} className="rounded-lg border border-border/70 bg-white/[0.76] p-4 shadow-polis-xs">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="truncate text-body-sm font-bold text-foreground">{group.key}</p>
              <Badge variant="glass">{group.count}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-caption">
              <MiniMetric label="Income" value={formatMoney(group.avgIncome)} />
              <MiniMetric label="Happy" value={`${group.avgHappiness}%`} />
              <MiniMetric label="Health" value={`${group.avgHealth}%`} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CitizenTable({ citizens, total }: { citizens: Citizen[]; total: number }) {
  return (
    <section className="surface-card rounded-lg p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-title-lg text-foreground">Citizen registry</h2>
          <p className="mt-1 text-body-sm text-muted-foreground">Showing {citizens.length} of {total} matching citizens.</p>
        </div>
        <Button variant="outline" size="sm">
          <MapPinned />
          Export cohort
        </Button>
      </div>
      {citizens.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Income</TableHead>
              <TableHead>Happiness</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>Occupation</TableHead>
              <TableHead>District</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {citizens.map((citizen) => (
              <TableRow key={citizen.id}>
                <TableCell className="font-semibold text-foreground">{citizen.name}</TableCell>
                <TableCell>{citizen.age}</TableCell>
                <TableCell>{formatMoney(citizen.income)}</TableCell>
                <TableCell>
                  <ScoreBadge value={citizen.happiness} />
                </TableCell>
                <TableCell>
                  <ScoreBadge value={citizen.health} />
                </TableCell>
                <TableCell className="text-muted-foreground">{citizen.occupation}</TableCell>
                <TableCell className="text-muted-foreground">{citizen.district}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState
          icon={Search}
          title="No citizens match these filters"
          description="Adjust the search, district, occupation, age, or wellbeing filters to restore the population view."
        />
      )}
    </section>
  );
}

function CohortIntelligence({ analytics, selectedCell }: { analytics: Analytics; selectedCell: HeatCell | null }) {
  return (
    <aside className="grid h-fit gap-5">
      <section className="glass-card rounded-lg p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="token-label">Demographic analytics</p>
            <h2 className="text-title-lg text-foreground">Civilization health</h2>
          </div>
          <Brain className="size-5 text-city-civic" />
        </div>
        <div className="grid gap-3">
          <InsightRow icon={UsersRound} label="Largest age cohort" value={analytics.largestAgeBand} />
          <InsightRow icon={Briefcase} label="Top occupation" value={analytics.topOccupation} />
          <InsightRow icon={Smile} label="Happiest district" value={analytics.happiestDistrict} />
          <InsightRow icon={HeartPulse} label="Health watch" value={`${analytics.riskCount} citizens`} />
        </div>
      </section>

      <section className="surface-card rounded-lg p-5">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="size-4 text-city-civic" />
          <h3 className="text-title-md text-foreground">PolisAI recommendation</h3>
        </div>
        <p className="text-body-sm text-muted-foreground">
          {selectedCell
            ? `Cell ${selectedCell.id} should receive service outreach because it has ${selectedCell.count} citizens and ${selectedCell.avgHealth}% average health.`
            : "Prioritize Factory Belt and Harbor Edge cohorts with lower happiness and higher income volatility."}
        </p>
      </section>
    </aside>
  );
}

function InsightRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/70 bg-white/[0.72] p-3 shadow-polis-xs">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-md bg-city-civic/10 text-city-civic">
          <Icon className="size-4" />
        </div>
        <p className="truncate text-body-sm font-semibold text-foreground">{label}</p>
      </div>
      <Badge variant="glass">{value}</Badge>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/70 px-2 py-2">
      <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-mono text-[11px] font-bold text-foreground">{value}</p>
    </div>
  );
}

function ScoreBadge({ value }: { value: number }) {
  const variant = value > 76 ? "success" : value > 58 ? "glass" : value > 42 ? "warning" : "danger";

  return <Badge variant={variant}>{value}%</Badge>;
}

function ChartSkeleton({ bars = false }: { bars?: boolean }) {
  return (
    <div className="flex h-full items-end gap-2 rounded-lg border border-border/70 bg-city-mist p-4">
      {[42, 58, 46, 70, 62, 84, 76, 90, 64, 78, 72, 88].map((height, index) => (
        <div
          key={`citizen-skeleton-${index}`}
          className={cn("w-full rounded-t-md", bars ? "bg-city-solar/70" : "bg-city-civic/40")}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

type HeatCell = {
  id: string;
  count: number;
  avgHappiness: number;
  avgHealth: number;
};

type GroupSummary = {
  key: string;
  count: number;
  avgIncome: number;
  avgHappiness: number;
  avgHealth: number;
};

type Analytics = ReturnType<typeof buildAnalytics>;

function generateCitizens(count: number): Citizen[] {
  return Array.from({ length: count }, (_, index) => {
    const random = seeded(index + 91);
    const occupation = occupations[Math.floor(random() * occupations.length)];
    const district = districts[Math.floor(random() * districts.length)];
    const age = Math.floor(6 + random() * 78);
    const incomeNoise = 0.62 + random() * 0.88;
    const income = Math.round((incomeBase[occupation] * incomeNoise + age * 390) / 1000) * 1000;
    const districtBoost = district === "Civic Core" || district === "University Row" ? 8 : district === "Factory Belt" ? -8 : 0;
    const happiness = clamp(Math.round(46 + random() * 42 + districtBoost - Math.max(0, age - 70) * 0.18), 12, 99);
    const health = clamp(Math.round(88 - Math.max(0, age - 35) * 0.55 + random() * 18 + (occupation === "Doctor" ? 5 : 0)), 18, 99);
    const firstName = firstNames[Math.floor(random() * firstNames.length)];
    const lastName = lastNames[Math.floor(random() * lastNames.length)];

    return {
      id: index + 1,
      name: `${firstName} ${lastName}`,
      age,
      income,
      happiness,
      health,
      occupation,
      district,
      heatX: Math.floor(random() * 10),
      heatY: Math.floor(random() * 10)
    };
  });
}

function buildAnalytics(data: Citizen[]) {
  const avgIncome = average(data.map((citizen) => citizen.income));
  const avgHappiness = Math.round(average(data.map((citizen) => citizen.happiness)));
  const avgHealth = Math.round(average(data.map((citizen) => citizen.health)));
  const workerShare = Math.round((data.filter((citizen) => citizen.occupation !== "Student").length / Math.max(data.length, 1)) * 100);
  const riskCount = data.filter((citizen) => citizen.happiness < 45 || citizen.health < 45).length;
  const ageGroups = buildGroups(data, "age");
  const occupationGroups = buildGroups(data, "occupation");
  const districtGroups = buildGroups(data, "district");

  return {
    avgIncome,
    avgHappiness,
    avgHealth,
    workerShare,
    riskCount,
    largestAgeBand: ageGroups[0]?.key ?? "No cohort",
    topOccupation: occupationGroups[0]?.key ?? "No cohort",
    happiestDistrict: [...districtGroups].sort((a, b) => b.avgHappiness - a.avgHappiness)[0]?.key ?? "No district",
    ageDistribution: ["0-17", "18-34", "35-54", "55-74", "75+"].map((band) => {
      const citizensInBand = data.filter((citizen) => getAgeBand(citizen.age) === band);
      return {
        band,
        count: citizensInBand.length,
        happiness: Math.round(average(citizensInBand.map((citizen) => citizen.happiness))),
        health: Math.round(average(citizensInBand.map((citizen) => citizen.health)))
      };
    }),
    incomeByOccupation: occupations.map((item) => {
      const people = data.filter((citizen) => citizen.occupation === item);
      return {
        occupation: item.replace(" ", "\n"),
        income: Math.round(average(people.map((citizen) => citizen.income)) / 1000),
        count: people.length
      };
    })
  };
}

function buildGroups(data: Citizen[], groupBy: GroupBy): GroupSummary[] {
  const map = new Map<string, Citizen[]>();

  for (const citizen of data) {
    const key = groupKey(citizen, groupBy);
    const existing = map.get(key) ?? [];
    existing.push(citizen);
    map.set(key, existing);
  }

  return Array.from(map.entries())
    .map(([key, people]) => ({
      key,
      count: people.length,
      avgIncome: average(people.map((citizen) => citizen.income)),
      avgHappiness: Math.round(average(people.map((citizen) => citizen.happiness))),
      avgHealth: Math.round(average(people.map((citizen) => citizen.health)))
    }))
    .sort((a, b) => b.count - a.count);
}

function buildHeatmap(data: Citizen[]): HeatCell[] {
  return Array.from({ length: 100 }, (_, index) => {
    const x = index % 10;
    const y = Math.floor(index / 10);
    const people = data.filter((citizen) => citizen.heatX === x && citizen.heatY === y);

    return {
      id: `${x + 1}-${y + 1}`,
      count: people.length,
      avgHappiness: Math.round(average(people.map((citizen) => citizen.happiness))),
      avgHealth: Math.round(average(people.map((citizen) => citizen.health)))
    };
  });
}

function groupKey(citizen: Citizen, groupBy: GroupBy) {
  if (groupBy === "district") return citizen.district;
  if (groupBy === "occupation") return citizen.occupation;
  if (groupBy === "age") return getAgeBand(citizen.age);
  if (groupBy === "income") return getIncomeBand(citizen.income);
  return getWellbeingBand(citizen);
}

function getAgeBand(age: number) {
  if (age < 18) return "0-17";
  if (age < 35) return "18-34";
  if (age < 55) return "35-54";
  if (age < 75) return "55-74";
  return "75+";
}

function getIncomeBand(income: number) {
  if (income < 40000) return "Under $40k";
  if (income < 80000) return "$40k-$80k";
  if (income < 140000) return "$80k-$140k";
  return "$140k+";
}

function getWellbeingBand(citizen: Citizen) {
  const score = (citizen.happiness + citizen.health) / 2;
  if (score >= 78) return "Thriving";
  if (score >= 62) return "Stable";
  if (score >= 46) return "Watch";
  return "Critical";
}

function heatColor(cell: HeatCell) {
  const pressure = cell.count * 4 + (100 - cell.avgHealth) + (100 - cell.avgHappiness);
  if (pressure > 112) return "bg-city-coral/80";
  if (pressure > 86) return "bg-city-solar/75";
  if (pressure > 60) return "bg-city-civic/[0.55]";
  return "bg-city-park/40";
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatMoney(value: number) {
  if (value >= 1000000) return `$${Math.round(value / 1000000)}M`;
  return `$${Math.round(value / 1000)}k`;
}

function toneClass(tone: "civic" | "signal" | "solar" | "park" | "coral" | "transit") {
  return {
    civic: "bg-city-civic/10 text-city-civic",
    signal: "bg-city-signal/10 text-city-signal",
    solar: "bg-city-solar/[0.16] text-[#8A5A00]",
    park: "bg-city-park/10 text-city-park",
    coral: "bg-city-coral/10 text-city-coral",
    transit: "bg-city-transit/10 text-city-transit"
  }[tone];
}
