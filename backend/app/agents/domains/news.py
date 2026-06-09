"""
NewsAgent — synthesizes cross-domain events into a human-readable news feed.

Publishes: NEWS_BROADCAST
Reacts to: all domain updates + EVENT_ALERT
"""

from __future__ import annotations

from app.agents.base import (
    AgentContext, AgentMessage, AgentResult,
    BaseAgent, MessageType,
)

# Priority: higher = more newsworthy
_ALERT_PRIORITY = {
    "critical": 4,
    "high":     3,
    "medium":   2,
    "low":      1,
}


class NewsAgent(BaseAgent):
    def __init__(self) -> None:
        super().__init__("news", "news")
        self._pending_events: list[AgentMessage] = []

    async def analyze(self, ctx: AgentContext) -> AgentResult:
        metrics  = ctx.last_metrics
        policies = ctx.active_policies
        tick     = ctx.tick
        insights: list[str] = []
        new_metrics: dict[str, float] = {}

        gdp         = float(metrics.get("gdp", 0))
        happiness   = float(metrics.get("avg_happiness", 50))
        health      = float(metrics.get("avg_health", 50))
        approval    = float(metrics.get("approval_rating", 50))
        crime       = float(metrics.get("crime_rate", 10))
        unemployment = float(metrics.get("unemployment_rate", 5))

        headlines: list[dict] = []

        # ── Headline generation ────────────────────────────────────────────
        # Economic
        if unemployment > 12:
            headlines.append({"category": "economy", "priority": 4,
                "headline": f"UNEMPLOYMENT CRISIS: Jobless rate hits {unemployment:.1f}%",
                "sentiment": "negative"})
        elif unemployment < 3:
            headlines.append({"category": "economy", "priority": 2,
                "headline": f"Labour market reaches near-full employment at {unemployment:.1f}%",
                "sentiment": "positive"})

        if gdp > 0:
            headlines.append({"category": "economy", "priority": 1,
                "headline": f"GDP stands at ${gdp:,.0f} — {'growing' if gdp > 30_000_000 else 'stagnant'}",
                "sentiment": "neutral"})

        # Health
        if health < 35:
            headlines.append({"category": "health", "priority": 4,
                "headline": f"PUBLIC HEALTH EMERGENCY: Average health score {health:.0f}/100",
                "sentiment": "negative"})
        elif health > 75:
            headlines.append({"category": "health", "priority": 1,
                "headline": f"Health minister reports best outcomes in recent history ({health:.0f}/100)",
                "sentiment": "positive"})

        # Governance
        if approval < 25:
            headlines.append({"category": "politics", "priority": 4,
                "headline": f"GOVERNMENT IN CRISIS: Approval rating collapses to {approval:.0f}%",
                "sentiment": "negative"})
        elif approval > 80:
            headlines.append({"category": "politics", "priority": 2,
                "headline": f"Government enjoys strong mandate with {approval:.0f}% approval",
                "sentiment": "positive"})

        # Crime
        if crime > 25:
            headlines.append({"category": "security", "priority": 3,
                "headline": f"Crime rate surges to {crime:.1f} — calls for tougher policing",
                "sentiment": "negative"})
        elif crime < 5:
            headlines.append({"category": "security", "priority": 1,
                "headline": f"Crime rate at historic low ({crime:.1f}) — city safer than ever",
                "sentiment": "positive"})

        # Happiness
        if happiness < 30:
            headlines.append({"category": "society", "priority": 3,
                "headline": f"Happiness survey: citizens deeply unhappy ({happiness:.0f}/100)",
                "sentiment": "negative"})
        elif happiness > 75:
            headlines.append({"category": "society", "priority": 1,
                "headline": f"Quality of life survey shows record happiness ({happiness:.0f}/100)",
                "sentiment": "positive"})

        # Policy news
        active_policies = [p for p in policies if p.get("status") == "active"]
        if active_policies:
            newest = active_policies[0]
            headlines.append({"category": "policy", "priority": 2,
                "headline": f"Policy in effect: '{newest.get('name','Unknown')}' ({newest.get('category','')}) — "
                            f"popularity {newest.get('popularity_score', 50):.0f}/100",
                "sentiment": "neutral"})

        # Event alerts from bus
        for evt_msg in self._pending_events:
            p = evt_msg.payload
            headlines.append({
                "category": "event",
                "priority": _ALERT_PRIORITY.get(p.get("severity", "low"), 1),
                "headline": f"ALERT [{p.get('type','event').upper()}]: {p.get('detail','—')}",
                "sentiment": "negative",
            })
        self._pending_events.clear()

        # Sort by priority desc, keep top 5
        headlines.sort(key=lambda h: h["priority"], reverse=True)
        top_headlines = headlines[:5]

        # ── Media sentiment index (0=very negative, 100=very positive) ────
        if top_headlines:
            sent_scores = {"positive": 70, "neutral": 50, "negative": 25}
            sentiment_index = sum(
                sent_scores.get(h.get("sentiment", "neutral"), 50)
                for h in top_headlines
            ) / len(top_headlines)
        else:
            sentiment_index = 50.0
        new_metrics["media_sentiment_index"] = round(sentiment_index, 2)

        # ── Insights (for TickReport) ──────────────────────────────────────
        for h in top_headlines[:3]:
            insights.append(h["headline"])

        messages = [AgentMessage(
            agent_id=self.agent_id,
            type=MessageType.NEWS_BROADCAST,
            payload={
                "tick": tick,
                "headlines": top_headlines,
                "sentiment_index": sentiment_index,
                "headline_count": len(top_headlines),
            },
            sim_id=ctx.sim_id, tick=ctx.tick,
        )]

        return AgentResult(
            agent_id=self.agent_id, domain=self.domain, tick=tick,
            insights=insights, metrics=new_metrics, alerts=[], messages=messages,
        )

    async def on_message(self, msg: AgentMessage) -> None:
        if msg.type == MessageType.EVENT_ALERT:
            self._pending_events.append(msg)
