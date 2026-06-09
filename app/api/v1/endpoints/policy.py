from uuid import UUID

from fastapi import APIRouter, Query, status

from app.core.exceptions import ValidationError
from app.core.permissions import CurrentUser, PolicyMakerOrAbove, ResearcherOrAbove
from app.db.supabase import get_supabase_admin
from app.schemas.civilization import (
    PolicyActivateRequest,
    PolicyCreate,
    PolicyResponse,
    PolicySimulateRequest,
    PolicySimulateResponse,
    PolicyUpdate,
)
from app.services.policy.service import PolicyService

router = APIRouter(prefix="/policies", tags=["policy"])


def _svc() -> PolicyService:
    return PolicyService(get_supabase_admin())


# ── CRUD ───────────────────────────────────────────────────────────────────────

@router.post("", response_model=PolicyResponse, status_code=status.HTTP_201_CREATED,
             dependencies=[PolicyMakerOrAbove])
async def create_policy(body: PolicyCreate):
    svc = _svc()
    return await svc.create(body.model_dump())


@router.get("", dependencies=[ResearcherOrAbove])
async def list_policies(
    simulation_id: UUID,
    status_filter: str | None = Query(default=None, alias="status"),
    category:      str | None = Query(default=None),
    government_id: UUID | None = Query(default=None),
):
    svc = _svc()
    return await svc.list(
        simulation_id=str(simulation_id),
        status=status_filter,
        category=category,
        government_id=str(government_id) if government_id else None,
    )


@router.get("/{policy_id}", response_model=PolicyResponse, dependencies=[ResearcherOrAbove])
async def get_policy(policy_id: UUID):
    svc = _svc()
    return await svc.get(str(policy_id))


@router.patch("/{policy_id}", response_model=PolicyResponse, dependencies=[PolicyMakerOrAbove])
async def update_policy(policy_id: UUID, body: PolicyUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise ValidationError("No fields to update")
    svc = _svc()
    return await svc.update(str(policy_id), updates)


@router.delete("/{policy_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[PolicyMakerOrAbove])
async def delete_policy(policy_id: UUID):
    svc = _svc()
    await svc.delete(str(policy_id))


# ── Lifecycle ──────────────────────────────────────────────────────────────────

@router.post("/{policy_id}/activate", response_model=PolicyResponse,
             dependencies=[PolicyMakerOrAbove])
async def activate_policy(policy_id: UUID, body: PolicyActivateRequest):
    """
    Mark a policy as active (enacted). Pass the simulation's current_tick
    so the engine can track when the policy was enacted.
    """
    svc = _svc()
    return await svc.activate(str(policy_id), body.current_tick)


@router.post("/{policy_id}/deactivate", response_model=PolicyResponse,
             dependencies=[PolicyMakerOrAbove])
async def deactivate_policy(policy_id: UUID, body: PolicyActivateRequest):
    """Repeal an active policy, stamping the current tick."""
    svc = _svc()
    return await svc.deactivate(str(policy_id), body.current_tick)


# ── Impact Simulation ──────────────────────────────────────────────────────────

@router.post("/{policy_id}/simulate", response_model=PolicySimulateResponse,
             dependencies=[ResearcherOrAbove])
async def simulate_policy(policy_id: UUID, body: PolicySimulateRequest):
    """
    Run the analytical Policy Impact Model for this policy over n_ticks.

    Does NOT mutate simulation state — purely a read + forecast operation.
    Returns projected metrics, per-metric delta, confidence score, and key insights.

    Examples:
      - EV subsidy (environmental, +budget): health↑, income↓ short-term
      - UBI (social, high +budget): happiness↑↑, income↑↑, crime↓
      - Carbon tax (environmental, -budget): health↑, income↓, GDP↓ short-term
      - Metro expansion (infrastructure, +budget): income↑, happiness↑, GDP↑
    """
    svc = _svc()
    projection = await svc.simulate(str(policy_id), body.n_ticks)
    return PolicySimulateResponse(
        policy_id=projection.policy_id,
        n_ticks=projection.n_ticks,
        current_metrics=projection.current_metrics,
        projected_metrics=projection.projected_metrics,
        delta=projection.delta,
        confidence_score=projection.confidence_score,
        key_insights=projection.key_insights,
    )
