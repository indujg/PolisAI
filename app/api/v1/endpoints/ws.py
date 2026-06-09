"""
WebSocket endpoints for real-time simulation streaming.

Clients connect to /ws/simulations/{sim_id} and receive a stream of events:
  tick_complete, citizen_batch, event_alert, policy_outcome,
  agent_insight, news_broadcast, heartbeat

Query params:
  token  — optional auth token (user_id extracted for logging)
  channels — comma-separated filter (e.g. "tick,citizens"); default = all
"""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.logging import get_logger
from app.ws.broadcaster import get_broadcaster
from app.ws.events import status_event
from app.ws.manager import get_ws_manager

logger = get_logger(__name__)

router = APIRouter(tags=["websocket"])

_VALID_CHANNELS = {"tick", "citizens", "events", "policy", "agents", "*"}


@router.websocket("/ws/simulations/{sim_id}")
async def simulation_ws(
    websocket: WebSocket,
    sim_id: str,
    token: str | None = Query(default=None),
    channels: str = Query(default="*"),
) -> None:
    """
    WebSocket stream for a single simulation.

    Sends events as JSON text frames:
      { "type": "...", "sim_id": "...", "tick": N, "payload": {...}, "ts": float }

    Close codes:
      1000 — normal closure (client initiated)
      1011 — server error
    """
    manager    = get_ws_manager()
    broadcaster = get_broadcaster()

    # Parse channel filter
    requested = {c.strip() for c in channels.split(",") if c.strip()} or {"*"}
    requested &= _VALID_CHANNELS | {"*"}
    if not requested:
        requested = {"*"}

    # Extract user_id from token (simple JWT sub extraction, best-effort)
    user_id: str | None = None
    if token:
        try:
            import base64, json as _json
            parts = token.split(".")
            if len(parts) == 3:
                padded = parts[1] + "=" * (-len(parts[1]) % 4)
                user_id = _json.loads(base64.urlsafe_b64decode(padded)).get("sub")
        except Exception:
            pass

    conn = await manager.connect(websocket, sim_id, user_id=user_id, channels=requested)

    # Subscribe broadcaster to Redis channels for this sim (no-op when Redis is off)
    await broadcaster.subscribe_sim(sim_id)

    # Heartbeat task
    settings = None
    try:
        from app.config import get_settings
        settings = get_settings()
    except Exception:
        pass
    interval = getattr(settings, "WS_HEARTBEAT_INTERVAL", 30)

    async def _heartbeat():
        while True:
            await asyncio.sleep(interval)
            await broadcaster.send_heartbeat(sim_id)

    hb_task = asyncio.create_task(_heartbeat(), name=f"ws_heartbeat_{sim_id}")

    try:
        while True:
            # Keep the connection alive — we only read for client-sent close frames
            data = await websocket.receive_text()
            # Clients can send {"type": "ping"} for a manual keepalive
            if data.strip() == '{"type":"ping"}':
                await broadcaster.send_heartbeat(sim_id)

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.warning("ws_error", sim_id=sim_id, error=str(exc))
    finally:
        hb_task.cancel()
        await manager.disconnect(conn)
        # If no more local connections for this sim, unsubscribe from Redis
        if manager.connection_count(sim_id) == 0:
            await broadcaster.unsubscribe_sim(sim_id)
        logger.info("ws_closed", sim_id=sim_id)


@router.websocket("/ws/global")
async def global_ws(websocket: WebSocket) -> None:
    """Cross-simulation global event stream (admin/monitoring)."""
    manager = get_ws_manager()
    conn = await manager.connect(websocket, "__global__")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.warning("ws_global_error", error=str(exc))
    finally:
        await manager.disconnect(conn)
