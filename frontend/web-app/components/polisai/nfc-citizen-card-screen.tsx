"use client";

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import {
  Activity,
  BadgeCheck,
  BellRing,
  Building2,
  Car,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CircleDot,
  Clock3,
  CreditCard,
  FileText,
  Fingerprint,
  GraduationCap,
  HeartPulse,
  Home,
  LockKeyhole,
  Radio,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
  Wind
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tone = "civic" | "signal" | "solar" | "park" | "coral" | "transit" | "graphite";
type PolicyExposure = "Low" | "Medium" | "High" | "Positive";

type IdentityField = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: Tone;
};

type Benefit = {
  name: string;
  value: string;
  detail: string;
  status: "Active" | "Pending" | "Eligible";
  icon: LucideIcon;
  tone: Tone;
};

type Policy = {
  name: string;
  exposure: PolicyExposure;
  score: number;
  impact: string;
  recommendation: string;
  icon: LucideIcon;
  tone: Tone;
};

const citizen = {
  name: "Maya Shah",
  citizenId: "POLIS-2849-74",
  age: 34,
  district: "Greenline",
  occupation: "Transit Systems Engineer",
  household: "3 members",
  address: "Greenline District / Block 18",
  trustScore: 98,
  cardStatus: "Verified",
  issuedBy: "PolisAI Civic Identity Authority",
  validUntil: "Jun 09, 2031"
};

const scanSteps = [
  "Reader initialized",
  "NFC field active",
  "Secure element detected",
  "Identity credential matched",
  "Benefits ledger synced",
  "Policy exposure calculated"
];

const identityFields: IdentityField[] = [
  { label: "Digital ID", value: citizen.citizenId, icon: BadgeCheck, tone: "signal" },
  { label: "Credential", value: "W3C Verifiable ID", icon: ShieldCheck, tone: "park" },
  { label: "Biometric hash", value: "bio:7F2A...E91C", icon: Fingerprint, tone: "civic" },
  { label: "Secure enclave", value: "NFC tokenized", icon: LockKeyhole, tone: "graphite" }
];

const benefits: Benefit[] = [
  {
    name: "Healthcare Access",
    value: "Tier A",
    detail: "Primary care, emergency routing, preventive screenings",
    status: "Active",
    icon: HeartPulse,
    tone: "coral"
  },
  {
    name: "Transit Pass",
    value: "$84/mo",
    detail: "Greenline metro and autonomous bus subsidy",
    status: "Active",
    icon: Car,
    tone: "transit"
  },
  {
    name: "Education Credit",
    value: "$1,250",
    detail: "AI upskilling grant for mobility infrastructure",
    status: "Eligible",
    icon: GraduationCap,
    tone: "park"
  },
  {
    name: "Housing Support",
    value: "$420",
    detail: "District affordability adjustment for Block 18",
    status: "Pending",
    icon: Home,
    tone: "solar"
  }
];

const policies: Policy[] = [
  {
    name: "Metro Expansion",
    exposure: "Positive",
    score: 92,
    impact: "+18 min/week saved",
    recommendation: "Prioritize station access survey",
    icon: Car,
    tone: "transit"
  },
  {
    name: "Carbon Tax",
    exposure: "Medium",
    score: 54,
    impact: "+$12/mo energy cost",
    recommendation: "Apply solar rebate offset",
    icon: Wind,
    tone: "solar"
  },
  {
    name: "Education Reform",
    exposure: "High",
    score: 81,
    impact: "+$1,250 grant eligibility",
    recommendation: "Enroll in AI systems certificate",
    icon: GraduationCap,
    tone: "park"
  },
  {
    name: "Healthcare Reform",
    exposure: "Low",
    score: 28,
    impact: "No premium change",
    recommendation: "Maintain preventive screening plan",
    icon: HeartPulse,
    tone: "coral"
  },
  {
    name: "EV Subsidy",
    exposure: "Medium",
    score: 61,
    impact: "$3,200 possible credit",
    recommendation: "Review off-peak charging schedule",
    icon: CircleDollarSign,
    tone: "civic"
  }
];

const activityLog = [
  "Civic ID validated against city credential graph",
  "Transit benefit refreshed from Greenline mobility ledger",
  "Policy exposure recalculated after carbon update",
  "Healthcare eligibility confirmed with privacy-preserving token"
];

export function NfcCitizenCardScreen() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), 1400);

    return () => window.clearInterval(interval);
  }, []);

  const activeStep = tick % scanSteps.length;
  const scanProgress = Math.round(((activeStep + 1) / scanSteps.length) * 100);
  const activeLog = activityLog[tick % activityLog.length];
  const trustRing = useMemo(() => buildTrustRing(citizen.trustScore), []);

  return (
    <div className="grid gap-5">
      <motion.section
        className="glass-card city-map overflow-hidden rounded-lg p-4 sm:p-5 lg:p-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="relative z-[1] grid gap-6 2xl:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="max-w-4xl">
            <Badge variant="glass" className="mb-3 gap-1.5">
              <Radio className="size-3.5 text-city-civic" />
              NFC Citizen Card / Secure civic identity
            </Badge>
            <h1 className="text-display-md text-foreground">NFC Citizen Card</h1>
            <p className="mt-3 max-w-3xl text-body-lg text-muted-foreground">
              A premium citizen identity screen for profile verification, benefits access, and real-time policy exposure.
            </p>
          </div>

          <div className="grid gap-3 rounded-lg border border-white/70 bg-white/[0.72] p-4 shadow-polis-sm backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="token-label">Secure read status</p>
                <h2 className="mt-1 text-title-md text-foreground">{scanSteps[activeStep]}</h2>
              </div>
              <Badge variant="success" className="gap-1.5">
                <CircleDot className="size-3.5" />
                Live
              </Badge>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-city-civic"
                animate={{ width: `${scanProgress}%` }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              />
            </div>
            <div className="flex items-center justify-between gap-3 font-mono text-[11px] font-semibold text-muted-foreground">
              <span>ISO 14443-A</span>
              <span>{scanProgress}%</span>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(25rem,0.78fr)_minmax(0,1fr)]">
        <div className="grid gap-5">
          <NfcScanPanel activeStep={activeStep} />
          <SmartCard trustRing={trustRing} />
        </div>

        <div className="grid gap-5">
          <CitizenProfile activeLog={activeLog} />
          <DigitalIdentity />
        </div>
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_28rem]">
        <BenefitsPanel />
        <PolicyExposurePanel />
      </section>
    </div>
  );
}

function NfcScanPanel({ activeStep }: { activeStep: number }) {
  return (
    <section className="surface-card overflow-hidden rounded-lg p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <Badge variant="glass" className="mb-3 gap-1.5">
            <ScanLine className="size-3.5 text-city-signal" />
            NFC scan animation
          </Badge>
          <h2 className="text-title-md text-foreground">Secure element reader</h2>
        </div>
        <Badge variant="success">Encrypted</Badge>
      </div>

      <div className="relative grid min-h-[310px] place-items-center overflow-hidden rounded-lg border border-white/70 bg-city-graphite shadow-polis-md">
        <div className="absolute inset-0 bg-city-grid opacity-[0.18] [background-size:26px_26px]" />
        <motion.div
          className="absolute h-72 w-72 rounded-full border border-city-aqua/30"
          animate={{ scale: [0.68, 1.25], opacity: [0.72, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
        />
        <motion.div
          className="absolute h-56 w-56 rounded-full border border-city-solar/30"
          animate={{ scale: [0.72, 1.35], opacity: [0.6, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: 0.5, ease: "easeOut" }}
        />
        <motion.div
          className="absolute h-40 w-40 rounded-full border border-white/25"
          animate={{ scale: [0.7, 1.45], opacity: [0.55, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: 1, ease: "easeOut" }}
        />

        <div className="relative z-[1] grid w-[min(18rem,82vw)] gap-4 rounded-lg border border-white/15 bg-white/[0.08] p-5 text-white shadow-glass backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-3">
            <div className="grid size-12 place-items-center rounded-lg bg-white/12 text-city-aqua">
              <Radio className="size-6" />
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

          <div>
            <p className="font-mono text-[11px] uppercase text-white/58">Reader</p>
            <h3 className="mt-2 text-title-md text-white">Civic Access Terminal</h3>
            <p className="mt-2 text-body-sm text-white/68">Tokenized identity, benefits ledger, and policy graph sync.</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {scanSteps.map((step, index) => (
          <div
            key={step}
            className={cn(
              "flex items-center justify-between gap-3 rounded-md border p-3 transition-all",
              index <= activeStep
                ? "border-city-civic/20 bg-city-civic/[0.07]"
                : "border-border/70 bg-white/[0.68]"
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-md",
                  index <= activeStep ? "bg-city-civic text-white" : "bg-muted text-muted-foreground"
                )}
              >
                {index < activeStep ? <CheckCircle2 className="size-4" /> : <CircleDot className="size-4" />}
              </div>
              <span className="truncate text-body-sm font-semibold text-foreground">{step}</span>
            </div>
            <span className="font-mono text-[11px] font-semibold text-muted-foreground">
              {index < activeStep ? "DONE" : index === activeStep ? "READ" : "WAIT"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SmartCard({ trustRing }: { trustRing: string }) {
  return (
    <section className="glass-card overflow-hidden rounded-lg p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="token-label">Smart card UI</p>
          <h2 className="text-title-md text-foreground">Digital citizen pass</h2>
        </div>
        <Badge variant="success">{citizen.cardStatus}</Badge>
      </div>

      <motion.div
        className="relative min-h-[290px] overflow-hidden rounded-lg border border-city-graphite/20 bg-city-graphite p-5 text-white shadow-polis-lg"
        initial={{ opacity: 0, rotateX: 8, y: 16 }}
        animate={{ opacity: 1, rotateX: 0, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        <div className="absolute inset-0 bg-city-grid opacity-[0.15] [background-size:24px_24px]" />
        <div className="absolute right-[-4rem] top-[-5rem] h-52 w-52 rounded-full bg-city-civic/25 blur-3xl" />
        <div className="absolute bottom-[-5rem] left-[-5rem] h-56 w-56 rounded-full bg-city-solar/20 blur-3xl" />
        <motion.div
          className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/18 to-transparent"
          animate={{ x: ["-30%", "30%"] }}
          transition={{ duration: 5.5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
        />

        <div className="relative z-[1] flex h-full min-h-[250px] flex-col justify-between gap-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-4 grid size-12 place-items-center rounded-lg border border-white/20 bg-white/12">
                <CreditCard className="size-6 text-city-solar" />
              </div>
              <p className="font-mono text-[11px] uppercase text-white/58">PolisAI civic identity</p>
              <h3 className="mt-2 text-title-lg text-white">{citizen.name}</h3>
            </div>

            <div className="relative grid size-24 place-items-center rounded-full" style={{ background: trustRing }}>
              <div className="grid size-[4.9rem] place-items-center rounded-full bg-city-graphite">
                <div className="text-center">
                  <p className="font-mono text-[20px] font-bold text-white">{citizen.trustScore}</p>
                  <p className="font-mono text-[9px] uppercase text-white/54">trust</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-end">
            <div>
              <p className="font-mono text-[11px] uppercase text-white/58">Citizen token</p>
              <p className="mt-2 break-all font-mono text-[15px] font-semibold text-white">{citizen.citizenId}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 font-mono text-[10px] uppercase text-white/72">
                  {citizen.district}
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 font-mono text-[10px] uppercase text-white/72">
                  Valid 2031
                </span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1 sm:grid-cols-3">
              {Array.from({ length: 12 }, (_, index) => (
                <div
                  key={index}
                  className={cn(
                    "aspect-square rounded-sm",
                    index % 3 === 0 ? "bg-city-aqua" : index % 4 === 0 ? "bg-city-solar" : "bg-white/22"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function CitizenProfile({ activeLog }: { activeLog: string }) {
  return (
    <section className="surface-card rounded-lg p-4 sm:p-5">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid size-16 shrink-0 place-items-center rounded-lg bg-city-civic/10 text-city-civic shadow-polis-xs">
            <UserRound className="size-8" />
          </div>
          <div className="min-w-0">
            <p className="token-label">Citizen profile</p>
            <h2 className="mt-1 truncate text-title-lg text-foreground">{citizen.name}</h2>
            <p className="mt-1 text-body-sm text-muted-foreground">{citizen.occupation}</p>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <FileText />
          Export ID
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProfileMetric label="Age" value={`${citizen.age}`} icon={Clock3} tone="signal" />
        <ProfileMetric label="District" value={citizen.district} icon={Building2} tone="civic" />
        <ProfileMetric label="Household" value={citizen.household} icon={Home} tone="solar" />
        <ProfileMetric label="Status" value={citizen.cardStatus} icon={BadgeCheck} tone="park" />
      </div>

      <div className="mt-4 rounded-lg border border-border/70 bg-city-mist p-4">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-md bg-city-signal/10 text-city-signal">
            <Activity className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-body-sm font-semibold text-foreground">Live verification log</p>
            <motion.p
              key={activeLog}
              className="mt-1 text-body-sm text-muted-foreground"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeLog}
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  );
}

function DigitalIdentity() {
  return (
    <section className="glass-card rounded-lg p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="token-label">Digital identity</p>
          <h2 className="text-title-md text-foreground">Credential vault</h2>
        </div>
        <Badge variant="success" className="gap-1.5">
          <ShieldCheck className="size-3.5" />
          Privacy safe
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {identityFields.map((field, index) => (
          <motion.div
            key={field.label}
            className="rounded-lg border border-white/70 bg-white/[0.76] p-4 shadow-polis-xs backdrop-blur-xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: index * 0.06 }}
          >
            <div className="mb-3 flex items-center gap-3">
              <div className={cn("grid size-9 place-items-center rounded-md", toneClass(field.tone))}>
                <field.icon className="size-4" />
              </div>
              <p className="text-body-sm font-semibold text-foreground">{field.label}</p>
            </div>
            <p className="break-all font-mono text-[12px] font-semibold text-muted-foreground">{field.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 rounded-lg border border-border/70 bg-white/[0.68] p-4 sm:grid-cols-2">
        <InfoLine label="Issuer" value={citizen.issuedBy} />
        <InfoLine label="Valid until" value={citizen.validUntil} />
      </div>
    </section>
  );
}

function BenefitsPanel() {
  return (
    <section className="surface-card rounded-lg p-4 sm:p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge variant="glass" className="mb-3 gap-1.5">
            <WalletCards className="size-3.5 text-city-civic" />
            Benefits
          </Badge>
          <h2 className="text-title-md text-foreground">Entitlement ledger</h2>
          <p className="mt-1 text-body-sm text-muted-foreground">Benefits tied to verified identity and district eligibility.</p>
        </div>
        <Badge variant="glass">4 linked programs</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {benefits.map((benefit, index) => {
          const Icon = benefit.icon;

          return (
            <motion.article
              key={benefit.name}
              className="rounded-lg border border-border/70 bg-white/[0.74] p-4 shadow-polis-xs backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-polis-md"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: index * 0.07 }}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className={cn("grid size-10 shrink-0 place-items-center rounded-md", toneClass(benefit.tone))}>
                  <Icon className="size-5" />
                </div>
                <BenefitStatus status={benefit.status} />
              </div>
              <h3 className="text-body font-semibold text-foreground">{benefit.name}</h3>
              <p className="mt-2 text-metric text-foreground">{benefit.value}</p>
              <p className="mt-2 text-body-sm text-muted-foreground">{benefit.detail}</p>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

function PolicyExposurePanel() {
  return (
    <section className="glass-card rounded-lg p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <Badge variant="glass" className="mb-3 gap-1.5">
            <BellRing className="size-3.5 text-city-solar" />
            Policy exposure
          </Badge>
          <h2 className="text-title-md text-foreground">Citizen impact model</h2>
        </div>
        <Badge variant="warning">5 policies</Badge>
      </div>

      <div className="grid gap-3">
        {policies.map((policy, index) => {
          const Icon = policy.icon;

          return (
            <motion.article
              key={policy.name}
              className="rounded-lg border border-white/70 bg-white/[0.76] p-4 shadow-polis-xs backdrop-blur-xl"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.32, delay: index * 0.06 }}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={cn("grid size-10 shrink-0 place-items-center rounded-md", toneClass(policy.tone))}>
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-body-sm font-semibold text-foreground">{policy.name}</h3>
                    <p className="mt-1 text-caption text-muted-foreground">{policy.impact}</p>
                  </div>
                </div>
                <ExposureBadge exposure={policy.exposure} />
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className={cn("h-full rounded-full", exposureBarClass(policy.exposure))}
                  initial={{ width: 0 }}
                  animate={{ width: `${policy.score}%` }}
                  transition={{ duration: 0.7, delay: index * 0.06, ease: "easeOut" }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 text-caption">
                <span className="text-muted-foreground">{policy.recommendation}</span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

function ProfileMetric({
  label,
  value,
  icon: Icon,
  tone
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: Tone;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-white/[0.74] p-3 shadow-polis-xs">
      <div className="mb-3 flex items-center gap-2">
        <div className={cn("grid size-8 place-items-center rounded-md", toneClass(tone))}>
          <Icon className="size-4" />
        </div>
        <p className="token-label">{label}</p>
      </div>
      <p className="truncate text-body-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="token-label">{label}</p>
      <p className="mt-1 truncate text-body-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function BenefitStatus({ status }: { status: Benefit["status"] }) {
  const variant = {
    Active: "success",
    Pending: "warning",
    Eligible: "glass"
  }[status] as "success" | "warning" | "glass";

  return <Badge variant={variant}>{status}</Badge>;
}

function ExposureBadge({ exposure }: { exposure: PolicyExposure }) {
  const variant = {
    Low: "glass",
    Medium: "warning",
    High: "danger",
    Positive: "success"
  }[exposure] as "glass" | "warning" | "danger" | "success";

  return <Badge variant={variant}>{exposure}</Badge>;
}

function exposureBarClass(exposure: PolicyExposure) {
  return {
    Low: "bg-city-civic",
    Medium: "bg-city-solar",
    High: "bg-city-coral",
    Positive: "bg-city-park"
  }[exposure];
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

function buildTrustRing(score: number) {
  return `conic-gradient(#13C8C3 0deg ${score * 3.6}deg, rgba(255,255,255,0.14) ${score * 3.6}deg 360deg)`;
}
