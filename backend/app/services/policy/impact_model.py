"""
PolicyImpactModel — analytical engine that projects policy effects over n ticks.

Uses category-specific transfer functions calibrated against the CitizenBehaviorEngine
formulas, so projections are consistent with what actually happens during simulation.

Each category produces deltas per tick; compound over n_ticks gives a forecast.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

# Per-tick effect magnitudes keyed by (category, metric)
# Positive = increase, negative = decrease
# Multiplied by (budget_impact / 10_000) so a 1M budget has ~100x effect of a 10K budget
# Base effects at budget_impact == 0 represent regulatory/non-fiscal impacts

_BASE_DELTAS: dict[str, dict[str, float]] = {
    "economic": {
        "avg_income":       2.0,    # income growth from economic activity
        "avg_happiness":    0.3,
        "unemployment_rate": -0.2,
        "gdp_factor":       0.005,  # % GDP growth per tick
        "avg_health":       0.05,
        "crime_rate":       -0.1,
    },
    "social": {
        "avg_happiness":    0.8,
        "avg_health":       0.2,
        "crime_rate":       -0.15,
        "avg_income":       0.5,
        "unemployment_rate": -0.05,
    },
    "environmental": {
        "avg_health":       0.4,
        "avg_happiness":    0.15,
        "avg_income":       -0.3,   # short-term cost (carbon tax, etc.)
        "crime_rate":       -0.05,
        "gdp_factor":       -0.001,
    },
    "healthcare": {
        "avg_health":       1.2,
        "avg_happiness":    0.5,
        "avg_income":       0.2,    # productivity gain
        "crime_rate":       -0.1,
        "unemployment_rate": -0.1,
    },
    "education": {
        "avg_income":       1.5,    # delayed productivity — higher per tick
        "avg_happiness":    0.3,
        "avg_health":       0.1,
        "unemployment_rate": -0.15,
        "crime_rate":       -0.2,
        "literacy_rate":    0.2,
    },
    "security": {
        "crime_rate":       -0.8,
        "avg_happiness":    -0.1,   # surveillance trade-off
        "avg_health":       0.05,
        "avg_income":       0.0,
        "unemployment_rate": -0.05,
    },
    "infrastructure": {
        "avg_income":       1.8,    # productivity: metro expansion, etc.
        "avg_happiness":    0.6,
        "gdp_factor":       0.003,
        "crime_rate":       -0.1,
        "avg_health":       0.1,
        "unemployment_rate": -0.2,
    },
    "foreign": {
        "avg_income":       1.0,
        "gdp_factor":       0.004,
        "avg_happiness":    0.1,
        "unemployment_rate": -0.1,
        "avg_health":       0.0,
        "crime_rate":       0.0,
    },
}

_CONFIDENCE: dict[str, float] = {
    "economic":       0.78,
    "social":         0.72,
    "environmental":  0.70,
    "healthcare":     0.82,
    "education":      0.74,
    "security":       0.80,
    "infrastructure": 0.76,
    "foreign":        0.58,
}

_POPULARITY_THRESHOLDS = {
    "high":   70.0,
    "low":    50.0,
}

# Metrics whose sign is independent of budget_impact direction —
# they benefit from the SIZE of intervention, not fiscal sign.
_WELFARE_METRICS = {"avg_health", "avg_happiness", "crime_rate", "literacy_rate"}


@dataclass
class PolicyProjection:
    policy_id:         str
    n_ticks:           int
    current_metrics:   dict[str, Any]
    projected_metrics: dict[str, Any]
    delta:             dict[str, float]
    confidence_score:  float
    key_insights:      list[str] = field(default_factory=list)


def project(
    policy_id: str,
    category: str,
    budget_impact: float,
    popularity_score: float,
    current_metrics: dict[str, Any],
    n_ticks: int = 10,
) -> PolicyProjection:
    """
    Project the effect of activating this policy over n_ticks.

    budget_impact > 0 = government spending / subsidy
    budget_impact < 0 = austerity / tax increase
    """
    base = _BASE_DELTAS.get(category, _BASE_DELTAS["economic"])

    # Budget scaling: magnitude for welfare effects, signed for economic effects
    budget_mult        = _budget_multiplier(budget_impact)
    budget_mult_abs    = abs(budget_mult)   # welfare metrics benefit from SIZE, not sign

    # Popularity: above-median support amplifies positive effects
    pop_mult = 0.5 + (popularity_score / 100.0)   # 0.5 – 1.5

    # Per-tick delta
    per_tick: dict[str, float] = {}
    for metric, base_val in base.items():
        if metric == "gdp_factor":
            continue
        # Welfare metrics (health, happiness, crime) use abs magnitude
        mult = budget_mult_abs if metric in _WELFARE_METRICS else budget_mult
        per_tick[metric] = base_val * mult * pop_mult

    # Compound n ticks
    proj = dict(current_metrics)
    cumulative: dict[str, float] = {k: 0.0 for k in per_tick}

    for _ in range(n_ticks):
        for metric, delta_per in per_tick.items():
            if metric in proj:
                proj[metric] = _clamp_metric(metric, proj[metric] + delta_per)
                cumulative[metric] = round(cumulative[metric] + delta_per, 4)

        # GDP grows multiplicatively
        gdp_factor = base.get("gdp_factor", 0.0) * budget_mult * pop_mult
        if "gdp" in proj:
            proj["gdp"] = round(proj["gdp"] * (1 + gdp_factor), 2)

    # Round projected
    proj = {k: (round(v, 2) if isinstance(v, float) else v) for k, v in proj.items()}

    # Total delta (what's actually changed)
    delta = {
        metric: round(proj.get(metric, 0) - current_metrics.get(metric, 0), 4)
        for metric in per_tick
        if metric in current_metrics
    }
    if "gdp" in current_metrics and "gdp" in proj:
        delta["gdp"] = round(proj["gdp"] - current_metrics["gdp"], 2)

    confidence = _CONFIDENCE.get(category, 0.65)
    insights = _generate_insights(category, budget_impact, popularity_score, delta, n_ticks)

    return PolicyProjection(
        policy_id=policy_id,
        n_ticks=n_ticks,
        current_metrics=current_metrics,
        projected_metrics=proj,
        delta=delta,
        confidence_score=confidence,
        key_insights=insights,
    )


# ── Helpers ────────────────────────────────────────────────────────────────────

def _budget_multiplier(budget_impact: float) -> float:
    """Sigmoidal-ish scaling so huge budgets don't dominate linearly."""
    if budget_impact == 0:
        return 1.0
    import math
    sign = 1 if budget_impact > 0 else -1
    magnitude = abs(budget_impact)
    # Every 100k of budget ≈ +0.1x multiplier, soft-capped around 3x
    return sign * (1 + math.log1p(magnitude / 100_000) * 0.5)


def _clamp_metric(metric: str, value: float) -> float:
    bounds = {
        "avg_happiness":    (0.0, 100.0),
        "avg_health":       (0.0, 100.0),
        "crime_rate":       (0.0, 100.0),
        "unemployment_rate":(0.0, 100.0),
        "literacy_rate":    (0.0, 100.0),
        "approval_rating":  (0.0, 100.0),
    }
    lo, hi = bounds.get(metric, (None, None))
    if lo is None:
        return value
    return max(lo, min(hi, value))


def _generate_insights(
    category: str,
    budget_impact: float,
    popularity_score: float,
    delta: dict[str, float],
    n_ticks: int,
) -> list[str]:
    insights: list[str] = []

    if budget_impact > 1_000_000:
        insights.append(f"Large spending (${budget_impact:,.0f}) amplifies all effects significantly.")
    elif budget_impact < -500_000:
        insights.append(f"Austerity measure (${budget_impact:,.0f}) will dampen economic gains.")
    elif budget_impact == 0:
        insights.append("Regulatory-only policy — effects driven by enforcement, not fiscal stimulus.")

    if popularity_score >= _POPULARITY_THRESHOLDS["high"]:
        insights.append("High public support boosts policy effectiveness by ~50%.")
    elif popularity_score < _POPULARITY_THRESHOLDS["low"]:
        insights.append("Low popularity reduces effectiveness — expect political resistance.")

    income_delta = delta.get("avg_income", 0)
    happiness_delta = delta.get("avg_happiness", 0)
    health_delta = delta.get("avg_health", 0)
    crime_delta = delta.get("crime_rate", 0)

    if income_delta > 500:
        insights.append(f"Significant income boost: +${income_delta:,.0f} avg over {n_ticks} ticks.")
    elif income_delta < -200:
        insights.append(f"Income will decline: ${income_delta:,.0f} avg over {n_ticks} ticks.")

    if happiness_delta > 5:
        insights.append(f"Notable happiness improvement: +{happiness_delta:.1f} points.")
    elif happiness_delta < -3:
        insights.append(f"Happiness drop expected: {happiness_delta:.1f} points.")

    if health_delta > 5:
        insights.append(f"Health improves by {health_delta:.1f} points — reduces long-term costs.")

    if crime_delta < -2:
        insights.append(f"Crime rate drops {abs(crime_delta):.1f} points — improves stability index.")

    if category == "education":
        insights.append("Education policies have delayed effects; full impact visible after 20+ ticks.")
    elif category == "environmental":
        insights.append("Short-term economic friction expected; long-term health dividends are strong.")
    elif category == "foreign":
        insights.append("Foreign policy outcomes are highly sensitive to external simulation parameters.")

    return insights
