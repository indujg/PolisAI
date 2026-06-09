"""
AgentOrchestrator — runs all registered agents concurrently for each tick.

Pattern:
  1. Build AgentContext from current simulation state.
  2. Attach a fresh AgentBus so agents can message each other.
  3. asyncio.gather all agent.run(ctx) calls — agents run in parallel.
  4. Collect AgentResult list into a TickReport.
  5. Merge agent-computed metrics into the simulation's metric snapshot.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Any

from app.agents.base import AgentBus, AgentContext, AgentMessage, AgentResult, MessageType
from app.agents.registry import AgentRegistry
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class TickReport:
    sim_id:       str
    tick:         int
    agent_results: list[AgentResult]
    merged_metrics: dict[str, Any]     = field(default_factory=dict)
    all_insights:   list[str]          = field(default_factory=list)
    all_alerts:     list[dict[str, Any]] = field(default_factory=list)
    bus_messages:   list[AgentMessage] = field(default_factory=list)
    errors:         list[str]          = field(default_factory=list)

    @property
    def success_count(self) -> int:
        return sum(1 for r in self.agent_results if not r.error)

    @property
    def error_count(self) -> int:
        return sum(1 for r in self.agent_results if r.error)


class AgentOrchestrator:
    def __init__(self, registry: AgentRegistry) -> None:
        self._registry = registry

    async def run_tick(
        self,
        ctx: AgentContext,
        timeout_seconds: float = 10.0,
    ) -> TickReport:
        """
        Run all agents concurrently for one tick.
        Agents that exceed timeout_seconds are cancelled (result marked as error).
        """
        agents = self._registry.all()
        if not agents:
            logger.warning("orchestrator_no_agents", tick=ctx.tick)
            return TickReport(sim_id=ctx.sim_id, tick=ctx.tick, agent_results=[])

        # Fresh bus for this tick
        bus = AgentBus()
        for agent in agents:
            agent.attach_bus(bus)
            # Each agent subscribes to messages from other agents
            bus.subscribe(MessageType.POLICY_EFFECT,  agent.on_message)
            bus.subscribe(MessageType.EVENT_ALERT,    agent.on_message)
            bus.subscribe(MessageType.METRIC_SNAPSHOT, agent.on_message)

        logger.info("orchestrator_tick_start",
                    sim_id=ctx.sim_id, tick=ctx.tick, agents=len(agents))

        # Run all agents concurrently with timeout
        tasks = [asyncio.create_task(agent.run(ctx), name=agent.agent_id)
                 for agent in agents]
        try:
            raw = await asyncio.wait_for(
                asyncio.gather(*tasks, return_exceptions=True),
                timeout=timeout_seconds,
            )
        except asyncio.TimeoutError:
            for t in tasks:
                t.cancel()
            raw = [t.result() if t.done() and not t.cancelled()
                   else AgentResult(agent_id=t.get_name(), domain="unknown",
                                    tick=ctx.tick, error="timeout")
                   for t in tasks]

        results: list[AgentResult] = []
        for item in raw:
            if isinstance(item, Exception):
                results.append(AgentResult(agent_id="unknown", domain="unknown",
                                           tick=ctx.tick, error=str(item)))
            else:
                results.append(item)

        report = self._build_report(ctx, results, bus)
        logger.info("orchestrator_tick_done",
                    sim_id=ctx.sim_id, tick=ctx.tick,
                    success=report.success_count, errors=report.error_count,
                    insights=len(report.all_insights))
        return report

    def _build_report(
        self,
        ctx: AgentContext,
        results: list[AgentResult],
        bus: AgentBus,
    ) -> TickReport:
        merged: dict[str, Any] = dict(ctx.last_metrics)
        all_insights: list[str] = []
        all_alerts:   list[dict[str, Any]] = []
        errors:       list[str] = []

        for result in results:
            if result.error:
                errors.append(f"{result.agent_id}: {result.error}")
                continue

            # Merge agent metrics — later agents can override earlier ones
            # (governance approval overrides sim approval, etc.)
            for key, val in result.metrics.items():
                merged[key] = val

            all_insights.extend(
                f"[{result.domain.upper()}] {ins}" for ins in result.insights
            )
            all_alerts.extend(result.alerts)

        return TickReport(
            sim_id=ctx.sim_id,
            tick=ctx.tick,
            agent_results=results,
            merged_metrics=merged,
            all_insights=all_insights,
            all_alerts=all_alerts,
            bus_messages=bus.messages_for_tick(ctx.tick),
            errors=errors,
        )
