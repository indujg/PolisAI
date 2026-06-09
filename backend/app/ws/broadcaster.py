"""
BroadcastService — two-tier publish/subscribe.

Tier 1 (always on): in-process asyncio broadcast via WebSocketManager.
Tier 2 (optional):  Redis PubSub for multi-process deployments.

When REDIS_URL is set:
  publish()  → writes to Redis channel
  _redis_listener() → background task reads from Redis, forwards to local WS pool

When REDIS_URL is empty:
  publish()  → writes directly to in-process WS pool (no Redis hop)

This means the system works fully without Redis, and Redis adds
horizontal scaling when you run multiple uvicorn workers.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

from app.core.logging import get_logger
from app.ws.events import (
    EventType, WSEvent,
    agent_insight_event, citizen_batch_event, event_alert_event,
    heartbeat_event, news_event, policy_outcome_event,
    status_event, tick_event,
    channel_tick, channel_citizens, channel_events, channel_policy, channel_agents,
    all_sim_channels, CHANNEL_GLOBAL,
)
from app.ws.manager import WebSocketManager, get_ws_manager

logger = get_logger(__name__)


class BroadcastService:
    def __init__(
        self,
        redis_url: str = "",
        ws_manager: WebSocketManager | None = None,
    ) -> None:
        self._redis_url    = redis_url.strip()
        self._manager      = ws_manager or get_ws_manager()
        self._redis        = None   # redis.asyncio.Redis
        self._pubsub       = None   # redis PubSub handle
        self._listener_task: asyncio.Task | None = None
        self._subscribed_sims: set[str] = set()

    @property
    def redis_enabled(self) -> bool:
        return bool(self._redis_url)

    # ── Startup / shutdown ─────────────────────────────────────────────────────

    async def startup(self) -> None:
        if not self._redis_url:
            logger.info("broadcaster_mode", mode="in-process (no Redis)")
            return
        try:
            import redis.asyncio as aioredis
            self._redis  = aioredis.from_url(self._redis_url, decode_responses=True)
            await self._redis.ping()
            self._pubsub = self._redis.pubsub()
            # Subscribe to global channel immediately
            await self._pubsub.subscribe(CHANNEL_GLOBAL)
            self._listener_task = asyncio.create_task(
                self._redis_listener(), name="redis_listener"
            )
            logger.info("broadcaster_mode", mode="redis", url=self._redis_url)
        except Exception as exc:
            logger.warning("broadcaster_redis_unavailable", error=str(exc),
                           fallback="in-process")
            self._redis = None

    async def shutdown(self) -> None:
        if self._listener_task:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass
        if self._redis:
            await self._redis.aclose()

    # ── Simulation subscription management ────────────────────────────────────

    async def subscribe_sim(self, sim_id: str) -> None:
        """Subscribe to all channels for a simulation (called on first WS connect)."""
        if not self._redis or sim_id in self._subscribed_sims:
            return
        channels = all_sim_channels(sim_id)
        await self._pubsub.subscribe(*channels)
        self._subscribed_sims.add(sim_id)
        logger.debug("broadcaster_subscribed", sim_id=sim_id)

    async def unsubscribe_sim(self, sim_id: str) -> None:
        if not self._redis or sim_id not in self._subscribed_sims:
            return
        await self._pubsub.unsubscribe(*all_sim_channels(sim_id))
        self._subscribed_sims.discard(sim_id)

    # ── Core publish ───────────────────────────────────────────────────────────

    async def publish(self, channel: str, event: WSEvent) -> None:
        """Publish an event. Via Redis if available, otherwise in-process only."""
        sim_id = event.sim_id

        if self._redis:
            try:
                await self._redis.publish(channel, json.dumps(event.to_dict()))
                return   # Redis listener will forward to local WS clients
            except Exception as exc:
                logger.warning("broadcaster_redis_publish_error", error=str(exc))
                # Fall through to in-process

        # In-process direct broadcast
        await self._deliver_locally(event)

    async def _deliver_locally(self, event: WSEvent) -> None:
        if event.sim_id == "__global__":
            await self._manager.broadcast_global(event)
        else:
            await self._manager.broadcast_to_sim(event.sim_id, event)

    # ── Redis listener ─────────────────────────────────────────────────────────

    async def _redis_listener(self) -> None:
        """Background task: reads messages from Redis, forwards to WS clients."""
        logger.info("redis_listener_started")
        try:
            async for raw in self._pubsub.listen():
                if raw["type"] != "message":
                    continue
                try:
                    data = json.loads(raw["data"])
                    event = WSEvent(
                        type=EventType(data.get("type", "error")),
                        sim_id=data.get("sim_id", ""),
                        tick=data.get("tick", 0),
                        payload=data.get("payload", {}),
                        ts=data.get("ts", 0.0),
                    )
                    await self._deliver_locally(event)
                except Exception as exc:
                    logger.warning("redis_listener_bad_message", error=str(exc))
        except asyncio.CancelledError:
            logger.info("redis_listener_stopped")
            raise
        except Exception as exc:
            logger.error("redis_listener_crashed", error=str(exc))

    # ── Domain-level publish helpers ───────────────────────────────────────────

    async def publish_tick(self, sim_id: str, tick: int, metrics: dict) -> None:
        await self.publish(channel_tick(sim_id),
                           tick_event(sim_id, tick, metrics))

    async def publish_status(self, sim_id: str, status: str, tick: int = 0) -> None:
        await self.publish(channel_tick(sim_id),
                           status_event(sim_id, status, tick))

    async def publish_citizens(self, sim_id: str, tick: int, deltas: list[dict]) -> None:
        if not deltas:
            return
        await self.publish(channel_citizens(sim_id),
                           citizen_batch_event(sim_id, tick, deltas))

    async def publish_event_alert(self, sim_id: str, tick: int, event_data: dict) -> None:
        await self.publish(channel_events(sim_id),
                           event_alert_event(sim_id, tick, event_data))

    async def publish_policy_outcome(
        self, sim_id: str, tick: int, policy: dict, action: str
    ) -> None:
        await self.publish(channel_policy(sim_id),
                           policy_outcome_event(sim_id, tick, policy, action))

    async def publish_agent_insights(
        self, sim_id: str, tick: int, insights: list[str], alerts: list[dict]
    ) -> None:
        await self.publish(channel_agents(sim_id),
                           agent_insight_event(sim_id, tick, insights, alerts))

    async def publish_news(
        self, sim_id: str, tick: int, headlines: list[dict], sentiment: float
    ) -> None:
        await self.publish(channel_agents(sim_id),
                           news_event(sim_id, tick, headlines, sentiment))

    async def send_heartbeat(self, sim_id: str) -> None:
        await self._deliver_locally(heartbeat_event(sim_id))


# ── Application singleton ──────────────────────────────────────────────────────

_broadcaster: BroadcastService | None = None


def get_broadcaster() -> BroadcastService:
    global _broadcaster
    if _broadcaster is None:
        from app.config import get_settings
        _broadcaster = BroadcastService(redis_url=get_settings().REDIS_URL)
    return _broadcaster


def reset_broadcaster() -> None:
    global _broadcaster
    _broadcaster = None
