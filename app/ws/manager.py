"""
ConnectionPool + WebSocketManager — tracks all active WebSocket connections.

Structure:
  _pools[sim_id] = set of WebSocket objects

The manager is the single source of truth for who is connected.
It handles safe send (dead connections are silently removed).
"""

from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

from app.core.logging import get_logger
from app.ws.events import EventType, WSEvent

logger = get_logger(__name__)


@dataclass
class ConnectionInfo:
    ws:      WebSocket
    sim_id:  str
    user_id: str | None = None
    channels: set[str] = None   # which channels this connection subscribes to

    def __post_init__(self):
        if self.channels is None:
            self.channels = set()

    def __hash__(self):
        return id(self.ws)

    def __eq__(self, other):
        return isinstance(other, ConnectionInfo) and self.ws is other.ws


class ConnectionPool:
    """Thread-safe connection pool for one simulation."""

    def __init__(self, sim_id: str) -> None:
        self.sim_id = sim_id
        self._conns: set[ConnectionInfo] = set()
        self._lock  = asyncio.Lock()

    async def add(self, conn: ConnectionInfo) -> None:
        async with self._lock:
            self._conns.add(conn)
        logger.info("ws_connected", sim_id=self.sim_id, total=len(self._conns))

    async def remove(self, conn: ConnectionInfo) -> None:
        async with self._lock:
            self._conns.discard(conn)
        logger.info("ws_disconnected", sim_id=self.sim_id, total=len(self._conns))

    async def broadcast(self, message: dict[str, Any]) -> int:
        """Send to all connections. Returns number of successful sends."""
        text = json.dumps(message)
        dead: list[ConnectionInfo] = []
        sent = 0

        # Snapshot to avoid mutation during iteration
        async with self._lock:
            snapshot = list(self._conns)

        for conn in snapshot:
            try:
                if conn.ws.client_state == WebSocketState.CONNECTED:
                    await conn.ws.send_text(text)
                    sent += 1
                else:
                    dead.append(conn)
            except Exception:
                dead.append(conn)

        # Clean up dead connections
        if dead:
            async with self._lock:
                for conn in dead:
                    self._conns.discard(conn)

        return sent

    def count(self) -> int:
        return len(self._conns)


class WebSocketManager:
    """
    Central manager. Holds one ConnectionPool per simulation.
    Also maintains a 'global' pool for cross-simulation broadcasts.
    """

    def __init__(self) -> None:
        self._pools: dict[str, ConnectionPool] = {}
        self._global_pool = ConnectionPool("__global__")
        self._lock = asyncio.Lock()

    async def _get_pool(self, sim_id: str) -> ConnectionPool:
        async with self._lock:
            if sim_id not in self._pools:
                self._pools[sim_id] = ConnectionPool(sim_id)
            return self._pools[sim_id]

    async def connect(
        self,
        ws: WebSocket,
        sim_id: str,
        user_id: str | None = None,
        channels: set[str] | None = None,
    ) -> ConnectionInfo:
        await ws.accept()
        conn = ConnectionInfo(ws=ws, sim_id=sim_id, user_id=user_id,
                              channels=channels or {"*"})
        pool = await self._get_pool(sim_id)
        await pool.add(conn)

        # Send welcome event
        welcome = WSEvent(
            type=EventType.CONNECTED, sim_id=sim_id,
            payload={"message": f"Connected to simulation {sim_id}",
                     "channels": list(conn.channels)},
        )
        try:
            await ws.send_text(json.dumps(welcome.to_dict()))
        except Exception:
            pass

        return conn

    async def disconnect(self, conn: ConnectionInfo) -> None:
        pool = await self._get_pool(conn.sim_id)
        await pool.remove(conn)

    async def broadcast_to_sim(self, sim_id: str, event: WSEvent) -> int:
        pool = await self._get_pool(sim_id)
        return await pool.broadcast(event.to_dict())

    async def broadcast_global(self, event: WSEvent) -> int:
        return await self._global_pool.broadcast(event.to_dict())

    async def broadcast_all(self, event: WSEvent) -> int:
        """Broadcast to every connected client across all simulations."""
        total = 0
        async with self._lock:
            pools = list(self._pools.values())
        for pool in pools:
            total += await pool.broadcast(event.to_dict())
        total += await self._global_pool.broadcast(event.to_dict())
        return total

    def connection_count(self, sim_id: str | None = None) -> int:
        if sim_id:
            pool = self._pools.get(sim_id)
            return pool.count() if pool else 0
        return sum(p.count() for p in self._pools.values()) + self._global_pool.count()

    def active_simulations(self) -> list[str]:
        return [sid for sid, pool in self._pools.items() if pool.count() > 0]


# ── Application singleton ──────────────────────────────────────────────────────

_ws_manager: WebSocketManager | None = None


def get_ws_manager() -> WebSocketManager:
    global _ws_manager
    if _ws_manager is None:
        _ws_manager = WebSocketManager()
    return _ws_manager
