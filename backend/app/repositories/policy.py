"""
PolicyRepository — data access for policies.
"""

from __future__ import annotations

from typing import Any

from app.repositories.base import BaseRepository


class PolicyRepository(BaseRepository):
    table_name = "policies"

    async def get(self, policy_id: str) -> dict | None:
        return await self._fetch_one(
            self._table().select("*").eq("id", policy_id)
        )

    async def get_required(self, policy_id: str) -> dict:
        return await self._fetch_one_required(
            self._table().select("*").eq("id", policy_id),
            resource=f"Policy {policy_id} not found",
        )

    async def list_by_sim(
        self,
        sim_id: str,
        status: str | None = None,
        category: str | None = None,
        government_id: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]:
        q = (
            self._table()
            .select("id, name, description, category, status, budget_impact, "
                    "popularity_score, enacted_tick, repealed_tick, government_id")
            .eq("simulation_id", sim_id)
        )
        if status:
            q = q.eq("status", status)
        if category:
            q = q.eq("category", category)
        if government_id:
            q = q.eq("government_id", government_id)
        r = await q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        return r.data or []

    async def get_active(self, sim_id: str) -> list[dict]:
        r = await (
            self._table()
            .select("id, category, status, budget_impact, popularity_score")
            .eq("simulation_id", sim_id)
            .eq("status", "active")
            .execute()
        )
        return r.data or []

    async def exists_by_name(self, sim_id: str, name: str, exclude_id: str | None = None) -> bool:
        q = (
            self._table()
            .select("id")
            .eq("simulation_id", sim_id)
            .eq("name", name)
        )
        if exclude_id:
            q = q.neq("id", exclude_id)
        r = await q.limit(1).execute()
        return bool(r.data)

    async def create(self, data: dict[str, Any]) -> dict:
        return await self.insert(data)

    async def update(self, policy_id: str, updates: dict[str, Any]) -> dict:
        return await super().update(policy_id, updates)
