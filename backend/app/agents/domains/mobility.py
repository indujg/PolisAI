"""
MobilityAgent — models transportation, urban density, and commute quality.

Publishes: MOBILITY_UPDATE
Reacts to: CLIMATE_UPDATE (emissions from transport), ECONOMIC_UPDATE (income → car ownership)
"""

from __future__ import annotations

from app.agents.base import (
    AgentContext, AgentMessage, AgentResult,
    BaseAgent, MessageType,
)


class MobilityAgent(BaseAgent):
    def __init__(self) -> None:
        super().__init__("mobility", "mobility")
        self._emissions_index: float = 30.0

    async def analyze(self, ctx: AgentContext) -> AgentResult:
        metrics  = ctx.last_metrics
        policies = ctx.active_policies
        insights: list[str] = []
        alerts:   list[dict] = []
        new_metrics: dict[str, float] = {}

        avg_income   = float(metrics.get("avg_income", 30000))
        happiness    = float(metrics.get("avg_happiness", 50))
        population   = int(metrics.get("population", 1000))

        # ── Infrastructure spend ───────────────────────────────────────────
        infra_spend = sum(
            p.get("budget_impact", 0) for p in policies
            if p.get("category") == "infrastructure" and p.get("status") == "active"
        )
        transit_active = any(
            any(kw in p.get("name", "").lower() for kw in ("metro", "bus", "rail", "transit"))
            for p in policies if p.get("status") == "active"
        )
        ev_active = any(
            any(kw in p.get("name", "").lower() for kw in ("ev", "electric", "vehicle"))
            for p in policies if p.get("status") == "active"
        )

        # ── Transit quality index (0–100) ──────────────────────────────────
        transit_base = 40.0
        transit_boost = min(30.0, infra_spend / 1_000_000 * 2)
        transit_boost += 15.0 if transit_active else 0
        transit_quality = min(100.0, transit_base + transit_boost)
        new_metrics["transit_quality_index"] = round(transit_quality, 2)

        # ── Car dependency (inverse of transit quality + income effect) ────
        car_dependency = max(0.0, 100.0 - transit_quality
                             + (avg_income - 30_000) / 5_000)
        car_dependency = min(100.0, car_dependency)
        new_metrics["car_dependency_index"] = round(car_dependency, 2)

        # ── Transport emissions contribution ───────────────────────────────
        transport_emissions = max(0.0,
            car_dependency * 0.3 - (20.0 if ev_active else 0)
        )
        new_metrics["transport_emissions"] = round(transport_emissions, 2)

        # ── Commute happiness modifier (feeds back to simulation) ──────────
        commute_happiness_mod = (transit_quality - 50) * 0.05
        new_metrics["commute_happiness_modifier"] = round(commute_happiness_mod, 2)

        # ── Urban congestion ───────────────────────────────────────────────
        congestion = max(0.0, 100.0 - transit_quality + car_dependency * 0.2)
        congestion = min(100.0, congestion)
        new_metrics["congestion_index"] = round(congestion, 2)

        # ── Insights ──────────────────────────────────────────────────────
        if transit_active:
            insights.append(f"Public transit investment boosting transit quality to {transit_quality:.0f}/100.")
        if ev_active:
            insights.append("EV policy reducing transport emissions — improving air quality.")
        if congestion > 70:
            insights.append(f"Heavy congestion ({congestion:.0f}/100) reducing productivity and happiness.")
            alerts.append({"type": "congestion", "severity": "medium",
                           "detail": f"Congestion index {congestion:.0f}"})
        elif congestion < 25:
            insights.append(f"Low congestion ({congestion:.0f}/100) — efficient urban mobility.")

        if car_dependency > 75:
            insights.append(f"High car dependency ({car_dependency:.0f}/100) — fossil fuel exposure risk.")
        if transit_quality > 75:
            insights.append(f"Excellent public transit ({transit_quality:.0f}/100) boosting citizen wellbeing.")

        if infra_spend > 5_000_000:
            insights.append(f"Major infrastructure investment ${infra_spend:,.0f} improving long-term mobility.")

        messages = [AgentMessage(
            agent_id=self.agent_id,
            type=MessageType.MOBILITY_UPDATE,
            payload={
                "transit_quality_index": transit_quality,
                "car_dependency_index":  car_dependency,
                "transport_emissions":   transport_emissions,
                "congestion_index":      congestion,
            },
            sim_id=ctx.sim_id, tick=ctx.tick,
        )]

        return AgentResult(
            agent_id=self.agent_id, domain=self.domain, tick=ctx.tick,
            insights=insights, metrics=new_metrics, alerts=alerts, messages=messages,
        )

    async def on_message(self, msg: AgentMessage) -> None:
        if msg.type == MessageType.CLIMATE_UPDATE:
            self._emissions_index = float(msg.payload.get("emissions_index", 30))
