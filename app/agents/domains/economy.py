"""
EconomyAgent — analyzes GDP, income distribution, unemployment, and inflation.

Publishes: ECONOMIC_UPDATE
Reacts to: POLICY_EFFECT (economic policies), EVENT_ALERT (crises)
"""

from __future__ import annotations

import math

from app.agents.base import (
    AgentContext, AgentMessage, AgentResult, AgentBus,
    BaseAgent, MessageType,
)


class EconomyAgent(BaseAgent):
    def __init__(self) -> None:
        super().__init__("economy", "economy")
        self._policy_effects: list[AgentMessage] = []

    async def analyze(self, ctx: AgentContext) -> AgentResult:
        metrics = ctx.last_metrics
        policies = ctx.active_policies
        citizens = ctx.citizen_sample
        insights: list[str] = []
        alerts:   list[dict] = []
        new_metrics: dict[str, float] = {}

        # ── GDP trend ──────────────────────────────────────────────────────
        gdp         = float(metrics.get("gdp", 0))
        avg_income  = float(metrics.get("avg_income", 30000))
        gini        = float(metrics.get("gini_coefficient", 0.35))
        unemployment = float(metrics.get("unemployment_rate", 5.0))

        # Policy pressure on GDP
        econ_spend = sum(p.get("budget_impact", 0) for p in policies if p.get("category") == "economic")
        infra_spend = sum(p.get("budget_impact", 0) for p in policies if p.get("category") == "infrastructure")
        total_stimulus = econ_spend + infra_spend * 0.6

        gdp_growth_rate = _estimate_gdp_growth(avg_income, unemployment, gini, total_stimulus)
        new_gdp = round(gdp * (1 + gdp_growth_rate), 2)
        new_metrics["gdp"] = new_gdp

        # ── Unemployment ───────────────────────────────────────────────────
        edu_bonus = sum(
            1 for c in citizens
            if c.get("education_level") in ("tertiary", "postgraduate")
        ) / max(len(citizens), 1) * 0.02
        new_unemp = max(0, unemployment - edu_bonus
                        - (0.3 if econ_spend > 500_000 else 0)
                        - (0.2 if infra_spend > 1_000_000 else 0))
        new_metrics["unemployment_rate"] = round(new_unemp, 2)

        # ── Income inequality ──────────────────────────────────────────────
        if citizens:
            incomes = sorted(float(c.get("income", 0)) for c in citizens)
            new_gini = _gini(incomes) if incomes else gini
            new_metrics["gini_coefficient"] = round(new_gini, 4)
        else:
            new_gini = gini

        # ── Insights ──────────────────────────────────────────────────────
        if gdp_growth_rate > 0.01:
            insights.append(f"GDP growing at {gdp_growth_rate*100:.1f}% — strong economic momentum.")
        elif gdp_growth_rate < -0.005:
            insights.append(f"GDP contracting at {abs(gdp_growth_rate)*100:.1f}% — recession risk.")
            alerts.append({"type": "recession_risk", "severity": "high",
                           "detail": f"GDP growth: {gdp_growth_rate*100:.1f}%"})

        if new_unemp > 10:
            insights.append(f"Unemployment critical at {new_unemp:.1f}% — requires economic stimulus.")
            alerts.append({"type": "high_unemployment", "severity": "medium",
                           "detail": f"{new_unemp:.1f}% unemployment"})
        elif new_unemp < 3:
            insights.append(f"Near full employment at {new_unemp:.1f}% — labour shortage possible.")

        if new_gini > 0.45:
            insights.append(f"Inequality high (Gini {new_gini:.3f}) — social tension risk rising.")
            alerts.append({"type": "inequality_alert", "severity": "medium",
                           "detail": f"Gini={new_gini:.3f}"})
        elif new_gini < 0.25:
            insights.append(f"Equality strong (Gini {new_gini:.3f}) — redistributive policies working.")

        if total_stimulus > 5_000_000:
            insights.append(f"Large fiscal stimulus (${total_stimulus:,.0f}) is boosting aggregate demand.")

        # Publish economic update
        messages = [AgentMessage(
            agent_id=self.agent_id,
            type=MessageType.ECONOMIC_UPDATE,
            payload={
                "gdp": new_gdp, "gdp_growth_rate": gdp_growth_rate,
                "unemployment_rate": new_unemp, "gini_coefficient": new_gini,
                "total_stimulus": total_stimulus,
            },
            sim_id=ctx.sim_id, tick=ctx.tick,
        )]

        return AgentResult(
            agent_id=self.agent_id, domain=self.domain, tick=ctx.tick,
            insights=insights, metrics=new_metrics, alerts=alerts, messages=messages,
        )

    async def on_message(self, msg: AgentMessage) -> None:
        if msg.type == MessageType.POLICY_EFFECT:
            self._policy_effects.append(msg)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _estimate_gdp_growth(avg_income: float, unemployment: float,
                          gini: float, stimulus: float) -> float:
    base = 0.002                                    # baseline 0.2% per tick
    income_factor = math.log1p(avg_income / 30_000) * 0.001
    unemp_drag    = -(unemployment / 100) * 0.02
    inequality_drag = -(gini - 0.3) * 0.01
    stimulus_boost = math.log1p(abs(stimulus) / 1_000_000) * 0.003 * (1 if stimulus >= 0 else -1)
    return base + income_factor + unemp_drag + inequality_drag + stimulus_boost


def _gini(sorted_incomes: list[float]) -> float:
    if not sorted_incomes or sum(sorted_incomes) == 0:
        return 0.0
    n = len(sorted_incomes)
    numer = sum(2 * (i + 1) * y for i, y in enumerate(sorted_incomes))
    denom = n * sum(sorted_incomes)
    return max(0.0, (numer / denom) - (n + 1) / n)
