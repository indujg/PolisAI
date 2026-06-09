"""
BaseRepository — generic async repository over Supabase PostgREST.

Concrete repos extend this and get standard CRUD for free.
Business logic stays in services; this layer is pure data-access.
"""

from __future__ import annotations

from typing import Any

from supabase._async.client import AsyncClient

from app.core.exceptions import NotFoundError
from app.core.logging import get_logger

logger = get_logger(__name__)


class BaseRepository:
    """
    Provides safe wrappers around PostgREST queries with:
      - NotFoundError on missing rows (instead of silent None)
      - Consistent error logging
      - Helper for .limit(1) + data[0] pattern (avoids .single() APIError)
    """

    table_name: str = ""

    def __init__(self, db: AsyncClient) -> None:
        self._db = db

    def _table(self):
        return self._db.table(self.table_name)

    async def _fetch_one(self, query) -> dict | None:
        """Execute query, return first row or None."""
        r = await query.limit(1).execute()
        return r.data[0] if r.data else None

    async def _fetch_one_required(self, query, resource: str = "") -> dict:
        """Execute query, raise NotFoundError if no row."""
        row = await self._fetch_one(query)
        if row is None:
            raise NotFoundError(resource or f"{self.table_name} not found")
        return row

    async def _fetch_all(self, query) -> list[dict]:
        r = await query.execute()
        return r.data or []

    async def get_by_id(self, id: str, columns: str = "*") -> dict | None:
        return await self._fetch_one(
            self._table().select(columns).eq("id", id)
        )

    async def get_by_id_required(self, id: str, columns: str = "*") -> dict:
        return await self._fetch_one_required(
            self._table().select(columns).eq("id", id),
            resource=f"{self.table_name}:{id} not found",
        )

    async def insert(self, data: dict[str, Any]) -> dict:
        r = await self._table().insert(data).execute()
        if not r.data:
            raise RuntimeError(f"Insert into {self.table_name} returned no data")
        return r.data[0]

    async def update(self, id: str, data: dict[str, Any]) -> dict:
        r = await self._table().update(data).eq("id", id).execute()
        if not r.data:
            raise NotFoundError(f"{self.table_name}:{id} not found")
        return r.data[0]

    async def delete(self, id: str) -> None:
        await self._table().delete().eq("id", id).execute()

    async def upsert(self, data: dict | list[dict], on_conflict: str = "id") -> list[dict]:
        payload = data if isinstance(data, list) else [data]
        r = await self._table().upsert(payload, on_conflict=on_conflict).execute()
        return r.data or []
