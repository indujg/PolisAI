"""
AgentRegistry — maps agent_id → BaseAgent instances.

All 6 domain agents register here at startup. The orchestrator resolves
agents from the registry so new agents can be added without touching orchestration.
"""

from __future__ import annotations

from app.agents.base import BaseAgent
from app.core.logging import get_logger

logger = get_logger(__name__)


class AgentRegistry:
    def __init__(self) -> None:
        self._agents: dict[str, BaseAgent] = {}

    def register(self, agent: BaseAgent) -> None:
        if agent.agent_id in self._agents:
            logger.warning("agent_already_registered", agent_id=agent.agent_id)
            return
        self._agents[agent.agent_id] = agent
        logger.info("agent_registered", agent_id=agent.agent_id, domain=agent.domain)

    def get(self, agent_id: str) -> BaseAgent:
        agent = self._agents.get(agent_id)
        if agent is None:
            raise KeyError(f"Agent '{agent_id}' not registered")
        return agent

    def all(self) -> list[BaseAgent]:
        return list(self._agents.values())

    def ids(self) -> list[str]:
        return list(self._agents.keys())

    def __len__(self) -> int:
        return len(self._agents)


# ── Application singleton ──────────────────────────────────────────────────────

_registry: AgentRegistry | None = None


def get_registry() -> AgentRegistry:
    global _registry
    if _registry is None:
        _registry = AgentRegistry()
    return _registry


def build_default_registry() -> AgentRegistry:
    """Create and populate the registry with all 6 domain agents."""
    from app.agents.domains.economy     import EconomyAgent
    from app.agents.domains.climate     import ClimateAgent
    from app.agents.domains.healthcare  import HealthcareAgent
    from app.agents.domains.governance  import GovernanceAgent
    from app.agents.domains.mobility    import MobilityAgent
    from app.agents.domains.news        import NewsAgent

    reg = get_registry()
    for agent in [
        EconomyAgent(),
        ClimateAgent(),
        HealthcareAgent(),
        GovernanceAgent(),
        MobilityAgent(),
        NewsAgent(),
    ]:
        reg.register(agent)

    return reg
