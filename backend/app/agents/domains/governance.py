"""
GovernanceAgent — tracks political stability, public approval, and corruption.

Publishes: GOVERNANCE_UPDATE
Reacts to: ECONOMIC_UPDATE, HEALTH_UPDATE (both affect approval)
"""

from __future__ import annotations

from app.agents.base import (
    AgentContext, AgentMessage, AgentResult,
    BaseAgent, MessageType,
)


class GovernanceAgent(BaseAgent):
    def __init__(self) -> None:
        super().__init__("governance", "governance")
        self._econ_signal:   float = 0.0   # GDP growth rate from EconomyAgent
        self._health_signal: float = 50.0  # avg_health from HealthcareAgent

    async def analyze(self, ctx: AgentContext) -> AgentResult:
        metrics  = ctx.last_metrics
        policies = ctx.active_policies
        gov      = ctx.government
        insights: list[str] = []
        alerts:   list[dict] = []
        new_metrics: dict[str, float] = {}

        approval     = float(metrics.get("approval_rating", 50))
        happiness    = float(metrics.get("avg_happiness", 50))
        crime_rate   = float(metrics.get("crime_rate", 10))
        unemployment = float(metrics.get("unemployment_rate", 5))
        gov_type     = gov.get("type", "democracy")

        # ── Policy popularity effect ───────────────────────────────────────
        active_policies = [p for p in policies if p.get("status") == "active"]
        avg_popularity = (
            sum(float(p.get("popularity_score", 50)) for p in active_policies)
            / max(len(active_policies), 1)
        )
        popularity_delta = (avg_popularity - 50) * 0.05

        # ── Socioeconomic pressures ────────────────────────────────────────
        happiness_delta = (happiness - 50) * 0.02
        crime_penalty   = -(crime_rate / 100) * 3
        unemp_penalty   = -(unemployment / 100) * 4
        health_bonus    = (self._health_signal - 50) * 0.01
        econ_bonus      = self._econ_signal * 10   # GDP growth → approval

        # ── Government type stability modifier ────────────────────────────
        stability_mult = {
            "democracy":               1.0,
            "republic":                1.0,
            "constitutional_monarchy": 0.95,
            "federation":              0.9,
            "oligarchy":               0.7,
            "autocracy":               0.5,
            "absolute_monarchy":       0.6,
            "theocracy":               0.8,
        }.get(gov_type, 1.0)

        raw_delta = (popularity_delta + happiness_delta + crime_penalty
                     + unemp_penalty + health_bonus + econ_bonus)
        approval_delta = raw_delta * stability_mult
        new_approval = min(100.0, max(0.0, approval + approval_delta))
        new_metrics["approval_rating"] = round(new_approval, 2)

        # ── Corruption index (0=clean, 100=corrupt) ────────────────────────
        # Autocratic regimes and low happiness → higher corruption proxy
        corruption = max(0, min(100,
            50 - (approval - 50) * 0.3
            + (0 if gov_type == "democracy" else 10)
            + (100 - happiness) * 0.1
        ))
        new_metrics["corruption_index"] = round(corruption, 2)

        # ── Political stability (0=unstable, 100=stable) ───────────────────
        stability = max(0, min(100,
            new_approval * 0.6 + (100 - crime_rate) * 0.2
            + (100 - corruption) * 0.2
        ))
        new_metrics["political_stability"] = round(stability, 2)

        # ── Insights ──────────────────────────────────────────────────────
        if new_approval < 25:
            insights.append(f"Government approval critical ({new_approval:.1f}%) — instability risk.")
            alerts.append({"type": "low_approval", "severity": "high",
                           "detail": f"Approval {new_approval:.1f}%"})
        elif new_approval > 75:
            insights.append(f"Strong mandate ({new_approval:.1f}%) — policy window is open.")

        if stability < 30:
            insights.append(f"Political instability ({stability:.0f}/100) — governance reforms needed.")
            alerts.append({"type": "political_instability", "severity": "medium",
                           "detail": f"Stability index {stability:.0f}"})

        if corruption > 60:
            insights.append(f"High corruption ({corruption:.0f}/100) undermining public trust.")
            alerts.append({"type": "corruption_alert", "severity": "medium",
                           "detail": f"Corruption index {corruption:.0f}"})

        if len(active_policies) == 0:
            insights.append("No active policies — government inaction may erode public trust.")
        elif avg_popularity > 70:
            insights.append(f"Active policy portfolio is popular ({avg_popularity:.0f}/100 avg).")

        if gov_type in ("autocracy", "absolute_monarchy") and new_approval < 40:
            alerts.append({"type": "regime_instability", "severity": "high",
                           "detail": f"{gov_type} with {new_approval:.1f}% approval"})

        messages = [AgentMessage(
            agent_id=self.agent_id,
            type=MessageType.GOVERNANCE_UPDATE,
            payload={
                "approval_rating": new_approval,
                "corruption_index": corruption,
                "political_stability": stability,
                "active_policy_count": len(active_policies),
            },
            sim_id=ctx.sim_id, tick=ctx.tick,
        )]

        return AgentResult(
            agent_id=self.agent_id, domain=self.domain, tick=ctx.tick,
            insights=insights, metrics=new_metrics, alerts=alerts, messages=messages,
        )

    async def on_message(self, msg: AgentMessage) -> None:
        if msg.type == MessageType.ECONOMIC_UPDATE:
            self._econ_signal = float(msg.payload.get("gdp_growth_rate", 0))
        elif msg.type == MessageType.HEALTH_UPDATE:
            self._health_signal = float(msg.payload.get("avg_health", 50))
