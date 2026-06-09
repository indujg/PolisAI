"use client";

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BellRing,
  Bot,
  CheckCircle2,
  CircleDot,
  Clock3,
  Command,
  Inbox,
  MessageSquareText,
  Play,
  RadioTower,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  UsersRound,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type BotStatus = "Online" | "Syncing" | "Review" | "Paused";
type RequestStatus = "Queued" | "Running" | "Approved" | "Needs review";
type Tone = "civic" | "signal" | "solar" | "park" | "coral" | "transit" | "graphite";

type TelegramBot = {
  name: string;
  handle: string;
  owner: string;
  status: BotStatus;
  chats: number;
  requests: number;
  simulations: number;
  uptime: string;
  tone: Tone;
  icon: LucideIcon;
};

type ChatPreview = {
  id: string;
  name: string;
  handle: string;
  channel: string;
  status: string;
  unread: number;
  intent: string;
  bot: string;
  messages: { from: "user" | "bot" | "system"; text: string; time: string }[];
};

type ActivityItem = {
  id: number;
  title: string;
  detail: string;
  bot: string;
  time: string;
  tone: Tone;
  icon: LucideIcon;
};

type RequestItem = {
  id: string;
  requester: string;
  command: string;
  status: RequestStatus;
  bot: string;
  confidence: string;
};

const bots: TelegramBot[] = [
  {
    name: "Simulation Bot",
    handle: "@PolisSimBot",
    owner: "Scenario Ops",
    status: "Online",
    chats: 18,
    requests: 86,
    simulations: 42,
    uptime: "99.7%",
    tone: "signal",
    icon: Play
  },
  {
    name: "Policy Intake Bot",
    handle: "@PolisPolicyBot",
    owner: "Policy Desk",
    status: "Online",
    chats: 12,
    requests: 74,
    simulations: 19,
    uptime: "99.4%",
    tone: "civic",
    icon: Command
  },
  {
    name: "Citizen Help Bot",
    handle: "@PolisCitizenBot",
    owner: "Civic Services",
    status: "Syncing",
    chats: 31,
    requests: 128,
    simulations: 7,
    uptime: "98.9%",
    tone: "park",
    icon: UsersRound
  },
  {
    name: "News Signal Bot",
    handle: "@PolisNewsBot",
    owner: "Narrative AI",
    status: "Online",
    chats: 9,
    requests: 41,
    simulations: 11,
    uptime: "99.9%",
    tone: "solar",
    icon: BellRing
  },
  {
    name: "Mobility Alert Bot",
    handle: "@PolisMoveBot",
    owner: "Transit Graph",
    status: "Review",
    chats: 16,
    requests: 52,
    simulations: 23,
    uptime: "97.6%",
    tone: "transit",
    icon: RadioTower
  },
  {
    name: "Emergency Triage Bot",
    handle: "@PolisTriageBot",
    owner: "Health Command",
    status: "Paused",
    chats: 4,
    requests: 17,
    simulations: 5,
    uptime: "96.8%",
    tone: "coral",
    icon: ShieldCheck
  }
];

const chats: ChatPreview[] = [
  {
    id: "greenline",
    name: "Greenline Council Ops",
    handle: "@greenline_ops",
    channel: "Private group",
    status: "Simulation pending",
    unread: 5,
    intent: "Metro expansion traffic impact",
    bot: "@PolisSimBot",
    messages: [
      { from: "user", text: "/simulate metro expansion phase 2 with school-zone protection", time: "10:42" },
      { from: "bot", text: "Scenario received. I found 4 affected corridors and 12 school pickup windows.", time: "10:42" },
      { from: "system", text: "Mobility Agent attached congestion baseline and equity constraints.", time: "10:43" },
      { from: "bot", text: "Ready to trigger simulation. Estimated runtime: 48 seconds.", time: "10:43" }
    ]
  },
  {
    id: "carbon",
    name: "Climate Policy Room",
    handle: "@carbon_review",
    channel: "Policy channel",
    status: "Awaiting approval",
    unread: 2,
    intent: "Carbon tax district exposure",
    bot: "@PolisPolicyBot",
    messages: [
      { from: "user", text: "/policy carbon tax 35 per ton with household rebate", time: "10:37" },
      { from: "bot", text: "Draft impact summary is ready. Factory Belt exposure is highest.", time: "10:38" },
      { from: "system", text: "Equity guardrail flagged for low-income energy cost band.", time: "10:38" }
    ]
  },
  {
    id: "citizen",
    name: "Citizen Services Queue",
    handle: "@polis_helpdesk",
    channel: "Support inbox",
    status: "Live triage",
    unread: 18,
    intent: "Benefits, transit passes, NFC identity",
    bot: "@PolisCitizenBot",
    messages: [
      { from: "user", text: "Can you check whether my transit subsidy renewed?", time: "10:31" },
      { from: "bot", text: "I can help. Your renewal is active and linked to your NFC citizen card.", time: "10:31" },
      { from: "system", text: "No sensitive data was sent to the chat. Tokenized eligibility only.", time: "10:32" }
    ]
  }
];

const requests: RequestItem[] = [
  { id: "REQ-4182", requester: "Greenline Council Ops", command: "/simulate metro expansion", status: "Running", bot: "@PolisSimBot", confidence: "94%" },
  { id: "REQ-4181", requester: "Climate Policy Room", command: "/policy carbon tax", status: "Needs review", bot: "@PolisPolicyBot", confidence: "88%" },
  { id: "REQ-4180", requester: "Citizen Services Queue", command: "/benefits transit pass", status: "Approved", bot: "@PolisCitizenBot", confidence: "97%" },
  { id: "REQ-4179", requester: "Mobility Watch", command: "/alert congestion north loop", status: "Queued", bot: "@PolisMoveBot", confidence: "91%" },
  { id: "REQ-4178", requester: "News Desk", command: "/brief public sentiment", status: "Approved", bot: "@PolisNewsBot", confidence: "93%" }
];

const liveActivityTemplates: Omit<ActivityItem, "id">[] = [
  {
    title: "Simulation triggered",
    detail: "Metro expansion phase 2 started from Greenline Council Ops.",
    bot: "@PolisSimBot",
    time: "Now",
    tone: "signal",
    icon: Play
  },
  {
    title: "Chat escalated",
    detail: "Carbon policy request moved to human review due to household rebate threshold.",
    bot: "@PolisPolicyBot",
    time: "1m",
    tone: "solar",
    icon: AlertTriangle
  },
  {
    title: "Citizen request resolved",
    detail: "Transit subsidy renewal confirmed using tokenized identity lookup.",
    bot: "@PolisCitizenBot",
    time: "3m",
    tone: "park",
    icon: CheckCircle2
  },
  {
    title: "News brief generated",
    detail: "Public sentiment summary delivered to the News Center feed.",
    bot: "@PolisNewsBot",
    time: "4m",
    tone: "civic",
    icon: MessageSquareText
  },
  {
    title: "Webhook sync completed",
    detail: "Telegram update offsets reconciled across all connected bots.",
    bot: "Integration Core",
    time: "6m",
    tone: "graphite",
    icon: RefreshCw
  }
];

const hourlyStats = [
  { hour: "06", chats: 34, requests: 48, simulations: 8 },
  { hour: "08", chats: 52, requests: 77, simulations: 14 },
  { hour: "10", chats: 88, requests: 114, simulations: 31 },
  { hour: "12", chats: 74, requests: 96, simulations: 24 },
  { hour: "14", chats: 91, requests: 122, simulations: 37 },
  { hour: "16", chats: 103, requests: 138, simulations: 44 },
  { hour: "18", chats: 83, requests: 109, simulations: 33 }
];

const workloadStats = bots.map((bot) => ({
  name: bot.name.replace(" Bot", ""),
  requests: bot.requests,
  simulations: bot.simulations
}));

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

export function TelegramIntegrationDashboard() {
  const [selectedChat, setSelectedChat] = useState(chats[0].id);
  const [tick, setTick] = useState(0);
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    setChartsReady(true);
    const interval = window.setInterval(() => setTick((value) => value + 1), 2400);

    return () => window.clearInterval(interval);
  }, []);

  const selected = chats.find((chat) => chat.id === selectedChat) ?? chats[0];
  const liveActivity = useMemo(
    () =>
      liveActivityTemplates.map((item, index) => ({
        ...item,
        id: index + tick
      })),
    [tick]
  );

  const activeChats = bots.reduce((sum, bot) => sum + bot.chats, 0);
  const totalRequests = bots.reduce((sum, bot) => sum + bot.requests, 0);
  const totalSimulations = bots.reduce((sum, bot) => sum + bot.simulations, 0);
  const onlineBots = bots.filter((bot) => bot.status === "Online" || bot.status === "Syncing").length;

  return (
    <div className="grid gap-5">
      <motion.section
        className="glass-card city-map overflow-hidden rounded-lg p-4 sm:p-5 lg:p-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="relative z-[1] flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <Badge variant="glass" className="mb-3 gap-1.5">
              <Send className="size-3.5 text-city-signal" />
              Telegram integration / Bot command center
            </Badge>
            <h1 className="text-display-md text-foreground">Telegram Integration Dashboard</h1>
            <p className="mt-3 max-w-3xl text-body-lg text-muted-foreground">
              Monitor connected Telegram bots, simulation commands, active civic chats, and incoming requests from one premium operations surface.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success" className="gap-1.5">
              <CircleDot className="size-3.5" />
              Webhook live
            </Badge>
            <Button variant="outline">
              <ShieldCheck />
              Audit scopes
            </Button>
            <Button variant="signal">
              <Sparkles />
              Add bot
            </Button>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Connected bots" value={`${onlineBots}/${bots.length}`} detail="online or syncing" icon={Bot} tone="signal" />
        <StatCard label="Simulations triggered" value={totalSimulations.toLocaleString()} detail="from Telegram commands" icon={Play} tone="civic" />
        <StatCard label="Active chats" value={activeChats.toLocaleString()} detail="groups, channels, support inboxes" icon={MessageSquareText} tone="park" />
        <StatCard label="Requests" value={totalRequests.toLocaleString()} detail="last 24 hours" icon={Inbox} tone="solar" />
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_29rem]">
        <div className="grid gap-5">
          <ConnectedBotsPanel />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <ChatPreviewPanel chats={chats} selected={selected} selectedChat={selectedChat} onSelect={setSelectedChat} tick={tick} />
            <StatisticsPanel chartsReady={chartsReady} />
          </div>

          <RequestsPanel />
        </div>

        <aside className="grid h-fit gap-5">
          <LiveActivityPanel items={liveActivity} tick={tick} />
          <IntegrationHealthPanel />
        </aside>
      </section>
    </div>
  );
}

function StatCard({
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
  tone: Tone;
}) {
  return (
    <motion.article
      className="rounded-lg border border-white/75 bg-white/[0.76] p-4 shadow-polis-sm backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.88] hover:shadow-polis-md"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className={cn("grid size-10 place-items-center rounded-md", toneClass(tone))}>
          <Icon className="size-5" />
        </div>
        <span className="font-mono text-[11px] font-semibold text-city-park">LIVE</span>
      </div>
      <p className="text-metric text-foreground">{value}</p>
      <p className="mt-1 text-body-sm font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-caption text-muted-foreground">{detail}</p>
    </motion.article>
  );
}

function ConnectedBotsPanel() {
  return (
    <section className="surface-card rounded-lg p-4 sm:p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge variant="glass" className="mb-3 gap-1.5">
            <Bot className="size-3.5 text-city-civic" />
            Connected bots
          </Badge>
          <h2 className="text-title-md text-foreground">Telegram bot fleet</h2>
          <p className="mt-1 text-body-sm text-muted-foreground">Operational status, chat load, request volume, and simulation trigger count.</p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw />
          Sync webhooks
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {bots.map((bot, index) => {
          const Icon = bot.icon;

          return (
            <motion.article
              key={bot.handle}
              className="rounded-lg border border-border/70 bg-white/[0.74] p-4 shadow-polis-xs backdrop-blur-xl"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: index * 0.05 }}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={cn("grid size-10 shrink-0 place-items-center rounded-md", toneClass(bot.tone))}>
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-body-sm font-semibold text-foreground">{bot.name}</h3>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">{bot.handle}</p>
                  </div>
                </div>
                <BotStatusBadge status={bot.status} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <TinyMetric label="Chats" value={bot.chats.toString()} />
                <TinyMetric label="Requests" value={bot.requests.toString()} />
                <TinyMetric label="Sims" value={bot.simulations.toString()} />
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 text-caption text-muted-foreground">
                <span>{bot.owner}</span>
                <span className="font-mono font-semibold text-foreground">{bot.uptime}</span>
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

function ChatPreviewPanel({
  chats,
  selected,
  selectedChat,
  onSelect,
  tick
}: {
  chats: ChatPreview[];
  selected: ChatPreview;
  selectedChat: string;
  onSelect: (id: string) => void;
  tick: number;
}) {
  return (
    <section className="glass-card rounded-lg p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <Badge variant="glass" className="mb-3 gap-1.5">
            <MessageSquareText className="size-3.5 text-city-signal" />
            Chat preview
          </Badge>
          <h2 className="text-title-md text-foreground">Command conversations</h2>
        </div>
        <Badge variant="success">{selected.status}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <div className="grid gap-2">
          {chats.map((chat) => (
            <button
              key={chat.id}
              type="button"
              onClick={() => onSelect(chat.id)}
              className={cn(
                "focus-ring rounded-md border p-3 text-left transition-all",
                selectedChat === chat.id
                  ? "border-primary/35 bg-white text-foreground shadow-polis-sm"
                  : "border-border/70 bg-white/[0.58] text-muted-foreground hover:bg-white hover:text-foreground"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-body-sm font-semibold">{chat.name}</span>
                <span className="rounded-full bg-city-coral/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-city-coral">
                  {chat.unread}
                </span>
              </div>
              <p className="mt-1 truncate font-mono text-[11px]">{chat.handle}</p>
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-lg border border-city-graphite/10 bg-city-graphite shadow-polis-md">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white">
            <div className="min-w-0">
              <p className="truncate text-body-sm font-semibold">{selected.name}</p>
              <p className="truncate font-mono text-[11px] text-white/58">{selected.channel} / {selected.bot}</p>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map((item) => (
                <motion.span
                  key={item}
                  className="block size-2 rounded-full bg-city-aqua"
                  animate={{ opacity: [0.35, 1, 0.35] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: item * 0.18 }}
                />
              ))}
            </div>
          </div>

          <div className="grid min-h-[340px] content-end gap-3 bg-city-grid p-4 [background-size:24px_24px]">
            <div className="mb-auto rounded-md border border-white/10 bg-white/[0.06] px-3 py-2">
              <p className="font-mono text-[10px] uppercase text-white/48">Detected intent</p>
              <p className="mt-1 text-body-sm font-semibold text-white">{selected.intent}</p>
            </div>
            {selected.messages.map((message, index) => (
              <motion.div
                key={`${selected.id}-${message.time}-${index}`}
                className={cn(
                  "max-w-[88%] rounded-lg border px-3 py-2 text-body-sm shadow-polis-xs",
                  message.from === "user" && "ml-auto border-city-signal/30 bg-city-signal text-white",
                  message.from === "bot" && "border-white/15 bg-white/[0.12] text-white",
                  message.from === "system" && "mx-auto border-city-solar/30 bg-city-solar/15 text-white/82"
                )}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
              >
                <p>{message.text}</p>
                <p className="mt-1 font-mono text-[10px] opacity-60">{message.time}</p>
              </motion.div>
            ))}
            <motion.div
              className="ml-auto flex w-fit items-center gap-2 rounded-full border border-city-aqua/25 bg-city-aqua/10 px-3 py-1.5 font-mono text-[11px] text-city-aqua"
              animate={{ opacity: tick % 2 === 0 ? 1 : 0.62 }}
              transition={{ duration: 0.4 }}
            >
              <Sparkles className="size-3.5" />
              PolisAI is composing response
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatisticsPanel({ chartsReady }: { chartsReady: boolean }) {
  return (
    <section className="surface-card rounded-lg p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <Badge variant="glass" className="mb-3 gap-1.5">
            <BarChart3 className="size-3.5 text-city-civic" />
            Statistics
          </Badge>
          <h2 className="text-title-md text-foreground">Telegram operations</h2>
        </div>
        <Badge variant="glass">24h window</Badge>
      </div>

      <div className="grid gap-5">
        <div className="h-[230px] min-w-0">
          {chartsReady ? <HourlyAreaChart /> : <ChartSkeleton />}
        </div>
        <div className="h-[230px] min-w-0">
          {chartsReady ? <BotWorkloadChart /> : <ChartSkeleton bars />}
        </div>
      </div>
    </section>
  );
}

function RequestsPanel() {
  return (
    <section className="surface-card rounded-lg p-4 sm:p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="token-label">Requests</p>
          <h2 className="text-title-md text-foreground">Command request queue</h2>
        </div>
        <Button variant="outline" size="sm">
          <Inbox />
          Review queue
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Requester</TableHead>
            <TableHead>Command</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Bot</TableHead>
            <TableHead>Confidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-mono text-[12px] font-semibold text-foreground">{request.id}</TableCell>
              <TableCell className="font-semibold text-foreground">{request.requester}</TableCell>
              <TableCell className="font-mono text-[12px] text-muted-foreground">{request.command}</TableCell>
              <TableCell><RequestStatusBadge status={request.status} /></TableCell>
              <TableCell className="font-mono text-[12px] text-muted-foreground">{request.bot}</TableCell>
              <TableCell>{request.confidence}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

function LiveActivityPanel({ items, tick }: { items: ActivityItem[]; tick: number }) {
  return (
    <section className="glass-card rounded-lg p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <Badge variant="glass" className="mb-3 gap-1.5">
            <Activity className="size-3.5 text-city-park" />
            Live activity
          </Badge>
          <h2 className="text-title-md text-foreground">Integration stream</h2>
        </div>
        <Badge variant="success">Live</Badge>
      </div>

      <div className="grid gap-3">
        {items.map((item, index) => {
          const Icon = item.icon;

          return (
            <motion.article
              key={`${item.title}-${index}`}
              className={cn(
                "rounded-lg border p-3 shadow-polis-xs transition-colors",
                index === tick % items.length
                  ? "border-city-civic/25 bg-city-civic/[0.08]"
                  : "border-white/70 bg-white/[0.72]"
              )}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: index * 0.04 }}
            >
              <div className="flex gap-3">
                <div className={cn("grid size-9 shrink-0 place-items-center rounded-md", toneClass(item.tone))}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-body-sm font-semibold text-foreground">{item.title}</p>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{item.time}</span>
                  </div>
                  <p className="mt-1 text-caption text-muted-foreground">{item.detail}</p>
                  <p className="mt-2 font-mono text-[11px] font-semibold text-city-signal">{item.bot}</p>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

function IntegrationHealthPanel() {
  return (
    <section className="overflow-hidden rounded-lg border border-city-graphite/10 bg-white shadow-polis-sm">
      <div className="border-b border-border/70 bg-city-graphite px-4 py-3 text-white sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-city-solar" />
            <p className="font-mono text-[11px] uppercase text-white/72">Integration health</p>
          </div>
          <Badge variant="glass" className="border-white/20 bg-white/10 text-white">Secure</Badge>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:p-5">
        <HealthRow label="Webhook latency" value="184ms" status="Nominal" />
        <HealthRow label="Update offset drift" value="0.02%" status="Nominal" />
        <HealthRow label="Bot token vault" value="6 sealed" status="Protected" />
        <HealthRow label="Human approval gates" value="3 active" status="Guarded" />
      </div>
    </section>
  );
}

function HourlyAreaChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={hourlyStats} margin={{ left: -12, right: 8, top: 12, bottom: 8 }}>
        <defs>
          <linearGradient id="telegram-chats" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2F6BFF" stopOpacity={0.24} />
            <stop offset="95%" stopColor="#2F6BFF" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="telegram-sims" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#009E9D" stopOpacity={0.24} />
            <stop offset="95%" stopColor="#009E9D" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#DDE8EA" strokeDasharray="3 6" vertical={false} />
        <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Area type="monotone" dataKey="chats" stroke="#2F6BFF" strokeWidth={3} fill="url(#telegram-chats)" />
        <Area type="monotone" dataKey="requests" stroke="#F6B73C" strokeWidth={2} fill="transparent" />
        <Area type="monotone" dataKey="simulations" stroke="#009E9D" strokeWidth={3} fill="url(#telegram-sims)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function BotWorkloadChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={workloadStats} margin={{ left: -12, right: 8, top: 12, bottom: 8 }}>
        <CartesianGrid stroke="#DDE8EA" strokeDasharray="3 6" vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 11 }} interval={0} angle={-14} textAnchor="end" height={54} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <Tooltip cursor={{ fill: "rgba(0, 158, 157, 0.06)" }} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Bar dataKey="requests" fill="#2F6BFF" radius={[6, 6, 2, 2]} />
        <Bar dataKey="simulations" fill="#13C8C3" radius={[6, 6, 2, 2]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function TinyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-white/[0.78] px-2 py-2 shadow-polis-xs">
      <p className="font-mono text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-[13px] font-semibold text-foreground">{value}</p>
    </div>
  );
}

function HealthRow({ label, value, status }: { label: string; value: string; status: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-white/[0.76] p-3">
      <div className="min-w-0">
        <p className="truncate text-body-sm font-semibold text-foreground">{label}</p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">{status}</p>
      </div>
      <span className="shrink-0 font-mono text-[12px] font-semibold text-foreground">{value}</span>
    </div>
  );
}

function BotStatusBadge({ status }: { status: BotStatus }) {
  const variant = {
    Online: "success",
    Syncing: "glass",
    Review: "warning",
    Paused: "danger"
  }[status] as "success" | "glass" | "warning" | "danger";

  return <Badge variant={variant}>{status}</Badge>;
}

function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const variant = {
    Queued: "glass",
    Running: "warning",
    Approved: "success",
    "Needs review": "danger"
  }[status] as "glass" | "warning" | "success" | "danger";

  return <Badge variant={variant}>{status}</Badge>;
}

function ChartSkeleton({ bars = false }: { bars?: boolean }) {
  return (
    <div className="flex h-full items-end gap-2 rounded-lg border border-border/70 bg-city-mist p-4">
      {[42, 58, 46, 70, 62, 84, 76, 90, 64, 78, 72, 88].map((height, index) => (
        <div
          key={`telegram-skeleton-${index}`}
          className={cn("w-full rounded-t-md", bars ? "bg-city-signal/45" : "bg-city-civic/35")}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
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
