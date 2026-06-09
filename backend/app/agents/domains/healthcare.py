"""
HealthcareAgent — models population health, disease burden, and life expectancy.

Publishes: HEALTH_UPDATE
Reacts to: CLIMATE_UPDATE (air quality), ECONOMIC_UPDATE (income effects)
"""

from __future__ import annotations

from app.agents.base import (
    AgentContext, AgentMessage, AgentResult,
    BaseAgent, MessageType,
)


class HealthcareAgent(BaseAgent):
    def __init__(self) -> None:
        super().__init__("healthcare", "healthcare")
        self._air_quality: float = 80.0   # updated via bus from ClimateAgent

    async def analyze(self, ctx: AgentContext) -> AgentResult:
        metrics   = ctx.last_metrics
        policies  = ctx.active_policies
        citizens  = ctx.citizen_sample
        insights: list[str] = []
        alerts:   list[dict] = []
        new_metrics: dict[str, float] = {}

        avg_health      = float(metrics.get("avg_health", 50))
        avg_income      = float(metrics.get("avg_income", 30000))
        life_expectancy = float(metrics.get("life_expectancy", 72))
        unemployment    = float(metrics.get("unemployment_rate", 5.0))

        # ── Healthcare policy spending ────────────────────────────────────
        health_spend = sum(
            p.get("budget_impact", 0) for p in policies
            if p.get("category") == "healthcare" and p.get("status") == "active"
        )
        health_bonus = min(10.0, health_spend / 500_000)  # up to +10 from spending

        # ── Air quality impact (from ClimateAgent) ────────────────────────
        air_modifier = (self._air_quality - 50) * 0.05   # ±2.5 at extremes

        # ── Income-health correlation ─────────────────────────────────────
        income_health = min(5.0, max(-5.0, (avg_income - 30_000) / 10_000))

        # ── Stress from unemployment ──────────────────────────────────────
        stress_penalty = -(unemployment / 100) * 3

        new_health = min(100.0, max(0.0,
            avg_health + health_bonus * 0.1 + air_modifier * 0.05
            + income_health * 0.05 + stress_penalty * 0.1
        ))
        new_metrics["avg_health"] = round(new_health, 2)

        # ── Life expectancy ───────────────────────────────────────────────
        new_le = min(100.0, max(40.0,
            70 + (new_health - 50) * 0.3 - (100 - self._air_quality) * 0.05
        ))
        new_metrics["life_expectancy"] = round(new_le, 2)

        # ── Disease burden score (0=low burden, 100=epidemic) ─────────────
        disease_burden = max(0.0, 100 - new_health - (self._air_quality * 0.1))
        new_metrics["disease_burden"] = round(disease_burden, 2)

        # ── Mental health proxy from unemployment + stress ─────────────────
        mental_health_score = max(0, min(100,
            70 - unemployment * 1.5 + (avg_income - 25_000) / 2000
        ))
        new_metrics["mental_health_score"] = round(mental_health_score, 2)

        # ── Citizen-level health stats ────────────────────────────────────
        if citizens:
            elderly = [c for c in citizens if c.get("age", 0) >= 65]
            if elderly:
                elderly_health = sum(float(c.get("health_score", 50)) for c in elderly) / len(elderly)
                if elderly_health < 40:
                    alerts.append({"type": "elderly_health_crisis", "severity": "high",
                                   "detail": f"Avg elderly health: {elderly_health:.1f}"})

        # ── Insights ──────────────────────────────────────────────────────
        if new_health < 35:
            insights.append(f"Public health in crisis (avg {new_health:.1f}) — epidemic risk high.")
            alerts.append({"type": "health_crisis", "severity": "critical",
                           "detail": f"Avg health {new_health:.1f}"})
        elif new_health > 75:
            insights.append(f"Population health excellent ({new_health:.1f}) — strong human capital.")

        if health_spend > 1_000_000:
            insights.append(f"Healthcare investment ${health_spend:,.0f} improving outcomes.")

        if self._air_quality < 40:
            insights.append(f"Poor air quality (AQI {self._air_quality:.0f}) is a major health driver.")
            alerts.append({"type": "air_quality_health", "severity": "medium",
                           "detail": f"AQI {self._air_quality:.0f}"})

        if disease_burden > 60:
            insights.append(f"High disease burden ({disease_burden:.0f}) — public health system under strain.")

        if new_le < 65:
            insights.append(f"Life expectancy declining to {new_le:.1f} — long-term productivity at risk.")
        elif new_le > 80:
            insights.append(f"Life expectancy {new_le:.1f} — aging population will strain pensions.")

        messages = [AgentMessage(
            agent_id=self.agent_id,
            type=MessageType.HEALTH_UPDATE,
            payload={
                "avg_health": new_health, "life_expectancy": new_le,
                "disease_burden": disease_burden, "mental_health_score": mental_health_score,
                "health_spend": health_spend,
            },
            sim_id=ctx.sim_id, tick=ctx.tick,
        )]

        return AgentResult(
            agent_id=self.agent_id, domain=self.domain, tick=ctx.tick,
            insights=insights, metrics=new_metrics, alerts=alerts, messages=messages,
        )

    async def on_message(self, msg: AgentMessage) -> None:
        if msg.type == MessageType.CLIMATE_UPDATE:
            self._air_quality = float(msg.payload.get("air_quality_index", 80))
