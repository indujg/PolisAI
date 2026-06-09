"use client";

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BellRing,
  Brain,
  CheckCircle2,
  CircleDot,
  Clock3,
  Command,
  Cpu,
  Database,
  FileKey2,
  Fingerprint,
  Gauge,
  GitBranch,
  KeyRound,
  LockKeyhole,
  MoreHorizontal,
  Pause,
  Play,
  RadioTower,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserPlus,
  UsersRound,
  Webhook
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type AdminTab = "users" | "roles" | "simulation" | "ai" | "sources";
type Tone = "civic" | "signal" | "solar" | "park" | "coral" | "transit" | "graphite";
type UserStatus = "Active" | "Invited" | "Suspended" | "Review";
type RoleRisk = "Low" | "Medium" | "High";
type SourceStatus = "Healthy" | "Degraded" | "Syncing" | "Offline";

type User = {
  name: string;
  email: string;
  role: string;
  team: string;
  status: UserStatus;
  lastSeen: string;
  mfa: boolean;
};

type Role = {
  name: string;
  users: number;
  risk: RoleRisk;
  description: string;
  permissions: string[];
};

type Source = {
  name: string;
  type: string;
  status: SourceStatus;
  freshness: string;
  records: string;
  owner: string;
  icon: LucideIcon;
  tone: Tone;
};

type AuditEvent = {
  title: string;
  detail: string;
  time: string;
  tone: Tone;
  icon: LucideIcon;
};

const tabs: { id: AdminTab; label: string; icon: LucideIcon }[] = [
  { id: "users", label: "Users", icon: UsersRound },
  { id: "roles", label: "Roles", icon: ShieldCheck },
  { id: "simulation", label: "Simulation", icon: Play },
  { id: "ai", label: "AI Config", icon: Brain },
  { id: "sources", label: "Data Sources", icon: Database }
];

const users: User[] = [
  { name: "Avery Chen", email: "avery@polis.ai", role: "Super Admin", team: "Command", status: "Active", lastSeen: "2m ago", mfa: true },
  { name: "Maya Shah", email: "maya@polis.ai", role: "Policy Director", team: "Policy", status: "Active", lastSeen: "11m ago", mfa: true },
  { name: "Jon Bell", email: "jon@polis.ai", role: "Simulation Operator", team: "City Twin", status: "Review", lastSeen: "28m ago", mfa: true },
  { name: "Priya Raman", email: "priya@polis.ai", role: "Data Steward", team: "Data", status: "Active", lastSeen: "42m ago", mfa: true },
  { name: "Leo Martin", email: "leo@polis.ai", role: "Analyst", team: "Analytics", status: "Invited", lastSeen: "Pending", mfa: false },
  { name: "Nora Hart", email: "nora@polis.ai", role: "Viewer", team: "Council", status: "Suspended", lastSeen: "9d ago", mfa: false }
];

const roles: Role[] = [
  {
    name: "Super Admin",
    users: 3,
    risk: "High",
    description: "Full workspace control, billing, secrets, and policy override authority.",
    permissions: ["Manage users", "Rotate keys", "Override simulations", "Deploy agents"]
  },
  {
    name: "Policy Director",
    users: 8,
    risk: "Medium",
    description: "Approves policy packages, briefings, and public scenario releases.",
    permissions: ["Approve policies", "View citizens", "Export reports"]
  },
  {
    name: "Simulation Operator",
    users: 14,
    risk: "Medium",
    description: "Runs city twin scenarios within approved compute and safety limits.",
    permissions: ["Run simulations", "Tune parameters", "View outputs"]
  },
  {
    name: "Data Steward",
    users: 6,
    risk: "Low",
    description: "Maintains connectors, lineage, freshness, and data quality gates.",
    permissions: ["Manage sources", "View lineage", "Resolve syncs"]
  },
  {
    name: "Council Viewer",
    users: 31,
    risk: "Low",
    description: "Read-only access for dashboards, briefings, and approved reports.",
    permissions: ["View dashboards", "Download briefings"]
  }
];

const dataSources: Source[] = [
  { name: "City Mobility Graph", type: "Streaming API", status: "Healthy", freshness: "12s", records: "18.4M", owner: "Transit Graph", icon: RadioTower, tone: "transit" },
  { name: "Civic Identity Ledger", type: "Encrypted warehouse", status: "Healthy", freshness: "1m", records: "8.2M", owner: "GovCloud", icon: Fingerprint, tone: "signal" },
  { name: "Hospital Capacity Feed", type: "HL7 bridge", status: "Syncing", freshness: "4m", records: "482K", owner: "Health Command", icon: Activity, tone: "coral" },
  { name: "Climate Sensor Mesh", type: "IoT stream", status: "Degraded", freshness: "18m", records: "42.1M", owner: "Resilience", icon: Webhook, tone: "solar" },
  { name: "Council Policy Archive", type: "Document index", status: "Healthy", freshness: "8m", records: "91K", owner: "Policy Desk", icon: FileKey2, tone: "civic" },
  { name: "Public Sentiment Firehose", type: "Moderated stream", status: "Offline", freshness: "2h", records: "6.7M", owner: "News Agent", icon: BellRing, tone: "park" }
];

const auditEvents: AuditEvent[] = [
  { title: "Role updated", detail: "Policy Director role gained export approval gate.", time: "4m", tone: "signal", icon: ShieldCheck },
  { title: "Model config saved", detail: "GPT civic planner temperature set to 0.31.", time: "18m", tone: "civic", icon: Brain },
  { title: "Simulation paused", detail: "Public scenario release paused for equity review.", time: "42m", tone: "solar", icon: Pause },
  { title: "Connector degraded", detail: "Climate Sensor Mesh freshness exceeded SLA.", time: "1h", tone: "coral", icon: AlertTriangle }
];

const governanceTrend = [
  { day: "Mon", users: 82, roles: 34, sources: 91 },
  { day: "Tue", users: 86, roles: 36, sources: 88 },
  { day: "Wed", users: 91, roles: 42, sources: 93 },
  { day: "Thu", users: 89, roles: 39, sources: 85 },
  { day: "Fri", users: 94, roles: 41, sources: 89 },
  { day: "Sat", users: 96, roles: 44, sources: 92 },
  { day: "Sun", users: 98, roles: 46, sources: 95 }
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

export function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [query, setQuery] = useState("");
  const [chartsReady, setChartsReady] = useState(false);
  const [simulationLive, setSimulationLive] = useState(true);
  const [humanReview, setHumanReview] = useState(true);
  const [publicRelease, setPublicRelease] = useState(false);
  const [maxRuntime, setMaxRuntime] = useState(48);
  const [computeLimit, setComputeLimit] = useState(72);
  const [modelTemperature, setModelTemperature] = useState(31);
  const [agentAutonomy, setAgentAutonomy] = useState(64);
  const [piiGuard, setPiiGuard] = useState(true);
  const [toolCalling, setToolCalling] = useState(true);

  useEffect(() => {
    setChartsReady(true);
  }, []);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return users;
    }

    return users.filter((user) =>
      [user.name, user.email, user.role, user.team, user.status].join(" ").toLowerCase().includes(normalized)
    );
  }, [query]);

  const onlineUsers = users.filter((user) => user.status === "Active").length;
  const mfaCoverage = Math.round((users.filter((user) => user.mfa).length / users.length) * 100);
  const healthySources = dataSources.filter((source) => source.status === "Healthy" || source.status === "Syncing").length;

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
              <Settings2 className="size-3.5 text-city-civic" />
              Admin settings / Enterprise governance
            </Badge>
            <h1 className="text-display-md text-foreground">Admin Settings</h1>
            <p className="mt-3 max-w-3xl text-body-lg text-muted-foreground">
              Govern users, roles, simulation controls, AI configuration, and trusted data sources for the PolisAI city operating system.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success" className="gap-1.5">
              <CircleDot className="size-3.5" />
              Compliance live
            </Badge>
            <Button variant="outline">
              <RefreshCw />
              Sync policies
            </Button>
            <Button variant="signal">
              <Command />
              Save changes
            </Button>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Active users" value={`${onlineUsers}/${users.length}`} detail="workspace members online" icon={UsersRound} tone="signal" />
        <AdminStat label="MFA coverage" value={`${mfaCoverage}%`} detail="strong authentication enforced" icon={KeyRound} tone="park" />
        <AdminStat label="Simulation guardrails" value={humanReview ? "On" : "Off"} detail="human approval for public scenarios" icon={Gauge} tone="solar" />
        <AdminStat label="Data health" value={`${healthySources}/${dataSources.length}`} detail="connectors healthy or syncing" icon={Database} tone="civic" />
      </section>

      <section className="surface-card rounded-lg p-3 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "focus-ring inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-body-sm font-semibold transition-all",
                    active
                      ? "border-primary/35 bg-white text-foreground shadow-polis-sm"
                      : "border-border/70 bg-white/[0.64] text-muted-foreground hover:-translate-y-0.5 hover:bg-white hover:text-foreground"
                  )}
                >
                  <Icon className={cn("size-4", active ? "text-city-civic" : "text-muted-foreground")} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative min-w-0 xl:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users, roles, sources"
              className="pl-9"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_27rem]">
        <div className="min-w-0">
          {activeTab === "users" ? <UserManagement users={filteredUsers} /> : null}
          {activeTab === "roles" ? <RoleManagement /> : null}
          {activeTab === "simulation" ? (
            <SimulationControls
              simulationLive={simulationLive}
              setSimulationLive={setSimulationLive}
              humanReview={humanReview}
              setHumanReview={setHumanReview}
              publicRelease={publicRelease}
              setPublicRelease={setPublicRelease}
              maxRuntime={maxRuntime}
              setMaxRuntime={setMaxRuntime}
              computeLimit={computeLimit}
              setComputeLimit={setComputeLimit}
            />
          ) : null}
          {activeTab === "ai" ? (
            <AIConfiguration
              modelTemperature={modelTemperature}
              setModelTemperature={setModelTemperature}
              agentAutonomy={agentAutonomy}
              setAgentAutonomy={setAgentAutonomy}
              piiGuard={piiGuard}
              setPiiGuard={setPiiGuard}
              toolCalling={toolCalling}
              setToolCalling={setToolCalling}
            />
          ) : null}
          {activeTab === "sources" ? <DataSources /> : null}
        </div>

        <aside className="grid h-fit gap-5">
          <GovernancePanel chartsReady={chartsReady} />
          <AuditStream />
        </aside>
      </section>
    </div>
  );
}

function AdminStat({
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

function UserManagement({ users: visibleUsers }: { users: User[] }) {
  return (
    <section className="surface-card rounded-lg p-4 sm:p-5">
      <SectionHeader
        eyebrow="User management"
        title="Workspace members"
        description="Invite, suspend, review, and audit access across city operations teams."
        icon={UsersRound}
        action={<Button variant="signal" size="sm"><UserPlus />Invite user</Button>}
      />

      {visibleUsers.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border/70 bg-white/[0.72]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>MFA</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleUsers.map((user) => (
                <TableRow key={user.email}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{user.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell className="text-muted-foreground">{user.team}</TableCell>
                  <TableCell><UserStatusBadge status={user.status} /></TableCell>
                  <TableCell>
                    <Badge variant={user.mfa ? "success" : "warning"}>{user.mfa ? "On" : "Missing"}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-[12px] text-muted-foreground">{user.lastSeen}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="icon" size="icon-sm" aria-label={`Open actions for ${user.name}`}>
                      <MoreHorizontal />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={UsersRound}
          title="No users found"
          description="Change the search term or clear filters to see workspace members."
        />
      )}
    </section>
  );
}

function RoleManagement() {
  return (
    <section className="surface-card rounded-lg p-4 sm:p-5">
      <SectionHeader
        eyebrow="Role management"
        title="Permission architecture"
        description="Map human authority, AI actions, exports, approvals, and data access into enforceable roles."
        icon={ShieldCheck}
        action={<Button variant="outline" size="sm"><LockKeyhole />Create role</Button>}
      />

      <div className="grid gap-3 lg:grid-cols-2">
        {roles.map((role, index) => (
          <motion.article
            key={role.name}
            className="rounded-lg border border-border/70 bg-white/[0.74] p-4 shadow-polis-xs backdrop-blur-xl"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: index * 0.05 }}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-title-md text-foreground">{role.name}</h3>
                <p className="mt-1 text-body-sm text-muted-foreground">{role.description}</p>
              </div>
              <RiskBadge risk={role.risk} />
            </div>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <TinyMetric label="Users" value={role.users.toString()} />
              <TinyMetric label="Risk" value={role.risk} />
            </div>
            <div className="flex flex-wrap gap-2">
              {role.permissions.map((permission) => (
                <Badge key={permission} variant="glass">{permission}</Badge>
              ))}
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function SimulationControls({
  simulationLive,
  setSimulationLive,
  humanReview,
  setHumanReview,
  publicRelease,
  setPublicRelease,
  maxRuntime,
  setMaxRuntime,
  computeLimit,
  setComputeLimit
}: {
  simulationLive: boolean;
  setSimulationLive: (value: boolean) => void;
  humanReview: boolean;
  setHumanReview: (value: boolean) => void;
  publicRelease: boolean;
  setPublicRelease: (value: boolean) => void;
  maxRuntime: number;
  setMaxRuntime: (value: number) => void;
  computeLimit: number;
  setComputeLimit: (value: number) => void;
}) {
  return (
    <section className="surface-card rounded-lg p-4 sm:p-5">
      <SectionHeader
        eyebrow="Simulation controls"
        title="City twin guardrails"
        description="Set runtime limits, approval gates, and public-release controls for policy simulations."
        icon={Play}
        action={<Button variant={simulationLive ? "outline" : "signal"} size="sm" onClick={() => setSimulationLive(!simulationLive)}>{simulationLive ? <Pause /> : <Play />}{simulationLive ? "Pause engine" : "Start engine"}</Button>}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="grid gap-4">
          <ToggleRow
            title="Simulation engine"
            detail="Allow approved operators to run city twin scenarios."
            enabled={simulationLive}
            onToggle={() => setSimulationLive(!simulationLive)}
            icon={Cpu}
          />
          <ToggleRow
            title="Human review gate"
            detail="Require director approval before publishing scenario outputs."
            enabled={humanReview}
            onToggle={() => setHumanReview(!humanReview)}
            icon={ShieldCheck}
          />
          <ToggleRow
            title="Public release mode"
            detail="Permit approved scenarios to appear in external briefings."
            enabled={publicRelease}
            onToggle={() => setPublicRelease(!publicRelease)}
            icon={RadioTower}
          />
          <RangeControl label="Max runtime" value={maxRuntime} suffix="min" min={10} max={120} onChange={setMaxRuntime} />
          <RangeControl label="Compute limit" value={computeLimit} suffix="%" min={10} max={100} onChange={setComputeLimit} />
        </div>

        <div className="rounded-lg border border-white/70 bg-city-graphite p-4 text-white shadow-polis-md">
          <p className="font-mono text-[11px] uppercase text-white/58">Current policy</p>
          <h3 className="mt-2 text-title-md text-white">Controlled autonomy</h3>
          <div className="mt-5 grid gap-3">
            <DarkMetric label="Runtime cap" value={`${maxRuntime} min`} />
            <DarkMetric label="Compute budget" value={`${computeLimit}%`} />
            <DarkMetric label="Public release" value={publicRelease ? "Enabled" : "Locked"} />
            <DarkMetric label="Approval mode" value={humanReview ? "Required" : "Bypassed"} />
          </div>
        </div>
      </div>
    </section>
  );
}

function AIConfiguration({
  modelTemperature,
  setModelTemperature,
  agentAutonomy,
  setAgentAutonomy,
  piiGuard,
  setPiiGuard,
  toolCalling,
  setToolCalling
}: {
  modelTemperature: number;
  setModelTemperature: (value: number) => void;
  agentAutonomy: number;
  setAgentAutonomy: (value: number) => void;
  piiGuard: boolean;
  setPiiGuard: (value: boolean) => void;
  toolCalling: boolean;
  setToolCalling: (value: boolean) => void;
}) {
  return (
    <section className="surface-card rounded-lg p-4 sm:p-5">
      <SectionHeader
        eyebrow="AI configuration"
        title="Model and agent policy"
        description="Configure civic reasoning, tool access, privacy controls, and autonomy thresholds."
        icon={Brain}
        action={<Button variant="signal" size="sm"><Sparkles />Run eval</Button>}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-4">
          <div className="rounded-lg border border-border/70 bg-white/[0.74] p-4 shadow-polis-xs">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="token-label">Primary model</p>
                <h3 className="mt-1 text-title-md text-foreground">PolisAI Civic Planner</h3>
                <p className="mt-1 text-body-sm text-muted-foreground">Reasoning profile for policy summaries, simulations, and agent handoffs.</p>
              </div>
              <Badge variant="success">Production</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <TinyMetric label="Context" value="1M tokens" />
              <TinyMetric label="Eval score" value="96.4" />
              <TinyMetric label="Latency" value="412ms" />
            </div>
          </div>

          <RangeControl label="Model temperature" value={modelTemperature} suffix="%" min={0} max={100} onChange={setModelTemperature} />
          <RangeControl label="Agent autonomy" value={agentAutonomy} suffix="%" min={0} max={100} onChange={setAgentAutonomy} />
          <ToggleRow title="PII redaction guard" detail="Strip sensitive citizen data before model and tool calls." enabled={piiGuard} onToggle={() => setPiiGuard(!piiGuard)} icon={Fingerprint} />
          <ToggleRow title="Tool calling" detail="Allow agents to call approved simulation, source, and briefing tools." enabled={toolCalling} onToggle={() => setToolCalling(!toolCalling)} icon={GitBranch} />
        </div>

        <div className="glass-card rounded-lg p-4">
          <p className="token-label">Policy preview</p>
          <h3 className="mt-2 text-title-md text-foreground">AI operating envelope</h3>
          <div className="mt-5 grid gap-3">
            <EnvelopeRow label="Creativity" value={`${modelTemperature}%`} />
            <EnvelopeRow label="Autonomy" value={`${agentAutonomy}%`} />
            <EnvelopeRow label="PII guard" value={piiGuard ? "Strict" : "Relaxed"} />
            <EnvelopeRow label="Tool calls" value={toolCalling ? "Allowed" : "Blocked"} />
          </div>
          <div className="mt-5 rounded-lg border border-city-civic/20 bg-city-civic/[0.07] p-4">
            <div className="mb-2 flex items-center gap-2">
              <CheckCircle2 className="size-4 text-city-park" />
              <p className="text-body-sm font-semibold text-foreground">Recommended</p>
            </div>
            <p className="text-body-sm text-muted-foreground">Keep autonomy below 70% while public-release mode is disabled.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function DataSources() {
  return (
    <section className="surface-card rounded-lg p-4 sm:p-5">
      <SectionHeader
        eyebrow="Data sources"
        title="Connector registry"
        description="Monitor source freshness, lineage owners, records, and sync health for every civic intelligence feed."
        icon={Database}
        action={<Button variant="outline" size="sm"><Webhook />Add source</Button>}
      />

      <div className="grid gap-3 lg:grid-cols-2">
        {dataSources.map((source, index) => {
          const Icon = source.icon;

          return (
            <motion.article
              key={source.name}
              className="rounded-lg border border-border/70 bg-white/[0.74] p-4 shadow-polis-xs backdrop-blur-xl"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: index * 0.05 }}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={cn("grid size-10 shrink-0 place-items-center rounded-md", toneClass(source.tone))}>
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-body-sm font-semibold text-foreground">{source.name}</h3>
                    <p className="truncate text-caption text-muted-foreground">{source.type}</p>
                  </div>
                </div>
                <SourceStatusBadge status={source.status} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <TinyMetric label="Freshness" value={source.freshness} />
                <TinyMetric label="Records" value={source.records} />
                <TinyMetric label="Owner" value={source.owner} />
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

function GovernancePanel({ chartsReady }: { chartsReady: boolean }) {
  return (
    <section className="glass-card rounded-lg p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <Badge variant="glass" className="mb-3 gap-1.5">
            <SlidersHorizontal className="size-3.5 text-city-signal" />
            Governance score
          </Badge>
          <h2 className="text-title-md text-foreground">Control coverage</h2>
        </div>
        <Badge variant="success">96%</Badge>
      </div>
      <div className="h-[240px] min-w-0">
        {chartsReady ? <GovernanceChart /> : <ChartSkeleton />}
      </div>
    </section>
  );
}

function AuditStream() {
  return (
    <section className="surface-card rounded-lg p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="token-label">Audit trail</p>
          <h2 className="text-title-md text-foreground">Recent admin activity</h2>
        </div>
        <Badge variant="glass">Immutable</Badge>
      </div>

      <div className="grid gap-3">
        {auditEvents.map((event, index) => {
          const Icon = event.icon;

          return (
            <motion.article
              key={event.title}
              className="rounded-lg border border-border/70 bg-white/[0.74] p-3 shadow-polis-xs"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: index * 0.05 }}
            >
              <div className="flex gap-3">
                <div className={cn("grid size-9 shrink-0 place-items-center rounded-md", toneClass(event.tone))}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-body-sm font-semibold text-foreground">{event.title}</p>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{event.time}</span>
                  </div>
                  <p className="mt-1 text-caption text-muted-foreground">{event.detail}</p>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  action
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  action: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <Badge variant="glass" className="mb-3 gap-1.5">
          <Icon className="size-3.5 text-city-civic" />
          {eyebrow}
        </Badge>
        <h2 className="text-title-md text-foreground">{title}</h2>
        <p className="mt-1 max-w-3xl text-body-sm text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function ToggleRow({
  title,
  detail,
  enabled,
  onToggle,
  icon: Icon
}: {
  title: string;
  detail: string;
  enabled: boolean;
  onToggle: () => void;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-white/[0.74] p-4 shadow-polis-xs">
      <div className="flex min-w-0 items-start gap-3">
        <div className={cn("grid size-10 shrink-0 place-items-center rounded-md", enabled ? "bg-city-civic/10 text-city-civic" : "bg-muted text-muted-foreground")}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-body-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-caption text-muted-foreground">{detail}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={enabled}
        className={cn(
          "focus-ring relative h-6 w-11 shrink-0 rounded-full transition-colors",
          enabled ? "bg-city-civic" : "bg-muted-foreground/25"
        )}
      >
        <span
          className={cn(
            "absolute top-1 size-4 rounded-full bg-white shadow-polis-xs transition-transform",
            enabled ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

function RangeControl({
  label,
  value,
  suffix,
  min,
  max,
  onChange
}: {
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-3 rounded-lg border border-border/70 bg-white/[0.74] p-4 shadow-polis-xs">
      <span className="flex items-center justify-between gap-3">
        <span className="text-body-sm font-semibold text-foreground">{label}</span>
        <span className="font-mono text-[12px] font-semibold text-city-signal">{value}{suffix}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full accent-city-civic"
      />
    </label>
  );
}

function GovernanceChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={governanceTrend} margin={{ left: -12, right: 8, top: 12, bottom: 8 }}>
        <defs>
          <linearGradient id="settings-users" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2F6BFF" stopOpacity={0.24} />
            <stop offset="95%" stopColor="#2F6BFF" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="settings-sources" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#009E9D" stopOpacity={0.24} />
            <stop offset="95%" stopColor="#009E9D" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#DDE8EA" strokeDasharray="3 6" vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#687386", fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Area type="monotone" dataKey="users" stroke="#2F6BFF" strokeWidth={3} fill="url(#settings-users)" />
        <Area type="monotone" dataKey="roles" stroke="#F6B73C" strokeWidth={2} fill="transparent" />
        <Area type="monotone" dataKey="sources" stroke="#009E9D" strokeWidth={3} fill="url(#settings-sources)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function UserStatusBadge({ status }: { status: UserStatus }) {
  const variant = {
    Active: "success",
    Invited: "glass",
    Suspended: "danger",
    Review: "warning"
  }[status] as "success" | "glass" | "danger" | "warning";

  return <Badge variant={variant}>{status}</Badge>;
}

function RiskBadge({ risk }: { risk: RoleRisk }) {
  const variant = {
    Low: "success",
    Medium: "warning",
    High: "danger"
  }[risk] as "success" | "warning" | "danger";

  return <Badge variant={variant}>{risk} risk</Badge>;
}

function SourceStatusBadge({ status }: { status: SourceStatus }) {
  const variant = {
    Healthy: "success",
    Degraded: "warning",
    Syncing: "glass",
    Offline: "danger"
  }[status] as "success" | "warning" | "glass" | "danger";

  return <Badge variant={variant}>{status}</Badge>;
}

function TinyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border/70 bg-white/[0.78] px-3 py-2 shadow-polis-xs">
      <p className="font-mono text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-mono text-[12px] font-semibold text-foreground">{value}</p>
    </div>
  );
}

function DarkMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.08] px-3 py-2">
      <p className="font-mono text-[10px] uppercase text-white/48">{label}</p>
      <p className="mt-1 font-mono text-[13px] font-semibold text-white">{value}</p>
    </div>
  );
}

function EnvelopeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/70 bg-white/[0.72] p-3 shadow-polis-xs">
      <span className="text-body-sm font-semibold text-foreground">{label}</span>
      <span className="font-mono text-[12px] font-semibold text-city-signal">{value}</span>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex h-full items-end gap-2 rounded-lg border border-border/70 bg-city-mist p-4">
      {[42, 58, 46, 70, 62, 84, 76, 90, 64, 78, 72, 88].map((height, index) => (
        <div
          key={`settings-skeleton-${index}`}
          className="w-full rounded-t-md bg-city-civic/35"
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
