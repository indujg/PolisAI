"""
SimulationService — business logic layer for simulations.

Endpoints call this; this calls repositories + cache + scheduler.
No raw DB access lives in endpoints.

Responsibilities:
  - CRUD with ownership validation
  - Lifecycle: start / pause / stop / manual tick
  - Caching hot reads (simulation, state snapshot)
  - Event broadcasting after state transitions
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from supabase._async.client import AsyncClient

from app.cache.cache import get_cache, ck_simulation, ck_government
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationError
from app.core.logging import get_logger
from app.models.user import UserProfile
from app.repositories.simulation import GovernmentRepository, SimulationRepository
from app.services.simulation.engine import SimulationEngine
from app.services.simulation.scheduler import get_scheduler
from app.services.simulation.state_manager import StateManager

logger = get_logger(__name__)

# Cache TTLs
_SIM_TTL = 30    # seconds — simulation row (status changes)
_GOV_TTL = 60    # government stats (slower changing)


class SimulationService:
    def __init__(self, db: AsyncClient) -> None:
        self._db    = db
        self._repo  = SimulationRepository(db)
        self._gov   = GovernmentRepository(db)
        self._cache = get_cache()

    # ── CRUD ───────────────────────────────────────────────────────────────────

    async def create(self, data: dict[str, Any], owner_id: str) -> dict:
        row = await self._repo.insert({
            "owner_id":        owner_id,
            "name":            data["name"],
            "description":     data.get("description", ""),
            "population_size": data.get("population_size", 1000),
            "tick_rate":       data.get("tick_rate", 1),
            "status":          "draft",
            "config":          data.get("config", {}),
        })
        await self._db.table("governments").insert({
            "simulation_id": row["id"],
            "name": f"{data['name']} Government",
            "type": "democracy",
            "budget": 0,
            "debt": 0,
            "gdp": 0,
            "region": data.get("config", {}).get("region"),
        }).execute()
        logger.info("simulation_created", sim_id=row["id"], owner=owner_id)
        return row

    async def get(self, sim_id: str) -> dict:
        cached = await self._cache.get(ck_simulation(sim_id))
        if cached:
            return cached
        row = await self._repo.get_required(sim_id)
        await self._cache.set(ck_simulation(sim_id), row, ttl=_SIM_TTL)
        return row

    async def list_for_owner(
        self, owner_id: str,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict]:
        return await self._repo.list_by_owner(owner_id, status=status,
                                              limit=limit, offset=offset)

    async def update(self, sim_id: str, updates: dict[str, Any], user: UserProfile) -> dict:
        await self._assert_owner(sim_id, user)
        # Status transitions are via start/pause/stop — not direct update
        updates.pop("status", None)
        updates.pop("current_tick", None)
        if not updates:
            raise ValidationError("No updatable fields provided")
        row = await self._repo.update(sim_id, updates)
        await self._cache.delete(ck_simulation(sim_id))
        return row

    async def delete(self, sim_id: str, user: UserProfile) -> None:
        await self._assert_owner(sim_id, user)
        scheduler = get_scheduler()
        if scheduler.is_running(sim_id):
            sm = StateManager(self._db)
            await scheduler.stop(sim_id, sm)
        await self._repo.delete(sim_id)
        await self._cache.delete(ck_simulation(sim_id))
        logger.info("simulation_deleted", sim_id=sim_id)

    # ── Lifecycle ──────────────────────────────────────────────────────────────

    async def start(
        self,
        sim_id: str,
        user: UserProfile,
        max_ticks: int | None = None,
    ) -> dict:
        await self._assert_owner(sim_id, user)
        sim = await self.get(sim_id)

        if sim["status"] == "running":
            raise ConflictError("Simulation is already running")
        if sim["status"] == "completed":
            raise ConflictError("Simulation has already completed; create a new one")

        sm      = StateManager(self._db)
        engine  = SimulationEngine(sm)
        scheduler = get_scheduler()
        await scheduler.start(
            sim_id, engine, sm,
            tick_rate=sim.get("tick_rate", 1),
            max_ticks=max_ticks,
        )
        await self._cache.delete(ck_simulation(sim_id))

        # Broadcast status change
        await self._broadcast_status(sim_id, "running")
        return {"message": f"Simulation {sim_id} started", "tick_rate": sim.get("tick_rate")}

    async def pause(self, sim_id: str, user: UserProfile) -> dict:
        await self._assert_owner(sim_id, user)
        scheduler = get_scheduler()
        if not scheduler.is_running(sim_id):
            raise ValidationError("Simulation is not currently running")
        sm = StateManager(self._db)
        await scheduler.pause(sim_id, sm)
        await self._cache.delete(ck_simulation(sim_id))
        await self._broadcast_status(sim_id, "paused")
        return {"message": f"Simulation {sim_id} paused"}

    async def stop(self, sim_id: str, user: UserProfile) -> dict:
        await self._assert_owner(sim_id, user)
        sm = StateManager(self._db)
        await get_scheduler().stop(sim_id, sm)
        await self._cache.delete(ck_simulation(sim_id))
        await self._broadcast_status(sim_id, "completed")
        return {"message": f"Simulation {sim_id} stopped"}

    async def manual_tick(
        self, sim_id: str, user: UserProfile, ticks: int = 1
    ) -> dict:
        await self._assert_owner(sim_id, user)
        sim = await self.get(sim_id)
        if sim["status"] == "running":
            raise ConflictError("Pause the simulation before manual ticking")
        sm     = StateManager(self._db)
        engine = SimulationEngine(sm)
        await sm.set_simulation_status(sim_id, "running")
        metrics_list = await engine.run_ticks(sim_id, ticks)
        await sm.set_simulation_status(sim_id, "paused")
        await self._cache.delete(ck_simulation(sim_id))
        return {
            "ticks_processed": len(metrics_list),
            "last_metrics":    metrics_list[-1] if metrics_list else None,
        }

    # ── State snapshot ─────────────────────────────────────────────────────────

    async def get_state(self, sim_id: str) -> dict:
        """Full state snapshot for the UI — cached 10s."""
        cache_key = f"state:{sim_id}"
        cached = await self._cache.get(cache_key)
        if cached:
            return cached

        sim = await self.get(sim_id)
        gov = await self._get_government(sim_id)
        last_result = await self._repo.get_latest_result(sim_id)

        from app.repositories.citizen import CitizenRepository
        citizen_count = await CitizenRepository(self._db).count(sim_id)

        state = {
            "simulation":     sim,
            "government":     gov,
            "citizen_count":  citizen_count,
            "scheduler_live": get_scheduler().is_running(sim_id),
            "last_result":    last_result,
        }
        await self._cache.set(cache_key, state, ttl=10)
        return state

    # ── Helpers ────────────────────────────────────────────────────────────────

    async def _assert_owner(self, sim_id: str, user: UserProfile) -> None:
        sim = await self.get(sim_id)
        if str(sim.get("owner_id")) != str(user.id):
            if not user.has_role(user.role.__class__.ADMIN):  # type: ignore[arg-type]
                raise ForbiddenError("You do not own this simulation")

    async def _get_government(self, sim_id: str) -> dict | None:
        cached = await self._cache.get(ck_government(sim_id))
        if cached:
            return cached
        gov = await self._gov.get_by_sim(sim_id)
        if gov:
            await self._cache.set(ck_government(sim_id), gov, ttl=_GOV_TTL)
        return gov

    async def _broadcast_status(self, sim_id: str, status: str) -> None:
        try:
            from app.ws.broadcaster import get_broadcaster
            await get_broadcaster().publish_status(sim_id, status)
        except Exception as exc:
            logger.debug("status_broadcast_failed", sim_id=sim_id, error=str(exc))
