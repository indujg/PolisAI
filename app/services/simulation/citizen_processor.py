"""
CitizenProcessor — parallel tick processing for large citizen populations.

Design for 100k citizens:
  100k / 500 per page = 200 pages.
  Sequential: 200 × 80ms ≈ 16s per tick.
  Concurrent (20 workers): 10 rounds × 80ms ≈ 800ms per tick.

Each worker independently:
  1. Reads one page of citizens from DB
  2. Computes behavioral deltas (CPU-bound, fast)
  3. Batch-upserts the page back to DB (single PostgREST call)
  4. Contributes its page's stats to a shared StreamingStats accumulator

After all pages are done, StreamingStats produces the tick metrics dict
without ever holding all 100k CitizenState objects in memory simultaneously.

Aggregate metrics produced:
  avg_happiness, avg_health, avg_income, avg_stress,
  gdp, unemployment_rate, gini_coefficient, literacy_rate,
  life_expectancy, crime_rate, approval_rating, population, tick
"""

from __future__ import annotations

import asyncio
import math
from dataclasses import dataclass, field
from typing import Any

from supabase._async.client import AsyncClient

from app.core.logging import get_logger
from app.repositories.citizen import CitizenRepository
from app.services.simulation.citizen_behavior import (
    CitizenBehaviorEngine, CitizenDelta, CitizenState,
    EventContext, PolicyContext,
)

logger = get_logger(__name__)

# Education levels that count as literate
_LITERATE = {"secondary", "tertiary", "postgraduate"}

# Default concurrency if config unavailable
_DEFAULT_CONCURRENCY = 20
_DEFAULT_PAGE_SIZE   = 500


# ── Streaming statistics accumulator ──────────────────────────────────────────

@dataclass
class StreamingStats:
    """
    Accumulates per-page statistics without storing all citizens in memory.
    Uses simple sum-based incremental computation for O(1) merge.
    Incomes are stored (as floats only) for Gini — 100k floats ≈ 800KB.
    """
    count:          int   = 0
    sum_happiness:  float = 0.0
    sum_health:     float = 0.0
    sum_income:     float = 0.0
    sum_stress:     float = 0.0
    literate_count: int   = 0
    incomes:        list[float] = field(default_factory=list)

    def add_citizen(self, c: CitizenState) -> None:
        self.count          += 1
        self.sum_happiness  += c.happiness_score
        self.sum_health     += c.health_score
        self.sum_income     += c.income
        self.sum_stress     += c.stress_score
        self.incomes.append(c.income)
        if c.education_level in _LITERATE:
            self.literate_count += 1

    def merge(self, other: "StreamingStats") -> None:
        self.count          += other.count
        self.sum_happiness  += other.sum_happiness
        self.sum_health     += other.sum_health
        self.sum_income     += other.sum_income
        self.sum_stress     += other.sum_stress
        self.literate_count += other.literate_count
        self.incomes.extend(other.incomes)

    def finalize(
        self,
        tick: int,
        gov_approval: float,
        unemployment_rate: float,
    ) -> dict[str, Any]:
        n = self.count
        if n == 0:
            return _empty_metrics(tick, gov_approval, unemployment_rate)

        avg_happiness = self.sum_happiness / n
        avg_health    = self.sum_health    / n
        avg_income    = self.sum_income    / n
        avg_stress    = self.sum_stress    / n
        literacy_rate = self.literate_count / n * 100

        sorted_incomes = sorted(self.incomes)
        gini           = _gini(sorted_incomes)

        crime_rate = _clamp(
            (100 - avg_happiness) * 0.05
            + avg_stress * 0.02
            + max(0, 30_000 - avg_income) / 30_000 * 5,
            0, 100,
        )
        life_expectancy = _clamp(
            70 + (avg_health - 50) * 0.3 - (100 - literacy_rate) * 0.05,
            40, 100,
        )

        return {
            "avg_happiness":     round(avg_happiness, 2),
            "avg_health":        round(avg_health, 2),
            "avg_income":        round(avg_income, 2),
            "gdp":               round(avg_income * n * 52, 2),
            "unemployment_rate": round(unemployment_rate, 2),
            "gini_coefficient":  round(gini, 4),
            "crime_rate":        round(crime_rate, 2),
            "literacy_rate":     round(literacy_rate, 2),
            "life_expectancy":   round(life_expectancy, 2),
            "approval_rating":   round(gov_approval, 2),
            "population":        n,
            "tick":              tick,
        }


# ── Per-page result ────────────────────────────────────────────────────────────

@dataclass
class PageResult:
    stats:         StreamingStats
    deltas_sample: list[CitizenDelta]   # first 5 per page → max 1000 for WS broadcast
    error:         Exception | None = None


# ── CitizenProcessor ───────────────────────────────────────────────────────────

class CitizenProcessor:
    """
    Processes all citizens for one tick in parallel pages.

    Usage:
        processor = CitizenProcessor(db)
        result = await processor.process_tick(sim_id, tick, policies, events, ...)
        metrics   = result["metrics"]
        deltas    = result["deltas_sample"]
    """

    def __init__(
        self,
        db: AsyncClient,
        concurrency: int | None = None,
        page_size: int | None   = None,
    ) -> None:
        self._repo       = CitizenRepository(db)
        self._behavior   = CitizenBehaviorEngine()

        cfg_concurrency  = concurrency
        cfg_page_size    = page_size
        if cfg_concurrency is None or cfg_page_size is None:
            try:
                from app.config import get_settings
                s = get_settings()
                cfg_concurrency = cfg_concurrency or s.CITIZEN_CONCURRENCY
                cfg_page_size   = cfg_page_size   or s.CITIZEN_PAGE_SIZE
            except Exception:
                cfg_concurrency = _DEFAULT_CONCURRENCY
                cfg_page_size   = _DEFAULT_PAGE_SIZE

        self._page_size  = cfg_page_size
        self._semaphore  = asyncio.Semaphore(cfg_concurrency)

    async def process_tick(
        self,
        sim_id:          str,
        tick:            int,
        policies:        list[PolicyContext],
        events:          list[EventContext],
        gov_approval:    float,
        unemployment_rate: float,
    ) -> dict[str, Any]:
        """
        Returns {"metrics": dict, "deltas_sample": list[CitizenDelta], "population": int}.
        """
        total   = await self._repo.count(sim_id)
        n_pages = max(1, math.ceil(total / self._page_size))

        logger.info("tick_processing_start",
                    sim_id=sim_id, tick=tick, population=total, pages=n_pages)

        # Fan out all pages concurrently
        tasks = [
            self._process_page(
                sim_id, page_idx * self._page_size,
                tick, policies, events, gov_approval, unemployment_rate,
            )
            for page_idx in range(n_pages)
        ]
        page_results: list[PageResult] = await asyncio.gather(*tasks)

        # Merge stats from all pages
        merged   = StreamingStats()
        all_deltas_sample: list[CitizenDelta] = []
        errors   = 0

        for pr in page_results:
            if pr.error:
                errors += 1
                logger.warning("page_error", sim_id=sim_id, error=str(pr.error))
                continue
            merged.merge(pr.stats)
            all_deltas_sample.extend(pr.deltas_sample)

        if errors:
            logger.warning("tick_partial_errors", sim_id=sim_id, errors=errors,
                           pages=n_pages)

        metrics = merged.finalize(tick, gov_approval, unemployment_rate)
        logger.info("tick_processing_done", sim_id=sim_id, tick=tick,
                    population=metrics["population"])

        return {
            "metrics":       metrics,
            "deltas_sample": all_deltas_sample[:200],  # cap WS payload
            "population":    metrics["population"],
            "page_errors":   errors,
        }

    async def _process_page(
        self,
        sim_id:  str,
        offset:  int,
        tick:    int,
        policies: list[PolicyContext],
        events:   list[EventContext],
        gov_approval: float,
        unemployment_rate: float,
    ) -> PageResult:
        async with self._semaphore:
            try:
                # 1. Read page
                raw_rows = await self._repo.get_page(sim_id, offset=offset,
                                                     page_size=self._page_size)
                if not raw_rows:
                    return PageResult(stats=StreamingStats(), deltas_sample=[])

                citizens = [_row_to_citizen(r) for r in raw_rows]

                # 2. Compute deltas (pure CPU)
                deltas = self._behavior.process_batch(
                    citizens, tick, policies, events, gov_approval, unemployment_rate
                )

                # 3. Write page back (batch upsert — single DB call)
                update_rows = _deltas_to_upsert_rows(deltas, citizens)
                if update_rows:
                    await self._repo.batch_upsert(update_rows)

                # 4. Accumulate streaming stats
                stats = StreamingStats()
                for c in citizens:
                    stats.add_citizen(c)

                return PageResult(stats=stats, deltas_sample=deltas[:5])

            except Exception as exc:
                return PageResult(
                    stats=StreamingStats(),
                    deltas_sample=[],
                    error=exc,
                )


# ── Helpers ────────────────────────────────────────────────────────────────────

def _row_to_citizen(row: dict) -> CitizenState:
    from app.services.simulation.state_manager import _row_to_citizen as _r
    return _r(row)


def _deltas_to_upsert_rows(
    deltas: list[CitizenDelta],
    citizens: list[CitizenState],
) -> list[dict]:
    citizen_map = {c.id: c for c in citizens}
    levels = ["none", "primary", "secondary", "tertiary", "postgraduate"]
    rows = []
    for d in deltas:
        c = citizen_map.get(d.citizen_id)
        if not c:
            continue
        new_edu = c.education_level
        if d.education_upgrade:
            idx = levels.index(c.education_level) if c.education_level in levels else 2
            if idx < 4:
                new_edu = levels[idx + 1]
        row: dict = {
            "id":              c.id,
            "happiness_score": round(max(0.0, min(100.0, c.happiness_score + d.happiness_delta)), 2),
            "health_score":    round(max(0.0, min(100.0, c.health_score    + d.health_delta)),    2),
            "stress_score":    round(max(0.0, min(100.0, c.stress_score    + d.stress_delta)),    2),
            "income":          round(max(0.0, c.income + d.income_delta),  2),
            "wealth":          round(max(0.0, c.wealth + d.wealth_delta),  2),
            "education_level": new_edu,
        }
        if d.alignment_shift:
            row["political_alignment"] = d.alignment_shift
        rows.append(row)
    return rows


def _gini(sorted_incomes: list[float]) -> float:
    if not sorted_incomes or sum(sorted_incomes) == 0:
        return 0.0
    n     = len(sorted_incomes)
    numer = sum(2 * (i + 1) * y for i, y in enumerate(sorted_incomes))
    denom = n * sum(sorted_incomes)
    return (numer / denom) - (n + 1) / n


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _empty_metrics(tick: int, gov_approval: float, unemployment_rate: float) -> dict:
    return {
        "avg_happiness": 50.0, "avg_health": 50.0, "avg_income": 0.0,
        "gdp": 0.0, "unemployment_rate": unemployment_rate,
        "gini_coefficient": 0.0, "crime_rate": 0.0, "literacy_rate": 0.0,
        "life_expectancy": 70.0, "approval_rating": gov_approval,
        "population": 0, "tick": tick,
    }
