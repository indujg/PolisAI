"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import {
  Activity,
  Bot,
  Brain,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Cpu,
  HeartPulse,
  MessageSquareText,
  Network,
  Newspaper,
  RadioTower,
  Route,
  ScrollText,
  Send,
  ShieldCheck,
  Sparkles,
  Wind,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AgentId = "economy" | "policy" | "health" | "climate" | "mobility" | "news";
type AgentStatus = "thinking" | "running" | "waiting" | "complete";

type Agent = {
  id: AgentId;
  name: string;
  role: string;
  icon: LucideIcon;
  status: AgentStatus;
  confidence: number;
  tasks: number;
  latency: string;
  tone: "civic" | "signal" | "solar" | "park" | "coral" | "transit";
  x: number;
  y: number;
};

type Message = {
  id: number;
  from: AgentId;
  to: AgentId | "orchestrator";
  text: string;
  type: "handoff" | "tool" | "decision" | "review";
};

const agents: Agent[] = [
  {
    id: "economy",
    name: "Economy Agent",
    role: "GDP, budgets, labor markets",
    icon: CircleDollarSign,
    status: "running",
    confidence: 94,
    tasks: 18,
    latency: "142ms",
    tone: "civic",
    x: 18,
    y: 18
  },
  {
    id: "policy",
    name: "Policy Agent",
    role: "Legislation, tradeoffs, approvals",
    icon: ScrollText,
    status: "thinking",
    confidence: 91,
    tasks: 12,
    latency: "188ms",
    tone: "signal",
    x: 50,
    y: 10
  },
  {
    id: "health",
    name: "Health Agent",
    role: "Hospitals, public health, triage",
    icon: HeartPulse,
    status: "complete",
    confidence: 97,
    tasks: 21,
    latency: "96ms",
    tone: "coral",
    x: 82,
    y: 20
  },
  {
    id: "climate",
    name: "Climate Agent",
    role: "Emissions, heat, resilience",
    icon: Wind,
    status: "running",
    confidence: 89,
    tasks: 15,
    latency: "164ms",
    tone: "solar",
    x: 18,
    y: 74
  },
  {
    id: "mobility",
    name: "Mobility Agent",
    role: "Transit, roads, routing",
    icon: Route,
    status: "waiting",
    confidence: 86,
    tasks: 9,
    latency: "211ms",
    tone: "transit",
    x: 50,
    y: 84
  },
  {
    id: "news",
    name: "News Agent",
    role: "Briefings, public narrative, alerts",
    icon: Newspaper,
    status: "thinking",
    confidence: 92,
    tasks: 14,
    latency: "133ms",
    tone: "park",
    x: 82,
    y: 72
  }
];

const connections: { from: AgentId | "orchestrator"; to: AgentId; load: number }[] = [
  { from: "orchestrator", to: "economy", load: 84 },
  { from: "orchestrator", to: "policy", load: 91 },
  { from: "orchestrator", to: "health", load: 76 },
  { from: "orchestrator", to: "climate", load: 69 },
  { from: "orchestrator", to: "mobility", load: 88 },
  { from: "orchestrator", to: "news", load: 73 },
  { from: "economy", to: "policy", load: 66 },
  { from: "climate", to: "mobility", load: 79 },
  { from: "health", to: "news", load: 58 },
  { from: "policy", to: "news", load: 71 }
];

const messageTemplates: Omit<Message, "id">[] = [
  {
    from: "economy",
    to: "policy",
    type: "handoff",
    text: "Budget impact model is ready. Carbon scenario raises $420M with low-income rebate requirement."
  },
  {
    from: "policy",
    to: "orchestrator",
    type: "review",
    text: "Drafting approval pathway with public hearing and equity guardrail gates."
  },
  {
    from: "health",
    to: "news",
    type: "decision",
    text: "Hospital readiness is stable. Recommend public message: no emergency capacity risk."
  },
  {
    from: "climate",
    to: "mobility",
    type: "tool",
    text: "Heat corridor detected near Greenline. Recommending shaded transfer routing."
  },
  {
    from: "mobility",
    to: "orchestrator",
    type: "handoff",
    text: "Transit optimization accepted. Expected congestion reduction: 8.2% over evening peak."
  },
  {
    from: "news",
    to: "policy",
    type: "review",
    text: "Public brief rewritten for clarity. Risk language reduced without losing precision."
  }
];

const runTrace = [
  { label: "Goal parsed", value: "Citywide carbon and mobility scenario", icon: Brain },
  { label: "Tools called", value: "Budget model, traffic sim, public sentiment", icon: Cpu },
  { label: "Agent handoffs", value: "Economy -> Policy -> News", icon: Network },
  { label: "Human gate", value: "Awaiting policy director approval", icon: ShieldCheck }
];

const center = { x: 50, y: 48 };

export function AIAgentCollaboration() {
  const [selectedAgent, setSelectedAgent] = useState<AgentId>("policy");
  const [tick, setTick] = useState(0);
  const [messages, setMessages] = useState<Message[]>(
    messageTemplates.slice(0, 4).map((message, index) => ({ ...message, id: index + 1 }))
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTick((value) => value + 1);
      setMessages((current) => {
        const nextIndex = (current[0]?.id ?? 0) + 1;
        const template = messageTemplates[nextIndex % messageTemplates.length];
        return [{ ...template, id: nextIndex }, ...current].slice(0, 8);
      });
    }, 2600);

    return () => window.clearInterval(interval);
  }, []);

  const selected = agents.find((agent) => agent.id === selectedAgent) ?? agents[0];
  const activeConnection = tick % connections.length;
  const networkHealth = useMemo(
    () => Math.round(agents.reduce((sum, agent) => sum + agent.confidence, 0) / agents.length),
    []
  );

  return (
    <div className="grid gap-5">
      <section className="glass-card city-map overflow-hidden rounded-lg p-4 sm:p-5 lg:p-6">
        <div className="relative z-[1] flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <Badge variant="glass" className="mb-3 gap-1.5">
              <Bot className="size-3.5 text-city-civic" />
              Agent graph / live multi-agent reasoning
            </Badge>
            <h1 className="text-display-md text-foreground">AI Agent Collaboration</h1>
            <p className="mt-3 max-w-3xl text-body-lg text-muted-foreground">
              A LangGraph-inspired civic agent workspace where economy, policy, health, climate, mobility, and news agents coordinate decisions in real time.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success" className="gap-1.5">
              <RadioTower className="size-3.5" />
              {networkHealth}% graph health
            </Badge>
            <Button variant="outline">
              <Activity />
              Inspect trace
            </Button>
            <Button variant="premium" asChild>
              <Link href="/agents/telegram">
                <MessageSquareText />
                Telegram
              </Link>
            </Button>
            <Button variant="signal">
              <Send />
              Dispatch task
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="surface-card overflow-hidden rounded-lg">
          <div className="flex flex-col gap-3 border-b border-border/70 bg-white/[0.76] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="token-label">Animated network graph</p>
              <h2 className="text-title-lg text-foreground">PolisAI orchestration graph</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="glass">6 agents</Badge>
              <Badge variant="secondary">10 channels</Badge>
              <Badge variant="success">Live messages</Badge>
            </div>
          </div>

          <div className="relative min-h-[640px] overflow-hidden bg-sensor-flow">
            <div className="absolute inset-0 bg-city-grid [background-size:32px_32px]" />
            <NetworkLines activeConnection={activeConnection} />

            <motion.button
              type="button"
              className="absolute z-20 flex size-36 flex-col items-center justify-center rounded-full border border-white/80 bg-white/[0.84] text-center shadow-glass backdrop-blur-2xl"
              style={{ left: "calc(50% - 4.5rem)", top: "calc(48% - 4.5rem)" }}
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="grid size-12 place-items-center rounded-lg bg-city-graphite text-white shadow-polis-sm">
                <Sparkles className="size-5" />
              </div>
              <p className="mt-3 text-body-sm font-bold text-foreground">Orchestrator</p>
              <p className="mt-1 text-[11px] font-semibold text-muted-foreground">Supervisor node</p>
            </motion.button>

            {agents.map((agent, index) => (
              <AgentNode
                key={agent.id}
                agent={agent}
                selected={selectedAgent === agent.id}
                pulse={tick % agents.length === index}
                onSelect={() => setSelectedAgent(agent.id)}
              />
            ))}
          </div>
        </div>

        <AgentInspector agent={selected} />
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_26rem]">
        <LiveMessages messages={messages} />
        <RunTracePanel selected={selected} />
      </section>
    </div>
  );
}

function NetworkLines({ activeConnection }: { activeConnection: number }) {
  return (
    <svg className="absolute inset-0 z-10 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="agent-line" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#009E9D" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#2F6BFF" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#F6B73C" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {connections.map((connection, index) => {
        const from = connection.from === "orchestrator" ? center : agents.find((agent) => agent.id === connection.from)!;
        const to = agents.find((agent) => agent.id === connection.to)!;
        const active = activeConnection === index;

        return (
          <g key={`${connection.from}-${connection.to}`}>
            <motion.line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="url(#agent-line)"
              strokeWidth={active ? 0.42 : 0.24}
              strokeLinecap="round"
              strokeDasharray="2 2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: active ? 0.95 : 0.48 }}
              transition={{ duration: 0.6, delay: index * 0.03 }}
            />
            <motion.circle
              r={active ? 1.05 : 0.72}
              fill={active ? "#2F6BFF" : "#009E9D"}
              animate={{
                cx: [from.x, to.x],
                cy: [from.y, to.y],
                opacity: active ? [0.2, 1, 0.2] : [0, 0.65, 0]
              }}
              transition={{ duration: active ? 1.6 : 3.8, repeat: Infinity, ease: "easeInOut", delay: index * 0.18 }}
            />
          </g>
        );
      })}
    </svg>
  );
}

function AgentNode({
  agent,
  selected,
  pulse,
  onSelect
}: {
  agent: Agent;
  selected: boolean;
  pulse: boolean;
  onSelect: () => void;
}) {
  const Icon = agent.icon;

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      className={cn(
        "absolute z-20 w-[12rem] rounded-lg border p-4 text-left shadow-polis-sm backdrop-blur-2xl transition-all hover:-translate-y-1 hover:shadow-polis-lg",
        selected ? "border-city-civic/45 bg-white/[0.92]" : "border-white/75 bg-white/[0.78]"
      )}
      style={{ left: `calc(${agent.x}% - 6rem)`, top: `calc(${agent.y}% - 4.5rem)` }}
      animate={{ y: pulse ? [0, -8, 0] : [0, -3, 0] }}
      transition={{ duration: pulse ? 1.1 : 5, repeat: Infinity, ease: "easeInOut" }}
      whileHover={{ scale: 1.03 }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className={cn("grid size-11 place-items-center rounded-md", toneClass(agent.tone))}>
          <Icon className="size-5" />
        </div>
        <AgentStatusBadge status={agent.status} />
      </div>
      <p className="truncate text-body-sm font-bold text-foreground">{agent.name}</p>
      <p className="mt-1 line-clamp-2 text-caption text-muted-foreground">{agent.role}</p>
      <div className="mt-4 flex items-center justify-between gap-3 text-[11px] font-bold text-muted-foreground">
        <span>{agent.confidence}% confidence</span>
        <span>{agent.tasks} tasks</span>
      </div>
    </motion.button>
  );
}

function AgentInspector({ agent }: { agent: Agent }) {
  const Icon = agent.icon;

  return (
    <aside className="grid h-fit gap-5">
      <section className="surface-card rounded-lg p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="token-label">Selected agent</p>
            <h2 className="text-title-lg text-foreground">{agent.name}</h2>
          </div>
          <div className={cn("grid size-12 place-items-center rounded-lg", toneClass(agent.tone))}>
            <Icon className="size-5" />
          </div>
        </div>
        <p className="text-body-sm text-muted-foreground">{agent.role}</p>

        <div className="mt-5 grid gap-3">
          <InspectorMetric label="Status" value={agent.status} icon={Activity} />
          <InspectorMetric label="Confidence" value={`${agent.confidence}%`} icon={CheckCircle2} />
          <InspectorMetric label="Active tasks" value={String(agent.tasks)} icon={Cpu} />
          <InspectorMetric label="Latency" value={agent.latency} icon={Clock3} />
        </div>
      </section>

      <section className="glass-card rounded-lg p-5">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="size-4 text-city-civic" />
          <h3 className="text-title-md text-foreground">Agent instruction</h3>
        </div>
        <p className="text-body-sm text-muted-foreground">
          Coordinate with sibling agents, cite model assumptions, produce reversible recommendations, and escalate public-facing actions to a human reviewer.
        </p>
      </section>
    </aside>
  );
}

function LiveMessages({ messages }: { messages: Message[] }) {
  return (
    <section className="surface-card rounded-lg p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="token-label">Live messages</p>
          <h2 className="text-title-lg text-foreground">Agent communication stream</h2>
        </div>
        <Badge variant="success">Streaming</Badge>
      </div>

      <div className="grid gap-3">
        {messages.map((message, index) => {
          const from = agents.find((agent) => agent.id === message.from)!;
          const to = message.to === "orchestrator" ? null : agents.find((agent) => agent.id === message.to);
          const FromIcon = from.icon;

          return (
            <motion.article
              key={message.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.025 }}
              className="rounded-lg border border-border/70 bg-white/[0.76] p-4 shadow-polis-xs"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className={cn("grid size-8 place-items-center rounded-md", toneClass(from.tone))}>
                  <FromIcon className="size-4" />
                </div>
                <p className="text-body-sm font-bold text-foreground">{from.name}</p>
                <span className="text-caption text-muted-foreground">to</span>
                <Badge variant="glass">{to?.name ?? "Orchestrator"}</Badge>
                <Badge variant={message.type === "decision" ? "success" : message.type === "review" ? "warning" : "secondary"}>{message.type}</Badge>
              </div>
              <p className="text-body-sm text-muted-foreground">{message.text}</p>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

function RunTracePanel({ selected }: { selected: Agent }) {
  return (
    <aside className="surface-card rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="token-label">Run trace</p>
          <h2 className="text-title-lg text-foreground">Crew execution</h2>
        </div>
        <Badge variant="glass">CrewAI style</Badge>
      </div>

      <div className="grid gap-4">
        {runTrace.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="relative pl-7">
              <div className="absolute left-0 top-1 grid size-5 place-items-center rounded-full bg-city-civic text-white">
                <Icon className="size-3" />
              </div>
              {index < runTrace.length - 1 ? <div className="absolute bottom-[-1rem] left-2.5 top-7 w-px bg-border" /> : null}
              <p className="text-body-sm font-bold text-foreground">{item.label}</p>
              <p className="mt-1 text-caption text-muted-foreground">{item.value}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-lg border border-city-signal/20 bg-city-signal/10 p-4">
        <div className="mb-2 flex items-center gap-2">
          <MessageSquareText className="size-4 text-city-signal" />
          <p className="text-body-sm font-bold text-foreground">Next handoff</p>
        </div>
        <p className="text-body-sm text-muted-foreground">
          {selected.name} is queued to send a structured update to the orchestrator after current tool calls complete.
        </p>
      </div>
    </aside>
  );
}

function InspectorMetric({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
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

function AgentStatusBadge({ status }: { status: AgentStatus }) {
  const variant = {
    thinking: "secondary",
    running: "success",
    waiting: "warning",
    complete: "glass"
  }[status] as "secondary" | "success" | "warning" | "glass";

  return (
    <Badge variant={variant} className="gap-1.5">
      <span className={cn("size-1.5 rounded-full", status === "running" ? "bg-city-park" : "bg-current")} />
      {status}
    </Badge>
  );
}

function toneClass(tone: Agent["tone"]) {
  return {
    civic: "bg-city-civic/10 text-city-civic",
    signal: "bg-city-signal/10 text-city-signal",
    solar: "bg-city-solar/[0.16] text-[#8A5A00]",
    park: "bg-city-park/10 text-city-park",
    coral: "bg-city-coral/10 text-city-coral",
    transit: "bg-city-transit/10 text-city-transit"
  }[tone];
}
