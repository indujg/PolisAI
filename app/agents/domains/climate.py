"""
ClimateAgent — tracks environmental health, carbon emissions, and natural events.

Publishes: CLIMATE_UPDATE, EVENT_ALERT (disasters)
Reacts to: ECONOMIC_UPDATE (high GDP → higher emissions)
"""

from __future__ import annotations

import math

from app.agents.base import (
    AgentContext, AgentMessage, AgentResult,
    BaseAgent, MessageType,
)


# Ticks between random extreme weather events at each pollution level
_EVENT_INTERVAL = {
    "low":    80,
    "medium": 40,
    "high":   20,
    "severe": 10,
}


class ClimateAgent(BaseAgent):
    def __init__(self) -> None:
        super().__init__("climate", "climate")
        self._gdp_last_tick: float = 0.0

    async def analyze(self, ctx: AgentContext) -> AgentResult:
        metrics  = ctx.last_metrics
        policies = ctx.active_policies
        tick     = ctx.tick
        insights: list[str] = []
        alerts:   list[dict] = []
        new_metrics: dict[str, float] = {}

        # ── Emissions model ────────────────────────────────────────────────
        gdp        = float(metrics.get("gdp", 30_000_000))
        avg_income = float(metrics.get("avg_income", 30000))
        population = int(metrics.get("population", 1000))

        # Baseline emissions proxy (arbitrary index 0–100)
        emissions_index = _compute_emissions(gdp, population, policies)
        new_metrics["emissions_index"] = round(emissions_index, 2)

        # ── Air quality → health modifier ─────────────────────────────────
        # Published so HealthcareAgent can pick it up
        air_quality = max(0, 100 - emissions_index * 0.6)
        new_metrics["air_quality_index"] = round(air_quality, 2)

        # ── Pollution level ────────────────────────────────────────────────
        if emissions_index < 20:
            level = "low"
        elif emissions_index < 45:
            level = "medium"
        elif emissions_index < 70:
            level = "high"
        else:
            level = "severe"

        # ── Environmental policy effects ───────────────────────────────────
        env_spend = sum(
            p.get("budget_impact", 0) for p in policies
            if p.get("category") == "environmental"
        )
        carbon_tax_active = any(
            "carbon" in p.get("name", "").lower() for p in policies
            if p.get("status") == "active"
        )
        renewable_active = any(
            "renew" in p.get("name", "").lower() or "ev" in p.get("name", "").lower()
            for p in policies if p.get("status") == "active"
        )

        # ── Insights ──────────────────────────────────────────────────────
        if level == "severe":
            insights.append(f"SEVERE pollution (index {emissions_index:.0f}) — public health crisis imminent.")
            alerts.append({"type": "pollution_crisis", "severity": "critical",
                           "detail": f"Emissions index {emissions_index:.0f}"})
        elif level == "high":
            insights.append(f"High pollution (index {emissions_index:.0f}) — long-term health damage accumulating.")
            alerts.append({"type": "high_pollution", "severity": "high",
                           "detail": f"Emissions index {emissions_index:.0f}"})
        elif level == "low":
            insights.append(f"Clean environment (index {emissions_index:.0f}) — air quality is excellent.")

        if carbon_tax_active:
            insights.append("Carbon tax is reducing industrial emissions.")
        if renewable_active:
            insights.append("EV/renewable subsidies are shifting energy mix towards clean sources.")
        if env_spend < -500_000:
            insights.append(f"Fiscal tightening (${env_spend:,.0f}) limiting environmental programmes.")

        # ── Extreme weather event risk ─────────────────────────────────────
        interval = _EVENT_INTERVAL[level]
        if tick > 0 and tick % interval == 0:
            event_type = "drought" if emissions_index > 50 else "flooding"
            alerts.append({
                "type": "extreme_weather",
                "severity": level,
                "detail": f"Tick {tick}: {event_type} risk elevated due to {level} pollution",
                "suggested_event_type": event_type,
            })
            insights.append(
                f"Extreme weather risk at tick {tick}: {event_type} likely in current climate band."
            )

        messages = [AgentMessage(
            agent_id=self.agent_id,
            type=MessageType.CLIMATE_UPDATE,
            payload={
                "emissions_index": emissions_index,
                "air_quality_index": air_quality,
                "pollution_level": level,
                "carbon_tax_active": carbon_tax_active,
            },
            sim_id=ctx.sim_id, tick=ctx.tick,
        )]

        if alerts:
            for alert in alerts:
                if alert.get("type") in ("pollution_crisis", "extreme_weather"):
                    messages.append(AgentMessage(
                        agent_id=self.agent_id,
                        type=MessageType.EVENT_ALERT,
                        payload=alert,
                        sim_id=ctx.sim_id, tick=ctx.tick,
                    ))

        return AgentResult(
            agent_id=self.agent_id, domain=self.domain, tick=ctx.tick,
            insights=insights, metrics=new_metrics, alerts=alerts, messages=messages,
        )

    async def on_message(self, msg: AgentMessage) -> None:
        if msg.type == MessageType.ECONOMIC_UPDATE:
            self._gdp_last_tick = msg.payload.get("gdp", 0)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _compute_emissions(gdp: float, population: int, policies: list[dict]) -> float:
    # Base: proportional to economic output per capita
    per_capita_gdp = gdp / max(population, 1)
    base = math.log1p(per_capita_gdp / 10_000) * 15   # 0–~50 range

    # Environmental policies reduce emissions
    env_reduction = sum(
        abs(p.get("budget_impact", 0)) / 1_000_000 * 3
        for p in policies
        if p.get("category") == "environmental" and p.get("status") == "active"
    )
    # Economic growth adds emissions
    econ_pressure = sum(
        p.get("budget_impact", 0) / 1_000_000 * 1.5
        for p in policies
        if p.get("category") in ("economic", "infrastructure") and p.get("status") == "active"
    )

    return max(0, min(100, base - env_reduction + max(0, econ_pressure)))
