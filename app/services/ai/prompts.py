"""
Prompt templates for all 4 AI generation features.

Each function returns a string prompt ready to be sent to the OpenAI Agent.
Data is injected via Python f-strings so prompts stay readable and testable
without touching the service layer.
"""

from __future__ import annotations

import json
from typing import Any


# ── Agent system instructions ──────────────────────────────────────────────────

POLICY_ANALYST_INSTRUCTIONS = """
You are an expert policy analyst for PolisAI, an AI-powered societal digital twin.
Your role is to analyse government policies and their projected effects on a simulated civilization.

When given a policy and its simulation data, you produce:
- A clear, structured analysis of the policy's purpose and design
- Expected short-term and long-term impacts on citizens, economy, and environment
- Potential unintended consequences or second-order effects
- A risk rating (Low / Medium / High) with justification
- Comparison with analogous real-world policies where relevant

Write for a policy-maker audience: precise, evidence-based, and actionable.
Keep responses under 400 words. Use bullet points for impacts.
"""

SIMULATION_NARRATOR_INSTRUCTIONS = """
You are the narrative AI for PolisAI, a societal digital twin simulator.
Your role is to turn raw simulation metrics into clear, engaging explanations
that help researchers and policy-makers understand what is happening in their simulated civilization.

When given simulation tick data, you produce:
- A plain-English summary of the simulation's current state
- Key trends (improving, worsening, stable) for each major metric
- The most significant changes since the last snapshot
- What is driving those changes (policies, events, agent behaviours)
- A one-sentence "health of civilization" headline

Write accessibly — no jargon, concrete numbers, and a human tone.
Keep responses under 350 words.
"""

NEWS_JOURNALIST_INSTRUCTIONS = """
You are an AI journalist for The PolisAI Gazette, covering events in a simulated civilization.
Your role is to write compelling, factual news articles based on simulation data.

When given tick data and agent insights, you produce:
- A punchy headline (max 12 words)
- A dateline (e.g. "POLISAI CITY — Tick 42")
- An opening paragraph with the 5 Ws (who, what, when, where, why)
- 2–3 body paragraphs with quotes from fictional officials or citizens
- A closing paragraph with outlook or context

Match tone to the news: positive metrics → upbeat reporting, crises → serious journalism.
Keep total article under 300 words. Output as plain text, not markdown.
"""

ADVISOR_INSTRUCTIONS = """
You are a senior policy advisor for PolisAI, a societal digital twin.
Your role is to generate concrete, prioritised recommendations for simulation operators
based on the current state of their civilization.

When given simulation metrics, active policies, and agent analysis, you produce:
- 3–5 specific, actionable recommendations ranked by urgency
- For each recommendation: what to do, why it matters, and expected outcome
- One "quick win" that can be implemented immediately
- One "long-game" structural reform for sustained improvement
- Any red flags that require immediate attention

Write for decision-makers: direct, numbered, and outcome-focused.
Keep responses under 400 words.
"""


# ── Prompt builders ────────────────────────────────────────────────────────────

def policy_analysis_prompt(
    policy: dict[str, Any],
    simulation: dict[str, Any],
    current_metrics: dict[str, Any],
    projection: dict[str, Any] | None = None,
) -> str:
    lines = [
        f"Analyse the following policy in the context of this simulation.",
        "",
        "## POLICY",
        f"Name: {policy.get('name', 'Unknown')}",
        f"Category: {policy.get('category', 'unknown')}",
        f"Status: {policy.get('status', 'proposed')}",
        f"Description: {policy.get('description') or 'No description provided.'}",
        f"Budget Impact: ${policy.get('budget_impact', 0):,.0f}",
        f"Popularity Score: {policy.get('popularity_score', 50)}/100",
    ]
    if policy.get("enacted_tick"):
        lines.append(f"Enacted at tick: {policy['enacted_tick']}")

    lines += [
        "",
        "## SIMULATION CONTEXT",
        f"Name: {simulation.get('name', 'Unnamed')}",
        f"Current Tick: {simulation.get('current_tick', 0)}",
        f"Population: {simulation.get('population_size', 'Unknown')}",
        f"Status: {simulation.get('status', 'unknown')}",
        "",
        "## CURRENT METRICS",
        _format_metrics(current_metrics),
    ]

    if projection:
        lines += [
            "",
            "## PROJECTED IMPACT (analytical model)",
            f"Over {projection.get('n_ticks', 10)} ticks:",
            _format_delta(projection.get("delta", {})),
            f"Model confidence: {projection.get('confidence_score', 0.7)*100:.0f}%",
        ]
        if projection.get("key_insights"):
            lines += ["Model insights:"]
            lines += [f"  - {i}" for i in projection["key_insights"][:3]]

    lines += [
        "",
        "Provide your expert policy analysis.",
    ]
    return "\n".join(lines)


def simulation_explanation_prompt(
    simulation: dict[str, Any],
    current_metrics: dict[str, Any],
    previous_metrics: dict[str, Any] | None,
    active_policies: list[dict[str, Any]],
    recent_events: list[dict[str, Any]],
    agent_insights: list[str] | None = None,
) -> str:
    lines = [
        "Explain the current state of this simulation to a non-technical stakeholder.",
        "",
        "## SIMULATION",
        f"Name: {simulation.get('name', 'Unnamed')}",
        f"Tick: {simulation.get('current_tick', 0)}",
        f"Status: {simulation.get('status', 'unknown')}",
        f"Population: {simulation.get('population_size', 0):,}",
        "",
        "## CURRENT STATE (Tick {})".format(simulation.get("current_tick", 0)),
        _format_metrics(current_metrics),
    ]

    if previous_metrics:
        lines += [
            "",
            "## CHANGES FROM PREVIOUS SNAPSHOT",
            _format_metrics_diff(previous_metrics, current_metrics),
        ]

    if active_policies:
        lines += ["", "## ACTIVE POLICIES"]
        for p in active_policies[:5]:
            lines.append(f"  - {p.get('name')} ({p.get('category')}, "
                         f"budget ${p.get('budget_impact', 0):,.0f}, "
                         f"popularity {p.get('popularity_score', 50)}/100)")

    if recent_events:
        lines += ["", "## RECENT EVENTS"]
        for e in recent_events[:3]:
            lines.append(f"  - [{e.get('severity','').upper()}] {e.get('name')} "
                         f"({e.get('type')}) — tick {e.get('tick', 0)}")

    if agent_insights:
        lines += ["", "## AI AGENT INSIGHTS"]
        for ins in agent_insights[:6]:
            lines.append(f"  • {ins}")

    lines += ["", "Write your simulation explanation now."]
    return "\n".join(lines)


def news_article_prompt(
    tick: int,
    sim_name: str,
    metrics: dict[str, Any],
    headlines: list[dict[str, Any]],
    active_policies: list[dict[str, Any]],
    alerts: list[dict[str, Any]],
) -> str:
    lines = [
        f"Write a news article for tick {tick} of the '{sim_name}' simulation.",
        "",
        "## TOP HEADLINES (from AI agents)",
    ]
    for h in headlines[:5]:
        icon = "▲" if h.get("sentiment") == "positive" else "▼" if h.get("sentiment") == "negative" else "◆"
        lines.append(f"  {icon} [{h.get('category','').upper()}] {h.get('headline','')}")

    lines += [
        "",
        "## KEY METRICS",
        _format_metrics(metrics),
        "",
        "## ACTIVE POLICIES",
    ]
    for p in (active_policies or [])[:3]:
        lines.append(f"  - {p.get('name')} ({p.get('category')}): "
                     f"popularity {p.get('popularity_score', 50)}/100")

    if alerts:
        lines += ["", "## ACTIVE ALERTS"]
        for a in alerts[:3]:
            lines.append(f"  ⚠ [{a.get('severity','').upper()}] {a.get('type')}: {a.get('detail','')}")

    lines += ["", "Write the news article now."]
    return "\n".join(lines)


def recommendations_prompt(
    simulation: dict[str, Any],
    current_metrics: dict[str, Any],
    active_policies: list[dict[str, Any]],
    agent_analysis: list[str],
    alerts: list[dict[str, Any]],
    government: dict[str, Any] | None = None,
) -> str:
    gov_budget = (government or {}).get("budget", 0)

    lines = [
        "Generate prioritised recommendations for this simulation's operators.",
        "",
        "## SIMULATION",
        f"Name: {simulation.get('name', 'Unnamed')} | Tick: {simulation.get('current_tick', 0)}",
        f"Population: {simulation.get('population_size', 0):,} | Status: {simulation.get('status')}",
        f"Government Budget Available: ${gov_budget:,.0f}",
        "",
        "## CURRENT METRICS",
        _format_metrics(current_metrics),
        "",
        "## ACTIVE POLICIES ({} total)".format(len(active_policies)),
    ]
    for p in active_policies[:5]:
        lines.append(f"  - {p.get('name')} ({p.get('category')}, "
                     f"${p.get('budget_impact',0):,.0f}, "
                     f"pop {p.get('popularity_score',50)}/100)")

    if alerts:
        lines += ["", "## CURRENT ALERTS (requires attention)"]
        for a in sorted(alerts, key=lambda x: {"critical":4,"high":3,"medium":2,"low":1}.get(x.get("severity","low"),1), reverse=True)[:5]:
            lines.append(f"  ⚠ [{a.get('severity','?').upper()}] {a.get('type')}: {a.get('detail','')}")

    if agent_analysis:
        lines += ["", "## DOMAIN AGENT ANALYSIS"]
        for ins in agent_analysis[:8]:
            lines.append(f"  • {ins}")

    lines += ["", "Provide your prioritised recommendations now."]
    return "\n".join(lines)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _format_metrics(m: dict[str, Any]) -> str:
    keys = [
        ("avg_happiness", "Avg Happiness", "/100"),
        ("avg_health", "Avg Health", "/100"),
        ("avg_income", "Avg Income", "$"),
        ("gdp", "GDP", "$"),
        ("unemployment_rate", "Unemployment", "%"),
        ("gini_coefficient", "Gini", ""),
        ("crime_rate", "Crime Rate", "/100"),
        ("literacy_rate", "Literacy", "%"),
        ("life_expectancy", "Life Expectancy", " yrs"),
        ("approval_rating", "Approval", "%"),
    ]
    lines = []
    for key, label, unit in keys:
        if key in m:
            v = m[key]
            if unit == "$":
                lines.append(f"  {label}: ${float(v):,.0f}")
            else:
                lines.append(f"  {label}: {float(v):.1f}{unit}")
    return "\n".join(lines) if lines else "  No metrics available."


def _format_delta(delta: dict[str, Any]) -> str:
    lines = []
    for key, val in delta.items():
        if isinstance(val, (int, float)):
            sign = "+" if val > 0 else ""
            lines.append(f"  {key}: {sign}{val:.2f}")
    return "\n".join(lines) if lines else "  No deltas."


def _format_metrics_diff(prev: dict[str, Any], curr: dict[str, Any]) -> str:
    lines = []
    for key in ["avg_happiness", "avg_health", "avg_income", "gdp",
                "unemployment_rate", "crime_rate", "approval_rating"]:
        if key in prev and key in curr:
            diff = float(curr[key]) - float(prev[key])
            if abs(diff) > 0.01:
                sign = "+" if diff > 0 else ""
                lines.append(f"  {key}: {sign}{diff:.2f}")
    return "\n".join(lines) if lines else "  No significant changes."
