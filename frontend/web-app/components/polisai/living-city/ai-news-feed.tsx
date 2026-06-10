"use client";

// ============================================================================
// PolisAI — Bloomberg-style AI News Feed (right rail)
// ----------------------------------------------------------------------------
// A dark "terminal" panel: a horizontal ticker tape + an auto-scrolling vertical
// feed that loops seamlessly and pauses on hover. Pure CSS transforms drive the
// motion (cheap), Framer handles the slide-in. Frontend only, mock data.
// ============================================================================

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ArrowDownRight, ArrowUpRight, Radio, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSimBus } from "./sim-bus";

type News = {
  id: string;
  cat: string;
  color: string;
  headline: string;
  delta?: string;
  dir?: "up" | "down";
  good?: boolean;
  source: string;
  time: string;
};

const C = {
  mobility: "#9D8CFF",
  economy: "#19D3CE",
  health: "#FF7A8A",
  climate: "#48C98A",
  energy: "#F6B73C",
  gov: "#6FA0FF",
  housing: "#36D0CB",
  safety: "#F0904E",
};

const NEWS: News[] = [
  { id: "n1", cat: "Mobility", color: C.mobility, headline: "EV adoption rises 18% across the metro fleet", delta: "18%", dir: "up", good: true, source: "PolisAI Wire", time: "2m" },
  { id: "n2", cat: "Mobility", color: C.mobility, headline: "Traffic congestion reduced 12% after adaptive signal rollout", delta: "12%", dir: "down", good: true, source: "Mobility Desk", time: "6m" },
  { id: "n3", cat: "Health", color: C.health, headline: "Healthcare satisfaction improves to 91% citywide", delta: "5.2%", dir: "up", good: true, source: "Civic Data", time: "9m" },
  { id: "n4", cat: "Economy", color: C.economy, headline: "GDP forecast lifted to $684B on port throughput", delta: "3.4%", dir: "up", good: true, source: "PolisAI Wire", time: "12m" },
  { id: "n5", cat: "Climate", color: C.climate, headline: "Air quality index falls to 38 as industrial load smooths", delta: "4.6", dir: "down", good: true, source: "Climate Desk", time: "15m" },
  { id: "n6", cat: "Energy", color: C.energy, headline: "Solar microgrids now cover 47% of midday demand", delta: "6.0%", dir: "up", good: true, source: "Grid Watch", time: "18m" },
  { id: "n7", cat: "Governance", color: C.gov, headline: "Citizen approval of city services climbs to 78%", delta: "2.1%", dir: "up", good: true, source: "Civic Data", time: "21m" },
  { id: "n8", cat: "Housing", color: C.housing, headline: "New affordable units bring occupancy to 96%", delta: "1.8%", dir: "up", good: true, source: "Housing Desk", time: "24m" },
  { id: "n9", cat: "Safety", color: C.safety, headline: "Emergency response time cut to 3 min in core districts", delta: "1.4", dir: "down", good: true, source: "Safety Desk", time: "27m" },
  { id: "n10", cat: "Mobility", color: C.mobility, headline: "Metro ridership hits 60k daily on the Greenline", delta: "9.0%", dir: "up", good: true, source: "Mobility Desk", time: "31m" },
  { id: "n11", cat: "Economy", color: C.economy, headline: "Unemployment edges down to 4.2% across boroughs", delta: "0.6", dir: "down", good: true, source: "PolisAI Wire", time: "36m" },
  { id: "n12", cat: "Climate", color: C.climate, headline: "Urban tree canopy expands by 1,200 new plantings", delta: "3.0%", dir: "up", good: true, source: "Climate Desk", time: "42m" },
  { id: "n13", cat: "Safety", color: C.safety, headline: "Reported incidents fall 7% in the harbor district", delta: "7%", dir: "down", good: true, source: "Safety Desk", time: "53m" },
  { id: "n14", cat: "Governance", color: C.gov, headline: "Policy simulation predicts +2.4% mobility gain next quarter", delta: "2.4%", dir: "up", good: true, source: "Sim Lab", time: "1h" },
  { id: "n15", cat: "Climate", color: C.climate, headline: "Heat advisory issued for the industrial corridor", source: "Climate Desk", time: "1h" },
  { id: "n16", cat: "Housing", color: C.housing, headline: "Rents stabilize as new supply meets demand", delta: "0.4", dir: "down", good: true, source: "Housing Desk", time: "2h" },
  { id: "n17", cat: "Economy", color: C.economy, headline: "Retail footfall up 8% in commercial arcades", delta: "8%", dir: "up", good: true, source: "Markets", time: "2h" },
  { id: "n18", cat: "Safety", color: C.safety, headline: "Minor outage flagged on sensor mesh node 14", source: "Ops", time: "3h" },
];

const TICKER: { label: string; value: string; dir: "up" | "down"; good: boolean }[] = [
  { label: "EV", value: "18%", dir: "up", good: true },
  { label: "TRAFFIC", value: "12%", dir: "down", good: true },
  { label: "GDP", value: "3.4%", dir: "up", good: true },
  { label: "AQI", value: "4.6", dir: "down", good: true },
  { label: "RIDERSHIP", value: "9%", dir: "up", good: true },
  { label: "JOBS", value: "1.2%", dir: "up", good: true },
  { label: "CRIME", value: "7%", dir: "down", good: true },
  { label: "APPROVAL", value: "2.1%", dir: "up", good: true },
];

export function AiNewsFeed() {
  const [clock, setClock] = useState("");
  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const events = useSimBus();

  return (
    <motion.aside
      initial={{ x: 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 34, delay: 0.12 }}
      className="pointer-events-auto absolute bottom-4 right-4 top-4 z-20 hidden w-[20rem] max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-3xl border border-white/10 text-white shadow-glass lg:flex"
      style={{ background: "linear-gradient(180deg, rgba(13,20,33,0.93), rgba(9,14,24,0.95))", backdropFilter: "blur(20px)" }}
    >
      {/* header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-white/10">
            <Radio className="size-4 text-[#19D3CE]" />
          </span>
          <div>
            <p className="text-[13px] font-bold leading-tight tracking-tight">PolisAI Wire</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">AI civic & market feed</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <motion.span
            className="size-1.5 rounded-full bg-[#3ED598]"
            animate={{ opacity: [1, 0.25, 1], scale: [1, 1.3, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="font-mono text-[11px] font-bold tracking-wide text-[#3ED598]">LIVE</span>
        </div>
      </div>

      {/* ticker tape */}
      <div className="group relative overflow-hidden border-b border-white/10 bg-black/25 py-2">
        <div className="flex w-max animate-ticker-scroll gap-6 pr-6 group-hover:[animation-play-state:paused]">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="flex items-center gap-1.5 whitespace-nowrap font-mono text-[11px] font-bold">
              <span className="text-white/55">{t.label}</span>
              <span className={cn("flex items-center gap-0.5", t.good ? "text-[#3ED598]" : "text-[#F76D7A]")}>
                {t.dir === "up" ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                {t.value}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* breaking: live events emitted by the simulation cascade */}
      <AnimatePresence initial={false}>
        {events.length > 0 ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-white/10 bg-[#101B30]/60"
          >
            <div className="flex items-center gap-1.5 px-4 pb-1 pt-2">
              <Zap className="size-3 text-[#FFD27A]" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#FFD27A]">Breaking · just now</span>
            </div>
            <div className="px-2 pb-2">
              <AnimatePresence initial={false}>
                {events.slice(0, 3).map((e) => (
                  <motion.div
                    key={e.id}
                    layout
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-lg px-2.5 py-1.5">
                      <div className="mb-0.5 flex items-center gap-1.5">
                        <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ background: `${e.color}26`, color: e.color }}>
                          {e.category}
                        </span>
                        {e.delta ? (
                          <span className={cn("font-mono text-[10px] font-bold", e.good ? "text-[#3ED598]" : "text-[#F76D7A]")}>{e.delta}</span>
                        ) : null}
                        <span className="ml-auto text-[9px] font-semibold text-white/40">{e.source}</span>
                      </div>
                      <p className="text-[12px] font-semibold leading-snug text-white/90">{e.headline}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* auto-scrolling vertical feed */}
      <div className="group relative min-h-0 flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-[#0d1422] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-[#0a0f18] to-transparent" />
        <div className="animate-feed-scroll will-change-transform group-hover:[animation-play-state:paused]">
          {[0, 1].map((copy) => (
            <div key={copy} aria-hidden={copy === 1}>
              {NEWS.map((n) => (
                <NewsRow key={`${copy}-${n.id}`} n={n} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* footer */}
      <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-2.5 text-[10px] font-semibold text-white/45">
        <span className="flex items-center gap-1.5">
          <Activity className="size-3 text-[#19D3CE]" /> Auto-updating · hover to pause
        </span>
        <span className="font-mono tabular-nums text-white/60">{clock || "--:--:--"}</span>
      </div>
    </motion.aside>
  );
}

function NewsRow({ n }: { n: News }) {
  return (
    <div className="relative cursor-default border-b border-white/[0.06] px-4 py-3 transition-colors hover:bg-white/[0.05]">
      <span className="absolute inset-y-2.5 left-0 w-0.5 rounded-full" style={{ background: n.color }} />
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
          style={{ background: `${n.color}26`, color: n.color }}
        >
          {n.cat}
        </span>
        {n.delta ? (
          <span className={cn("flex items-center gap-0.5 font-mono text-[11px] font-bold", n.good ? "text-[#3ED598]" : "text-[#F76D7A]")}>
            {n.dir === "up" ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {n.delta}
          </span>
        ) : null}
      </div>
      <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-white/90">{n.headline}</p>
      <div className="mt-1.5 flex items-center gap-2 text-[10px] font-medium text-white/40">
        <span>{n.source}</span>
        <span className="size-0.5 rounded-full bg-white/30" />
        <span className="font-mono">{n.time}</span>
      </div>
    </div>
  );
}
