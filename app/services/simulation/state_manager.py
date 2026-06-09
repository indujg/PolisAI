"""
StateManager — all Supabase reads and writes for the simulation engine.
Keeps the engine and behavior layers free of DB concerns.

Backed by repositories for clean separation of data access.
Citizen deltas are applied via batch upsert — O(pages) not O(citizens).
"""

from datetime import datetime, timezone

from supabase._async.client import AsyncClient

from app.core.logging import get_logger
from app.repositories.citizen import CitizenRepository, CITIZEN_PAGE_SIZE
from app.repositories.simulation import (
    EventRepository, GovernmentRepository, SimulationRepository,
)
from app.services.simulation.citizen_behavior import (
    CitizenDelta, CitizenState, EventContext, PolicyContext,
)

logger = get_logger(__name__)

CITIZEN_BATCH = CITIZEN_PAGE_SIZE  # kept for external compatibility


class StateManager:
    """
    Thin orchestration layer over repositories.
    Engine and behavior classes call this; they never touch raw DB.
    """

    def __init__(self, db: AsyncClient) -> None:
        self._db       = db
        self._sim_repo = SimulationRepository(db)
        self._gov_repo = GovernmentRepository(db)
        self._evt_repo = EventRepository(db)
        self._cit_repo = CitizenRepository(db)

    # ── Reads ──────────────────────────────────────────────────────────────────

    async def get_simulation(self, sim_id: str) -> dict | None:
        return await self._sim_repo.get(sim_id)

    async def get_government(self, sim_id: str) -> dict | None:
        return await self._gov_repo.get_by_sim(sim_id)

    async def load_citizens_page(
        self, sim_id: str, offset: int = 0
    ) -> list[CitizenState]:
        rows = await self._cit_repo.get_page(sim_id, offset=offset,
                                              page_size=CITIZEN_BATCH)
        return [_row_to_citizen(row) for row in rows]

    async def load_all_citizens(self, sim_id: str) -> list[CitizenState]:
        all_citizens: list[CitizenState] = []
        offset = 0
        while True:
            page = await self.load_citizens_page(sim_id, offset)
            all_citizens.extend(page)
            if len(page) < CITIZEN_BATCH:
                break
            offset += CITIZEN_BATCH
        return all_citizens

    async def load_active_policies(self, sim_id: str) -> list[PolicyContext]:
        rows = await self._db.table("policies").select(
            "id, category, status, budget_impact, popularity_score"
        ).eq("simulation_id", sim_id).eq("status", "active").execute()
        return [
            PolicyContext(
                id=row["id"], category=row["category"], status=row["status"],
                budget_impact=row["budget_impact"] or 0,
                popularity_score=row["popularity_score"] or 50,
            )
            for row in (rows.data or [])
        ]

    async def load_active_events(self, sim_id: str, tick: int) -> list[EventContext]:
        rows = await self._evt_repo.get_active(sim_id, tick)
        return [
            EventContext(
                id=row["id"], type=row.get("event_type", row.get("type", "generic")),
                severity=row["severity"],
                impact=row.get("impact") or {
                    "economic": row.get("economic_impact", 0),
                    "health":   row.get("health_impact", 0),
                    "stability":row.get("stability_impact", 0),
                },
                tick=row["tick"], duration_ticks=row["duration_ticks"],
            )
            for row in rows
            if tick <= row["tick"] + row["duration_ticks"]
        ]

    async def count_citizens(self, sim_id: str) -> int:
        return await self._cit_repo.count(sim_id)

    # ── Writes ─────────────────────────────────────────────────────────────────

    async def apply_citizen_deltas(
        self, deltas: list[CitizenDelta], citizens: list[CitizenState]
    ) -> None:
        """
        Apply deltas via batch upsert — one PostgREST call per CITIZEN_PAGE_SIZE
        rows instead of one call per citizen. Scales to 1M citizens.
        """
        citizen_map = {c.id: c for c in citizens}
        levels = ["none", "primary", "secondary", "tertiary", "postgraduate"]
        updates = []

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
            updates.append(row)

        if updates:
            await self._cit_repo.batch_upsert(updates)
            logger.debug("citizen_deltas_applied", count=len(updates))

    async def save_tick_result(
        self, sim_id: str, tick: int, metrics: dict,
        policy_ids: list[str], event_ids: list[str]
    ) -> None:
        await self._sim_repo.save_result(sim_id, tick, metrics, policy_ids, event_ids)

    async def increment_tick(self, sim_id: str, new_tick: int) -> None:
        await self._sim_repo.increment_tick(sim_id, new_tick)

    async def set_simulation_status(self, sim_id: str, status: str) -> None:
        await self._sim_repo.set_status(sim_id, status)

    async def update_government_stats(self, gov_id: str, updates: dict) -> None:
        await self._gov_repo.update_stats(gov_id, updates)

    async def expire_events(self, sim_id: str, tick: int) -> None:
        await self._evt_repo.expire_finished(sim_id, tick)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _row_to_citizen(row: dict) -> CitizenState:
    return CitizenState(
        id=row["id"],
        age=row["age"],
        income=float(row.get("income") or 0),
        wealth=float(row.get("wealth") or 0),
        happiness_score=float(row.get("happiness_score") or 50),
        health_score=float(row.get("health_score") or 50),
        stress_score=float(row.get("stress_score") or 50),
        education_level=row.get("education_level") or "secondary",
        political_alignment=row.get("political_alignment") or "center",
        voting_likelihood=float(row.get("voting_likelihood") or 50),
        occupation=row.get("occupation"),
        personality_traits=row.get("personality_traits") or {},
        demographics=row.get("demographics") or {},
        is_alive=row.get("is_alive", True),
    )
