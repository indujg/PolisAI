from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import get_db
from app.core.exceptions import NotFoundError
from app.core.permissions import CurrentUser, PolicyMakerOrAbove, ResearcherOrAbove
from app.db.supabase import get_supabase_admin
from app.schemas.civilization import (
    SimulationCreate, SimulationResponse, SimulationResultResponse, SimulationUpdate,
)
from app.services.simulation.service import SimulationService

router = APIRouter(prefix="/simulations", tags=["simulation"])


def _svc(db=Depends(get_db)) -> SimulationService:
    return SimulationService(db)


# ── CRUD ───────────────────────────────────────────────────────────────────────

@router.post("", response_model=SimulationResponse, status_code=status.HTTP_201_CREATED,
             dependencies=[PolicyMakerOrAbove])
async def create_simulation(
    body: SimulationCreate,
    current_user: CurrentUser,
    svc: SimulationService = Depends(_svc),
):
    return await svc.create(body.model_dump(), owner_id=str(current_user.id))


@router.get("", dependencies=[ResearcherOrAbove])
async def list_simulations(
    current_user: CurrentUser,
    status_filter: str | None = Query(default=None, alias="status"),
    limit:  int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0,  ge=0),
    svc: SimulationService = Depends(_svc),
):
    return await svc.list_for_owner(
        str(current_user.id), status=status_filter, limit=limit, offset=offset
    )


@router.get("/{sim_id}", dependencies=[ResearcherOrAbove])
async def get_simulation(
    sim_id: UUID,
    svc: SimulationService = Depends(_svc),
):
    return await svc.get(str(sim_id))


@router.patch("/{sim_id}", dependencies=[PolicyMakerOrAbove])
async def update_simulation(
    sim_id: UUID,
    body: SimulationUpdate,
    current_user: CurrentUser,
    svc: SimulationService = Depends(_svc),
):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    return await svc.update(str(sim_id), updates, current_user)


@router.delete("/{sim_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[PolicyMakerOrAbove])
async def delete_simulation(
    sim_id: UUID,
    current_user: CurrentUser,
    svc: SimulationService = Depends(_svc),
):
    await svc.delete(str(sim_id), current_user)


# ── Lifecycle ──────────────────────────────────────────────────────────────────

@router.post("/{sim_id}/start", dependencies=[PolicyMakerOrAbove])
async def start_simulation(
    sim_id: UUID,
    current_user: CurrentUser,
    max_ticks: int | None = Query(default=None, ge=1),
    svc: SimulationService = Depends(_svc),
):
    return await svc.start(str(sim_id), current_user, max_ticks=max_ticks)


@router.post("/{sim_id}/pause", dependencies=[PolicyMakerOrAbove])
async def pause_simulation(
    sim_id: UUID,
    current_user: CurrentUser,
    svc: SimulationService = Depends(_svc),
):
    return await svc.pause(str(sim_id), current_user)


@router.post("/{sim_id}/stop", dependencies=[PolicyMakerOrAbove])
async def stop_simulation(
    sim_id: UUID,
    current_user: CurrentUser,
    svc: SimulationService = Depends(_svc),
):
    return await svc.stop(str(sim_id), current_user)


@router.post("/{sim_id}/tick", dependencies=[PolicyMakerOrAbove])
async def manual_tick(
    sim_id: UUID,
    current_user: CurrentUser,
    ticks: int = Query(default=1, ge=1, le=100),
    svc: SimulationService = Depends(_svc),
):
    return await svc.manual_tick(str(sim_id), current_user, ticks=ticks)


# ── State & results ───────────────────────────────────────────────────────────

@router.get("/{sim_id}/state", dependencies=[ResearcherOrAbove])
async def get_simulation_state(
    sim_id: UUID,
    svc: SimulationService = Depends(_svc),
):
    return await svc.get_state(str(sim_id))


@router.get("/{sim_id}/results", dependencies=[ResearcherOrAbove])
async def get_results(
    sim_id: UUID,
    limit:  int = Query(default=50,  ge=1, le=500),
    offset: int = Query(default=0,   ge=0),
):
    db = get_supabase_admin()
    from app.repositories.simulation import SimulationRepository
    repo = SimulationRepository(db)
    return await repo.get_results_page(str(sim_id), limit=limit, offset=offset)


@router.get("/{sim_id}/citizens", dependencies=[ResearcherOrAbove])
async def get_citizens(
    sim_id: UUID,
    limit:  int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0,  ge=0),
):
    from app.repositories.citizen import CitizenRepository
    repo = CitizenRepository(get_supabase_admin())
    return await repo.get_page(str(sim_id), offset=offset, page_size=limit)
