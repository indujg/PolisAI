"""
WebSocket layer tests — in-process mode only (no Redis required).

Tests cover:
  - WSEvent construction and serialisation
  - Channel name helpers
  - All convenience event constructors
  - ConnectionPool: add, remove, broadcast, dead-conn cleanup
  - WebSocketManager: connect/disconnect/broadcast_to_sim/broadcast_global/connection_count
  - BroadcastService (no-Redis mode): publish, domain helpers
  - broadcaster.py singleton pattern
"""

from __future__ import annotations

import asyncio
import json
import time
from dataclasses import dataclass
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.ws.events import (
    CHANNEL_GLOBAL,
    EventType,
    WSEvent,
    agent_insight_event,
    all_sim_channels,
    channel_agents,
    channel_citizens,
    channel_events,
    channel_policy,
    channel_tick,
    citizen_batch_event,
    event_alert_event,
    heartbeat_event,
    news_event,
    policy_outcome_event,
    status_event,
    tick_event,
)
from app.ws.manager import ConnectionInfo, ConnectionPool, WebSocketManager
from app.ws.broadcaster import BroadcastService, reset_broadcaster


# ── Helpers ────────────────────────────────────────────────────────────────────

class _FakeWS:
    """Minimal WebSocket stub — records sent messages."""

    def __init__(self, alive: bool = True):
        self._alive   = alive
        self.sent: list[str] = []
        from starlette.websockets import WebSocketState
        self.client_state = WebSocketState.CONNECTED if alive else WebSocketState.DISCONNECTED

    async def accept(self): pass

    async def send_text(self, data: str):
        if not self._alive:
            raise RuntimeError("socket is dead")
        self.sent.append(data)

    async def receive_text(self) -> str:
        await asyncio.sleep(999)  # block forever (simulates waiting for client)
        return ""


def _make_conn(sim_id: str = "sim1", alive: bool = True) -> tuple[ConnectionInfo, _FakeWS]:
    ws = _FakeWS(alive=alive)
    conn = ConnectionInfo(ws=ws, sim_id=sim_id, user_id="u1", channels={"*"})  # type: ignore[arg-type]
    return conn, ws


# ── WSEvent ────────────────────────────────────────────────────────────────────

class TestWSEvent:
    def test_to_dict_round_trip(self):
        ev = WSEvent(type=EventType.TICK_COMPLETE, sim_id="s1",
                     payload={"x": 1}, tick=5)
        d = ev.to_dict()
        assert d["type"]    == "tick_complete"
        assert d["sim_id"]  == "s1"
        assert d["tick"]    == 5
        assert d["payload"] == {"x": 1}
        assert isinstance(d["ts"], float)

    def test_ts_auto_populated(self):
        before = time.time()
        ev = WSEvent(type=EventType.HEARTBEAT, sim_id="s1", payload={})
        assert ev.ts >= before


# ── Channel helpers ────────────────────────────────────────────────────────────

class TestChannelHelpers:
    def test_channel_names(self):
        assert channel_tick("abc")     == "polis:sim:abc:tick"
        assert channel_citizens("abc") == "polis:sim:abc:citizens"
        assert channel_events("abc")   == "polis:sim:abc:events"
        assert channel_policy("abc")   == "polis:sim:abc:policy"
        assert channel_agents("abc")   == "polis:sim:abc:agents"
        assert CHANNEL_GLOBAL          == "polis:global"

    def test_all_sim_channels(self):
        channels = all_sim_channels("sim42")
        assert len(channels) == 5
        assert all("sim42" in c for c in channels)


# ── Convenience constructors ───────────────────────────────────────────────────

class TestEventConstructors:
    def test_tick_event(self):
        ev = tick_event("s1", 3, {"avg_happiness": 55.0})
        assert ev.type    == EventType.TICK_COMPLETE
        assert ev.tick    == 3
        assert ev.payload["metrics"]["avg_happiness"] == 55.0

    def test_status_event(self):
        ev = status_event("s1", "running", 2)
        assert ev.type              == EventType.SIMULATION_STATUS
        assert ev.payload["status"] == "running"

    def test_citizen_batch_event(self):
        deltas = [{"id": f"c{i}", "happiness": 0.1} for i in range(60)]
        ev = citizen_batch_event("s1", 1, deltas)
        assert ev.type              == EventType.CITIZEN_BATCH
        assert ev.payload["count"]  == 60
        assert len(ev.payload["deltas"]) == 50   # capped at 50

    def test_event_alert_event(self):
        ev = event_alert_event("s1", 4, {"name": "Earthquake", "severity": "high"})
        assert ev.type              == EventType.EVENT_ALERT
        assert ev.payload["name"]   == "Earthquake"

    def test_policy_outcome_event(self):
        ev = policy_outcome_event("s1", 5, {"id": "p1", "name": "UBI"}, "activated")
        assert ev.type               == EventType.POLICY_OUTCOME
        assert ev.payload["action"]  == "activated"

    def test_agent_insight_event(self):
        ev = agent_insight_event("s1", 6, ["GDP rising"], [{"level": "warn"}])
        assert ev.type                  == EventType.AGENT_INSIGHT
        assert ev.payload["insights"]   == ["GDP rising"]

    def test_news_event(self):
        ev = news_event("s1", 7, [{"headline": "Economy booms"}], 0.75)
        assert ev.type                          == EventType.NEWS_BROADCAST
        assert ev.payload["sentiment_index"]    == 0.75

    def test_heartbeat_event(self):
        ev = heartbeat_event("s1")
        assert ev.type    == EventType.HEARTBEAT
        assert ev.payload == {}


# ── ConnectionPool ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestConnectionPool:
    async def test_add_remove(self):
        pool = ConnectionPool("sim1")
        conn, _ = _make_conn("sim1")
        await pool.add(conn)
        assert pool.count() == 1
        await pool.remove(conn)
        assert pool.count() == 0

    async def test_broadcast_returns_sent_count(self):
        pool = ConnectionPool("sim1")
        conn1, ws1 = _make_conn("sim1")
        conn2, ws2 = _make_conn("sim1")
        await pool.add(conn1)
        await pool.add(conn2)

        msg = {"type": "heartbeat", "sim_id": "sim1", "tick": 0, "payload": {}, "ts": 0.0}
        sent = await pool.broadcast(msg)
        assert sent == 2
        assert len(ws1.sent) == 1
        assert len(ws2.sent) == 1

    async def test_broadcast_removes_dead_connection(self):
        pool = ConnectionPool("sim1")
        live_conn, live_ws = _make_conn("sim1", alive=True)
        dead_conn, _       = _make_conn("sim1", alive=False)
        await pool.add(live_conn)
        await pool.add(dead_conn)
        assert pool.count() == 2

        msg = {"type": "heartbeat", "sim_id": "sim1", "tick": 0, "payload": {}, "ts": 0.0}
        sent = await pool.broadcast(msg)
        assert sent == 1
        assert pool.count() == 1   # dead removed

    async def test_broadcast_empty_pool(self):
        pool = ConnectionPool("sim1")
        msg = {"type": "heartbeat", "sim_id": "sim1", "tick": 0, "payload": {}, "ts": 0.0}
        assert await pool.broadcast(msg) == 0


# ── WebSocketManager ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestWebSocketManager:
    async def test_connect_sends_connected_event(self):
        mgr = WebSocketManager()
        ws  = _FakeWS()
        conn = await mgr.connect(ws, "sim1", user_id="u1")  # type: ignore[arg-type]
        assert len(ws.sent) == 1
        data = json.loads(ws.sent[0])
        assert data["type"] == "connected"

    async def test_connection_count(self):
        mgr = WebSocketManager()
        ws1, ws2 = _FakeWS(), _FakeWS()
        c1 = await mgr.connect(ws1, "sim1")  # type: ignore[arg-type]
        c2 = await mgr.connect(ws2, "sim1")  # type: ignore[arg-type]
        assert mgr.connection_count("sim1") == 2
        assert mgr.connection_count()       >= 2

    async def test_disconnect_reduces_count(self):
        mgr = WebSocketManager()
        ws  = _FakeWS()
        conn = await mgr.connect(ws, "sim1")  # type: ignore[arg-type]
        assert mgr.connection_count("sim1") == 1
        await mgr.disconnect(conn)
        assert mgr.connection_count("sim1") == 0

    async def test_broadcast_to_sim(self):
        mgr = WebSocketManager()
        ws1, ws2 = _FakeWS(), _FakeWS()
        await mgr.connect(ws1, "sim1")  # type: ignore[arg-type]
        await mgr.connect(ws2, "sim2")  # type: ignore[arg-type]

        ev = tick_event("sim1", 1, {})
        sent = await mgr.broadcast_to_sim("sim1", ev)
        assert sent == 1
        assert len(ws1.sent) == 2   # welcome + tick
        assert len(ws2.sent) == 1   # only welcome

    async def test_broadcast_global(self):
        # broadcast_global() sends to the dedicated _global_pool.
        # We test it by calling broadcast_all() which includes all sim pools.
        mgr = WebSocketManager()
        ws1, ws2 = _FakeWS(), _FakeWS()
        await mgr.connect(ws1, "simP")  # type: ignore[arg-type]
        await mgr.connect(ws2, "simQ")  # type: ignore[arg-type]
        ev = heartbeat_event("simP")
        # broadcast_global targets only _global_pool (no clients there in this test)
        sent_global = await mgr.broadcast_global(ev)
        assert sent_global == 0   # _global_pool is empty
        # broadcast_all covers all sim pools
        total = await mgr.broadcast_all(ev)
        assert total >= 2

    async def test_active_simulations(self):
        mgr = WebSocketManager()
        ws  = _FakeWS()
        await mgr.connect(ws, "simX")  # type: ignore[arg-type]
        assert "simX" in mgr.active_simulations()

    async def test_broadcast_all(self):
        mgr = WebSocketManager()
        ws1, ws2 = _FakeWS(), _FakeWS()
        await mgr.connect(ws1, "sim1")  # type: ignore[arg-type]
        await mgr.connect(ws2, "sim2")  # type: ignore[arg-type]
        ev = heartbeat_event("__broadcast__")
        ev.sim_id = "sim1"   # needed to satisfy WSEvent, ignored by broadcast_all
        total = await mgr.broadcast_all(ev)
        assert total >= 2


# ── BroadcastService (in-process, no Redis) ────────────────────────────────────

@pytest.mark.asyncio
class TestBroadcastService:
    def _make_service(self) -> tuple[BroadcastService, WebSocketManager]:
        mgr = WebSocketManager()
        svc = BroadcastService(redis_url="", ws_manager=mgr)
        return svc, mgr

    async def test_startup_in_process_mode(self):
        svc, _ = self._make_service()
        await svc.startup()   # should not raise
        assert not svc.redis_enabled

    async def test_publish_delivers_locally(self):
        svc, mgr = self._make_service()
        await svc.startup()
        ws = _FakeWS()
        conn = await mgr.connect(ws, "sim1")  # type: ignore[arg-type]
        ev   = tick_event("sim1", 1, {"avg_happiness": 60.0})
        await svc.publish(channel_tick("sim1"), ev)

        # ws.sent[0] = welcome, ws.sent[1] = tick
        assert len(ws.sent) == 2
        msg = json.loads(ws.sent[1])
        assert msg["type"] == "tick_complete"

    async def test_publish_tick_helper(self):
        svc, mgr = self._make_service()
        await svc.startup()
        ws = _FakeWS()
        await mgr.connect(ws, "simA")  # type: ignore[arg-type]

        await svc.publish_tick("simA", 3, {"avg_health": 70.0})
        msg = json.loads(ws.sent[-1])
        assert msg["type"]                            == "tick_complete"
        assert msg["payload"]["metrics"]["avg_health"] == 70.0

    async def test_publish_status_helper(self):
        svc, mgr = self._make_service()
        await svc.startup()
        ws = _FakeWS()
        await mgr.connect(ws, "simB")  # type: ignore[arg-type]

        await svc.publish_status("simB", "paused", tick=5)
        msg = json.loads(ws.sent[-1])
        assert msg["type"]             == "simulation_status"
        assert msg["payload"]["status"] == "paused"

    async def test_publish_citizens_helper(self):
        svc, mgr = self._make_service()
        await svc.startup()
        ws = _FakeWS()
        await mgr.connect(ws, "simC")  # type: ignore[arg-type]

        deltas = [{"id": "c1", "happiness": 0.2}]
        await svc.publish_citizens("simC", 1, deltas)
        msg = json.loads(ws.sent[-1])
        assert msg["type"]           == "citizen_batch"
        assert msg["payload"]["count"] == 1

    async def test_publish_citizens_skips_empty(self):
        svc, mgr = self._make_service()
        await svc.startup()
        ws = _FakeWS()
        await mgr.connect(ws, "simD")  # type: ignore[arg-type]
        before = len(ws.sent)
        await svc.publish_citizens("simD", 1, [])   # no deltas — should no-op
        assert len(ws.sent) == before

    async def test_publish_event_alert(self):
        svc, mgr = self._make_service()
        await svc.startup()
        ws = _FakeWS()
        await mgr.connect(ws, "simE")  # type: ignore[arg-type]

        await svc.publish_event_alert("simE", 2, {"name": "Flood"})
        msg = json.loads(ws.sent[-1])
        assert msg["type"] == "event_alert"

    async def test_publish_policy_outcome(self):
        svc, mgr = self._make_service()
        await svc.startup()
        ws = _FakeWS()
        await mgr.connect(ws, "simF")  # type: ignore[arg-type]

        await svc.publish_policy_outcome("simF", 3, {"id": "p1"}, "activated")
        msg = json.loads(ws.sent[-1])
        assert msg["type"]              == "policy_outcome"
        assert msg["payload"]["action"] == "activated"

    async def test_publish_agent_insights(self):
        svc, mgr = self._make_service()
        await svc.startup()
        ws = _FakeWS()
        await mgr.connect(ws, "simG")  # type: ignore[arg-type]

        await svc.publish_agent_insights("simG", 1, ["GDP rising"], [])
        msg = json.loads(ws.sent[-1])
        assert msg["type"] == "agent_insight"

    async def test_publish_news(self):
        svc, mgr = self._make_service()
        await svc.startup()
        ws = _FakeWS()
        await mgr.connect(ws, "simH")  # type: ignore[arg-type]

        await svc.publish_news("simH", 1, [{"headline": "Boom"}], 0.8)
        msg = json.loads(ws.sent[-1])
        assert msg["type"] == "news_broadcast"

    async def test_heartbeat(self):
        svc, mgr = self._make_service()
        await svc.startup()
        ws = _FakeWS()
        await mgr.connect(ws, "simI")  # type: ignore[arg-type]

        await svc.send_heartbeat("simI")
        msg = json.loads(ws.sent[-1])
        assert msg["type"] == "heartbeat"

    async def test_subscribe_sim_noop_without_redis(self):
        svc, _ = self._make_service()
        await svc.startup()
        await svc.subscribe_sim("sim99")   # should not raise
        await svc.unsubscribe_sim("sim99")

    async def test_shutdown_noop_without_redis(self):
        svc, _ = self._make_service()
        await svc.startup()
        await svc.shutdown()   # should not raise


# ── Singleton ──────────────────────────────────────────────────────────────────

class TestBroadcasterSingleton:
    def test_singleton_returns_same_instance(self):
        from app.ws.broadcaster import get_broadcaster, reset_broadcaster
        reset_broadcaster()

        # get_settings is imported lazily inside get_broadcaster → patch via app.config
        with patch("app.config.get_settings") as mock_cfg:
            mock_cfg.return_value.REDIS_URL = ""
            b1 = get_broadcaster()
            b2 = get_broadcaster()
        assert b1 is b2

    def test_reset_creates_new_instance(self):
        from app.ws.broadcaster import get_broadcaster, reset_broadcaster
        reset_broadcaster()

        with patch("app.config.get_settings") as mock_cfg:
            mock_cfg.return_value.REDIS_URL = ""
            b1 = get_broadcaster()
        reset_broadcaster()
        with patch("app.config.get_settings") as mock_cfg:
            mock_cfg.return_value.REDIS_URL = ""
            b2 = get_broadcaster()
        assert b1 is not b2
