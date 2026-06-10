"use client";

// ============================================================================
// PolisAI — live analytics bridge
// ----------------------------------------------------------------------------
// Pulls the REAL KPI snapshot (/analytics) and population demographics
// (/population/stats) for the selected simulation and keeps them fresh while
// the sim ticks server-side. Fully defensive: any failure leaves `loaded:false`
// so the UI falls back to its curated demo numbers.
// ============================================================================

import { useEffect, useState } from "react";
import { useSim } from "@/lib/sim-context";
import { getAnalytics, getPopulationStats, type Kpis, type PopulationStats } from "@/lib/polis-api";

export type LiveAnalytics = {
  loaded: boolean;
  currentTick: number;
  kpis: Partial<Kpis>;
  population: PopulationStats | null;
};

const EMPTY: LiveAnalytics = { loaded: false, currentTick: 0, kpis: {}, population: null };

const REFRESH_MS = 8000;

export function useLiveAnalytics(): LiveAnalytics {
  const { simId } = useSim();
  const [state, setState] = useState<LiveAnalytics>(EMPTY);

  useEffect(() => {
    if (!simId) {
      setState(EMPTY);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const pull = async () => {
      try {
        const [analytics, population] = await Promise.all([
          getAnalytics(simId),
          getPopulationStats(simId).catch(() => null),
        ]);
        if (cancelled) return;
        setState({
          loaded: true,
          currentTick: typeof analytics?.current_tick === "number" ? analytics.current_tick : 0,
          kpis: analytics?.kpis ?? {},
          population,
        });
      } catch {
        // keep demo — do not surface errors into the immersive UI
        if (!cancelled) setState((s) => (s.loaded ? s : EMPTY));
      } finally {
        if (!cancelled) timer = setTimeout(pull, REFRESH_MS);
      }
    };

    pull();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [simId]);

  return state;
}
