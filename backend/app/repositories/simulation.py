"""
SimulationRepository — data access for simulations, governments, results, events.
"""

from __future__ import annotations

from typing import Any

from supabase._async.client import AsyncClient

from app.repositories.base import BaseRepository


class SimulationRepository(BaseRepository):
    table_name = "simulations"

    async def get(self, sim_id: str) -> dict | None:
        return await self._fetch_one(
            self._table()
            .select("id, owner_id, name, description, population_size, tick_rate, "
                    "status, current_tick, config, created_at, started_at, completed_at")
            .eq("id", sim_id)
        )

    async def get_required(self, sim_id: str) -> dict:
        return await self._fetch_one_required(
            self._table()
            .select("id, owner_id, name, description, population_size, tick_rate, "
                    "status, current_tick, config, created_at")
            .eq("id", sim_id),
            resource=f"Simulation {sim_id} not found",
        )

    async def list_by_owner(
        self,
        owner_id: str,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict]:
        q = (
            self._table()
            .select("id, name, status, current_tick, tick_rate, population_size, created_at")
            .eq("owner_id", owner_id)
        )
        if status:
            q = q.eq("status", status)
        r = await q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        return r.data or []

    async def set_status(self, sim_id: str, status: str) -> None:
        payload: dict[str, Any] = {"status": status}
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        if status == "running":
            payload["started_at"] = now
        elif status in ("completed", "failed"):
            payload["completed_at"] = now
        await self._table().update(payload).eq("id", sim_id).execute()

    async def increment_tick(self, sim_id: str, new_tick: int) -> None:
        await self._table().update({"current_tick": new_tick}).eq("id", sim_id).execute()

    async def save_result(
        self, sim_id: str, tick: int, metrics: dict,
        policy_ids: list[str], event_ids: list[str],
    ) -> None:
        await (
            self._db.table("simulation_results")
            .upsert({
                "simulation_id":   sim_id,
                "tick":            tick,
                "metrics":         metrics,
                "policy_snapshot": policy_ids,
                "event_snapshot":  event_ids,
            }, on_conflict="simulation_id,tick")
            .execute()
        )

    async def get_latest_result(self, sim_id: str) -> dict | None:
        return await self._fetch_one(
            self._db.table("simulation_results")
            .select("tick, metrics, policy_snapshot, event_snapshot")
            .eq("simulation_id", sim_id)
            .order("tick", desc=True)
        )

    async def get_results_page(
        self, sim_id: str, limit: int = 50, offset: int = 0, asc: bool = False
    ) -> list[dict]:
        r = await (
            self._db.table("simulation_results")
            .select("id, tick, metrics, policy_snapshot, event_snapshot, created_at")
            .eq("simulation_id", sim_id)
            .order("tick", desc=not asc)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return r.data or []


class GovernmentRepository(BaseRepository):
    table_name = "governments"

    async def get_by_sim(self, sim_id: str) -> dict | None:
        return await self._fetch_one(
            self._table()
            .select("id, name, approval_rating, budget, debt, tax_revenue, gdp, "
                    "type, simulation_id")
            .eq("simulation_id", sim_id)
        )

    async def update_stats(self, gov_id: str, updates: dict[str, Any]) -> None:
        await self._table().update(updates).eq("id", gov_id).execute()


class EventRepository(BaseRepository):
    table_name = "events"

    async def get_active(self, sim_id: str, tick: int) -> list[dict]:
        """Events that are active and have started at or before this tick."""
        r = await (
            self._table()
            .select("id, name, type, severity, duration_ticks, tick, "
                    "affected_region, impact")
            .eq("simulation_id", sim_id)
            .eq("is_active", True)
            .lte("tick", tick)
            .execute()
        )
        return r.data or []

    async def expire_finished(self, sim_id: str, current_tick: int) -> None:
        r = await (
            self._table()
            .select("id, tick, duration_ticks")
            .eq("simulation_id", sim_id)
            .eq("is_active", True)
            .execute()
        )
        expired_ids = [
            row["id"]
            for row in (r.data or [])
            if row.get("duration_ticks") is not None
            and current_tick >= row["tick"] + row["duration_ticks"]
        ]
        for eid in expired_ids:
            await self._table().update({"is_active": False}).eq("id", eid).execute()
