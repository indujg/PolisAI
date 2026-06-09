import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  BellRing,
  Bot,
  Building2,
  Cpu,
  FileText,
  FlaskConical,
  Gauge,
  Globe2,
  Landmark,
  MessageSquareText,
  Newspaper,
  RadioTower,
  Route,
  ScrollText,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  UsersRound,
  Zap
} from "lucide-react";
import type { PageId } from "@/components/polisai/navigation";

export type Stat = {
  label: string;
  value: string;
  delta: string;
  icon: LucideIcon;
  tone: "civic" | "signal" | "solar" | "park" | "coral" | "transit";
};

export type PanelItem = {
  title: string;
  meta: string;
  value: string;
};

export type TableRow = {
  name: string;
  status: "Active" | "Review" | "Stable" | "Critical" | "Draft";
  owner: string;
  impact: string;
  confidence: string;
};

export type PageSpec = {
  id: PageId;
  title: string;
  eyebrow: string;
  description: string;
  primaryAction: string;
  icon: LucideIcon;
  stats: Stat[];
  panels: {
    title: string;
    eyebrow: string;
    status: string;
    icon: LucideIcon;
    items: PanelItem[];
  }[];
  tableTitle: string;
  rows: TableRow[];
  insight: string;
};

export const pageSpecs: Record<PageId, PageSpec> = {
  dashboard: {
    id: "dashboard",
    title: "Command Center",
    eyebrow: "Live operations",
    description: "Monitor civic systems, route interventions, and AI recommendations from a single operational surface.",
    primaryAction: "Run city scan",
    icon: Building2,
    stats: [
      { label: "Transit flow", value: "86%", delta: "+4.8%", icon: Route, tone: "civic" },
      { label: "Safety confidence", value: "93", delta: "+2.1", icon: ShieldCheck, tone: "park" },
      { label: "Grid load", value: "71%", delta: "-8.4%", icon: Zap, tone: "solar" },
      { label: "Sensor uptime", value: "99.2%", delta: "+0.6%", icon: RadioTower, tone: "signal" }
    ],
    panels: [
      {
        title: "Priority incidents",
        eyebrow: "Dispatch queue",
        status: "3 active",
        icon: BellRing,
        items: [
          { title: "Harbor Edge feeder anomaly", meta: "Energy / medium impact", value: "12 min SLA" },
          { title: "Greenline crowding forecast", meta: "Transit / high impact", value: "91% confidence" },
          { title: "Civic Core signal drift", meta: "Mobility / low impact", value: "Auto-tuned" }
        ]
      },
      {
        title: "AI recommendations",
        eyebrow: "Model output",
        status: "Fresh",
        icon: Sparkles,
        items: [
          { title: "Rebalance downtown signal cycles", meta: "Reduces congestion by 7.2%", value: "Approve" },
          { title: "Shift microgrid reserve to Harbor Edge", meta: "Protects peak window", value: "Simulate" },
          { title: "Publish commuter advisory", meta: "Greenline station pressure", value: "Draft" }
        ]
      }
    ],
    tableTitle: "District readiness",
    rows: [
      { name: "North Loop", status: "Active", owner: "Mobility", impact: "High", confidence: "96%" },
      { name: "Harbor Edge", status: "Review", owner: "Energy", impact: "Medium", confidence: "88%" },
      { name: "Civic Core", status: "Stable", owner: "Safety", impact: "Low", confidence: "94%" },
      { name: "Greenline", status: "Critical", owner: "Transit", impact: "High", confidence: "91%" }
    ],
    insight: "PolisAI predicts downtown throughput will improve 8.4% if adaptive signal timing remains enabled through the evening peak."
  },
  simulation: {
    id: "simulation",
    title: "Simulation Studio",
    eyebrow: "Digital twin",
    description: "Stress-test decisions across mobility, energy, climate, safety, and service delivery before citywide rollout.",
    primaryAction: "Create scenario",
    icon: FlaskConical,
    stats: [
      { label: "Running scenarios", value: "18", delta: "+6", icon: FlaskConical, tone: "transit" },
      { label: "Model fidelity", value: "94%", delta: "+3.2%", icon: Cpu, tone: "signal" },
      { label: "Cost avoided", value: "$2.4M", delta: "+12%", icon: TrendingUp, tone: "park" },
      { label: "Risk exposure", value: "Low", delta: "-5.1%", icon: ShieldCheck, tone: "civic" }
    ],
    panels: [
      {
        title: "Scenario queue",
        eyebrow: "Simulations",
        status: "Live",
        icon: Activity,
        items: [
          { title: "Heatwave transit capacity", meta: "Mobility + climate", value: "62% done" },
          { title: "Harbor Edge brownout", meta: "Energy resilience", value: "Ready" },
          { title: "Stadium egress surge", meta: "Safety + transit", value: "Queued" }
        ]
      },
      {
        title: "Intervention levers",
        eyebrow: "Controls",
        status: "Tunable",
        icon: SlidersHorizontal,
        items: [
          { title: "Signal preemption", meta: "Emergency routing", value: "Enabled" },
          { title: "Microgrid reserve", meta: "Battery threshold", value: "18%" },
          { title: "Public alert cadence", meta: "Citizen messages", value: "10 min" }
        ]
      }
    ],
    tableTitle: "Scenario outcomes",
    rows: [
      { name: "Heatwave transit capacity", status: "Active", owner: "Simulation", impact: "High", confidence: "92%" },
      { name: "Flood detour routing", status: "Stable", owner: "Mobility", impact: "Medium", confidence: "89%" },
      { name: "Brownout recovery", status: "Review", owner: "Energy", impact: "High", confidence: "84%" },
      { name: "Event egress", status: "Draft", owner: "Safety", impact: "Medium", confidence: "78%" }
    ],
    insight: "The strongest scenario favors phased lane priority plus targeted energy reserve shifts, reducing projected delays by 14 minutes."
  },
  policies: {
    id: "policies",
    title: "Policy Console",
    eyebrow: "Governance",
    description: "Draft, simulate, approve, and audit policy changes with measurable civic outcomes and accountability trails.",
    primaryAction: "Draft policy",
    icon: ScrollText,
    stats: [
      { label: "Policies active", value: "42", delta: "+5", icon: ScrollText, tone: "civic" },
      { label: "Pending review", value: "7", delta: "-2", icon: FileText, tone: "solar" },
      { label: "Compliance", value: "98%", delta: "+1.1%", icon: BadgeCheck, tone: "park" },
      { label: "Audit gaps", value: "2", delta: "-4", icon: ShieldCheck, tone: "coral" }
    ],
    panels: [
      {
        title: "Approval pipeline",
        eyebrow: "Council flow",
        status: "7 items",
        icon: Landmark,
        items: [
          { title: "Congestion pricing adjustment", meta: "Finance + mobility", value: "Council" },
          { title: "EV curb access rules", meta: "Energy transition", value: "Legal" },
          { title: "Night safety patrol cadence", meta: "Public safety", value: "Impact" }
        ]
      },
      {
        title: "Policy impact",
        eyebrow: "Forecasts",
        status: "Modeled",
        icon: BarChart3,
        items: [
          { title: "Average commute", meta: "Projected reduction", value: "-6.8%" },
          { title: "Small business access", meta: "Potential increase", value: "+4.1%" },
          { title: "Equity coverage", meta: "Low-income districts", value: "92%" }
        ]
      }
    ],
    tableTitle: "Policy ledger",
    rows: [
      { name: "Congestion pricing adjustment", status: "Review", owner: "Council", impact: "High", confidence: "86%" },
      { name: "EV curb access", status: "Draft", owner: "Mobility", impact: "Medium", confidence: "80%" },
      { name: "Night safety cadence", status: "Active", owner: "Safety", impact: "High", confidence: "93%" },
      { name: "Open data sharing", status: "Stable", owner: "Data", impact: "Medium", confidence: "97%" }
    ],
    insight: "Policy impact modeling shows the pricing adjustment needs an equity offset in two outer districts before approval."
  },
  citizens: {
    id: "citizens",
    title: "Citizen Services",
    eyebrow: "Public experience",
    description: "Track requests, sentiment, public alerts, and service health across the neighborhoods that need attention first.",
    primaryAction: "Open intake",
    icon: UsersRound,
    stats: [
      { label: "Requests open", value: "1,482", delta: "-9%", icon: UsersRound, tone: "signal" },
      { label: "Median SLA", value: "18h", delta: "-3h", icon: Gauge, tone: "park" },
      { label: "Sentiment", value: "72", delta: "+4", icon: MessageSquareText, tone: "civic" },
      { label: "Alerts sent", value: "38k", delta: "+12k", icon: BellRing, tone: "solar" }
    ],
    panels: [
      {
        title: "Service pressure",
        eyebrow: "Citizen ops",
        status: "Updated",
        icon: UsersRound,
        items: [
          { title: "Pothole repair demand", meta: "North Loop", value: "+18%" },
          { title: "Heat shelter questions", meta: "Civic Core", value: "412" },
          { title: "Transit accessibility reports", meta: "Greenline", value: "71" }
        ]
      },
      {
        title: "Public communication",
        eyebrow: "Briefs",
        status: "Ready",
        icon: MessageSquareText,
        items: [
          { title: "Greenline capacity advisory", meta: "Push + SMS", value: "Drafted" },
          { title: "Water main repair update", meta: "District email", value: "Scheduled" },
          { title: "Heat shelter hours", meta: "Multilingual", value: "Live" }
        ]
      }
    ],
    tableTitle: "Citizen signal queue",
    rows: [
      { name: "Pothole repair cluster", status: "Active", owner: "Public Works", impact: "Medium", confidence: "91%" },
      { name: "Heat shelter demand", status: "Review", owner: "Health", impact: "High", confidence: "87%" },
      { name: "Transit access report", status: "Active", owner: "Transit", impact: "Medium", confidence: "89%" },
      { name: "Noise complaint trend", status: "Stable", owner: "Community", impact: "Low", confidence: "82%" }
    ],
    insight: "Citizen sentiment is improving citywide, but service pressure is concentrated around heat response and Greenline access."
  },
  analytics: {
    id: "analytics",
    title: "Analytics Hub",
    eyebrow: "Forecast intelligence",
    description: "Blend historic trends, real-time streams, and predictive models into executive-ready civic intelligence.",
    primaryAction: "Export report",
    icon: BarChart3,
    stats: [
      { label: "Forecast accuracy", value: "94%", delta: "+2.8%", icon: TrendingUp, tone: "park" },
      { label: "Datasets live", value: "214", delta: "+19", icon: Globe2, tone: "signal" },
      { label: "Model drift", value: "1.8%", delta: "-0.4%", icon: Activity, tone: "civic" },
      { label: "Reports", value: "31", delta: "+8", icon: FileText, tone: "solar" }
    ],
    panels: [
      {
        title: "Forecast watchlist",
        eyebrow: "Signals",
        status: "Clean",
        icon: TrendingUp,
        items: [
          { title: "Evening peak congestion", meta: "Mobility forecast", value: "86%" },
          { title: "Energy demand spike", meta: "Harbor district", value: "71%" },
          { title: "Service request surge", meta: "Public works", value: "44%" }
        ]
      },
      {
        title: "Data quality",
        eyebrow: "Pipelines",
        status: "Healthy",
        icon: Cpu,
        items: [
          { title: "Sensor completeness", meta: "City mesh", value: "99.2%" },
          { title: "Late data streams", meta: "3 providers", value: "5" },
          { title: "Anomaly rejects", meta: "24 hour window", value: "18" }
        ]
      }
    ],
    tableTitle: "Analytics workbench",
    rows: [
      { name: "Evening peak forecast", status: "Active", owner: "Analytics", impact: "High", confidence: "94%" },
      { name: "Energy demand model", status: "Stable", owner: "Energy", impact: "Medium", confidence: "91%" },
      { name: "Service request trend", status: "Review", owner: "Public Works", impact: "Medium", confidence: "86%" },
      { name: "Climate resilience index", status: "Draft", owner: "Planning", impact: "High", confidence: "79%" }
    ],
    insight: "Forecast health is strong, with the largest uncertainty tied to late provider streams from private mobility operators."
  },
  news: {
    id: "news",
    title: "Newsroom",
    eyebrow: "Civic signal desk",
    description: "Synthesize media, alerts, agency updates, and public conversation into briefings city teams can trust.",
    primaryAction: "Publish brief",
    icon: Newspaper,
    stats: [
      { label: "Stories tracked", value: "128", delta: "+24", icon: Newspaper, tone: "signal" },
      { label: "Public risk", value: "Low", delta: "-3", icon: ShieldCheck, tone: "park" },
      { label: "Briefs drafted", value: "9", delta: "+4", icon: FileText, tone: "civic" },
      { label: "Misinformation", value: "2", delta: "-6", icon: BellRing, tone: "coral" }
    ],
    panels: [
      {
        title: "Narrative monitor",
        eyebrow: "Public signals",
        status: "Watching",
        icon: Globe2,
        items: [
          { title: "Greenline platform delays", meta: "Local media", value: "Rising" },
          { title: "Heat shelter availability", meta: "Social channels", value: "Stable" },
          { title: "Water main disruption", meta: "Neighborhood groups", value: "Needs brief" }
        ]
      },
      {
        title: "Prepared statements",
        eyebrow: "Comms",
        status: "Drafts",
        icon: MessageSquareText,
        items: [
          { title: "Transit crowding context", meta: "Mayor office", value: "Review" },
          { title: "Energy reserve explanation", meta: "Utility partners", value: "Ready" },
          { title: "Open data correction", meta: "Press desk", value: "Queued" }
        ]
      }
    ],
    tableTitle: "Briefing desk",
    rows: [
      { name: "Greenline delay story", status: "Active", owner: "Comms", impact: "High", confidence: "90%" },
      { name: "Heat shelter availability", status: "Stable", owner: "Health", impact: "Medium", confidence: "94%" },
      { name: "Water main disruption", status: "Review", owner: "Utilities", impact: "Medium", confidence: "87%" },
      { name: "Open data correction", status: "Draft", owner: "Data", impact: "Low", confidence: "83%" }
    ],
    insight: "The news desk should prioritize a short Greenline delay brief before commuter volume peaks."
  },
  agents: {
    id: "agents",
    title: "Agent Orchestration",
    eyebrow: "AI workforce",
    description: "Coordinate specialized civic agents with permission boundaries, audit trails, and human approval checkpoints.",
    primaryAction: "Deploy agent",
    icon: Bot,
    stats: [
      { label: "Agents active", value: "26", delta: "+3", icon: Bot, tone: "signal" },
      { label: "Tasks automated", value: "8.4k", delta: "+18%", icon: Sparkles, tone: "civic" },
      { label: "Human reviews", value: "112", delta: "-7%", icon: UsersRound, tone: "solar" },
      { label: "Policy blocks", value: "4", delta: "-2", icon: ShieldCheck, tone: "coral" }
    ],
    panels: [
      {
        title: "Agent roster",
        eyebrow: "Runtime",
        status: "26 active",
        icon: Bot,
        items: [
          { title: "Transit Optimizer", meta: "Mobility domain", value: "Online" },
          { title: "Policy Auditor", meta: "Governance domain", value: "Reviewing" },
          { title: "Comms Synthesizer", meta: "Newsroom domain", value: "Drafting" }
        ]
      },
      {
        title: "Guardrails",
        eyebrow: "Controls",
        status: "Enforced",
        icon: ShieldCheck,
        items: [
          { title: "Citizen data access", meta: "Requires review", value: "Scoped" },
          { title: "Public message send", meta: "Human approval", value: "Locked" },
          { title: "Infrastructure changes", meta: "Simulation first", value: "Required" }
        ]
      }
    ],
    tableTitle: "Agent activity",
    rows: [
      { name: "Transit Optimizer", status: "Active", owner: "Mobility", impact: "High", confidence: "96%" },
      { name: "Policy Auditor", status: "Review", owner: "Legal", impact: "Medium", confidence: "88%" },
      { name: "Comms Synthesizer", status: "Active", owner: "Comms", impact: "Medium", confidence: "91%" },
      { name: "Budget Forecaster", status: "Stable", owner: "Finance", impact: "Low", confidence: "93%" }
    ],
    insight: "Agent automation is healthy, but public-facing communications remain correctly gated behind human approval."
  },
  settings: {
    id: "settings",
    title: "Settings",
    eyebrow: "Workspace controls",
    description: "Manage organization policy, roles, integrations, notifications, security, and city data connections.",
    primaryAction: "Save changes",
    icon: Settings2,
    stats: [
      { label: "Roles", value: "18", delta: "+2", icon: UsersRound, tone: "civic" },
      { label: "Integrations", value: "34", delta: "+5", icon: Globe2, tone: "signal" },
      { label: "Security score", value: "98", delta: "+1", icon: ShieldCheck, tone: "park" },
      { label: "Alerts", value: "12", delta: "-4", icon: BellRing, tone: "solar" }
    ],
    panels: [
      {
        title: "Workspace governance",
        eyebrow: "Access",
        status: "Secure",
        icon: Settings2,
        items: [
          { title: "Council reviewers", meta: "Approval group", value: "8 users" },
          { title: "Emergency operators", meta: "Incident access", value: "24 users" },
          { title: "Public comms publishers", meta: "Message approval", value: "6 users" }
        ]
      },
      {
        title: "Connected systems",
        eyebrow: "Integrations",
        status: "34 live",
        icon: Globe2,
        items: [
          { title: "Transit GTFS feed", meta: "Realtime updates", value: "Online" },
          { title: "Utility telemetry", meta: "Energy partner", value: "Online" },
          { title: "Open311 intake", meta: "Citizen requests", value: "Online" }
        ]
      }
    ],
    tableTitle: "Configuration audit",
    rows: [
      { name: "Role policy refresh", status: "Active", owner: "Admin", impact: "Medium", confidence: "99%" },
      { name: "Transit GTFS feed", status: "Stable", owner: "Integrations", impact: "High", confidence: "98%" },
      { name: "Alert delivery rules", status: "Review", owner: "Comms", impact: "Medium", confidence: "91%" },
      { name: "Data retention policy", status: "Active", owner: "Security", impact: "High", confidence: "96%" }
    ],
    insight: "Settings are production-ready; the only recommended review is alert delivery rules for multilingual neighborhoods."
  }
};
