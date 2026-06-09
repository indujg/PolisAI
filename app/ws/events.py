"""
WebSocket event definitions for PolisAI real-time streaming.

All messages follow a consistent envelope:
  { "type": EventType, "sim_id": str, "tick": int, "payload": dict, "ts": float }

Channels (Redis keys):
  polis:sim:{sim_id}:tick       — tick_complete, simulation_status
  polis:sim:{sim_id}:citizens   — citizen_batch
  polis:sim:{sim_id}:events     — event_alert
  polis:sim:{sim_id}:policy     — policy_outcome
  polis:sim:{sim_id}:agents     — agent_insight
  polis:global                  — cross-simulation broadcasts
"""

from __future__ import annotations

import time
from dataclasses import asdict, dataclass, field
from enum import StrEnum
from typing import Any


class EventType(StrEnum):
    # Simulation lifecycle
    TICK_COMPLETE      = "tick_complete"
    SIMULATION_STATUS  = "simulation_status"
    SIMULATION_ERROR   = "simulation_error"

    # Data streams
    CITIZEN_BATCH      = "citizen_batch"
    EVENT_ALERT        = "event_alert"
    POLICY_OUTCOME     = "policy_outcome"

    # Agent layer
    AGENT_INSIGHT      = "agent_insight"
    NEWS_BROADCAST     = "news_broadcast"

    # Connection management
    CONNECTED          = "connected"
    HEARTBEAT          = "heartbeat"
    ERROR              = "error"


# Redis channel names
def channel_tick(sim_id: str) -> str:      return f"polis:sim:{sim_id}:tick"
def channel_citizens(sim_id: str) -> str:  return f"polis:sim:{sim_id}:citizens"
def channel_events(sim_id: str) -> str:    return f"polis:sim:{sim_id}:events"
def channel_policy(sim_id: str) -> str:    return f"polis:sim:{sim_id}:policy"
def channel_agents(sim_id: str) -> str:    return f"polis:sim:{sim_id}:agents"
CHANNEL_GLOBAL = "polis:global"

# All channels for a simulation (used for subscription)
def all_sim_channels(sim_id: str) -> list[str]:
    return [
        channel_tick(sim_id), channel_citizens(sim_id),
        channel_events(sim_id), channel_policy(sim_id), channel_agents(sim_id),
    ]


@dataclass
class WSEvent:
    type:    EventType
    sim_id:  str
    payload: dict[str, Any]
    tick:    int        = 0
    ts:      float      = field(default_factory=time.time)

    def to_dict(self) -> dict[str, Any]:
        return {
            "type":    str(self.type),
            "sim_id":  self.sim_id,
            "tick":    self.tick,
            "payload": self.payload,
            "ts":      self.ts,
        }


# ── Convenience constructors ───────────────────────────────────────────────────

def tick_event(sim_id: str, tick: int, metrics: dict) -> WSEvent:
    return WSEvent(
        type=EventType.TICK_COMPLETE, sim_id=sim_id, tick=tick,
        payload={"metrics": metrics},
    )

def status_event(sim_id: str, status: str, tick: int = 0) -> WSEvent:
    return WSEvent(
        type=EventType.SIMULATION_STATUS, sim_id=sim_id, tick=tick,
        payload={"status": status},
    )

def citizen_batch_event(sim_id: str, tick: int, deltas: list[dict]) -> WSEvent:
    return WSEvent(
        type=EventType.CITIZEN_BATCH, sim_id=sim_id, tick=tick,
        payload={"count": len(deltas), "deltas": deltas[:50]},  # cap at 50 per message
    )

def event_alert_event(sim_id: str, tick: int, event_data: dict) -> WSEvent:
    return WSEvent(
        type=EventType.EVENT_ALERT, sim_id=sim_id, tick=tick,
        payload=event_data,
    )

def policy_outcome_event(sim_id: str, tick: int, policy: dict, action: str) -> WSEvent:
    return WSEvent(
        type=EventType.POLICY_OUTCOME, sim_id=sim_id, tick=tick,
        payload={"policy": policy, "action": action},
    )

def agent_insight_event(sim_id: str, tick: int, insights: list[str], alerts: list[dict]) -> WSEvent:
    return WSEvent(
        type=EventType.AGENT_INSIGHT, sim_id=sim_id, tick=tick,
        payload={"insights": insights, "alerts": alerts},
    )

def news_event(sim_id: str, tick: int, headlines: list[dict], sentiment: float) -> WSEvent:
    return WSEvent(
        type=EventType.NEWS_BROADCAST, sim_id=sim_id, tick=tick,
        payload={"headlines": headlines, "sentiment_index": sentiment},
    )

def heartbeat_event(sim_id: str) -> WSEvent:
    return WSEvent(type=EventType.HEARTBEAT, sim_id=sim_id, payload={})
