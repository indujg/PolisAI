from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import get_db  # noqa: F401 — re-exported from core
from app.services.analytics.service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _svc(db=Depends(get_db)) -> AnalyticsService:
    return AnalyticsService(db)


@router.get("")
async def get_analytics(
    simulation_id: str = Query(..., description="Simulation to analyse"),
    svc: AnalyticsService = Depends(_svc),
) -> dict:
    """
    Current KPI snapshot + trend lines for one simulation.

    Returns charts-ready `chart_series` (bar/radar) and per-field `trends`
    (line charts) covering all ticks on record.
    """
    return await svc.get_analytics(simulation_id)


@router.get("/dashboard")
async def get_dashboard(
    limit: int = Query(default=10, ge=1, le=50,
                       description="Max number of simulations to include"),
    svc: AnalyticsService = Depends(_svc),
) -> dict:
    """
    Multi-simulation dashboard overview.

    Returns the latest KPI snapshot per simulation and global averages
    across all loaded simulations.  Suited for overview cards/grids.
    """
    return await svc.get_dashboard(limit=limit)


@router.get("/reports")
async def get_reports(
    simulation_id: str = Query(..., description="Simulation to report on"),
    fields: str | None = Query(
        default=None,
        description="Comma-separated KPI fields to include; defaults to all",
    ),
    from_tick: int = Query(default=0, ge=0),
    to_tick: int | None = Query(default=None, ge=0),
    svc: AnalyticsService = Depends(_svc),
) -> dict:
    """
    Full time-series KPI report as charts-ready series arrays.

    Each field returns `{series: [{tick, value}], min, max, latest, change}`.
    Use `fields` to select a subset (e.g. `gdp_index,happiness_index`).
    """
    field_list: list[str] | None = None
    if fields:
        _valid = {
            "gdp_index", "happiness_index", "pollution_index",
            "traffic_index", "healthcare_index", "education_index",
            "wellbeing_score",
        }
        field_list = [f.strip() for f in fields.split(",") if f.strip() in _valid]
        if not field_list:
            field_list = None   # invalid fields → return all

    return await svc.get_reports(
        simulation_id, fields=field_list,
        from_tick=from_tick, to_tick=to_tick,
    )


@router.get("/simulation/{sim_id}/summary")
async def get_simulation_summary(
    sim_id: str,
    svc: AnalyticsService = Depends(_svc),
) -> dict:
    """
    Comprehensive single-simulation summary.

    Combines: simulation metadata, government stats, population count,
    KPI first/latest/delta, full trend series, policies list, events list.
    One call gives a frontend everything needed for a simulation detail page.
    """
    return await svc.get_simulation_summary(sim_id)
