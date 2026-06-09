"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BellRing,
  Brain,
  Car,
  CheckCircle2,
  CircleDollarSign,
  CircleDot,
  Clock3,
  Download,
  FileText,
  GraduationCap,
  HeartPulse,
  Newspaper,
  RadioTower,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wind,
  Zap
} from "lucide-react";
import {
  Area,
  AreaChart,
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
import { cn } from "@/lib/utils";

type NewsCategory = "economy" | "mobility" | "climate" | "health" | "education" | "policy";
type CategoryFilter = "all" | NewsCategory;
type Sentiment = "Positive" | "Neutral" | "Negative" | "Alert";
type Tone = "civic" | "signal" | "solar" | "park" | "coral" | "transit" | "graphite";

type NewsItem = {
  id: string;
  category: NewsCategory;
  headline: string;
  source: string;
  summary: string;
  timestamp: string;
  district: string;
  sentiment: Sentiment;
  sentimentScore: number;
  impact: number;
  velocity: string;
  tags: string[];
};

type CategoryMeta = {
  id: CategoryFilter;
  label: string;
  icon: LucideIcon;
  tone: Tone;
};

type Report = {
  title: string;
  category: NewsCategory;
  confidence: number;
  horizon: string;
  summary: string;
  bullets: string[];
  action: string;
};

const categories: CategoryMeta[] = [
  { id: "all", label: "All Signals", icon: Newspaper, tone: "graphite" },
  { id: "economy", label: "Economy", icon: CircleDollarSign, tone: "civic" },
  { id: "mobility", label: "Mobility", icon: Car, tone: "transit" },
  { id: "climate", label: "Climate", icon: Wind, tone: "solar" },
  { id: "health", label: "Health", icon: HeartPulse, tone: "coral" },
  { id: "education", label: "Education", icon: GraduationCap, tone: "park" },
  { id: "policy", label: "Policy", icon: ShieldCheck, tone: "signal" }
];

const newsItems: NewsItem[] = [
  {
    id: "n1",
    category: "economy",
    headline: "Port automation lifts city output forecast as logistics delays fall",
    source: "PolisAI Markets",
    summary: "Freight dwell time is down 14% after adaptive routing, raising the 90-day GDP outlook for Harbor Edge and Factory Belt.",
    timestamp: "2m ago",
    district: "Harbor Edge",
    sentiment: "Positive",
    sentimentScore: 72,
    impact: 94,
    velocity: "+18%",
    tags: ["GDP", "Supply chain", "Harbor"]
  },
  {
    id: "n2",
    category: "climate",
    headline: "Industrial emissions spike triggers targeted carbon credit review",
    source: "FT Civic Ledger",
    summary: "A four-hour power demand surge pushed Factory Belt emissions above policy bands, with AI recommending a narrower peak-hour levy.",
    timestamp: "6m ago",
    district: "Factory Belt",
    sentiment: "Alert",
    sentimentScore: -61,
    impact: 88,
    velocity: "+31%",
    tags: ["Carbon", "Industry", "Credits"]
  },
  {
    id: "n3",
    category: "mobility",
    headline: "Metro expansion sentiment turns positive after revised station plan",
    source: "Apple Civic News",
    summary: "Citizen support increased across three transit corridors after walk-time estimates improved for schools and hospitals.",
    timestamp: "11m ago",
    district: "Greenline",
    sentiment: "Positive",
    sentimentScore: 64,
    impact: 82,
    velocity: "+9%",
    tags: ["Metro", "Access", "Commute"]
  },
  {
    id: "n4",
    category: "health",
    headline: "Hospital capacity remains stable despite north-side respiratory alerts",
    source: "Polis Health Wire",
    summary: "Emergency capacity sits at 91%, but the model flags a 22% probability of demand clustering near Northline Health.",
    timestamp: "18m ago",
    district: "Northline Health",
    sentiment: "Neutral",
    sentimentScore: 8,
    impact: 76,
    velocity: "+4%",
    tags: ["Capacity", "Respiratory", "Triage"]
  },
  {
    id: "n5",
    category: "education",
    headline: "AI tutoring pilot narrows achievement gap in East Habitat schools",
    source: "Civic Education Desk",
    summary: "Weekly competency growth is 2.7 points above baseline, with the strongest gains in math readiness and after-school attendance.",
    timestamp: "24m ago",
    district: "East Habitat",
    sentiment: "Positive",
    sentimentScore: 81,
    impact: 79,
    velocity: "+12%",
    tags: ["Schools", "AI tutor", "Equity"]
  },
  {
    id: "n6",
    category: "policy",
    headline: "Council draft introduces dynamic EV subsidy based on grid load",
    source: "Bloomberg Civic Terminal",
    summary: "The draft shifts subsidies toward off-peak charging and low-income neighborhoods, reducing projected grid stress by 8%.",
    timestamp: "32m ago",
    district: "Civic Core",
    sentiment: "Positive",
    sentimentScore: 56,
    impact: 84,
    velocity: "+7%",
    tags: ["EV", "Subsidy", "Grid"]
  },
  {
    id: "n7",
    category: "mobility",
    headline: "School-zone congestion returns after ride-share pickup imbalance",
    source: "PolisAI Live Desk",
    summary: "Morning congestion rose near University Row, with AI recommending staggered pickup windows and curb pricing changes.",
    timestamp: "41m ago",
    district: "University Row",
    sentiment: "Negative",
    sentimentScore: -42,
    impact: 69,
    velocity: "+16%",
    tags: ["Traffic", "Schools", "Curb"]
  },
  {
    id: "n8",
    category: "economy",
    headline: "Small-business confidence improves after procurement policy update",
    source: "Financial Times AI Brief",
    summary: "Local vendors show higher hiring intent after faster payment guarantees and transparent contract scoring were announced.",
    timestamp: "52m ago",
    district: "Civic Core",
    sentiment: "Positive",
    sentimentScore: 49,
    impact: 73,
    velocity: "+6%",
    tags: ["SMB", "Jobs", "Procurement"]
  },
  {
    id: "n9",
    category: "climate",
    headline: "Solar Ward battery dispatch offsets evening grid carbon intensity",
    source: "Clean Grid Bulletin",
    summary: "Storage release reduced peak carbon intensity by 11%, creating room for expanded electric bus charging after 21:00.",
    timestamp: "1h ago",
    district: "Solar Ward",
    sentiment: "Positive",
    sentimentScore: 68,
    impact: 71,
    velocity: "+10%",
    tags: ["Battery", "Carbon", "Buses"]
  }
];

const reports: Report[] = [
  {
    title: "Carbon levy pressure test",
    category: "climate",
    confidence: 93,
    horizon: "72h",
    summary: "A narrow peak-hour carbon adjustment produces the highest emissions reduction without depressing port output.",
    bullets: ["Factory Belt absorbs 62% of the change", "GDP downside remains below 0.3%", "Mobility emissions fall when bus charging shifts later"],
    action: "Open policy simulation"
  },
  {
    title: "Metro expansion public narrative",
    category: "mobility",
    confidence: 89,
    horizon: "14d",
    summary: "Public sentiment is moving from cost concern to access optimism after station walk-time improvements.",
    bullets: ["Greenline sentiment up 18 points", "School access is the strongest positive driver", "Opposition clusters around construction noise"],
    action: "Generate council brief"
  },
  {
    title: "Healthcare capacity watch",
    category: "health",
    confidence: 86,
    horizon: "48h",
    summary: "Capacity remains healthy, but localized respiratory demand can create a north-side ambulance imbalance.",
    bullets: ["Northline call volume up 9%", "Two standby redeployments recommended", "Public messaging can reduce non-urgent ER visits"],
    action: "Dispatch agent review"
  }
];

const sentimentTrend = [
  { hour: "08", positive: 58, neutral: 28, negative: 14 },
  { hour: "10", positive: 61, neutral: 25, negative: 14 },
  { hour: "12", positive: 55, neutral: 30, negative: 15 },
  { hour: "14", positive: 67, neutral: 22, negative: 11 },
  { hour: "16", positive: 63, neutral: 23, negative: 14 },
  { hour: "18", positive: 71, neutral: 18, negative: 11 },
  { hour: "20", positive: 69, neutral: 20, negative: 11 }
];

const categorySentiment = [
  { category: "Economy", positive: 72, neutral: 18, negative: 10 },
  { category: "Mobility", positive: 55, neutral: 21, negative: 24 },
  { category: "Climate", positive: 48, neutral: 19, negative: 33 },
  { category: "Health", positive: 44, neutral: 42, negative: 14 },
  { category: "Education", positive: 81, neutral: 13, negative: 6 },
  { category: "Policy", positive: 62, neutral: 25, negative: 13 }
];

const tickerSignals = [
  { label: "GDP Nowcast", value: "+4.8%", tone: "up" },
  { label: "Carbon Risk", value: "Elevated", tone: "down" },
  { label: "Traffic Pulse", value: "-8.1%", tone: "up" },
  { label: "Public Mood", value: "69+", tone: "up" },
  { label: "Report Queue", value: "12", tone: "neutral" },
  { label: "Source Trust", value: "96%", tone: "up" }
];

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid rgba(221, 232, 234, 0.9)",
  boxShadow: "0 18px 50px rgba(17, 37, 62, 0.12)",
  background: "rgba(255, 255, 255, 0.94)",
  backdropFilter: "blur(18px)"
};

const tooltipLabelStyle = {
  color: "#101824",
  fontWeight: 700
};

export function AiNewsCenter() {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    setChartsReady(true);
    const interval = window.setInterval(() => setTick((value) => value + 1), 2600);

    return () => window.clearInterval(interval);
  }, []);

  const filteredNews = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return newsItems.filter((item) => {
      const categoryMatch = activeCategory === "all" || item.category === activeCategory;
      const queryMatch =
        normalizedQuery.length === 0 ||
        [item.headline, item.summary, item.source, item.district, ...item.tags]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return categoryMatch && queryMatch;
    });
  }, [activeCategory, query]);

  const leadStory = filteredNews[0] ?? newsItems[0];
  const activeTicker = tickerSignals[tick % tickerSignals.length];
  const positiveShare = Math.round(
    newsItems.reduce((total, item) => total + Math.max(item.sentimentScore, 0), 0) / newsItems.length
  );
  const alertCount = newsItems.filter((item) => item.sentiment === "Alert" || item.sentiment === "Negative").length;

  return (
    <div className="grid gap-5">
      <motion.section
        className="glass-card city-map overflow-hidden rounded-lg p-4 sm:p-5 lg:p-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="relative z-[1] grid gap-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <Badge variant="glass" className="mb-3 gap-1.5">
                <RadioTower className="size-3.5 text-city-civic" />
                AI News Center / Live civic intelligence
              </Badge>
              <h1 className="text-display-md text-foreground">PolisAI News Center</h1>
              <p className="mt-3 max-w-3xl text-body-lg text-muted-foreground">
                A Bloomberg-grade civic terminal with Apple News clarity and Financial Times-style AI analysis for every policy signal moving the city.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success" className="gap-1.5">
                <CircleDot className="size-3.5" />
                Live feed
              </Badge>
              <Button variant="outline">
                <Download />
                Export brief
              </Button>
              <Button variant="signal">
                <Sparkles />
                Generate report
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SignalCard icon={Newspaper} label="Sources tracked" value="1,284" detail="Verified civic and market feeds" tone="civic" />
            <SignalCard icon={Brain} label="AI summaries" value="48" detail="Generated in the last hour" tone="signal" />
            <SignalCard icon={TrendingUp} label="Positive sentiment" value={`${positiveShare}%`} detail="Weighted by civic impact" tone="park" />
            <SignalCard icon={AlertTriangle} label="Risk alerts" value={`${alertCount}`} detail="Escalated for policy review" tone="coral" />
          </div>
        </div>
      </motion.section>

      <TickerStrip activeTicker={activeTicker} />

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_29rem]">
        <div className="grid gap-5">
          <div className="surface-card rounded-lg p-3 sm:p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-wrap gap-2">
                {categories.map((category) => (
                  <CategoryButton
                    key={category.id}
                    category={category}
                    active={activeCategory === category.id}
                    onClick={() => setActiveCategory(category.id)}
                  />
                ))}
              </div>
              <div className="relative min-w-0 xl:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search topics, districts, sources"
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
            <LeadStoryCard story={leadStory} />
            <SentimentPanel chartsReady={chartsReady} />
          </div>

          <LiveFeed items={filteredNews} tick={tick} />
        </div>

        <aside className="grid gap-5 content-start">
          <GeneratedReports />
          <TerminalWatchlist />
        </aside>
      </section>
    </div>
  );
}

function SignalCard({
  icon: Icon,
  label,
  value,
  detail,
  tone
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone: Tone;
}) {
  return (
    <div className="rounded-lg border border-white/70 bg-white/[0.72] p-4 shadow-polis-xs backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.88] hover:shadow-polis-md">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className={cn("grid size-9 place-items-center rounded-md", toneClass(tone))}>
          <Icon className="size-4" />
        </div>
        <ArrowUpRight className="size-4 text-city-park" />
      </div>
      <p className="text-metric text-foreground">{value}</p>
      <p className="mt-1 text-body-sm font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-caption text-muted-foreground">{detail}</p>
    </div>
  );
}

function TickerStrip({ activeTicker }: { activeTicker: (typeof tickerSignals)[number] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-city-graphite/10 bg-city-graphite text-white shadow-polis-md">
      <div className="flex min-h-12 flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:px-4">
        <div className="flex shrink-0 items-center gap-2 font-mono text-[11px] uppercase text-white/70">
          <Zap className="size-4 text-city-solar" />
          Terminal pulse
        </div>
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {tickerSignals.map((signal) => (
            <div
              key={signal.label}
              className={cn(
                "flex min-w-0 items-center justify-between gap-2 rounded-md border px-3 py-2 font-mono text-[11px]",
                activeTicker.label === signal.label
                  ? "border-city-aqua/50 bg-white/12 text-white"
                  : "border-white/10 bg-white/[0.06] text-white/78"
              )}
            >
              <span className="truncate">{signal.label}</span>
              <span
                className={cn(
                  "shrink-0 font-semibold",
                  signal.tone === "up" && "text-city-aqua",
                  signal.tone === "down" && "text-city-solar",
                  signal.tone === "neutral" && "text-white"
                )}
              >
                {signal.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryButton({
  category,
  active,
  onClick
}: {
  category: CategoryMeta;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = category.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-ring inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-body-sm font-semibold transition-all",
        active
          ? "border-primary/35 bg-white text-foreground shadow-polis-sm"
          : "border-border/70 bg-white/[0.64] text-muted-foreground hover:-translate-y-0.5 hover:bg-white hover:text-foreground"
      )}
    >
      <Icon className={cn("size-4", active ? toneTextClass(category.tone) : "text-muted-foreground")} />
      {category.label}
    </button>
  );
}

function LeadStoryCard({ story }: { story: NewsItem }) {
  const Icon = categories.find((category) => category.id === story.category)?.icon ?? Newspaper;

  return (
    <motion.article
      layout
      className="glass-card overflow-hidden rounded-lg p-4 sm:p-5"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: "easeOut" }}
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge variant="glass" className="gap-1.5">
          <Icon className="size-3.5 text-city-civic" />
          Lead signal
        </Badge>
        <SentimentBadge sentiment={story.sentiment} score={story.sentimentScore} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="min-w-0">
          <p className="token-label">{story.source} / {story.timestamp}</p>
          <h2 className="mt-3 text-title-lg text-foreground">{story.headline}</h2>
          <p className="mt-3 text-body text-muted-foreground">{story.summary}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {story.tags.map((tag) => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>
        </div>

        <div className="grid content-between gap-3 rounded-lg border border-white/70 bg-white/[0.72] p-3 shadow-polis-xs">
          <div>
            <p className="token-label">District</p>
            <p className="mt-2 text-body-sm font-semibold text-foreground">{story.district}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <TerminalMetric label="Impact" value={`${story.impact}`} />
            <TerminalMetric label="Velocity" value={story.velocity} />
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function SentimentPanel({ chartsReady }: { chartsReady: boolean }) {
  return (
    <section className="surface-card rounded-lg p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <Badge variant="glass" className="mb-3 gap-1.5">
            <BarChart3 className="size-3.5 text-city-signal" />
            Sentiment analysis
          </Badge>
          <h2 className="text-title-md text-foreground">Public narrative index</h2>
          <p className="mt-1 text-body-sm text-muted-foreground">AI-classified tone across live civic, market, and policy feeds.</p>
        </div>
        <Badge variant="success">69 positive</Badge>
      </div>

      <div className="h-[220px] min-w-0">
        {chartsReady ? <SentimentAreaChart /> : <ChartSkeleton />}
      </div>

      <div className="mt-4 grid gap-2">
        {categorySentiment.slice(0, 4).map((row) => (
          <div key={row.category} className="grid grid-cols-[5.5rem_minmax(0,1fr)_2.5rem] items-center gap-3">
            <span className="text-caption font-semibold text-muted-foreground">{row.category}</span>
            <div className="flex h-2 overflow-hidden rounded-full bg-muted">
              <div className="bg-city-park" style={{ width: `${row.positive}%` }} />
              <div className="bg-city-solar" style={{ width: `${row.neutral}%` }} />
              <div className="bg-city-coral" style={{ width: `${row.negative}%` }} />
            </div>
            <span className="text-right font-mono text-[11px] font-semibold text-foreground">{row.positive}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function LiveFeed({ items, tick }: { items: NewsItem[]; tick: number }) {
  return (
    <section className="surface-card overflow-hidden rounded-lg">
      <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Activity className="size-4 text-city-civic" />
            <p className="token-label">Live news feed</p>
          </div>
          <h2 className="text-title-md text-foreground">Signals ranked by policy impact</h2>
        </div>
        <Badge variant="glass" className="gap-1.5">
          <Clock3 className="size-3.5" />
          Auto-refresh 2.6s
        </Badge>
      </div>

      <div className="divide-y divide-border/70">
        {items.map((item, index) => (
          <motion.article
            key={item.id}
            layout
            className={cn(
              "grid gap-3 p-4 transition-colors sm:p-5 xl:grid-cols-[8.5rem_minmax(0,1fr)_9rem]",
              index === tick % Math.max(items.length, 1) ? "bg-city-civic/[0.06]" : "bg-white/[0.58]"
            )}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.2) }}
          >
            <div className="flex flex-wrap items-center gap-2 xl:block">
              <Badge variant="outline" className="capitalize">{item.category}</Badge>
              <p className="font-mono text-[11px] font-semibold text-muted-foreground xl:mt-3">{item.timestamp}</p>
              <p className="hidden text-caption text-muted-foreground xl:mt-1 xl:block">{item.source}</p>
            </div>

            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <SentimentBadge sentiment={item.sentiment} score={item.sentimentScore} />
                <Badge variant="glass">{item.district}</Badge>
              </div>
              <h3 className="text-body font-semibold text-foreground">{item.headline}</h3>
              <p className="mt-1 text-body-sm text-muted-foreground">{item.summary}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
              <TerminalMetric label="Impact" value={String(item.impact)} />
              <TerminalMetric label="Velocity" value={item.velocity} />
            </div>
          </motion.article>
        ))}

        {items.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState
              icon={Search}
              title="No matching signals"
              description="Try another category, source, district, or policy topic."
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function GeneratedReports() {
  return (
    <section className="glass-card rounded-lg p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <Badge variant="glass" className="mb-3 gap-1.5">
            <FileText className="size-3.5 text-city-civic" />
            AI generated reports
          </Badge>
          <h2 className="text-title-md text-foreground">Decision briefs</h2>
          <p className="mt-1 text-body-sm text-muted-foreground">Auto-written reports with confidence, horizon, and recommended next action.</p>
        </div>
        <Button variant="icon" size="icon-sm" aria-label="Generate new report">
          <Sparkles />
        </Button>
      </div>

      <div className="grid gap-3">
        {reports.map((report, index) => (
          <motion.article
            key={report.title}
            className="rounded-lg border border-white/70 bg-white/[0.74] p-4 shadow-polis-xs backdrop-blur-xl"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.08 }}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <Badge variant="outline" className="capitalize">{report.category}</Badge>
              <span className="font-mono text-[11px] font-semibold text-city-park">{report.confidence}% confidence</span>
            </div>
            <h3 className="text-body font-semibold text-foreground">{report.title}</h3>
            <p className="mt-2 text-body-sm text-muted-foreground">{report.summary}</p>
            <div className="mt-3 grid gap-2">
              {report.bullets.map((bullet) => (
                <div key={bullet} className="flex gap-2 text-caption text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-city-park" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <Badge variant="glass">{report.horizon} horizon</Badge>
              <Button variant="outline" size="sm">
                <FileText />
                {report.action}
              </Button>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function TerminalWatchlist() {
  return (
    <section className="overflow-hidden rounded-lg border border-city-graphite/10 bg-white shadow-polis-sm">
      <div className="border-b border-border/70 bg-city-graphite px-4 py-3 text-white sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BellRing className="size-4 text-city-solar" />
            <p className="font-mono text-[11px] uppercase text-white/72">Watchlist</p>
          </div>
          <Badge variant="glass" className="border-white/20 bg-white/10 text-white">Bloomberg mode</Badge>
        </div>
      </div>
      <div className="divide-y divide-border/70">
        {[
          { label: "Council approval odds", value: "74%", delta: "+6", icon: TrendingUp, tone: "park" as Tone },
          { label: "Carbon backlash risk", value: "Medium", delta: "-2", icon: TrendingDown, tone: "solar" as Tone },
          { label: "Hospital media pressure", value: "Low", delta: "0", icon: HeartPulse, tone: "coral" as Tone },
          { label: "Metro support index", value: "68", delta: "+11", icon: Car, tone: "transit" as Tone }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="flex items-center justify-between gap-3 bg-white/[0.76] px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className={cn("grid size-9 shrink-0 place-items-center rounded-md", toneClass(item.tone))}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-semibold text-foreground">{item.label}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">delta {item.delta}</p>
                </div>
              </div>
              <span className="shrink-0 font-mono text-[12px] font-semibold text-foreground">{item.value}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SentimentAreaChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={sentimentTrend} margin={{ left: -12, right: 8, top: 12, bottom: 8 }}>
        <defs>
          <linearGradient id="news-positive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2FB36D" stopOpacity={0.26} />
            <stop offset="95%" stopColor="#2FB36D" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="news-negative" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#F45D6B" stopOpacity={0.22} />
            <stop offset="95%" stopColor="#F45D6B" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#DDE8EA" strokeDasharray="3 6" vertical={false} />
        <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Area type="monotone" dataKey="positive" stroke="#2FB36D" strokeWidth={3} fill="url(#news-positive)" />
        <Area type="monotone" dataKey="neutral" stroke="#F6B73C" strokeWidth={2} fill="transparent" />
        <Area type="monotone" dataKey="negative" stroke="#F45D6B" strokeWidth={3} fill="url(#news-negative)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function SentimentBadge({ sentiment, score }: { sentiment: Sentiment; score: number }) {
  const variant = {
    Positive: "success",
    Neutral: "glass",
    Negative: "warning",
    Alert: "danger"
  }[sentiment] as "success" | "glass" | "warning" | "danger";

  return (
    <Badge variant={variant} className="gap-1.5">
      {sentimentIcon(sentiment)}
      {sentiment} {score > 0 ? "+" : ""}{score}
    </Badge>
  );
}

function TerminalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-white/[0.82] px-3 py-2 shadow-polis-xs">
      <p className="font-mono text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-[13px] font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex h-full items-end gap-2 rounded-lg border border-border/70 bg-city-mist p-4">
      {[42, 58, 46, 70, 62, 84, 76, 90, 64, 78].map((height, index) => (
        <div
          key={`news-skeleton-${index}`}
          className="w-full rounded-t-md bg-city-civic/35"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

function sentimentIcon(sentiment: Sentiment): ReactNode {
  if (sentiment === "Positive") {
    return <TrendingUp className="size-3.5" />;
  }

  if (sentiment === "Negative") {
    return <TrendingDown className="size-3.5" />;
  }

  if (sentiment === "Alert") {
    return <AlertTriangle className="size-3.5" />;
  }

  return <CircleDot className="size-3.5" />;
}

function toneClass(tone: Tone) {
  return {
    civic: "bg-city-civic/10 text-city-civic",
    signal: "bg-city-signal/10 text-city-signal",
    solar: "bg-city-solar/[0.16] text-[#8A5A00]",
    park: "bg-city-park/10 text-city-park",
    coral: "bg-city-coral/10 text-city-coral",
    transit: "bg-city-transit/10 text-city-transit",
    graphite: "bg-city-graphite/10 text-city-graphite"
  }[tone];
}

function toneTextClass(tone: Tone) {
  return {
    civic: "text-city-civic",
    signal: "text-city-signal",
    solar: "text-[#8A5A00]",
    park: "text-city-park",
    coral: "text-city-coral",
    transit: "text-city-transit",
    graphite: "text-city-graphite"
  }[tone];
}
