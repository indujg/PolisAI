"""
Agent orchestration endpoints.

GET  /agents              — list all registered agents + status
POST /agents/run/{sim_id} — run all agents for one tick (manual trigger)
GET  /agents/{agent_id}   — get single agent info
"""

from uuid import UUID

from fastapi import APIRouter, Query

from app.agents.orchestrator import AgentOrchestrator
from app.agents.registry import get_registry
from app.core.exceptions import NotFoundError, ValidationError
from app.core.permissions import PolicyMakerOrAbove, ResearcherOrAbove
from app.db.supabase import get_supabase_admin

router = APIRouter(prefix="/agents", tags=["agents"])


def _build_context(sim: dict, gov: dict, policies: list, events: list,
                   metrics: dict, citizens: list, tick: int):
    from app.agents.base import AgentContext
    return AgentContext(
        sim_id=sim["id"], tick=tick,
        simulation=sim, government=gov or {},
        active_policies=policies, active_events=events,
        last_metrics=metrics, citizen_sample=citizens,
    )


@router.get("", dependencies=[ResearcherOrAbove])
async def list_agents():
    """List all registered domain agents."""
    registry = get_registry()
    return {
        "agents": [
            {"agent_id": a.agent_id, "domain": a.domain}
            for a in registry.all()
        ],
        "count": len(registry),
    }


@router.get("/{agent_id}", dependencies=[ResearcherOrAbove])
async def get_agent(agent_id: str):
    """Get a single agent by ID."""
    registry = get_registry()
    try:
        agent = registry.get(agent_id)
    except KeyError:
        raise NotFoundError(f"Agent '{agent_id}' not found")
    return {"agent_id": agent.agent_id, "domain": agent.domain}


@router.post("/run/{sim_id}", dependencies=[PolicyMakerOrAbove])
async def run_agents(
    sim_id: UUID,
    ticks:  int = Query(default=1, ge=1, le=10),
    timeout: float = Query(default=10.0, ge=1.0, le=60.0),
):
    """
    Manually trigger one or more agent ticks for a simulation.
    Runs all 6 domain agents concurrently and returns a TickReport per tick.

    Does NOT mutate the simulation's citizen states — this is a read+analyze
    layer on top of the existing simulation engine.
    """
    db = get_supabase_admin()
    registry = get_registry()

    if len(registry) == 0:
        raise ValidationError("No agents registered — call build_default_registry() at startup")

    # Load simulation
    sim_r = await db.table("simulations").select("*").eq("id", str(sim_id)).limit(1).execute()
    if not sim_r.data:
        raise NotFoundError("Simulation not found")
    sim = sim_r.data[0]

    if sim["status"] not in ("running", "paused", "draft"):
        raise ValidationError(f"Simulation is {sim['status']} — cannot run agents")

    # Load supporting data
    gov_r = await db.table("governments").select("*").eq("simulation_id", str(sim_id)).limit(1).execute()
    gov = gov_r.data[0] if gov_r.data else {}

    pol_r = await db.table("policies").select("*").eq("simulation_id", str(sim_id)).eq("status", "active").execute()
    policies = pol_r.data or []

    evt_r = await db.table("events").select("*").eq("simulation_id", str(sim_id)).eq("is_active", True).execute()
    events = evt_r.data or []

    # Last metrics snapshot
    met_r = (await db.table("simulation_results")
             .select("metrics").eq("simulation_id", str(sim_id))
             .order("tick", desc=True).limit(1).execute())
    metrics = met_r.data[0]["metrics"] if met_r.data else _default_metrics()

    # Citizen sample (up to 200)
    cit_r = (await db.table("citizens")
             .select("id,age,income,wealth,happiness_score,health_score,stress_score,"
                     "education_level,political_alignment")
             .eq("simulation_id", str(sim_id)).eq("is_alive", True)
             .limit(200).execute())
    citizens = cit_r.data or []

    orchestrator = AgentOrchestrator(registry)
    reports = []
    current_tick = sim["current_tick"]

    for i in range(ticks):
        ctx = _build_context(sim, gov, policies, events, metrics,
                             citizens, current_tick + i + 1)
        report = await orchestrator.run_tick(ctx, timeout_seconds=timeout)
        metrics = report.merged_metrics   # feed forward
        reports.append(_serialise_report(report))

    return {
        "sim_id": str(sim_id),
        "ticks_run": ticks,
        "reports": reports,
    }


def _serialise_report(report) -> dict:
    return {
        "tick":           report.tick,
        "success_count":  report.success_count,
        "error_count":    report.error_count,
        "merged_metrics": report.merged_metrics,
        "all_insights":   report.all_insights,
        "all_alerts":     report.all_alerts,
        "errors":         report.errors,
        "agent_results": [
            {
                "agent_id": r.agent_id,
                "domain":   r.domain,
                "insights": r.insights,
                "metrics":  r.metrics,
                "alerts":   r.alerts,
                "error":    r.error,
            }
            for r in report.agent_results
        ],
        "news": next(
            (
                r.messages[0].payload
                for r in report.agent_results
                if r.agent_id == "news" and r.messages
            ),
            None,
        ),
    }


def _default_metrics() -> dict:
    return {
        "avg_happiness": 50.0, "avg_health": 50.0, "avg_income": 30000.0,
        "gdp": 30_000_000.0, "unemployment_rate": 5.0, "gini_coefficient": 0.35,
        "crime_rate": 10.0, "literacy_rate": 70.0, "life_expectancy": 72.0,
        "approval_rating": 50.0, "population": 1000,
    }
