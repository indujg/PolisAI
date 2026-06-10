"use client";

// ============================================================================
// PolisAI — Simulation event bus
// ----------------------------------------------------------------------------
// The connective tissue that turns isolated features into one living system.
// When a policy is enacted (or an emergency fires), it emits a cascade event:
// an AI agent "reacts", a news headline is generated, and the dashboards pick
// it up — so the civilization visibly responds to itself.
// External store; only subscribers re-render.
// ============================================================================

import { useSyncExternalStore } from "react";

export type SimEvent = {
  id: number;
  source: string; // agent name
  color: string;
  category: string;
  headline: string; // for the news feed
  signal: string; // the agent's reasoning line
  delta?: string;
  good: boolean;
};

const EMPTY: SimEvent[] = [];
const MAX = 10;

let _events: SimEvent[] = EMPTY;
let _id = 0;
const subs = new Set<() => void>();

function notify() {
  subs.forEach((f) => f());
}

function push(e: Omit<SimEvent, "id">) {
  _id += 1;
  _events = [{ ...e, id: _id }, ..._events].slice(0, MAX);
  notify();
}

const POLICY_ON: Record<string, Omit<SimEvent, "id">> = {
  ev: {
    source: "Mobility Agent",
    color: "#775CFF",
    category: "Mobility",
    headline: "EV adoption climbs as the subsidy clears council",
    signal: "Projecting −12% congestion and −15% emissions over 10y",
    delta: "+18%",
    good: true,
  },
  congestion: {
    source: "Economy Agent",
    color: "#13C8C3",
    category: "Mobility",
    headline: "Congestion pricing approved for the urban core",
    signal: "Downtown throughput up; revenue recycled into transit",
    delta: "−22%",
    good: true,
  },
  green: {
    source: "Climate Agent",
    color: "#2FB36D",
    category: "Energy",
    headline: "Council greenlights clean-energy expansion",
    signal: "Grid emissions on track for −26% by 2035",
    delta: "−26%",
    good: true,
  },
  transit: {
    source: "Mobility Agent",
    color: "#0FA7A2",
    category: "Transit",
    headline: "Metro expansion secures multi-year funding",
    signal: "Ridership forecast +9%; road load easing",
    delta: "+9%",
    good: true,
  },
};

export function emitPolicy(id: string, on: boolean) {
  if (on) {
    const t = POLICY_ON[id];
    if (t) push(t);
    return;
  }
  push({
    source: "Governance Agent",
    color: "#2F6BFF",
    category: "Policy",
    headline: "Policy rolled back — projections recalculating",
    signal: "Reverting the scenario; KPIs returning to baseline",
    good: false,
  });
}

/** Inject an event from the live backend (WebSocket) into the cascade. */
export function pushExternal(e: Omit<SimEvent, "id">) {
  push(e);
}

export function emitEmergency(name: string, accent: string, headline: string) {
  push({
    source: "Governance Agent",
    color: accent,
    category: "Alert",
    headline: `${headline} — response activated`,
    signal: `Coordinating ${name} response across agencies`,
    delta: "LIVE",
    good: false,
  });
}

const getSnapshot = () => _events;
const getServerSnapshot = () => EMPTY;

function subscribe(cb: () => void) {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}

export function useSimBus() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
