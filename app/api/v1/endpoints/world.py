"""
World endpoints — businesses, infrastructure, institutions, elections,
citizen employment and relationships.

Seed:
  POST /simulations/{sim_id}/world/seed          — seed everything at once

Businesses:
  GET  /simulations/{sim_id}/businesses
  GET  /simulations/{sim_id}/businesses/{biz_id}
  GET  /simulations/{sim_id}/businesses/{biz_id}/employees

Infrastructure:
  GET  /simulations/{sim_id}/infrastructure
  GET  /simulations/{sim_id}/infrastructure/{infra_id}

Institutions:
  GET  /simulations/{sim_id}/institutions
  GET  /simulations/{sim_id}/institutions/{inst_id}

Elections:
  GET  /simulations/{sim_id}/elections
  GET  /simulations/{sim_id}/elections/latest

Citizens:
  GET  /simulations/{sim_id}/citizens/{citizen_id}/relationships
  GET  /simulations/{sim_id}/citizens/{citizen_id}/employment
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status

from app.core.dependencies import get_db
from app.core.exceptions import NotFoundError
from app.core.permissions import CurrentUser, PolicyMakerOrAbove, ResearcherOrAbove
from app.services.simulation.election_engine import ElectionEngine
from app.services.simulation.world_seeder import WorldSeeder

router = APIRouter(tags=["world"])

# ── Job registry (fire-and-forget seed) ───────────────────────────────────────
_world_jobs: dict[str, dict[str, Any]] = {}


def _seeder(db=Depends(get_db)) -> WorldSeeder:
    return WorldSeeder(db)


def _elections(db=Depends(get_db)) -> ElectionEngine:
    return ElectionEngine(db)


# ── Seed ──────────────────────────────────────────────────────────────────────

async def _run_world_seed(job_id: str, seeder: WorldSeeder, db,
                           sim_id: str, replace: bool) -> None:
    _world_jobs[job_id]["status"] = "running"
    _world_jobs[job_id]["started_at"] = datetime.now(timezone.utc).isoformat()
    try:
        # Get government id
        gov_r = await db.table("governments").select("id").eq("simulation_id", sim_id).limit(1).execute()
        gov_data = gov_r.data or []
        if not gov_data:
            raise ValueError("No government found for this simulation. Create the simulation first.")
        gov_id = gov_data[0]["id"]

        # Fetch ALL citizen IDs with pagination (Supabase caps at 1000/request)
        citizen_ids: list[str] = []
        page_size = 1000
        offset = 0
        while True:
            cit_r = await (
                db.table("citizens")
                .select("id")
                .eq("simulation_id", sim_id)
                .eq("is_alive", True)
                .range(offset, offset + page_size - 1)
                .execute()
            )
            batch = [r["id"] for r in (cit_r.data or [])]
            citizen_ids.extend(batch)
            if len(batch) < page_size:
                break
            offset += page_size

        if not citizen_ids:
            raise ValueError("No citizens found. Seed the population first.")

        result = await seeder.seed(sim_id, gov_id, citizen_ids, replace=replace)
        _world_jobs[job_id].update(
            status="completed", result=result,
            completed_at=datetime.now(timezone.utc).isoformat()
        )
    except Exception as exc:
        _world_jobs[job_id].update(
            status="failed", error=str(exc),
            completed_at=datetime.now(timezone.utc).isoformat()
        )


@router.post(
    "/simulations/{sim_id}/world/seed",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[PolicyMakerOrAbove],
)
async def seed_world(
    sim_id: str,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    replace: bool = Query(default=False, description="Delete existing world data before seeding"),
    seeder: WorldSeeder = Depends(_seeder),
    db=Depends(get_db),
) -> dict:
    """
    Fire-and-forget: seeds businesses, infrastructure, institutions, and
    citizen relationships. Requires population to exist first.
    Poll GET /simulations/{sim_id}/world/jobs/{job_id} for status.
    """
    job_id = str(uuid.uuid4())
    _world_jobs[job_id] = {
        "job_id":       job_id,
        "sim_id":       sim_id,
        "status":       "pending",
        "created_at":   datetime.now(timezone.utc).isoformat(),
        "started_at":   None,
        "completed_at": None,
        "result":       None,
        "error":        None,
    }
    background_tasks.add_task(_run_world_seed, job_id, seeder, db, sim_id, replace)
    return {
        "job_id":   job_id,
        "status":   "pending",
        "sim_id":   sim_id,
        "poll_url": f"/simulations/{sim_id}/world/jobs/{job_id}",
    }


@router.get(
    "/simulations/{sim_id}/world/jobs/{job_id}",
    dependencies=[ResearcherOrAbove],
)
async def get_world_seed_job(sim_id: str, job_id: str) -> dict:
    """Poll status of a world seeding job."""
    job = _world_jobs.get(job_id)
    if not job or job["sim_id"] != sim_id:
        raise NotFoundError(f"Job {job_id} not found")
    return job


# ── Businesses ────────────────────────────────────────────────────────────────

@router.get(
    "/simulations/{sim_id}/businesses",
    dependencies=[ResearcherOrAbove],
)
async def list_businesses(
    sim_id: str,
    sector: str | None = Query(default=None),
    size:   str | None = Query(default=None),
    region: str | None = Query(default=None),
    limit:  int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db=Depends(get_db),
) -> dict:
    q = db.table("businesses").select("*").eq("simulation_id", sim_id).eq("is_active", True)
    if sector: q = q.eq("sector", sector)
    if size:   q = q.eq("size", size)
    if region: q = q.eq("region", region)
    r = await q.order("revenue", desc=True).range(offset, offset + limit - 1).execute()
    return {"simulation_id": sim_id, "businesses": r.data or [], "offset": offset, "limit": limit}


@router.get(
    "/simulations/{sim_id}/businesses/{biz_id}",
    dependencies=[ResearcherOrAbove],
)
async def get_business(sim_id: str, biz_id: str, db=Depends(get_db)) -> dict:
    r = await db.table("businesses").select("*").eq("id", biz_id).eq("simulation_id", sim_id).limit(1).execute()
    if not r.data:
        raise NotFoundError(f"Business {biz_id} not found")
    return r.data[0]


@router.get(
    "/simulations/{sim_id}/businesses/{biz_id}/employees",
    dependencies=[ResearcherOrAbove],
)
async def get_business_employees(
    sim_id: str, biz_id: str,
    limit:  int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db=Depends(get_db),
) -> dict:
    biz = await (
        db.table("businesses")
        .select("id")
        .eq("id", biz_id)
        .eq("simulation_id", sim_id)
        .limit(1)
        .execute()
    )
    if not biz.data:
        raise NotFoundError(f"Business {biz_id} not found")

    r = await (
        db.table("citizen_employment")
        .select("*, citizens(first_name, last_name, age, occupation, income)")
        .eq("business_id", biz_id)
        .eq("is_active", True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return {"business_id": biz_id, "employees": r.data or [], "offset": offset, "limit": limit}


# ── Infrastructure ────────────────────────────────────────────────────────────

@router.get(
    "/simulations/{sim_id}/infrastructure",
    dependencies=[ResearcherOrAbove],
)
async def list_infrastructure(
    sim_id: str,
    type:   str | None = Query(default=None),
    region: str | None = Query(default=None),
    limit:  int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db=Depends(get_db),
) -> dict:
    q = db.table("infrastructure").select("*").eq("simulation_id", sim_id)
    if type:   q = q.eq("type", type)
    if region: q = q.eq("region", region)
    r = await q.order("quality_score", desc=True).range(offset, offset + limit - 1).execute()
    return {"simulation_id": sim_id, "infrastructure": r.data or []}


@router.get(
    "/simulations/{sim_id}/infrastructure/{infra_id}",
    dependencies=[ResearcherOrAbove],
)
async def get_infrastructure(sim_id: str, infra_id: str, db=Depends(get_db)) -> dict:
    r = await db.table("infrastructure").select("*").eq("id", infra_id).eq("simulation_id", sim_id).limit(1).execute()
    if not r.data:
        raise NotFoundError(f"Infrastructure {infra_id} not found")
    return r.data[0]


# ── Institutions ──────────────────────────────────────────────────────────────

@router.get(
    "/simulations/{sim_id}/institutions",
    dependencies=[ResearcherOrAbove],
)
async def list_institutions(
    sim_id: str,
    type:   str | None = Query(default=None),
    region: str | None = Query(default=None),
    limit:  int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db=Depends(get_db),
) -> dict:
    q = db.table("institutions").select("*").eq("simulation_id", sim_id)
    if type:   q = q.eq("type", type)
    if region: q = q.eq("region", region)
    r = await q.order("effectiveness_score", desc=True).range(offset, offset + limit - 1).execute()
    return {"simulation_id": sim_id, "institutions": r.data or []}


@router.get(
    "/simulations/{sim_id}/institutions/{inst_id}",
    dependencies=[ResearcherOrAbove],
)
async def get_institution(sim_id: str, inst_id: str, db=Depends(get_db)) -> dict:
    r = await db.table("institutions").select("*").eq("id", inst_id).eq("simulation_id", sim_id).limit(1).execute()
    if not r.data:
        raise NotFoundError(f"Institution {inst_id} not found")
    return r.data[0]


# ── Elections ─────────────────────────────────────────────────────────────────

@router.get(
    "/simulations/{sim_id}/elections",
    dependencies=[ResearcherOrAbove],
)
async def list_elections(
    sim_id: str,
    limit:  int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    elections: ElectionEngine = Depends(_elections),
) -> dict:
    data = await elections.get_elections(sim_id, limit=limit, offset=offset)
    return {"simulation_id": sim_id, "elections": data}


@router.get(
    "/simulations/{sim_id}/elections/latest",
    dependencies=[ResearcherOrAbove],
)
async def get_latest_election(
    sim_id: str,
    elections: ElectionEngine = Depends(_elections),
) -> dict:
    data = await elections.get_latest(sim_id)
    if not data:
        raise NotFoundError("No completed elections yet for this simulation")
    return data


@router.post(
    "/simulations/{sim_id}/elections/trigger",
    dependencies=[PolicyMakerOrAbove],
)
async def trigger_election(
    sim_id: str,
    current_user: CurrentUser,
    db=Depends(get_db),
    elections: ElectionEngine = Depends(_elections),
) -> dict:
    """Manually trigger an election (admin/policy-maker only)."""
    gov_r = await db.table("governments").select("id").eq("simulation_id", sim_id).limit(1).execute()
    if not gov_r.data:
        raise NotFoundError("No government found for this simulation")
    gov_id = gov_r.data[0]["id"]

    sim_r = await db.table("simulations").select("current_tick").eq("id", sim_id).limit(1).execute()
    tick = (sim_r.data or [{}])[0].get("current_tick", 0)

    result = await elections._run_election(sim_id, gov_id, tick)
    return result


# ── Citizen relationships + employment ────────────────────────────────────────

@router.get(
    "/simulations/{sim_id}/citizens/{citizen_id}/relationships",
    dependencies=[ResearcherOrAbove],
)
async def get_citizen_relationships(
    sim_id: str, citizen_id: str,
    limit:  int = Query(default=50, ge=1, le=200),
    db=Depends(get_db),
) -> dict:
    r = await (
        db.table("citizen_relationships")
        .select("*")
        .eq("simulation_id", sim_id)
        .or_(f"citizen_a_id.eq.{citizen_id},citizen_b_id.eq.{citizen_id}")
        .limit(limit)
        .execute()
    )
    return {"citizen_id": citizen_id, "relationships": r.data or []}


@router.get(
    "/simulations/{sim_id}/citizens/{citizen_id}/employment",
    dependencies=[ResearcherOrAbove],
)
async def get_citizen_employment(
    sim_id: str, citizen_id: str,
    db=Depends(get_db),
) -> dict:
    citizen = await (
        db.table("citizens")
        .select("id")
        .eq("id", citizen_id)
        .eq("simulation_id", sim_id)
        .limit(1)
        .execute()
    )
    if not citizen.data:
        raise NotFoundError(f"Citizen {citizen_id} not found")

    r = await (
        db.table("citizen_employment")
        .select("*, businesses(name, sector, size, region)")
        .eq("citizen_id", citizen_id)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    data = r.data or []
    return {"citizen_id": citizen_id, "employment": data[0] if data else None}


# ── World overview ────────────────────────────────────────────────────────────

@router.get(
    "/simulations/{sim_id}/world",
    dependencies=[ResearcherOrAbove],
)
async def get_world_overview(sim_id: str, db=Depends(get_db)) -> dict:
    """Single endpoint returning counts + averages for all world entities."""
    biz_ids_r = await (
        db.table("businesses")
        .select("id")
        .eq("simulation_id", sim_id)
        .eq("is_active", True)
        .execute()
    )
    business_ids = [row["id"] for row in (biz_ids_r.data or [])]

    employment_query = (
        db.table("citizen_employment")
        .select("id", count="exact")
        .eq("is_active", True)
    )
    if business_ids:
        employment_query = employment_query.in_("business_id", business_ids)

    results = await asyncio.gather(
        db.table("businesses").select("id", count="exact").eq("simulation_id", sim_id).eq("is_active", True).execute(),
        employment_query.execute() if business_ids else _empty_count(),
        db.table("citizen_relationships").select("id", count="exact").eq("simulation_id", sim_id).execute(),
        db.table("infrastructure").select("quality_score").eq("simulation_id", sim_id).eq("is_operational", True).execute(),
        db.table("institutions").select("effectiveness_score,trust_score").eq("simulation_id", sim_id).execute(),
        db.table("elections").select("id", count="exact").eq("simulation_id", sim_id).execute(),
        return_exceptions=True,
    )

    def _safe_count(r):
        if isinstance(r, Exception): return 0
        return r.count or len(r.data or [])

    def _safe_avg(r, key):
        if isinstance(r, Exception) or not r.data: return None
        vals = [float(row[key]) for row in r.data if row.get(key) is not None]
        return round(sum(vals) / len(vals), 2) if vals else None

    biz_r, emp_r, rel_r, infra_r, inst_r, elec_r = results
    return {
        "simulation_id":        sim_id,
        "businesses":           _safe_count(biz_r),
        "employed_citizens":    _safe_count(emp_r),
        "relationships":        _safe_count(rel_r),
        "infrastructure_nodes": _safe_count(infra_r) if not isinstance(infra_r, Exception) else 0,
        "avg_infra_quality":    _safe_avg(infra_r, "quality_score"),
        "institutions":         _safe_count(inst_r) if not isinstance(inst_r, Exception) else 0,
        "avg_institution_effectiveness": _safe_avg(inst_r, "effectiveness_score"),
        "avg_institution_trust":         _safe_avg(inst_r, "trust_score"),
        "elections_held":       _safe_count(elec_r),
    }


async def _empty_count():
    class EmptyResult:
        count = 0
        data = []

    return EmptyResult()
