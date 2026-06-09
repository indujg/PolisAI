"""
AnalyticsService — reads simulation_results from Supabase and produces
KPI snapshots, dashboard summaries, reports, and per-simulation summaries.

All methods return plain dicts ready to be JSON-serialised by FastAPI.
"""

from __future__ import annotations

from supabase._async.client import AsyncClient

from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.services.analytics.kpi_engine import (
    KPISnapshot, compute_kpis, compute_trend,
)

logger = get_logger(__name__)

_ALL_KPI_FIELDS = [
    "gdp_index", "happiness_index", "pollution_index",
    "traffic_index", "healthcare_index", "education_index",
    "wellbeing_score",
]


class AnalyticsService:
    def __init__(self, db: AsyncClient) -> None:
        self._db = db

    # ── Helpers ────────────────────────────────────────────────────────────────

    async def _get_sim(self, sim_id: str) -> dict:
        r = (
            await self._db.table("simulations")
            .select("id, name, status, current_tick, created_at")
            .eq("id", sim_id)
            .limit(1)
            .execute()
        )
        if not r.data:
            raise NotFoundError(f"Simulation {sim_id} not found")
        return r.data[0]

    async def _get_results(
        self, sim_id: str, limit: int = 200, order_asc: bool = True
    ) -> list[dict]:
        q = (
            self._db.table("simulation_results")
            .select("tick, metrics, policy_snapshot, event_snapshot, created_at")
            .eq("simulation_id", sim_id)
        )
        if order_asc:
            q = q.order("tick", desc=False)
        else:
            q = q.order("tick", desc=True)
        r = await q.limit(limit).execute()
        return r.data or []

    def _rows_to_snapshots(self, rows: list[dict]) -> list[KPISnapshot]:
        snapshots = []
        for row in rows:
            m = row.get("metrics") or {}
            tick = row.get("tick", m.get("tick", 0))
            snapshots.append(compute_kpis(m, tick=tick))
        return snapshots

    # ── /analytics — current KPIs for one simulation ──────────────────────────

    async def get_analytics(self, sim_id: str) -> dict:
        """
        Latest KPI snapshot for the simulation plus trend lines for all fields.
        """
        sim = await self._get_sim(sim_id)
        rows = await self._get_results(sim_id, limit=200, order_asc=True)

        if not rows:
            empty_kpi = compute_kpis({}, tick=0)
            return {
                "simulation_id": sim_id,
                "simulation_name": sim.get("name"),
                "current_tick": sim.get("current_tick", 0),
                "kpis": empty_kpi.to_dict(),
                "chart_series": empty_kpi.to_chart_series(),
                "trends": {},
                "data_points": 0,
            }

        snapshots = self._rows_to_snapshots(rows)
        latest    = snapshots[-1]

        trends = {field: compute_trend(snapshots, field) for field in _ALL_KPI_FIELDS}

        return {
            "simulation_id":   sim_id,
            "simulation_name": sim.get("name"),
            "current_tick":    sim.get("current_tick", 0),
            "kpis":            latest.to_dict(),
            "chart_series":    latest.to_chart_series(),
            "trends":          trends,
            "data_points":     len(rows),
        }

    # ── /dashboard — multi-sim overview ───────────────────────────────────────

    async def get_dashboard(self, user_id: str | None = None, limit: int = 10) -> dict:
        """
        Latest KPI snapshot for every (recent) simulation — for a multi-sim dashboard.
        """
        q = (
            self._db.table("simulations")
            .select("id, name, status, current_tick, created_at")
            .order("created_at", desc=True)
            .limit(limit)
        )
        r = await q.execute()
        sims = r.data or []

        sim_cards = []
        for sim in sims:
            # Grab latest tick result
            r2 = (
                await self._db.table("simulation_results")
                .select("tick, metrics")
                .eq("simulation_id", sim["id"])
                .order("tick", desc=True)
                .limit(1)
                .execute()
            )
            if r2.data:
                snap = compute_kpis(r2.data[0].get("metrics", {}),
                                    tick=r2.data[0]["tick"])
            else:
                snap = compute_kpis({}, tick=0)

            sim_cards.append({
                "simulation_id":   sim["id"],
                "simulation_name": sim["name"],
                "status":          sim["status"],
                "current_tick":    sim["current_tick"],
                "kpis":            snap.to_dict(),
                "chart_series":    snap.to_chart_series(),
            })

        # Global aggregates across all loaded sims (averages)
        overall: dict[str, float] = {}
        if sim_cards:
            for field in _ALL_KPI_FIELDS:
                vals = [c["kpis"][field] for c in sim_cards if c["kpis"].get(field) is not None]
                overall[field] = round(sum(vals) / len(vals), 2) if vals else 0.0

        return {
            "total_simulations": len(sim_cards),
            "simulations":       sim_cards,
            "global_averages":   overall,
        }

    # ── /reports — time-series report for one simulation ──────────────────────

    async def get_reports(
        self, sim_id: str,
        fields: list[str] | None = None,
        from_tick: int = 0,
        to_tick: int | None = None,
    ) -> dict:
        """
        Full time-series KPI report — charts-ready arrays per requested field.
        """
        sim  = await self._get_sim(sim_id)
        rows = await self._get_results(sim_id, limit=500, order_asc=True)

        # Filter by tick range
        if from_tick:
            rows = [r for r in rows if r.get("tick", 0) >= from_tick]
        if to_tick is not None:
            rows = [r for r in rows if r.get("tick", 0) <= to_tick]

        requested_fields = fields or _ALL_KPI_FIELDS
        snapshots = self._rows_to_snapshots(rows)

        series = {f: compute_trend(snapshots, f) for f in requested_fields}

        # Policy impact summary: count ticks with active policies
        policy_coverage = sum(1 for r in rows if r.get("policy_snapshot"))

        return {
            "simulation_id":   sim_id,
            "simulation_name": sim.get("name"),
            "current_tick":    sim.get("current_tick", 0),
            "tick_range":      {"from": from_tick, "to": to_tick},
            "data_points":     len(rows),
            "fields":          requested_fields,
            "series":          series,
            "policy_active_ticks": policy_coverage,
        }

    # ── /simulation/{id}/summary ───────────────────────────────────────────────

    async def get_simulation_summary(self, sim_id: str) -> dict:
        """
        Comprehensive summary: sim metadata, government stats, KPI evolution,
        policy impact, active events — all in one charts-ready payload.
        """
        sim = await self._get_sim(sim_id)

        # Government
        g = (
            await self._db.table("governments")
            .select("name, approval_rating, budget, debt, tax_revenue, gdp")
            .eq("simulation_id", sim_id)
            .limit(1)
            .execute()
        )
        gov = g.data[0] if g.data else {}

        # Policies
        p = (
            await self._db.table("policies")
            .select("id, name, category, status, budget_impact, popularity_score, enacted_tick")
            .eq("simulation_id", sim_id)
            .execute()
        )
        policies = p.data or []

        # Events
        ev = (
            await self._db.table("events")
            .select("id, name, type, severity, is_active, tick, duration_ticks")
            .eq("simulation_id", sim_id)
            .execute()
        )
        events = ev.data or []

        # Tick results — first, latest, and full trend
        rows = await self._get_results(sim_id, limit=500, order_asc=True)
        snapshots = self._rows_to_snapshots(rows)

        first_kpi  = snapshots[0].to_dict()  if snapshots else compute_kpis({}).to_dict()
        latest_kpi = snapshots[-1].to_dict() if snapshots else compute_kpis({}).to_dict()
        trends     = {f: compute_trend(snapshots, f) for f in _ALL_KPI_FIELDS}

        # Change from first to latest
        delta_kpi = {
            f: round(latest_kpi.get(f, 0) - first_kpi.get(f, 0), 2)
            for f in _ALL_KPI_FIELDS
        }

        # Citizens count (fast — just select count)
        c = (
            await self._db.table("citizens")
            .select("id", count="exact")
            .eq("simulation_id", sim_id)
            .eq("is_alive", True)
            .execute()
        )
        population = c.count if hasattr(c, "count") and c.count else len(c.data or [])

        return {
            "simulation": {
                "id":           sim["id"],
                "name":         sim.get("name"),
                "status":       sim.get("status"),
                "current_tick": sim.get("current_tick", 0),
                "created_at":   sim.get("created_at"),
            },
            "government": gov,
            "population":  population,
            "kpis": {
                "first":   first_kpi,
                "latest":  latest_kpi,
                "delta":   delta_kpi,
                "chart_series": snapshots[-1].to_chart_series() if snapshots else [],
            },
            "trends":    trends,
            "policies": {
                "total":   len(policies),
                "active":  sum(1 for p in policies if p["status"] == "active"),
                "list":    policies,
            },
            "events": {
                "total":  len(events),
                "active": sum(1 for e in events if e.get("is_active")),
                "list":   events,
            },
            "data_points": len(rows),
        }
