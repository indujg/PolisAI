"use client";

// ============================================================================
// PolisAI — live backend bridge
// ----------------------------------------------------------------------------
// Connects the immersive dashboard to the real backend when a simulation is
// selected: pulls the KPI snapshot from /analytics and streams the
// tick/events/agents/policy/news WebSocket channels into the sim-bus, so the
// news feed + agent status show REAL events. Fully defensive — any failure
// silently falls back to the deterministic demo (no sim required).
// ============================================================================

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { connectSimWs } from "@/lib/ws";
import { useAuth } from "@/lib/auth-context";
import { useSim } from "@/lib/sim-context";
import { pushExternal, type SimEvent } from "./sim-bus";

export type LiveState = { live: boolean; status: "demo" | "connecting" | "live"; tick: number };

const AGENT_COLOR: Record<string, string> = {
  economy: "#13C8C3",
  climate: "#2FB36D",
  healthcare: "#F45D6B",
  mobility: "#775CFF",
  governance: "#2F6BFF",
  policy: "#2F6BFF",
  news: "#FFD27A",
};

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function mapEvent(m: Record<string, unknown>, channel: string): Omit<SimEvent, "id"> {
  // policy_outcome frames carry { policy:{name,category}, action }
  const policy = m.policy && typeof m.policy === "object" ? (m.policy as Record<string, unknown>) : null;
  const agent = str(m.agent ?? m.source).toLowerCase();
  const source = agent ? `${cap(agent)} Agent` : channel === "news" ? "News Agent" : "Governance Agent";
  const color = AGENT_COLOR[agent] ?? (channel === "news" ? "#FFD27A" : "#2F6BFF");
  const headline = policy
    ? `Policy ${str(m.action, "updated")}: ${str(policy.name, "measure")}`
    : str(m.headline ?? m.title ?? m.article ?? m.message ?? m.text ?? m.detail ?? m.summary, "Simulation update");
  const signal = str(m.signal ?? m.detail ?? m.reasoning ?? m.message, "");
  const delta = typeof m.delta === "string" ? m.delta : typeof m.delta === "number" ? `${m.delta}` : undefined;
  const good = typeof m.good === "boolean" ? m.good : str(m.action).toLowerCase() !== "rolled_back";
  const category = cap(str(m.category) || str(policy?.category) || agent || channel);
  return { source, color, category, headline, signal, delta, good };
}

// agent_insight insights are strings like "[ECONOMY] GDP grew 2.1%"
function mapInsight(text: string): Omit<SimEvent, "id"> {
  const match = text.match(/^\[([A-Za-z]+)\]\s*(.*)$/);
  const domain = (match?.[1] ?? "").toLowerCase();
  return {
    source: domain ? `${cap(domain)} Agent` : "Governance Agent",
    color: AGENT_COLOR[domain] ?? "#2F6BFF",
    category: cap(domain) || "Insight",
    headline: match?.[2] || text,
    signal: "",
    good: true,
  };
}

// agent_insight alerts are dicts: { severity, type/category, message/detail, domain }
function mapAlert(a: Record<string, unknown>): Omit<SimEvent, "id"> {
  const domain = str(a.domain ?? a.agent ?? a.category).toLowerCase();
  const sev = str(a.severity);
  return {
    source: domain ? `${cap(domain)} Agent` : "Governance Agent",
    color: AGENT_COLOR[domain] ?? "#F45D6B",
    category: cap(str(a.type ?? a.category) || "Alert"),
    headline: str(a.message ?? a.headline ?? a.detail ?? a.title, "Risk alert"),
    signal: str(a.detail ?? a.reasoning, ""),
    delta: sev ? sev.toUpperCase() : undefined,
    good: false,
  };
}

// news_broadcast headlines: { category, headline, sentiment, priority }
function mapHeadline(h: Record<string, unknown>): Omit<SimEvent, "id"> {
  const category = str(h.category, "news");
  return {
    source: "News Agent",
    color: AGENT_COLOR.news,
    category: cap(category),
    headline: str(h.headline ?? h.title ?? h.text, "Simulation update"),
    signal: "",
    good: str(h.sentiment, "neutral") !== "negative",
  };
}

export function useLiveSim(): LiveState {
  const { simId } = useSim();
  const { token } = useAuth();
  const [state, setState] = useState<LiveState>({ live: false, status: "demo", tick: 0 });

  useEffect(() => {
    if (!simId) {
      setState({ live: false, status: "demo", tick: 0 });
      return;
    }
    let cancelled = false;
    let ws: WebSocket | null = null;
    setState((s) => ({ ...s, status: "connecting" }));

    // initial KPI snapshot
    apiGet<Record<string, unknown>>(`/api/v1/analytics?simulation_id=${simId}`)
      .then((d) => {
        if (cancelled) return;
        const tick = typeof d?.current_tick === "number" ? d.current_tick : typeof d?.tick === "number" ? d.tick : 0;
        setState((s) => ({ ...s, live: true, status: "live", tick }));
      })
      .catch(() => {
        /* stay in demo */
      });

    try {
      ws = connectSimWs(
        simId,
        "tick,events,agents,policy,news",
        (raw) => {
          if (cancelled) return;
          const m = (raw ?? {}) as Record<string, unknown>;
          // backend frames are { type, sim_id, tick, payload }
          const kind = (str(m.type) || str(m.channel)).toLowerCase();
          const payload = m.payload && typeof m.payload === "object" ? (m.payload as Record<string, unknown>) : {};
          const tickNo = typeof m.tick === "number" ? (m.tick as number) : undefined;
          const goLive = () => setState((s) => (s.status === "live" ? s : { ...s, live: true, status: "live" }));

          // lifecycle frames — no cascade, just keep the live badge + tick fresh
          if (kind === "connected" || kind === "heartbeat") {
            setState((s) => ({ ...s, live: true, status: "live" }));
            return;
          }
          if (kind === "tick_complete" || kind === "tick" || kind === "simulation_status" || kind === "citizen_batch") {
            setState((s) => ({ ...s, live: true, status: "live", tick: tickNo ?? s.tick }));
            return;
          }

          // agent_insight → { insights: string[], alerts: dict[] }
          if (kind === "agent_insight" || kind === "agents" || kind === "agent" || kind === "agent_message") {
            const insights = Array.isArray(payload.insights) ? payload.insights : [];
            const alerts = Array.isArray(payload.alerts) ? payload.alerts : [];
            insights.slice(0, 3).forEach((ins) => pushExternal(mapInsight(String(ins))));
            alerts.slice(0, 2).forEach((a) => pushExternal(mapAlert((a ?? {}) as Record<string, unknown>)));
            if (insights.length || alerts.length) goLive();
            return;
          }

          // news_broadcast → { headlines: dict[], sentiment_index }
          if (kind === "news_broadcast" || kind === "news") {
            const headlines = Array.isArray(payload.headlines) ? payload.headlines : [];
            headlines.slice(0, 3).forEach((h) => pushExternal(mapHeadline((h ?? {}) as Record<string, unknown>)));
            if (headlines.length) goLive();
            return;
          }

          // event_alert / policy_outcome → single cascade entry
          const merged: Record<string, unknown> = { ...m, ...payload };
          const hasContent = merged.headline ?? merged.title ?? merged.message ?? merged.text ?? merged.article ?? merged.summary ?? merged.detail ?? merged.policy;
          if (hasContent || ["event_alert", "event", "events", "policy_outcome", "policy", "alert"].includes(kind)) {
            pushExternal(mapEvent(merged, kind));
            goLive();
          }
        },
        token,
      );
      ws.onopen = () => {
        if (!cancelled) setState((s) => ({ ...s, live: true, status: "live" }));
      };
      ws.onclose = () => {
        if (!cancelled) setState((s) => ({ ...s, status: s.live ? "live" : "demo" }));
      };
      ws.onerror = () => {
        /* keep demo */
      };
    } catch {
      /* WebSocket unavailable → demo */
    }

    return () => {
      cancelled = true;
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
    };
  }, [simId, token]);

  return state;
}
