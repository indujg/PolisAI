"""
KPI Engine — derives the six high-level indices from raw simulation metrics.

Each KPI is a 0-100 normalised float so all indices live on the same scale
and can be directly compared or plotted together.

Indices:
  GDP Index          — derived from avg_income × population (normalised 0-100)
  Happiness Index    — avg_happiness (already 0-100)
  Pollution Index    — inverse of climate proxy; high = dirty city
  Traffic Index      — congestion/mobility; high = gridlocked
  Healthcare Index   — composite of avg_health + life_expectancy
  Education Index    — literacy_rate proxy (already 0-100)

We also expose a Composite Wellbeing Score (average of all six, after
inverting Pollution + Traffic so that higher = better for every dimension).
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any


# ── Reference constants for normalisation ─────────────────────────────────────

_GDP_BASELINE    = 2_000_000.0   # GDP below this → index 0; above 20×baseline → 100
_GDP_RANGE_LOG   = math.log(20)  # log scale so growth is visible at low incomes


@dataclass
class KPISnapshot:
    tick:              int
    gdp_index:         float   # 0-100
    happiness_index:   float   # 0-100
    pollution_index:   float   # 0-100  (high = more polluted)
    traffic_index:     float   # 0-100  (high = more congested)
    healthcare_index:  float   # 0-100
    education_index:   float   # 0-100
    wellbeing_score:   float   # 0-100  composite (higher = better quality of life)

    def to_dict(self) -> dict[str, Any]:
        return {
            "tick":             self.tick,
            "gdp_index":        round(self.gdp_index, 2),
            "happiness_index":  round(self.happiness_index, 2),
            "pollution_index":  round(self.pollution_index, 2),
            "traffic_index":    round(self.traffic_index, 2),
            "healthcare_index": round(self.healthcare_index, 2),
            "education_index":  round(self.education_index, 2),
            "wellbeing_score":  round(self.wellbeing_score, 2),
        }

    def to_chart_series(self) -> list[dict[str, Any]]:
        """Return list of {name, value} items suited for pie/bar charts."""
        return [
            {"name": "GDP",         "value": round(self.gdp_index, 2)},
            {"name": "Happiness",   "value": round(self.happiness_index, 2)},
            {"name": "Pollution",   "value": round(self.pollution_index, 2)},
            {"name": "Traffic",     "value": round(self.traffic_index, 2)},
            {"name": "Healthcare",  "value": round(self.healthcare_index, 2)},
            {"name": "Education",   "value": round(self.education_index, 2)},
        ]


def compute_kpis(metrics: dict[str, Any], tick: int | None = None) -> KPISnapshot:
    """
    Derive KPIs from a metrics dict (as stored in simulation_results.metrics).
    Works on both live engine output and historical snapshots.
    """
    t = tick if tick is not None else int(metrics.get("tick", 0))

    gdp_index        = _gdp_index(metrics)
    happiness_index  = _clamp(float(metrics.get("avg_happiness", 50)), 0, 100)
    pollution_index  = _pollution_index(metrics)
    traffic_index    = _traffic_index(metrics)
    healthcare_index = _healthcare_index(metrics)
    education_index  = _clamp(float(metrics.get("literacy_rate", 50)), 0, 100)

    # Composite wellbeing — invert pollution and traffic so all dims are "higher=better"
    wellbeing_score = _clamp(
        (gdp_index
         + happiness_index
         + (100 - pollution_index)
         + (100 - traffic_index)
         + healthcare_index
         + education_index) / 6,
        0, 100,
    )

    return KPISnapshot(
        tick=t,
        gdp_index=gdp_index,
        happiness_index=happiness_index,
        pollution_index=pollution_index,
        traffic_index=traffic_index,
        healthcare_index=healthcare_index,
        education_index=education_index,
        wellbeing_score=wellbeing_score,
    )


# ── Index derivations ──────────────────────────────────────────────────────────

def _gdp_index(m: dict) -> float:
    gdp = float(m.get("gdp", 0))
    if gdp <= 0:
        return 0.0
    # Log scale: GDP at baseline = 50, 20× baseline = 100, below baseline decays
    ratio = gdp / _GDP_BASELINE
    raw   = (math.log(max(ratio, 1e-9)) / _GDP_RANGE_LOG) * 50 + 50
    return _clamp(raw, 0, 100)


def _pollution_index(m: dict) -> float:
    """
    Proxy from simulation metrics:
      - crime_rate correlates with urban decay / poor infrastructure → some pollution
      - gini_coefficient: high inequality → more congestion + pollution
      - unemployment: idle industry is cleaner, but poverty → unregulated emissions
    Higher score = more polluted.
    """
    crime         = float(m.get("crime_rate", 10))
    gini          = float(m.get("gini_coefficient", 0.3))
    unemployment  = float(m.get("unemployment_rate", 5))

    # Weighted composite normalised to 0-100
    raw = (
        crime * 0.4           +   # 0-100 → up to 40
        gini * 100 * 0.35     +   # 0-1   → up to 35
        unemployment * 0.5        # 0-50  → up to 25
    )
    return _clamp(raw, 0, 100)


def _traffic_index(m: dict) -> float:
    """
    Proxy: high population density + high income (more cars) + low transit investment.
    Derived from population + avg_income + gini (inequality → private vehicles).
    """
    pop     = float(m.get("population", 100))
    income  = float(m.get("avg_income", 30_000))
    gini    = float(m.get("gini_coefficient", 0.3))

    # Normalise population to 0-50 range (0=0 citizens, 10000=50)
    pop_norm   = _clamp(pop / 200, 0, 50)
    # High income → more cars → more congestion (up to 30)
    income_norm = _clamp((income / 200_000) * 30, 0, 30)
    # High gini → more private vehicles (up to 20)
    gini_norm   = gini * 20

    return _clamp(pop_norm + income_norm + gini_norm, 0, 100)


def _healthcare_index(m: dict) -> float:
    """
    Composite of avg_health (0-100) and life_expectancy (40-100 → normalised).
    """
    health = float(m.get("avg_health", 50))
    life_ex = float(m.get("life_expectancy", 70))
    # Normalise life expectancy: 40 = 0, 100 = 100
    life_norm = _clamp((life_ex - 40) / 60 * 100, 0, 100)
    return _clamp((health * 0.6 + life_norm * 0.4), 0, 100)


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


# ── Trend helpers ──────────────────────────────────────────────────────────────

def compute_trend(snapshots: list[KPISnapshot], field: str) -> dict[str, Any]:
    """
    Return charts-ready time series for a single KPI field.
    {"field": "gdp_index", "series": [{"tick": 1, "value": 52.3}, ...],
     "min": ..., "max": ..., "latest": ..., "change": ...}
    """
    if not snapshots:
        return {"field": field, "series": [], "min": 0, "max": 0,
                "latest": 0, "change": 0}
    series = [{"tick": s.tick, "value": round(getattr(s, field, 0), 2)}
              for s in snapshots]
    values = [p["value"] for p in series]
    change = round(values[-1] - values[0], 2) if len(values) > 1 else 0.0
    return {
        "field":   field,
        "series":  series,
        "min":     round(min(values), 2),
        "max":     round(max(values), 2),
        "latest":  round(values[-1], 2),
        "change":  change,
    }
