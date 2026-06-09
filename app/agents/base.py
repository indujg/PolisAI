"""
BaseAgent — abstract foundation for all PolisAI domain agents.

Each agent owns one domain of the simulation (economy, climate, healthcare, …).
Agents communicate via an in-process message bus (AgentBus) and are orchestrated
by AgentOrchestrator, which runs them concurrently every tick.

Lifecycle:
  1. Orchestrator calls agent.run(context) for every tick.
  2. Agent publishes AgentMessage objects to the bus.
  3. Other agents (or the orchestrator) subscribe to relevant message types.
  4. Orchestrator aggregates all agent outputs into a TickReport.
"""

from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import Any, Callable, Coroutine

from app.core.logging import get_logger

logger = get_logger(__name__)


# ── Message types ──────────────────────────────────────────────────────────────

class MessageType(StrEnum):
    # Domain outputs
    ECONOMIC_UPDATE    = "economic_update"
    CLIMATE_UPDATE     = "climate_update"
    HEALTH_UPDATE      = "health_update"
    GOVERNANCE_UPDATE  = "governance_update"
    MOBILITY_UPDATE    = "mobility_update"
    NEWS_BROADCAST     = "news_broadcast"

    # Cross-agent requests
    POLICY_EFFECT      = "policy_effect"
    EVENT_ALERT        = "event_alert"
    METRIC_SNAPSHOT    = "metric_snapshot"

    # Lifecycle
    AGENT_STARTED      = "agent_started"
    AGENT_COMPLETED    = "agent_completed"
    AGENT_FAILED       = "agent_failed"


@dataclass
class AgentMessage:
    agent_id:    str
    type:        MessageType
    payload:     dict[str, Any]
    sim_id:      str
    tick:        int
    timestamp:   datetime = field(default_factory=datetime.utcnow)


# ── Agent context ──────────────────────────────────────────────────────────────

@dataclass
class AgentContext:
    """Read-only snapshot passed to every agent.run() call."""
    sim_id:          str
    tick:            int
    simulation:      dict[str, Any]
    government:      dict[str, Any]
    active_policies: list[dict[str, Any]]
    active_events:   list[dict[str, Any]]
    last_metrics:    dict[str, Any]
    citizen_sample:  list[dict[str, Any]]   # up to 200 citizens for fast analysis


# ── Agent result ───────────────────────────────────────────────────────────────

@dataclass
class AgentResult:
    agent_id:   str
    domain:     str
    tick:       int
    insights:   list[str]           = field(default_factory=list)
    metrics:    dict[str, float]    = field(default_factory=dict)
    alerts:     list[dict[str, Any]] = field(default_factory=list)
    messages:   list[AgentMessage]  = field(default_factory=list)
    error:      str | None          = None


# ── Base agent ─────────────────────────────────────────────────────────────────

class BaseAgent(ABC):
    """
    Abstract base class. Subclasses implement `analyze(ctx)` and
    optionally `on_message(msg)` for cross-agent communication.
    """

    def __init__(self, agent_id: str, domain: str) -> None:
        self.agent_id  = agent_id
        self.domain    = domain
        self._bus: AgentBus | None = None

    def attach_bus(self, bus: "AgentBus") -> None:
        self._bus = bus

    async def run(self, ctx: AgentContext) -> AgentResult:
        """Called by the orchestrator. Wraps analyze() with error handling."""
        logger.debug("agent_run_start", agent_id=self.agent_id, tick=ctx.tick)
        try:
            result = await self.analyze(ctx)
            result.agent_id = self.agent_id
            result.tick     = ctx.tick

            # Publish completion + any result messages to bus
            if self._bus:
                for msg in result.messages:
                    await self._bus.publish(msg)
                await self._bus.publish(AgentMessage(
                    agent_id=self.agent_id,
                    type=MessageType.AGENT_COMPLETED,
                    payload={"domain": self.domain, "insights": result.insights[:3]},
                    sim_id=ctx.sim_id, tick=ctx.tick,
                ))
            logger.debug("agent_run_done", agent_id=self.agent_id, tick=ctx.tick,
                         insights=len(result.insights))
            return result

        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.error("agent_run_error", agent_id=self.agent_id, tick=ctx.tick,
                         error=str(exc), exc_info=True)
            if self._bus:
                await self._bus.publish(AgentMessage(
                    agent_id=self.agent_id,
                    type=MessageType.AGENT_FAILED,
                    payload={"error": str(exc)},
                    sim_id=ctx.sim_id, tick=ctx.tick,
                ))
            return AgentResult(
                agent_id=self.agent_id, domain=self.domain,
                tick=ctx.tick, error=str(exc),
            )

    @abstractmethod
    async def analyze(self, ctx: AgentContext) -> AgentResult:
        """Domain analysis. Must return an AgentResult."""

    async def on_message(self, msg: AgentMessage) -> None:
        """Override to react to bus messages from other agents."""


# ── Agent bus ──────────────────────────────────────────────────────────────────

Subscriber = Callable[[AgentMessage], Coroutine[Any, Any, None]]


class AgentBus:
    """
    Lightweight in-process pub/sub.
    Agents subscribe by MessageType; the bus delivers asynchronously.
    """

    def __init__(self) -> None:
        self._subs: dict[MessageType, list[Subscriber]] = {}
        self._history: list[AgentMessage] = []

    def subscribe(self, msg_type: MessageType, handler: Subscriber) -> None:
        self._subs.setdefault(msg_type, []).append(handler)

    async def publish(self, msg: AgentMessage) -> None:
        self._history.append(msg)
        handlers = self._subs.get(msg.type, [])
        if handlers:
            await asyncio.gather(*[h(msg) for h in handlers], return_exceptions=True)

    def messages_for_tick(self, tick: int) -> list[AgentMessage]:
        return [m for m in self._history if m.tick == tick]

    def clear(self) -> None:
        self._history.clear()
        self._subs.clear()
