"""
100k-scale architecture tests.

Covers:
  - StreamingStats: incremental accumulation, merge, finalize
  - CitizenProcessor: concurrent page processing, error isolation, sample cap
  - _deltas_to_upsert_rows: field updates, clamping, education upgrade
  - _gini: edge cases + correctness
  - PopulationSeeder._generate_citizen: field validity, distributions, overrides
"""

from __future__ import annotations

import asyncio
import statistics
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.simulation.citizen_behavior import (
    CitizenDelta,
    CitizenState,
    EventContext,
    PolicyContext,
)
from app.services.simulation.citizen_processor import (
    CitizenProcessor,
    PageResult,
    StreamingStats,
    _deltas_to_upsert_rows,
    _gini,
)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _citizen(i: int, income: float = 50_000.0, edu: str = "secondary") -> CitizenState:
    return CitizenState(
        id=f"c{i}", age=30 + (i % 40),
        income=income, wealth=income * 2,
        happiness_score=60.0, health_score=70.0, stress_score=35.0,
        education_level=edu, political_alignment="center",
        voting_likelihood=60.0, occupation="engineer",
        personality_traits={"openness": 0.5, "neuroticism": 0.3},
        demographics={}, is_alive=True,
    )


def _db_rows(n: int, income_base: float = 50_000.0) -> list[dict]:
    return [
        {
            "id": f"c{i}", "age": 30 + (i % 40),
            "income": income_base + i * 100,
            "wealth": (income_base + i * 100) * 2,
            "happiness_score": 60.0, "health_score": 70.0, "stress_score": 35.0,
            "education_level": "secondary", "political_alignment": "center",
            "voting_likelihood": 60.0, "occupation": "engineer",
            "personality_traits": {}, "demographics": {}, "is_alive": True,
        }
        for i in range(n)
    ]


def _make_processor(repo: MagicMock, concurrency: int = 4,
                    page_size: int = 10) -> CitizenProcessor:
    proc = CitizenProcessor.__new__(CitizenProcessor)
    proc._repo      = repo
    proc._behavior  = MagicMock()
    proc._behavior.process_batch = MagicMock(return_value=[])
    proc._page_size = page_size
    proc._semaphore = asyncio.Semaphore(concurrency)
    return proc


# ── StreamingStats ─────────────────────────────────────────────────────────────

class TestStreamingStats:
    def test_empty_finalize_returns_defaults(self):
        m = StreamingStats().finalize(tick=1, gov_approval=50, unemployment_rate=5)
        assert m["population"] == 0
        assert m["tick"] == 1
        assert m["avg_happiness"] == 50.0

    def test_add_single_citizen_increments_counts(self):
        s = StreamingStats()
        s.add_citizen(_citizen(0, income=100_000))
        assert s.count == 1
        assert s.sum_happiness == pytest.approx(60.0)
        assert s.sum_income == pytest.approx(100_000.0)

    def test_literate_levels_counted_correctly(self):
        s = StreamingStats()
        for edu, expected_lit in [
            ("secondary", 1), ("tertiary", 1), ("postgraduate", 1),
            ("primary", 0), ("none", 0),
        ]:
            before = s.literate_count
            s.add_citizen(_citizen(0, edu=edu))
            assert s.literate_count - before == expected_lit

    def test_merge_combines_sums_and_incomes(self):
        a, b = StreamingStats(), StreamingStats()
        for i in range(5):
            a.add_citizen(_citizen(i))
        for i in range(5, 10):
            b.add_citizen(_citizen(i))
        a.merge(b)
        assert a.count == 10
        assert len(a.incomes) == 10
        assert a.sum_happiness == pytest.approx(60.0 * 10)

    def test_finalize_mean_income(self):
        s = StreamingStats()
        for i, inc in enumerate([10_000, 20_000, 30_000, 40_000, 50_000]):
            s.add_citizen(_citizen(i, income=float(inc)))
        m = s.finalize(tick=3, gov_approval=55, unemployment_rate=6)
        assert m["avg_income"] == pytest.approx(30_000, abs=1)

    def test_finalize_gdp(self):
        s = StreamingStats()
        s.add_citizen(_citizen(0, income=52_000.0))
        m = s.finalize(tick=1, gov_approval=50, unemployment_rate=5)
        assert m["gdp"] == pytest.approx(52_000 * 1 * 52, rel=0.01)

    def test_finalize_literacy_rate(self):
        s = StreamingStats()
        for edu, count in [("tertiary", 3), ("none", 2)]:
            for i in range(count):
                s.add_citizen(_citizen(i, edu=edu))
        m = s.finalize(tick=1, gov_approval=50, unemployment_rate=5)
        assert m["literacy_rate"] == pytest.approx(60.0, abs=0.1)

    def test_finalize_metrics_in_valid_range(self):
        s = StreamingStats()
        for i in range(20):
            s.add_citizen(_citizen(i, income=float(40_000 + i * 5000)))
        m = s.finalize(tick=5, gov_approval=55, unemployment_rate=5)
        assert 0 <= m["avg_happiness"] <= 100
        assert 0 <= m["avg_health"]    <= 100
        assert 0 <= m["gini_coefficient"] <= 1
        assert 0 <= m["crime_rate"] <= 100
        assert 40 <= m["life_expectancy"] <= 100

    def test_finalize_tick_propagated(self):
        s = StreamingStats()
        s.add_citizen(_citizen(0))
        assert s.finalize(tick=7, gov_approval=50, unemployment_rate=5)["tick"] == 7


# ── Gini coefficient ───────────────────────────────────────────────────────────

class TestGini:
    def test_empty_is_zero(self):
        assert _gini([]) == 0.0

    def test_all_zeros_is_zero(self):
        assert _gini([0.0, 0.0, 0.0]) == 0.0

    def test_perfect_equality(self):
        assert _gini(sorted([50_000.0] * 100)) < 0.05

    def test_one_earner_near_one(self):
        assert _gini(sorted([0.0] * 99 + [1_000_000.0])) > 0.95

    def test_moderate_inequality_in_range(self):
        incomes = sorted(float(10_000 * (i + 1)) for i in range(100))
        g = _gini(incomes)
        assert 0.3 < g < 0.7


# ── CitizenProcessor ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestCitizenProcessor:
    async def test_single_page_returns_population(self):
        rows = _db_rows(10)
        repo = MagicMock()
        repo.count        = AsyncMock(return_value=10)
        repo.get_page     = AsyncMock(return_value=rows)
        repo.batch_upsert = AsyncMock()
        proc = _make_processor(repo, concurrency=4, page_size=10)

        result = await proc.process_tick(
            "sim1", tick=1, policies=[], events=[],
            gov_approval=55.0, unemployment_rate=5.0,
        )
        assert result["population"] == 10
        assert "metrics" in result
        assert result["metrics"]["tick"] == 1

    async def test_multi_page_sums_population(self):
        n_per_page, n_pages = 5, 4
        rows = _db_rows(n_per_page)
        repo = MagicMock()
        repo.count        = AsyncMock(return_value=n_per_page * n_pages)
        repo.get_page     = AsyncMock(return_value=rows)
        repo.batch_upsert = AsyncMock()
        proc = _make_processor(repo, concurrency=4, page_size=n_per_page)

        result = await proc.process_tick(
            "sim1", tick=2, policies=[], events=[],
            gov_approval=50.0, unemployment_rate=5.0,
        )
        assert result["population"] == n_per_page * n_pages

    async def test_page_error_isolated_errors_counted(self):
        rows = _db_rows(5)
        call_count = [0]

        async def _get_page(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 2:
                raise RuntimeError("DB timeout")
            return rows

        repo = MagicMock()
        repo.count        = AsyncMock(return_value=10)
        repo.get_page     = _get_page
        repo.batch_upsert = AsyncMock()
        proc = _make_processor(repo, concurrency=2, page_size=5)

        result = await proc.process_tick(
            "sim1", tick=1, policies=[], events=[],
            gov_approval=50.0, unemployment_rate=5.0,
        )
        assert result["page_errors"] >= 1
        assert "metrics" in result

    async def test_deltas_sample_capped_at_200(self):
        n_per_page, n_pages = 50, 10
        rows = _db_rows(n_per_page)
        repo = MagicMock()
        repo.count        = AsyncMock(return_value=n_per_page * n_pages)
        repo.get_page     = AsyncMock(return_value=rows)
        repo.batch_upsert = AsyncMock()
        proc = _make_processor(repo, concurrency=10, page_size=n_per_page)
        proc._behavior.process_batch = MagicMock(
            return_value=[CitizenDelta(citizen_id=f"c{i}") for i in range(50)]
        )

        result = await proc.process_tick(
            "sim1", tick=1, policies=[], events=[],
            gov_approval=50.0, unemployment_rate=5.0,
        )
        assert len(result["deltas_sample"]) <= 200

    async def test_empty_population(self):
        repo = MagicMock()
        repo.count        = AsyncMock(return_value=0)
        repo.get_page     = AsyncMock(return_value=[])
        repo.batch_upsert = AsyncMock()
        proc = _make_processor(repo, concurrency=4, page_size=10)

        result = await proc.process_tick(
            "sim1", tick=1, policies=[], events=[],
            gov_approval=50.0, unemployment_rate=5.0,
        )
        assert result["population"] == 0
        assert result["page_errors"] == 0

    async def test_semaphore_respected(self):
        max_concurrent = [0]
        current        = [0]
        rows           = _db_rows(5)
        n_pages        = 20

        async def _get_page(*args, **kwargs):
            current[0] += 1
            max_concurrent[0] = max(max_concurrent[0], current[0])
            await asyncio.sleep(0.01)
            current[0] -= 1
            return rows

        repo = MagicMock()
        repo.count        = AsyncMock(return_value=5 * n_pages)
        repo.get_page     = _get_page
        repo.batch_upsert = AsyncMock()

        CONCURRENCY = 5
        proc = _make_processor(repo, concurrency=CONCURRENCY, page_size=5)
        await proc.process_tick(
            "sim1", tick=1, policies=[], events=[],
            gov_approval=50.0, unemployment_rate=5.0,
        )
        assert max_concurrent[0] <= CONCURRENCY + 1


# ── _deltas_to_upsert_rows ────────────────────────────────────────────────────

class TestDeltasToUpsertRows:
    def test_basic_happiness_and_income_delta(self):
        c = _citizen(0, income=50_000)
        d = CitizenDelta(citizen_id="c0", happiness_delta=2.0, income_delta=500)
        rows = _deltas_to_upsert_rows([d], [c])
        assert len(rows) == 1
        assert rows[0]["id"] == "c0"
        assert rows[0]["happiness_score"] == pytest.approx(62.0, abs=0.1)
        assert rows[0]["income"] == pytest.approx(50_500, abs=1)

    def test_happiness_clamped_at_100(self):
        c = _citizen(0)
        c.happiness_score = 99.0
        rows = _deltas_to_upsert_rows([CitizenDelta(citizen_id="c0", happiness_delta=10.0)], [c])
        assert rows[0]["happiness_score"] == 100.0

    def test_happiness_clamped_at_0(self):
        c = _citizen(0)
        c.happiness_score = 1.0
        rows = _deltas_to_upsert_rows([CitizenDelta(citizen_id="c0", happiness_delta=-10.0)], [c])
        assert rows[0]["happiness_score"] == 0.0

    def test_income_floor_at_zero(self):
        c = _citizen(0, income=100.0)
        rows = _deltas_to_upsert_rows([CitizenDelta(citizen_id="c0", income_delta=-500.0)], [c])
        assert rows[0]["income"] == 0.0

    def test_education_upgrade_secondary_to_tertiary(self):
        c = _citizen(0, edu="secondary")
        rows = _deltas_to_upsert_rows([CitizenDelta(citizen_id="c0", education_upgrade=True)], [c])
        assert rows[0]["education_level"] == "tertiary"

    def test_education_upgrade_caps_at_postgraduate(self):
        c = _citizen(0, edu="postgraduate")
        rows = _deltas_to_upsert_rows([CitizenDelta(citizen_id="c0", education_upgrade=True)], [c])
        assert rows[0]["education_level"] == "postgraduate"

    def test_unknown_citizen_skipped(self):
        c = _citizen(0)
        rows = _deltas_to_upsert_rows([CitizenDelta(citizen_id="UNKNOWN", happiness_delta=5.0)], [c])
        assert len(rows) == 0

    def test_alignment_shift_included_in_row(self):
        c = _citizen(0)
        rows = _deltas_to_upsert_rows([CitizenDelta(citizen_id="c0", alignment_shift="left")], [c])
        assert rows[0]["political_alignment"] == "left"

    def test_no_alignment_shift_not_in_row(self):
        c = _citizen(0)
        rows = _deltas_to_upsert_rows([CitizenDelta(citizen_id="c0")], [c])
        assert "political_alignment" not in rows[0]

    def test_multiple_citizens_all_included(self):
        citizens = [_citizen(i) for i in range(5)]
        deltas   = [CitizenDelta(citizen_id=f"c{i}", happiness_delta=1.0) for i in range(5)]
        rows = _deltas_to_upsert_rows(deltas, citizens)
        assert len(rows) == 5


# ── PopulationSeeder._generate_citizen ───────────────────────────────────────

class TestGenerateCitizen:
    def _rng(self, seed: str = "test-sim"):
        from app.services.simulation.population_seeder import _make_rng
        return _make_rng(seed)

    def test_deterministic_across_identical_rngs(self):
        from app.services.simulation.population_seeder import _generate_citizen
        rng1 = self._rng("sim-abc")
        rng2 = self._rng("sim-abc")
        ages1 = [_generate_citizen("s", rng1)["age"] for _ in range(20)]
        ages2 = [_generate_citizen("s", rng2)["age"] for _ in range(20)]
        assert ages1 == ages2

    def test_required_fields_present(self):
        from app.services.simulation.population_seeder import _generate_citizen
        c = _generate_citizen("sim1", self._rng())
        required = {
            "id", "simulation_id", "age", "income", "wealth",
            "happiness_score", "health_score", "stress_score",
            "education_level", "occupation", "political_alignment",
            "voting_likelihood", "personality_traits", "demographics", "is_alive",
        }
        assert required.issubset(set(c.keys()))
        assert c["simulation_id"] == "sim1"
        assert c["is_alive"] is True

    def test_all_field_ranges_valid(self):
        from app.services.simulation.population_seeder import _generate_citizen
        rng = self._rng()
        for _ in range(100):
            c = _generate_citizen("sim1", rng)
            assert 18 <= c["age"] <= 100
            assert c["income"] >= 30_000
            assert c["wealth"] >= 0
            assert 0 <= c["happiness_score"] <= 100
            assert 0 <= c["health_score"]    <= 100
            assert 0 <= c["stress_score"]    <= 100
            assert c["education_level"] in [
                "none", "primary", "secondary", "tertiary", "postgraduate"
            ]
            assert 0 <= c["voting_likelihood"] <= 100
            for v in c["personality_traits"].values():
                assert 0 <= v <= 1

    def test_income_multiplier_raises_income(self):
        from app.services.simulation.population_seeder import _generate_citizen
        rng1 = self._rng("s1")
        rng2 = self._rng("s1")
        default = [_generate_citizen("s", rng1)["income"] for _ in range(50)]
        rich    = [_generate_citizen("s", rng2, {"income_multiplier": 2.0})["income"]
                   for _ in range(50)]
        assert statistics.mean(rich) > statistics.mean(default) * 1.5

    def test_happiness_baseline_shifts_mean(self):
        from app.services.simulation.population_seeder import _generate_citizen
        rng = self._rng()
        scores = [_generate_citizen("s", rng, {"happiness_baseline": 90.0})["happiness_score"]
                  for _ in range(100)]
        assert statistics.mean(scores) > 70.0

    def test_mean_age_low_vs_high(self):
        from app.services.simulation.population_seeder import _generate_citizen
        rng1, rng2 = self._rng("a"), self._rng("b")
        young = [_generate_citizen("s", rng1, {"mean_age": 22.0})["age"] for _ in range(100)]
        old   = [_generate_citizen("s", rng2, {"mean_age": 70.0})["age"] for _ in range(100)]
        assert statistics.mean(young) < statistics.mean(old)

    def test_high_education_rate_increases_tertiary_plus(self):
        from app.services.simulation.population_seeder import _generate_citizen
        rng = self._rng()
        citizens = [_generate_citizen("s", rng, {"high_education_rate": 0.80})
                    for _ in range(200)]
        high_edu = sum(1 for c in citizens
                       if c["education_level"] in ("tertiary", "postgraduate"))
        assert high_edu / len(citizens) > 0.60

    def test_no_citizens_under_18(self):
        from app.services.simulation.population_seeder import _generate_citizen
        rng = self._rng()
        ages = [_generate_citizen("sim", rng)["age"] for _ in range(500)]
        assert min(ages) >= 18

    def test_realistic_mean_age_range(self):
        from app.services.simulation.population_seeder import _generate_citizen
        rng = self._rng()
        ages = [_generate_citizen("sim", rng)["age"] for _ in range(500)]
        assert 30 <= statistics.mean(ages) <= 55

    def test_occupation_variety(self):
        from app.services.simulation.population_seeder import _generate_citizen
        rng = self._rng()
        occs = {_generate_citizen("sim", rng)["occupation"] for _ in range(500)}
        assert len(occs) >= 5

    def test_center_alignment_is_plurality(self):
        from app.services.simulation.population_seeder import _generate_citizen
        rng = self._rng()
        citizens = [_generate_citizen("sim", rng) for _ in range(500)]
        center = sum(1 for c in citizens if "center" in c["political_alignment"])
        assert center / len(citizens) > 0.3
