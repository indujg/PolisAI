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
  const agent = str(m.agent ?? m.source).toLowerCase();
  const source = agent ? `${cap(agent)} Agent` : channel === "news" ? "News Agent" : "Governance Agent";
  const color = AGENT_COLOR[agent] ?? (channel === "news" ? "#FFD27A" : "#2F6BFF");
  const headline = str(m.headline ?? m.title ?? m.article ?? m.message ?? m.text ?? m.summary, "Simulation update");
  const signal = str(m.signal ?? m.detail ?? m.reasoning ?? m.message, "");
  const delta = typeof m.delta === "string" ? m.delta : typeof m.delta === "number" ? `${m.delta}` : undefined;
  const good = typeof m.good === "boolean" ? m.good : true;
  const category = cap(str(m.category) || agent || channel);
  return { source, color, category, headline, signal, delta, good };
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
          // backend frames are { type, tick, payload }
          const kind = (str(m.type) || str(m.channel)).toLowerCase();
          const payload = m.payload && typeof m.payload === "object" ? (m.payload as Record<string, unknown>) : {};
          const merged: Record<string, unknown> = { ...m, ...payload };

          if (kind === "connected" || kind === "tick") {
            const tick = typeof merged.tick === "number" ? merged.tick : undefined;
            setState((s) => ({ ...s, live: true, status: "live", tick: tick ?? (kind === "tick" ? s.tick + 1 : s.tick) }));
            return;
          }
          const hasContent = merged.headline ?? merged.title ?? merged.message ?? merged.text ?? merged.article ?? merged.summary;
          if (hasContent || ["event", "events", "agent", "agents", "agent_message", "news", "policy", "alert"].includes(kind)) {
            pushExternal(mapEvent(merged, kind));
            setState((s) => (s.status === "live" ? s : { ...s, live: true, status: "live" }));
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
