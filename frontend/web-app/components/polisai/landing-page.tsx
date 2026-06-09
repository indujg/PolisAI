"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Building2,
  ChevronRight,
  CircleDot,
  Command,
  FileCheck2,
  Gauge,
  Globe2,
  Landmark,
  Layers3,
  Play,
  RadioTower,
  Route,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UsersRound,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 }
};

const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

const features = [
  {
    title: "Policy-grade simulation",
    description: "Run transit, climate, safety, budget, and citizen impact scenarios before a public decision goes live.",
    icon: Landmark,
    tone: "civic"
  },
  {
    title: "Real-time city twin",
    description: "Fuse sensor streams, service requests, events, and infrastructure health into one adaptive civic model.",
    icon: RadioTower,
    tone: "signal"
  },
  {
    title: "Human-governed agents",
    description: "Deploy specialist AI agents with approval gates, audit trails, role scopes, and public accountability.",
    icon: ShieldCheck,
    tone: "park"
  },
  {
    title: "Executive briefings",
    description: "Turn complex model outputs into clear recommendations for mayors, councils, and operating teams.",
    icon: FileCheck2,
    tone: "solar"
  }
];

const agents = [
  { name: "Transit Optimizer", role: "Balances commute time, crowding, and emergency priority.", metric: "-14 min", icon: Route },
  { name: "Policy Auditor", role: "Tests proposed changes for equity, cost, and compliance risk.", metric: "98%", icon: BadgeCheck },
  { name: "Citizen Signal", role: "Clusters service demand, sentiment, and local incident patterns.", metric: "1.4M", icon: UsersRound },
  { name: "Grid Forecaster", role: "Predicts load spikes and recommends reserve allocation.", metric: "91%", icon: Zap }
];

const testimonials = [
  {
    quote: "PolisAI gave our cabinet the confidence to choose the highest-impact response before the storm even landed.",
    name: "Maya Ren",
    role: "Chief Resilience Officer, Port Azure"
  },
  {
    quote: "It feels like a civic operating system: precise, calm, explainable, and fast enough for real decisions.",
    name: "Elliot Voss",
    role: "Deputy Mayor, Northline"
  },
  {
    quote: "The agent guardrails are the difference. We can move quickly without losing public-sector accountability.",
    name: "Samira Cole",
    role: "Director of Digital Services, Meridian City"
  }
];

export function LandingPage() {
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.45], [0, 90]);
  const sceneScale = useTransform(scrollYProgress, [0, 0.45], [1, 1.06]);

  return (
    <main id="main-content" className="min-h-screen overflow-hidden bg-city-mist text-foreground">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <LandingNav />

      <section className="relative min-h-[92svh] overflow-hidden px-page pb-16 pt-24 sm:pt-28 lg:pt-32">
        <motion.div style={{ y: heroY, scale: sceneScale }} className="absolute inset-0">
          <CitySimulationScene />
        </motion.div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(246,250,250,0.74)_0%,rgba(246,250,250,0.28)_42%,rgba(246,250,250,0.96)_100%)]" />

        <motion.div
          className="relative z-[1] mx-auto flex min-h-[calc(92svh-9rem)] max-w-[1440px] flex-col justify-end"
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          <div className="max-w-5xl pb-10">
            <motion.div variants={fadeUp}>
              <Badge variant="glass" className="mb-5 gap-1.5">
                <Sparkles className="size-3.5 text-city-civic" />
                Civic simulation for high-stakes decisions
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="max-w-5xl text-[3.5rem] font-[760] leading-[0.92] text-city-graphite sm:text-[5.25rem] lg:text-[7rem] xl:text-[8rem]"
            >
              Simulate Tomorrow Before Deciding Today
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-7 max-w-2xl text-body-lg text-city-slate">
              PolisAI helps city leaders model policy, infrastructure, climate, safety, and citizen outcomes before decisions become headlines.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="signal">
                <Link href="/dashboard">
                  Open command center
                  <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="premium">
                <Play />
                Watch simulation
              </Button>
            </motion.div>
          </div>

          <motion.div variants={fadeUp} className="grid gap-3 pb-2 sm:grid-cols-3">
            <HeroMetric label="Projected delay reduction" value="24%" icon={TrendingUp} />
            <HeroMetric label="Civic systems modeled" value="12" icon={Layers3} />
            <HeroMetric label="Decision confidence" value="96%" icon={Gauge} />
          </motion.div>
        </motion.div>
      </section>

      <LogoBand />
      <FeaturesSection />
      <SimulationDemo />
      <AgentsSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </main>
  );
}

function LandingNav() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 px-page py-3">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 rounded-lg border border-white/75 bg-white/[0.78] px-3 shadow-polis-sm backdrop-blur-2xl">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-md bg-city-graphite text-white shadow-polis-xs">
            <Building2 className="size-4" />
          </div>
          <span className="text-body-sm font-bold text-foreground">PolisAI</span>
        </Link>

        <nav aria-label="Landing page navigation" className="hidden items-center gap-1 md:flex">
          {["Features", "Simulation", "Agents", "Customers"].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="rounded-md px-3 py-2 text-body-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              {item}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/dashboard">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard">
              Launch
              <ChevronRight />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function CitySimulationScene() {
  const lanes = [
    "left-[4%] top-[31%] w-[92%] rotate-0 bg-city-civic/30",
    "left-[7%] top-[61%] w-[86%] -rotate-[7deg] bg-city-signal/25",
    "left-[18%] top-[46%] w-[68%] rotate-[13deg] bg-city-solar/30",
    "left-[12%] top-[76%] w-[72%] rotate-[4deg] bg-city-park/24"
  ];

  return (
    <div className="relative h-full min-h-[92svh] bg-sensor-flow">
      <div className="absolute inset-0 bg-city-grid [background-size:32px_32px]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,rgba(246,250,250,0.9))]" />

      {lanes.map((lane, index) => (
        <motion.div
          key={lane}
          className={cn("absolute h-1 rounded-full", lane)}
          animate={{ x: index % 2 === 0 ? [0, 18, 0] : [0, -18, 0] }}
          transition={{ duration: 7 + index, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      <div className="absolute bottom-[15%] left-[5%] right-[5%] grid grid-cols-6 items-end gap-[2vw] opacity-95">
        {[36, 58, 44, 72, 52, 84, 63, 48, 76, 57, 66, 42].map((height, index) => (
          <motion.div
            key={`landing-skyline-${index}`}
            className="relative rounded-t-lg border border-white/75 bg-white/[0.76] shadow-polis-sm backdrop-blur-xl"
            style={{ height: `${height}svh`, maxHeight: "33rem" }}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.04, duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="absolute inset-x-3 top-4 grid gap-2">
              <span className="h-1.5 rounded-full bg-city-civic/20" />
              <span className="h-1.5 rounded-full bg-city-signal/20" />
              <span className="h-1.5 rounded-full bg-city-solar/20" />
            </div>
          </motion.div>
        ))}
      </div>

      {[
        ["left-[17%] top-[28%]", "Transit", "86%"],
        ["right-[18%] top-[35%]", "Energy", "71%"],
        ["left-[48%] top-[20%]", "Safety", "93%"]
      ].map(([position, label, value]) => (
        <motion.div
          key={label}
          className={cn("absolute rounded-lg border border-white/75 bg-white/[0.78] px-3 py-2 shadow-glass backdrop-blur-2xl", position)}
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <p className="text-[11px] font-bold uppercase text-muted-foreground">{label}</p>
          <p className="text-title-md text-foreground">{value}</p>
        </motion.div>
      ))}
    </div>
  );
}

function HeroMetric({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="rounded-lg border border-white/75 bg-white/[0.68] p-4 shadow-polis-sm backdrop-blur-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="grid size-9 place-items-center rounded-md bg-city-civic/10 text-city-civic">
          <Icon className="size-4" />
        </div>
        <CircleDot className="size-4 text-city-park" />
      </div>
      <p className="text-metric text-foreground">{value}</p>
      <p className="mt-1 text-caption font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}

function LogoBand() {
  return (
    <section className="border-y border-border/70 bg-white/[0.72] px-page py-7 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body-sm font-semibold text-muted-foreground">Trusted by next-generation civic teams</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {["Port Azure", "Northline", "Meridian", "Civitas Lab"].map((name) => (
            <div key={name} className="rounded-md border border-border/70 bg-white/[0.74] px-4 py-2 text-center text-body-sm font-bold text-city-slate shadow-polis-xs">
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <SectionShell id="features" eyebrow="Features" title="Decision infrastructure for cities that cannot guess.">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <motion.div key={feature.title} variants={fadeUp} className="surface-card rounded-lg p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-polis-md">
              <div className={cn("mb-6 grid size-11 place-items-center rounded-md", toneClass(feature.tone))}>
                <Icon className="size-5" />
              </div>
              <h3 className="text-title-md text-foreground">{feature.title}</h3>
              <p className="mt-3 text-body-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          );
        })}
      </motion.div>
    </SectionShell>
  );
}

function SimulationDemo() {
  return (
    <SectionShell id="simulation" eyebrow="Simulation Demo" title="Model the move, then see the city react.">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55 }}
          className="glass-card city-map min-h-[520px] rounded-lg p-5"
        >
          <div className="relative z-[1] flex h-full flex-col justify-between gap-6">
            <div className="flex items-center justify-between gap-3">
              <Badge variant="glass">Heatwave transit capacity</Badge>
              <Badge variant="success">Running</Badge>
            </div>
            <div className="grid flex-1 grid-cols-8 items-end gap-2">
              {[42, 64, 51, 78, 72, 86, 67, 92].map((height, index) => (
                <motion.div
                  key={`landing-demo-bar-${index}`}
                  className="rounded-t-md bg-city-civic shadow-polis-xs"
                  style={{ height: `${height}%` }}
                  initial={{ scaleY: 0.2 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05, duration: 0.55 }}
                />
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <DemoChip label="Delay avoided" value="14 min" />
              <DemoChip label="Equity coverage" value="92%" />
              <DemoChip label="Budget impact" value="$2.4M" />
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-4"
        >
          {[
            ["1", "Select a future stressor", "Choose heat, flood, transit surge, budget shift, or a custom scenario."],
            ["2", "Tune policy levers", "Adjust enforcement, routing, staffing, pricing, reserve power, and communications."],
            ["3", "Compare outcomes", "See confidence, tradeoffs, equity effects, and recommended actions in minutes."]
          ].map(([step, title, copy]) => (
            <motion.div key={title} variants={fadeUp} className="surface-card rounded-lg p-5">
              <div className="mb-4 grid size-9 place-items-center rounded-md bg-city-signal/10 font-mono text-body-sm font-bold text-city-signal">
                {step}
              </div>
              <h3 className="text-title-md text-foreground">{title}</h3>
              <p className="mt-2 text-body-sm text-muted-foreground">{copy}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </SectionShell>
  );
}

function AgentsSection() {
  return (
    <SectionShell id="agents" eyebrow="AI Agents" title="Specialist agents. Public-sector guardrails.">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="grid gap-4 md:grid-cols-2"
      >
        {agents.map((agent) => {
          const Icon = agent.icon;
          return (
            <motion.div key={agent.name} variants={fadeUp} className="surface-card rounded-lg p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-4">
                  <div className="grid size-12 shrink-0 place-items-center rounded-md bg-city-civic/10 text-city-civic">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-title-md text-foreground">{agent.name}</h3>
                    <p className="mt-2 text-body-sm text-muted-foreground">{agent.role}</p>
                  </div>
                </div>
                <Badge variant="glass">{agent.metric}</Badge>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </SectionShell>
  );
}

function TestimonialsSection() {
  return (
    <SectionShell id="customers" eyebrow="Testimonials" title="Built for the room where the decision is made.">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="grid gap-4 lg:grid-cols-3"
      >
        {testimonials.map((testimonial) => (
          <motion.figure key={testimonial.name} variants={fadeUp} className="surface-card rounded-lg p-5">
            <blockquote className="text-body-lg text-foreground">"{testimonial.quote}"</blockquote>
            <figcaption className="mt-8 border-t border-border/70 pt-4">
              <p className="text-body-sm font-bold text-foreground">{testimonial.name}</p>
              <p className="mt-1 text-caption text-muted-foreground">{testimonial.role}</p>
            </figcaption>
          </motion.figure>
        ))}
      </motion.div>
    </SectionShell>
  );
}

function CTASection() {
  return (
    <section className="px-page py-section">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.55 }}
        className="glass-card city-map mx-auto max-w-[1440px] overflow-hidden rounded-lg p-7 sm:p-10 lg:p-14"
      >
        <div className="relative z-[1] max-w-4xl">
          <Badge variant="glass" className="mb-5 gap-1.5">
            <Command className="size-3.5 text-city-civic" />
            PolisAI Command
          </Badge>
          <h2 className="text-display-md text-foreground">Make the next civic decision with tomorrow already modeled.</h2>
          <p className="mt-5 max-w-2xl text-body-lg text-muted-foreground">
            Stand up a city simulation layer for executive teams, emergency operations, policy offices, and digital service leaders.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="signal">
              <Link href="/dashboard">
                Enter dashboard
                <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="premium">
              <Globe2 />
              Request city briefing
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/70 bg-white/[0.72] px-page py-10 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-md bg-city-graphite text-white">
            <Building2 className="size-4" />
          </div>
          <div>
            <p className="text-body-sm font-bold text-foreground">PolisAI</p>
            <p className="text-caption text-muted-foreground">Simulate tomorrow before deciding today.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-body-sm font-semibold text-muted-foreground">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#simulation" className="hover:text-foreground">Simulation</a>
          <a href="#agents" className="hover:text-foreground">Agents</a>
          <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
        </div>
      </div>
    </footer>
  );
}

function SectionShell({
  id,
  eyebrow,
  title,
  children
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="px-page py-section">
      <div className="mx-auto max-w-[1440px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-8 max-w-3xl"
        >
          <p className="mb-3 text-caption font-bold uppercase text-city-civic">{eyebrow}</p>
          <h2 className="text-display-md text-foreground">{title}</h2>
        </motion.div>
        {children}
      </div>
    </section>
  );
}

function DemoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/70 bg-white/[0.74] p-3 shadow-polis-xs backdrop-blur-xl">
      <p className="text-caption font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-title-md text-foreground">{value}</p>
    </div>
  );
}

function toneClass(tone: string) {
  return {
    civic: "bg-city-civic/10 text-city-civic",
    signal: "bg-city-signal/10 text-city-signal",
    solar: "bg-city-solar/[0.16] text-[#8A5A00]",
    park: "bg-city-park/10 text-city-park"
  }[tone];
}
