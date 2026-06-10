"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CircleDot,
  Network,
  ScanLine,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { MiniCity } from "@/components/polisai/landing/mini-city";

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0 },
};

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060A12] text-white antialiased">
      {/* ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_-10%,rgba(45,224,214,0.16),transparent_60%),radial-gradient(60%_50%_at_85%_20%,rgba(77,124,255,0.14),transparent_55%),radial-gradient(50%_50%_at_10%_30%,rgba(157,123,255,0.12),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:46px_46px]" />
      </div>

      {/* nav */}
      <header className="relative z-30">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-[#2DE0D6] to-[#4D7CFF] text-[#060A12]">
              <Building2 className="size-[18px]" />
            </span>
            <span className="text-[15px] font-black tracking-tight">PolisAI</span>
          </Link>
          <div className="hidden items-center gap-8 text-[13px] font-semibold text-white/60 md:flex">
            <a href="#simulate" className="transition-colors hover:text-white">Simulation</a>
            <a href="#agents" className="transition-colors hover:text-white">Agents</a>
            <a href="#decide" className="transition-colors hover:text-white">Governance</a>
          </div>
          <Link
            href="/login"
            className="group flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-bold text-[#060A12] transition-transform hover:scale-[1.03]"
          >
            Open console
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </nav>
      </header>

      {/* hero */}
      <section className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pt-16 text-center sm:pt-24">
        <motion.div
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center"
        >
          <motion.span
            variants={fadeUp}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-[12px] font-semibold text-white/70 backdrop-blur"
          >
            <Sparkles className="size-3.5 text-[#2DE0D6]" />
            The societal digital twin
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className="max-w-4xl text-balance text-[clamp(2.6rem,7.4vw,5.5rem)] font-black leading-[0.95] tracking-[-0.03em]"
          >
            Simulate{" "}
            <span className="bg-gradient-to-r from-[#2DE0D6] via-[#4D7CFF] to-[#9D7BFF] bg-clip-text text-transparent">
              Tomorrow
            </span>
            <br />
            Before Deciding Today
          </motion.h1>

          <motion.p variants={fadeUp} className="mt-6 max-w-xl text-balance text-[17px] leading-relaxed text-white/60">
            A living model of your city — citizens, AI agents and economies — so every policy can be tested in a world
            that breathes, before it ever touches the real one.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="group flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[15px] font-bold text-[#060A12] shadow-[0_8px_40px_rgba(45,224,214,0.25)] transition-transform hover:scale-[1.03]"
            >
              Launch the console
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#simulate"
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3.5 text-[15px] font-bold text-white/85 backdrop-blur transition-colors hover:bg-white/[0.08]"
            >
              <ScanLine className="size-4 text-[#2DE0D6]" />
              Explore the world
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* live miniature city */}
      <section id="simulate" className="relative z-10 -mt-4">
        <div className="pointer-events-none absolute left-1/2 top-1/2 size-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(45,224,214,0.10),transparent_60%)]" />
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1], delay: 0.2 }}
          className="relative mx-auto max-w-6xl"
        >
          <MiniCity className="h-[clamp(360px,52vw,640px)] w-full" />
          <div className="mb-3 flex items-center justify-center gap-2 text-[12px] font-semibold text-white/45">
            <CircleDot className="size-3.5 animate-pulse text-[#34E5A0]" />
            Live simulation · 500 citizens · 5 AI agents · running at 60fps
          </div>
        </motion.div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#060A12]" />
      </section>

      {/* stat band */}
      <section className="relative z-10 border-y border-white/[0.06] bg-white/[0.02]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 px-6 sm:grid-cols-4">
          {[
            { v: "500+", l: "Citizens simulated" },
            { v: "5", l: "Autonomous agents" },
            { v: "∞", l: "Policy scenarios" },
            { v: "60fps", l: "Living world" },
          ].map((s) => (
            <div key={s.l} className="py-8 text-center">
              <p className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-3xl font-black tracking-tight text-transparent">{s.v}</p>
              <p className="mt-1 text-[12px] font-semibold uppercase tracking-wider text-white/40">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* feature trio */}
      <section id="decide" className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-[clamp(2rem,4.5vw,3rem)] font-black leading-tight tracking-[-0.02em]">
            See the consequences,
            <br />
            not just the dashboard.
          </h2>
          <p className="mt-4 text-[16px] text-white/55">
            PolisAI turns governance into a flight simulator — model, watch, and decide with confidence.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {[
            { icon: ScanLine, title: "Simulate", desc: "Spin up a breathing twin of your city — citizens, traffic, economy and climate, evolving in real time.", c: "#2DE0D6" },
            { icon: Network, title: "Orchestrate", desc: "A network of AI agents debates economy, health, mobility and policy — and surfaces the trade-offs.", c: "#4D7CFF" },
            { icon: TrendingUp, title: "Decide", desc: "Scrub the future, trigger a policy, and watch the waves ripple across the city before you commit.", c: "#9D7BFF" },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-xl transition-colors hover:bg-white/[0.05]"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-40 blur-2xl transition-opacity group-hover:opacity-70" style={{ background: f.c }} />
              <div className="relative grid size-11 place-items-center rounded-2xl" style={{ background: `${f.c}1f`, color: f.c }}>
                <f.icon className="size-5" />
              </div>
              <h3 className="relative mt-5 text-xl font-bold">{f.title}</h3>
              <p className="relative mt-2 text-[14.5px] leading-relaxed text-white/55">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* final CTA */}
      <section id="agents" className="relative z-10 px-6 pb-28">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] px-8 py-16 text-center backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(45,224,214,0.16),transparent_60%)]" />
          <h2 className="relative text-balance text-[clamp(2rem,5vw,3.4rem)] font-black leading-[1.02] tracking-[-0.02em]">
            Govern the future.
            <br />
            Rehearse it first.
          </h2>
          <p className="relative mx-auto mt-5 max-w-lg text-[16px] text-white/60">
            Step into the console and watch your city think, move and respond — in real time.
          </p>
          <Link
            href="/login"
            className="group relative mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 text-[15px] font-bold text-[#060A12] shadow-[0_8px_40px_rgba(45,224,214,0.3)] transition-transform hover:scale-[1.03]"
          >
            Enter PolisAI
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* footer */}
      <footer className="relative z-10 border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-[13px] text-white/40 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-lg bg-gradient-to-br from-[#2DE0D6] to-[#4D7CFF] text-[#060A12]">
              <Building2 className="size-3.5" />
            </span>
            <span className="font-bold text-white/70">PolisAI</span>
            <span>— the societal digital twin</span>
          </div>
          <p>Simulate tomorrow before deciding today.</p>
        </div>
      </footer>
    </div>
  );
}
