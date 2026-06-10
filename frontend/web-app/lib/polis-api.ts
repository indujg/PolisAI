// ============================================================================
// PolisAI — typed domain API
// ----------------------------------------------------------------------------
// Thin, typed wrappers over the backend REST surface used by the live
// dashboard. Every call is defensive at the call site (callers catch and fall
// back to the deterministic demo), so these just describe the contract.
// ============================================================================

import { apiGet, apiPost } from "./api";

// ── Analytics ───────────────────────────────────────────────────────────────
// GET /api/v1/analytics?simulation_id=...

export type Kpis = {
  gdp_index: number;
  happiness_index: number;
  pollution_index: number;
  traffic_index: number;
  healthcare_index: number;
  education_index: number;
  wellbeing_score: number;
};

export type AnalyticsResponse = {
  simulation_id: string;
  simulation_name: string | null;
  current_tick: number;
  kpis: Partial<Kpis>;
  chart_series?: unknown;
  trends?: Record<string, unknown>;
  data_points?: number;
};

export const getAnalytics = (simId: string) =>
  apiGet<AnalyticsResponse>(`/api/v1/analytics?simulation_id=${encodeURIComponent(simId)}`);

// ── Population stats ────────────────────────────────────────────────────────
// GET /api/v1/simulations/{sim_id}/population/stats

export type PopulationStats = {
  simulation_id: string;
  population: number;
  sample_size?: number;
  avg_age?: number;
  avg_happiness?: number;
  avg_health?: number;
  avg_income?: number;
  avg_stress?: number;
  education_distribution?: Record<string, number>;
  occupation_distribution?: Record<string, number>;
  age_band_distribution?: Record<string, number>;
};

export const getPopulationStats = (simId: string) =>
  apiGet<PopulationStats>(`/api/v1/simulations/${encodeURIComponent(simId)}/population/stats`);

// ── Policies ────────────────────────────────────────────────────────────────
// GET  /api/v1/policies?simulation_id=...&status=active
// POST /api/v1/policies/{id}/simulate   { n_ticks }

export type Policy = {
  id: string;
  simulation_id: string;
  government_id: string;
  name: string;
  category: string;
  description: string | null;
  status: string;
  budget_impact: number;
  popularity_score: number;
  enacted_tick: number | null;
  repealed_tick: number | null;
};

export const listPolicies = (simId: string, status?: string) =>
  apiGet<Policy[]>(
    `/api/v1/policies?simulation_id=${encodeURIComponent(simId)}` +
      (status ? `&status=${encodeURIComponent(status)}` : ""),
  );

export type PolicySimulateResponse = {
  policy_id: string;
  n_ticks: number;
  current_metrics: Record<string, number>;
  projected_metrics: Record<string, number>;
  delta: Record<string, number>;
  confidence_score: number;
  key_insights: string[];
};

export const simulatePolicy = (policyId: string, nTicks = 120) =>
  apiPost<PolicySimulateResponse>(`/api/v1/policies/${encodeURIComponent(policyId)}/simulate`, {
    n_ticks: nTicks,
  });

// ── AI recommendations ──────────────────────────────────────────────────────
// POST /api/v1/ai/simulations/{sim_id}/recommend

export type RecommendResponse = {
  sim_id: string;
  sim_name: string;
  tick: number;
  recommendations: unknown; // free-form AI text/structure
  agent_insights_used?: number;
  alerts_considered?: number;
};

export const getRecommendations = (simId: string) =>
  apiPost<RecommendResponse>(`/api/v1/ai/simulations/${encodeURIComponent(simId)}/recommend`);
