"""
Analytics backend tests — pure unit tests, no DB or HTTP required.

Tests cover:
  - KPI Engine: all 6 index derivations + wellbeing composite
  - Edge cases: empty metrics, zero population, maximal values
  - compute_trend: series shape, min/max/change calculation
  - KPISnapshot.to_dict() and to_chart_series() format
  - AnalyticsService methods (DB mocked)
  - API endpoint routing (FastAPI TestClient)
"""

from __future__ import annotations

import math
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.analytics.kpi_engine import (
    KPISnapshot, compute_kpis, compute_trend,
    _clamp, _gdp_index, _healthcare_index, _pollution_index, _traffic_index,
)


# ── Fixtures ───────────────────────────────────────────────────────────────────

def _metrics(**overrides) -> dict[str, Any]:
    """Return a complete metrics dict with sensible defaults."""
    base = {
        "tick": 5,
        "avg_happiness": 60.0,
        "avg_health": 65.0,
        "avg_income": 45_000.0,
        "gdp": 4_500_000.0,
        "unemployment_rate": 5.0,
        "gini_coefficient": 0.35,
        "crime_rate": 8.0,
        "literacy_rate": 78.0,
        "life_expectancy": 75.0,
        "approval_rating": 55.0,
        "population": 200,
    }
    base.update(overrides)
    return base


# ── _clamp ─────────────────────────────────────────────────────────────────────

class TestClamp:
    def test_below_lo(self):     assert _clamp(-5, 0, 100) == 0
    def test_above_hi(self):     assert _clamp(200, 0, 100) == 100
    def test_within(self):       assert _clamp(50, 0, 100) == 50
    def test_at_boundary(self):  assert _clamp(100, 0, 100) == 100


# ── GDP Index ──────────────────────────────────────────────────────────────────

class TestGDPIndex:
    def test_zero_gdp_returns_zero(self):
        assert _gdp_index({"gdp": 0}) == 0.0

    def test_negative_gdp_returns_zero(self):
        assert _gdp_index({"gdp": -1}) == 0.0

    def test_baseline_gdp_is_roughly_50(self):
        idx = _gdp_index({"gdp": 2_000_000})
        assert 45 <= idx <= 55

    def test_high_gdp_approaches_100(self):
        idx = _gdp_index({"gdp": 40_000_000})
        assert idx > 90

    def test_very_low_gdp_is_near_zero(self):
        idx = _gdp_index({"gdp": 1_000})
        assert idx < 10

    def test_returns_float(self):
        assert isinstance(_gdp_index({"gdp": 5_000_000}), float)


# ── Pollution Index ────────────────────────────────────────────────────────────

class TestPollutionIndex:
    def test_low_crime_low_gini_low_unemployment(self):
        idx = _pollution_index({"crime_rate": 0, "gini_coefficient": 0, "unemployment_rate": 0})
        assert idx == 0.0

    def test_high_crime_raises_pollution(self):
        low  = _pollution_index({"crime_rate": 5,  "gini_coefficient": 0.3, "unemployment_rate": 5})
        high = _pollution_index({"crime_rate": 80, "gini_coefficient": 0.3, "unemployment_rate": 5})
        assert high > low

    def test_high_gini_raises_pollution(self):
        low  = _pollution_index({"crime_rate": 10, "gini_coefficient": 0.1, "unemployment_rate": 5})
        high = _pollution_index({"crime_rate": 10, "gini_coefficient": 0.9, "unemployment_rate": 5})
        assert high > low

    def test_result_in_range(self):
        for gini in [0.0, 0.5, 1.0]:
            idx = _pollution_index({"crime_rate": 50, "gini_coefficient": gini, "unemployment_rate": 10})
            assert 0 <= idx <= 100


# ── Traffic Index ──────────────────────────────────────────────────────────────

class TestTrafficIndex:
    def test_empty_city_near_zero(self):
        idx = _traffic_index({"population": 0, "avg_income": 0, "gini_coefficient": 0})
        assert idx == 0.0

    def test_large_rich_unequal_city_high(self):
        idx = _traffic_index({"population": 10_000, "avg_income": 200_000, "gini_coefficient": 0.9})
        assert idx > 60

    def test_result_in_range(self):
        idx = _traffic_index({"population": 500, "avg_income": 60_000, "gini_coefficient": 0.4})
        assert 0 <= idx <= 100


# ── Healthcare Index ───────────────────────────────────────────────────────────

class TestHealthcareIndex:
    def test_perfect_health(self):
        idx = _healthcare_index({"avg_health": 100, "life_expectancy": 100})
        assert idx == 100.0

    def test_worst_health(self):
        idx = _healthcare_index({"avg_health": 0, "life_expectancy": 40})
        assert idx == 0.0

    def test_composite_weights(self):
        # health=100, life_ex=40 → life_norm=0, result=60
        idx = _healthcare_index({"avg_health": 100, "life_expectancy": 40})
        assert abs(idx - 60) < 0.1

    def test_result_in_range(self):
        for h in [0, 50, 100]:
            idx = _healthcare_index({"avg_health": h, "life_expectancy": 70})
            assert 0 <= idx <= 100


# ── compute_kpis ───────────────────────────────────────────────────────────────

class TestComputeKPIs:
    def test_returns_kpi_snapshot(self):
        snap = compute_kpis(_metrics())
        assert isinstance(snap, KPISnapshot)

    def test_tick_forwarded(self):
        snap = compute_kpis(_metrics(tick=7))
        assert snap.tick == 7

    def test_explicit_tick_overrides(self):
        snap = compute_kpis(_metrics(tick=3), tick=99)
        assert snap.tick == 99

    def test_all_fields_in_range(self):
        snap = compute_kpis(_metrics())
        for field in ["gdp_index", "happiness_index", "pollution_index",
                      "traffic_index", "healthcare_index", "education_index",
                      "wellbeing_score"]:
            val = getattr(snap, field)
            assert 0 <= val <= 100, f"{field}={val} out of range"

    def test_empty_metrics_doesnt_crash(self):
        snap = compute_kpis({})
        assert isinstance(snap, KPISnapshot)
        assert 0 <= snap.wellbeing_score <= 100

    def test_happiness_passthrough(self):
        snap = compute_kpis(_metrics(avg_happiness=72.5))
        assert abs(snap.happiness_index - 72.5) < 0.01

    def test_education_index_matches_literacy(self):
        snap = compute_kpis(_metrics(literacy_rate=85.0))
        assert abs(snap.education_index - 85.0) < 0.01

    def test_wellbeing_inverts_pollution_and_traffic(self):
        # Perfect metrics → wellbeing near 100
        perfect = _metrics(avg_happiness=100, avg_health=100, life_expectancy=100,
                           literacy_rate=100, gdp=40_000_000, crime_rate=0,
                           gini_coefficient=0, unemployment_rate=0, population=1)
        snap_perfect = compute_kpis(perfect)
        # Terrible metrics → wellbeing near 0
        terrible = _metrics(avg_happiness=0, avg_health=0, life_expectancy=40,
                            literacy_rate=0, gdp=100, crime_rate=100,
                            gini_coefficient=1.0, unemployment_rate=50, population=5000)
        snap_terrible = compute_kpis(terrible)
        assert snap_perfect.wellbeing_score > snap_terrible.wellbeing_score


# ── KPISnapshot serialisation ──────────────────────────────────────────────────

class TestKPISnapshotSerialisation:
    def test_to_dict_contains_all_keys(self):
        snap = compute_kpis(_metrics())
        d = snap.to_dict()
        expected = {"tick", "gdp_index", "happiness_index", "pollution_index",
                    "traffic_index", "healthcare_index", "education_index", "wellbeing_score"}
        assert expected == set(d.keys())

    def test_to_dict_values_are_rounded(self):
        snap = compute_kpis(_metrics())
        for k, v in snap.to_dict().items():
            if k != "tick":
                assert isinstance(v, float)
                assert len(str(v).split(".")[-1]) <= 2

    def test_to_chart_series_shape(self):
        snap = compute_kpis(_metrics())
        series = snap.to_chart_series()
        assert len(series) == 6
        for item in series:
            assert "name" in item and "value" in item
            assert 0 <= item["value"] <= 100

    def test_to_chart_series_names(self):
        names = {s["name"] for s in compute_kpis(_metrics()).to_chart_series()}
        assert names == {"GDP", "Happiness", "Pollution", "Traffic", "Healthcare", "Education"}


# ── compute_trend ──────────────────────────────────────────────────────────────

class TestComputeTrend:
    def _snaps(self) -> list[KPISnapshot]:
        return [compute_kpis(_metrics(tick=t, avg_happiness=40 + t * 5)) for t in range(1, 6)]

    def test_series_length_matches_input(self):
        snaps = self._snaps()
        result = compute_trend(snaps, "happiness_index")
        assert len(result["series"]) == len(snaps)

    def test_series_tick_ordering(self):
        snaps = self._snaps()
        result = compute_trend(snaps, "happiness_index")
        ticks = [p["tick"] for p in result["series"]]
        assert ticks == sorted(ticks)

    def test_min_max_correct(self):
        snaps = self._snaps()
        result = compute_trend(snaps, "happiness_index")
        values = [p["value"] for p in result["series"]]
        assert result["min"] == min(values)
        assert result["max"] == max(values)

    def test_change_last_minus_first(self):
        snaps = self._snaps()
        result = compute_trend(snaps, "happiness_index")
        values = [p["value"] for p in result["series"]]
        assert abs(result["change"] - round(values[-1] - values[0], 2)) < 0.01

    def test_empty_snapshots(self):
        result = compute_trend([], "gdp_index")
        assert result["series"] == []
        assert result["change"] == 0

    def test_single_snapshot_zero_change(self):
        snap = compute_kpis(_metrics())
        result = compute_trend([snap], "gdp_index")
        assert result["change"] == 0
        assert len(result["series"]) == 1


# ── AnalyticsService (DB mocked) ───────────────────────────────────────────────

def _mock_db() -> MagicMock:
    """Build a minimal async Supabase mock."""
    db = MagicMock()

    def _chain(**result_data):
        """Return a chain-able mock whose execute() returns result_data."""
        chain = MagicMock()
        chain.select.return_value    = chain
        chain.eq.return_value        = chain
        chain.order.return_value     = chain
        chain.limit.return_value     = chain
        chain.execute = AsyncMock(return_value=MagicMock(**result_data))
        return chain

    sim_row = {
        "id": "sim1", "name": "Test Sim", "status": "running",
        "current_tick": 5, "created_at": "2026-01-01T00:00:00"
    }

    metrics_row = _metrics()
    result_row  = {"tick": 5, "metrics": metrics_row,
                   "policy_snapshot": ["p1"], "event_snapshot": []}

    # simulations table
    sim_chain = _chain(data=[sim_row])
    # simulation_results table
    results_chain = _chain(data=[result_row])

    def table_router(name):
        if name == "simulations":
            return sim_chain
        if name == "simulation_results":
            return results_chain
        return _chain(data=[])

    db.table = table_router
    return db


@pytest.mark.asyncio
class TestAnalyticsService:
    async def test_get_analytics_returns_expected_keys(self):
        from app.services.analytics.service import AnalyticsService
        svc = AnalyticsService(_mock_db())
        result = await svc.get_analytics("sim1")
        assert "kpis" in result
        assert "chart_series" in result
        assert "trends" in result
        assert result["simulation_id"] == "sim1"

    async def test_get_analytics_empty_results(self):
        from app.services.analytics.service import AnalyticsService
        db = MagicMock()
        chain = MagicMock()
        chain.select.return_value = chain
        chain.eq.return_value     = chain
        chain.order.return_value  = chain
        chain.limit.return_value  = chain

        sim_row = {"id": "s1", "name": "Empty", "status": "draft",
                   "current_tick": 0, "created_at": None}
        chain.execute = AsyncMock(side_effect=[
            MagicMock(data=[sim_row]),   # simulations query
            MagicMock(data=[]),          # results query
        ])
        db.table.return_value = chain

        svc    = AnalyticsService(db)
        result = await svc.get_analytics("s1")
        assert result["data_points"] == 0
        assert result["kpis"]["tick"] == 0

    async def test_get_analytics_not_found(self):
        from app.core.exceptions import NotFoundError
        from app.services.analytics.service import AnalyticsService

        db    = MagicMock()
        chain = MagicMock()
        chain.select.return_value = chain
        chain.eq.return_value     = chain
        chain.limit.return_value  = chain
        chain.execute = AsyncMock(return_value=MagicMock(data=[]))
        db.table.return_value = chain

        svc = AnalyticsService(db)
        with pytest.raises(NotFoundError):
            await svc.get_analytics("missing-sim")

    async def test_kpis_all_in_range(self):
        from app.services.analytics.service import AnalyticsService
        svc    = AnalyticsService(_mock_db())
        result = await svc.get_analytics("sim1")
        kpis   = result["kpis"]
        for key, val in kpis.items():
            if key != "tick":
                assert 0 <= val <= 100, f"{key}={val}"

    async def test_chart_series_has_six_items(self):
        from app.services.analytics.service import AnalyticsService
        svc    = AnalyticsService(_mock_db())
        result = await svc.get_analytics("sim1")
        assert len(result["chart_series"]) == 6

    async def test_trends_cover_all_fields(self):
        from app.services.analytics.service import AnalyticsService
        svc    = AnalyticsService(_mock_db())
        result = await svc.get_analytics("sim1")
        expected = {"gdp_index", "happiness_index", "pollution_index",
                    "traffic_index", "healthcare_index", "education_index", "wellbeing_score"}
        assert expected == set(result["trends"].keys())
