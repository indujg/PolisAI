"""
AI generation endpoints — powered by OpenAI Agents SDK.

POST /ai/policy/{policy_id}/analyse        — policy analysis
POST /ai/simulations/{sim_id}/explain      — simulation explanation
POST /ai/simulations/{sim_id}/news         — news article from latest tick
POST /ai/simulations/{sim_id}/recommend    — actionable recommendations
"""

from uuid import UUID

from fastapi import APIRouter, Query

from app.core.exceptions import NotFoundError, ValidationError
from app.core.permissions import PolicyMakerOrAbove, ResearcherOrAbove
from app.db.supabase import get_supabase_admin
from app.services.ai.openai_service import get_ai_service

router = APIRouter(prefix="/ai", tags=["ai"])


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _load_simulation(sim_id: str) -> dict:
    db = get_supabase_admin()
    r = await db.table("simulations").select("*").eq("id", sim_id).limit(1).execute()
    if not r.data:
        raise NotFoundError("Simulation not found")
    return r.data[0]


async def _load_metrics(sim_id: str, offset: int = 0) -> dict:
    """Returns latest (offset=0) or second-latest (offset=1) metrics snapshot."""
    db = get_supabase_admin()
    r = (await db.table("simulation_results")
         .select("metrics, tick")
         .eq("simulation_id", sim_id)
         .order("tick", desc=True)
         .limit(2)
         .execute())
    rows = r.data or []
    if offset < len(rows):
        return rows[offset]["metrics"] or {}
    return _default_metrics()


async def _load_active_policies(sim_id: str) -> list[dict]:
    db = get_supabase_admin()
    r = (await db.table("policies").select("*")
         .eq("simulation_id", sim_id).eq("status", "active").execute())
    return r.data or []


async def _load_recent_events(sim_id: str, limit: int = 5) -> list[dict]:
    db = get_supabase_admin()
    r = (await db.table("events").select("*")
         .eq("simulation_id", sim_id)
         .order("tick", desc=True).limit(limit).execute())
    return r.data or []


async def _load_government(sim_id: str) -> dict | None:
    db = get_supabase_admin()
    r = (await db.table("governments").select("*")
         .eq("simulation_id", sim_id).limit(1).execute())
    return r.data[0] if r.data else None


def _default_metrics() -> dict:
    return {
        "avg_happiness": 50.0, "avg_health": 50.0, "avg_income": 30000.0,
        "gdp": 30_000_000.0, "unemployment_rate": 5.0, "gini_coefficient": 0.35,
        "crime_rate": 10.0, "literacy_rate": 70.0, "life_expectancy": 72.0,
        "approval_rating": 50.0, "population": 1000,
    }


# ── 1. Policy Analysis ─────────────────────────────────────────────────────────

@router.post("/policy/{policy_id}/analyse", dependencies=[ResearcherOrAbove])
async def analyse_policy(
    policy_id: UUID,
    include_projection: bool = Query(default=True),
):
    """
    Generate an expert AI analysis of a policy using the OpenAI Agents SDK.

    Includes:
    - Policy purpose and design critique
    - Short/long-term impact assessment
    - Risk rating (Low/Medium/High)
    - Comparison to real-world analogues

    If include_projection=true, the analytical impact model runs first and
    its output is fed to the AI as additional context.
    """
    db = get_supabase_admin()
    pol_r = await db.table("policies").select("*").eq("id", str(policy_id)).limit(1).execute()
    if not pol_r.data:
        raise NotFoundError("Policy not found")
    policy = pol_r.data[0]

    sim = await _load_simulation(policy["simulation_id"])
    metrics = await _load_metrics(policy["simulation_id"])

    projection = None
    if include_projection:
        from app.services.policy.service import PolicyService
        svc = PolicyService(db)
        try:
            proj = await svc.simulate(str(policy_id), n_ticks=10)
            projection = {
                "n_ticks": proj.n_ticks,
                "delta": proj.delta,
                "confidence_score": proj.confidence_score,
                "key_insights": proj.key_insights,
            }
        except Exception:
            pass  # projection is optional — proceed without it

    ai = get_ai_service()
    analysis = await ai.analyse_policy(policy, sim, metrics, projection)

    return {
        "policy_id": str(policy_id),
        "policy_name": policy["name"],
        "sim_id": policy["simulation_id"],
        "analysis": analysis,
        "projection_included": projection is not None,
    }


# ── 2. Simulation Explanation ──────────────────────────────────────────────────

@router.post("/simulations/{sim_id}/explain", dependencies=[ResearcherOrAbove])
async def explain_simulation(
    sim_id: UUID,
    include_agent_insights: bool = Query(default=True),
):
    """
    Generate a plain-English explanation of the simulation's current state.

    Compares current tick to the previous snapshot to surface trends.
    Optionally runs a single agent tick to enrich the explanation with
    domain insights (economy, climate, health, governance, mobility, news).
    """
    sim = await _load_simulation(str(sim_id))
    current_metrics  = await _load_metrics(str(sim_id), offset=0)
    previous_metrics = await _load_metrics(str(sim_id), offset=1)
    policies = await _load_active_policies(str(sim_id))
    events   = await _load_recent_events(str(sim_id))

    agent_insights: list[str] = []
    if include_agent_insights:
        try:
            from app.agents.base import AgentContext
            from app.agents.orchestrator import AgentOrchestrator
            from app.agents.registry import get_registry
            db = get_supabase_admin()
            gov_r = await db.table("governments").select("*").eq("simulation_id", str(sim_id)).limit(1).execute()
            gov = gov_r.data[0] if gov_r.data else {}
            cit_r = (await db.table("citizens")
                     .select("id,age,income,happiness_score,health_score,education_level")
                     .eq("simulation_id", str(sim_id)).eq("is_alive", True)
                     .limit(200).execute())
            ctx = AgentContext(
                sim_id=str(sim_id), tick=sim["current_tick"],
                simulation=sim, government=gov,
                active_policies=policies, active_events=events,
                last_metrics=current_metrics, citizen_sample=cit_r.data or [],
            )
            report = await AgentOrchestrator(get_registry()).run_tick(ctx, timeout_seconds=8.0)
            agent_insights = report.all_insights
        except Exception:
            pass

    if not previous_metrics or previous_metrics == current_metrics:
        previous_metrics = None

    ai = get_ai_service()
    explanation = await ai.explain_simulation(
        sim, current_metrics, previous_metrics, policies, events, agent_insights
    )

    return {
        "sim_id": str(sim_id),
        "sim_name": sim["name"],
        "tick": sim["current_tick"],
        "explanation": explanation,
        "agent_insights_used": len(agent_insights),
    }


# ── 3. News Article ────────────────────────────────────────────────────────────

@router.post("/simulations/{sim_id}/news", dependencies=[ResearcherOrAbove])
async def generate_news(sim_id: UUID):
    """
    Generate a news article for the simulation's latest tick.

    Runs all domain agents to get headlines and alerts, then feeds them
    to the AI journalist agent to write a full news article.
    """
    sim = await _load_simulation(str(sim_id))
    metrics  = await _load_metrics(str(sim_id))
    policies = await _load_active_policies(str(sim_id))
    events   = await _load_recent_events(str(sim_id))

    headlines: list[dict] = []
    alerts: list[dict] = []

    try:
        from app.agents.base import AgentContext
        from app.agents.orchestrator import AgentOrchestrator
        from app.agents.registry import get_registry
        db = get_supabase_admin()
        gov_r = await db.table("governments").select("*").eq("simulation_id", str(sim_id)).limit(1).execute()
        gov = gov_r.data[0] if gov_r.data else {}
        cit_r = (await db.table("citizens")
                 .select("id,age,income,happiness_score,health_score,education_level")
                 .eq("simulation_id", str(sim_id)).eq("is_alive", True)
                 .limit(200).execute())
        ctx = AgentContext(
            sim_id=str(sim_id), tick=sim["current_tick"],
            simulation=sim, government=gov,
            active_policies=policies, active_events=events,
            last_metrics=metrics, citizen_sample=cit_r.data or [],
        )
        report = await AgentOrchestrator(get_registry()).run_tick(ctx, timeout_seconds=8.0)
        # Extract headlines from NewsAgent
        news_result = next((r for r in report.agent_results if r.agent_id == "news"), None)
        if news_result and news_result.messages:
            headlines = news_result.messages[0].payload.get("headlines", [])
        alerts = report.all_alerts
    except Exception:
        pass

    if not headlines:
        headlines = [{"category": "general", "headline": f"Simulation tick {sim['current_tick']} complete",
                      "sentiment": "neutral", "priority": 1}]

    ai = get_ai_service()
    article = await ai.generate_news(
        tick=sim["current_tick"],
        sim_name=sim["name"],
        metrics=metrics,
        headlines=headlines,
        active_policies=policies,
        alerts=alerts,
    )

    return {
        "sim_id": str(sim_id),
        "sim_name": sim["name"],
        "tick": sim["current_tick"],
        "article": article,
        "source_headlines": len(headlines),
    }


# ── 4. Recommendations ─────────────────────────────────────────────────────────

@router.post("/simulations/{sim_id}/recommend", dependencies=[PolicyMakerOrAbove])
async def generate_recommendations(sim_id: UUID):
    """
    Generate prioritised, actionable recommendations for the simulation.

    Combines live metrics, active policies, domain agent analysis, and
    active alerts to produce a ranked list of interventions.
    """
    sim = await _load_simulation(str(sim_id))
    metrics  = await _load_metrics(str(sim_id))
    policies = await _load_active_policies(str(sim_id))
    gov      = await _load_government(str(sim_id))

    agent_analysis: list[str] = []
    alerts: list[dict] = []

    try:
        from app.agents.base import AgentContext
        from app.agents.orchestrator import AgentOrchestrator
        from app.agents.registry import get_registry
        db = get_supabase_admin()
        events = await _load_recent_events(str(sim_id))
        cit_r = (await db.table("citizens")
                 .select("id,age,income,happiness_score,health_score,education_level")
                 .eq("simulation_id", str(sim_id)).eq("is_alive", True)
                 .limit(200).execute())
        ctx = AgentContext(
            sim_id=str(sim_id), tick=sim["current_tick"],
            simulation=sim, government=gov or {},
            active_policies=policies, active_events=events,
            last_metrics=metrics, citizen_sample=cit_r.data or [],
        )
        report = await AgentOrchestrator(get_registry()).run_tick(ctx, timeout_seconds=8.0)
        agent_analysis = report.all_insights
        alerts = report.all_alerts
    except Exception:
        pass

    ai = get_ai_service()
    recommendations = await ai.generate_recommendations(
        simulation=sim,
        current_metrics=metrics,
        active_policies=policies,
        agent_analysis=agent_analysis,
        alerts=alerts,
        government=gov,
    )

    return {
        "sim_id": str(sim_id),
        "sim_name": sim["name"],
        "tick": sim["current_tick"],
        "recommendations": recommendations,
        "agent_insights_used": len(agent_analysis),
        "alerts_considered": len(alerts),
    }
