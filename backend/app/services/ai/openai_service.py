"""
OpenAI Agents SDK service for PolisAI.

Wraps the openai-agents SDK with:
- Per-feature Agent instances with specialized instructions
- asyncio.Semaphore rate limiting (AI_MAX_CONCURRENT concurrent calls)
- Exponential-backoff retry (AI_MAX_RETRIES attempts)
- Structured error handling (OpenAIError → ServiceUnavailableError)
- Result caching via a simple in-memory LRU for identical prompts

Usage:
    svc = get_ai_service()
    result = await svc.analyse_policy(policy, simulation, metrics)
"""

from __future__ import annotations

import asyncio
import hashlib
from collections import OrderedDict
from typing import Any

from agents import Agent, Runner
from openai import APIConnectionError, APIStatusError, RateLimitError

from app.core.exceptions import ServiceUnavailableError, ValidationError
from app.core.logging import get_logger
from app.services.ai import prompts as P

logger = get_logger(__name__)

# Simple LRU size — avoid re-generating identical prompts within a session
_CACHE_SIZE = 64


class _LRUCache:
    def __init__(self, maxsize: int) -> None:
        self._store: OrderedDict[str, str] = OrderedDict()
        self._max = maxsize

    def get(self, key: str) -> str | None:
        if key in self._store:
            self._store.move_to_end(key)
            return self._store[key]
        return None

    def set(self, key: str, value: str) -> None:
        self._store[key] = value
        self._store.move_to_end(key)
        if len(self._store) > self._max:
            self._store.popitem(last=False)


class OpenAIService:
    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4o-mini",
        max_concurrent: int = 5,
        max_retries: int = 3,
        retry_delay: float = 1.0,
    ) -> None:
        if not api_key:
            raise ValidationError(
                "OPENAI_API_KEY is not set. Add it to your .env file to use AI features."
            )

        import os
        os.environ["OPENAI_API_KEY"] = api_key

        self._model        = model
        self._semaphore    = asyncio.Semaphore(max_concurrent)
        self._max_retries  = max_retries
        self._retry_delay  = retry_delay
        self._cache        = _LRUCache(_CACHE_SIZE)

        # One Agent per feature — each has specialized instructions
        self._policy_agent = Agent(
            name="PolisAI Policy Analyst",
            instructions=P.POLICY_ANALYST_INSTRUCTIONS,
            model=model,
        )
        self._narrator_agent = Agent(
            name="PolisAI Simulation Narrator",
            instructions=P.SIMULATION_NARRATOR_INSTRUCTIONS,
            model=model,
        )
        self._journalist_agent = Agent(
            name="PolisAI News Journalist",
            instructions=P.NEWS_JOURNALIST_INSTRUCTIONS,
            model=model,
        )
        self._advisor_agent = Agent(
            name="PolisAI Policy Advisor",
            instructions=P.ADVISOR_INSTRUCTIONS,
            model=model,
        )

    # ── Public API ─────────────────────────────────────────────────────────────

    async def analyse_policy(
        self,
        policy: dict[str, Any],
        simulation: dict[str, Any],
        current_metrics: dict[str, Any],
        projection: dict[str, Any] | None = None,
    ) -> str:
        prompt = P.policy_analysis_prompt(policy, simulation, current_metrics, projection)
        return await self._run(self._policy_agent, prompt, feature="policy_analysis")

    async def explain_simulation(
        self,
        simulation: dict[str, Any],
        current_metrics: dict[str, Any],
        previous_metrics: dict[str, Any] | None,
        active_policies: list[dict[str, Any]],
        recent_events: list[dict[str, Any]],
        agent_insights: list[str] | None = None,
    ) -> str:
        prompt = P.simulation_explanation_prompt(
            simulation, current_metrics, previous_metrics,
            active_policies, recent_events, agent_insights,
        )
        return await self._run(self._narrator_agent, prompt, feature="simulation_explanation")

    async def generate_news(
        self,
        tick: int,
        sim_name: str,
        metrics: dict[str, Any],
        headlines: list[dict[str, Any]],
        active_policies: list[dict[str, Any]],
        alerts: list[dict[str, Any]],
    ) -> str:
        prompt = P.news_article_prompt(tick, sim_name, metrics, headlines, active_policies, alerts)
        return await self._run(self._journalist_agent, prompt, feature="news_generation")

    async def generate_recommendations(
        self,
        simulation: dict[str, Any],
        current_metrics: dict[str, Any],
        active_policies: list[dict[str, Any]],
        agent_analysis: list[str],
        alerts: list[dict[str, Any]],
        government: dict[str, Any] | None = None,
    ) -> str:
        prompt = P.recommendations_prompt(
            simulation, current_metrics, active_policies,
            agent_analysis, alerts, government,
        )
        return await self._run(self._advisor_agent, prompt, feature="recommendations")

    # ── Core runner: semaphore + retry + cache ─────────────────────────────────

    async def _run(self, agent: Agent, prompt: str, feature: str) -> str:
        cache_key = hashlib.md5(f"{agent.name}:{prompt}".encode()).hexdigest()
        cached = self._cache.get(cache_key)
        if cached:
            logger.debug("ai_cache_hit", feature=feature)
            return cached

        async with self._semaphore:
            result = await self._run_with_retry(agent, prompt, feature)

        self._cache.set(cache_key, result)
        return result

    async def _run_with_retry(self, agent: Agent, prompt: str, feature: str) -> str:
        last_exc: Exception | None = None
        delay = self._retry_delay

        for attempt in range(1, self._max_retries + 1):
            try:
                logger.info("ai_request", feature=feature, attempt=attempt, model=self._model)
                result = await Runner.run(agent, prompt)
                text = result.final_output or ""
                logger.info("ai_response", feature=feature, chars=len(text))
                return text

            except RateLimitError as exc:
                last_exc = exc
                wait = delay * (2 ** (attempt - 1))
                logger.warning("ai_rate_limit", feature=feature, attempt=attempt,
                               retry_in=wait)
                await asyncio.sleep(wait)

            except APIConnectionError as exc:
                last_exc = exc
                wait = delay * (2 ** (attempt - 1))
                logger.warning("ai_connection_error", feature=feature, attempt=attempt,
                               error=str(exc), retry_in=wait)
                await asyncio.sleep(wait)

            except APIStatusError as exc:
                # 4xx (except 429) are not retryable
                logger.error("ai_api_error", feature=feature, status=exc.status_code,
                             error=str(exc))
                raise ServiceUnavailableError(
                    f"OpenAI API error {exc.status_code}: {exc.message}"
                ) from exc

            except Exception as exc:
                last_exc = exc
                logger.error("ai_unexpected_error", feature=feature, error=str(exc))
                if attempt == self._max_retries:
                    break
                await asyncio.sleep(delay)

        raise ServiceUnavailableError(
            f"AI generation failed after {self._max_retries} attempts: {last_exc}"
        ) from last_exc


# ── Application singleton ──────────────────────────────────────────────────────

_ai_service: OpenAIService | None = None


def get_ai_service() -> OpenAIService:
    global _ai_service
    if _ai_service is None:
        from app.config import get_settings
        s = get_settings()
        _ai_service = OpenAIService(
            api_key=s.OPENAI_API_KEY,
            model=s.OPENAI_MODEL,
            max_concurrent=s.AI_MAX_CONCURRENT,
            max_retries=s.AI_MAX_RETRIES,
            retry_delay=s.AI_RETRY_DELAY,
        )
    return _ai_service


def reset_ai_service() -> None:
    """Force recreation on next get_ai_service() call. Used in tests."""
    global _ai_service
    _ai_service = None
