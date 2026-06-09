"""
Population endpoints — seed, inspect, and reset citizen populations.

POST /simulations/{sim_id}/population/seed
  Fire-and-forget: kicks off background seeding, returns job_id immediately.

GET  /simulations/{sim_id}/population/jobs/{job_id}
  Poll seeding job status (pending / running / completed / failed).

GET  /simulations/{sim_id}/population/stats
  Aggregate demographics snapshot.

DELETE /simulations/{sim_id}/population
  Wipe all citizens.
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, status
from pydantic import BaseModel, Field

from app.core.dependencies import get_db
from app.core.exceptions import NotFoundError
from app.core.permissions import CurrentUser, PolicyMakerOrAbove, ResearcherOrAbove
from app.repositories.citizen import CitizenRepository
from app.services.simulation.population_seeder import PopulationSeeder

router = APIRouter(tags=["population"])

# ── In-process job registry ────────────────────────────────────────────────────
# Single dict is safe for one worker. For multi-worker, swap to cache layer.
_jobs: dict[str, dict[str, Any]] = {}


def _seeder(db=Depends(get_db)) -> PopulationSeeder:
    return PopulationSeeder(db)


def _repo(db=Depends(get_db)) -> CitizenRepository:
    return CitizenRepository(db)


# ── Schemas ────────────────────────────────────────────────────────────────────

class SeedRequest(BaseModel):
    n:       int  = Field(default=1000, ge=1, le=100_000,
                          description="Number of citizens to generate")
    replace: bool = Field(default=False,
                          description="Delete existing citizens before seeding")
    mean_age:            float | None = Field(default=None, ge=18, le=90)
    income_multiplier:   float | None = Field(default=None, ge=0.1, le=10.0)
    happiness_baseline:  float | None = Field(default=None, ge=0, le=100)
    health_baseline:     float | None = Field(default=None, ge=0, le=100)
    high_education_rate: float | None = Field(default=None, ge=0.0, le=1.0)


# ── Background worker ──────────────────────────────────────────────────────────

async def _run_seed(job_id: str, seeder: PopulationSeeder,
                   sim_id: str, n: int, replace: bool, overrides: dict) -> None:
    _jobs[job_id]["status"] = "running"
    _jobs[job_id]["started_at"] = datetime.now(timezone.utc).isoformat()
    try:
        result = await seeder.seed(sim_id, n, replace=replace, overrides=overrides)
        _jobs[job_id].update(status="completed", result=result,
                             completed_at=datetime.now(timezone.utc).isoformat())
    except Exception as exc:
        _jobs[job_id].update(status="failed", error=str(exc),
                             completed_at=datetime.now(timezone.utc).isoformat())


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post(
    "/simulations/{sim_id}/population/seed",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[PolicyMakerOrAbove],
)
async def seed_population(
    sim_id: str,
    body: SeedRequest,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    seeder: PopulationSeeder = Depends(_seeder),
) -> dict:
    """
    Kick off background seeding. Returns a job_id immediately.
    Poll GET /simulations/{sim_id}/population/jobs/{job_id} for status.
    """
    overrides: dict = {}
    if body.mean_age            is not None: overrides["mean_age"]            = body.mean_age
    if body.income_multiplier   is not None: overrides["income_multiplier"]   = body.income_multiplier
    if body.happiness_baseline  is not None: overrides["happiness_baseline"]  = body.happiness_baseline
    if body.health_baseline     is not None: overrides["health_baseline"]     = body.health_baseline
    if body.high_education_rate is not None: overrides["high_education_rate"] = body.high_education_rate

    job_id = str(uuid.uuid4())
    _jobs[job_id] = {
        "job_id":     job_id,
        "sim_id":     sim_id,
        "status":     "pending",
        "n":          body.n,
        "result":     None,
        "error":      None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "started_at": None,
        "completed_at": None,
    }

    background_tasks.add_task(_run_seed, job_id, seeder, sim_id, body.n, body.replace, overrides)

    return {
        "job_id":   job_id,
        "status":   "pending",
        "sim_id":   sim_id,
        "n":        body.n,
        "poll_url": f"/simulations/{sim_id}/population/jobs/{job_id}",
    }


@router.get(
    "/simulations/{sim_id}/population/jobs/{job_id}",
    dependencies=[ResearcherOrAbove],
)
async def get_seed_job(sim_id: str, job_id: str) -> dict:
    """Poll the status of a seeding job."""
    job = _jobs.get(job_id)
    if not job or job["sim_id"] != sim_id:
        raise NotFoundError(f"Job {job_id} not found")
    return job


@router.get(
    "/simulations/{sim_id}/population/stats",
    dependencies=[ResearcherOrAbove],
)
async def get_population_stats(
    sim_id: str,
    repo: CitizenRepository = Depends(_repo),
) -> dict:
    """Aggregate population statistics — no individual citizen records returned."""
    total  = await repo.count(sim_id)
    sample = await repo.get_sample(sim_id, n=min(total, 5000))

    if not sample:
        return {"simulation_id": sim_id, "population": 0}

    n = len(sample)

    def _mean(key: str) -> float:
        vals = [float(r.get(key) or 0) for r in sample]
        return round(sum(vals) / n, 2)

    edu_dist: dict[str, int] = {}
    occ_dist: dict[str, int] = {}
    age_bands: dict[str, int] = {"18-34": 0, "35-54": 0, "55-74": 0, "75+": 0}

    for r in sample:
        edu = r.get("education_level", "unknown")
        edu_dist[edu] = edu_dist.get(edu, 0) + 1
        occ = r.get("occupation", "unknown")
        occ_dist[occ] = occ_dist.get(occ, 0) + 1
        age = int(r.get("age") or 0)
        if age < 35:   age_bands["18-34"] += 1
        elif age < 55: age_bands["35-54"] += 1
        elif age < 75: age_bands["55-74"] += 1
        else:          age_bands["75+"]   += 1

    scale = total / n if n else 1.0
    return {
        "simulation_id":          sim_id,
        "population":             total,
        "sample_size":            n,
        "avg_age":                _mean("age"),
        "avg_happiness":          _mean("happiness_score"),
        "avg_health":             _mean("health_score"),
        "avg_income":             _mean("income"),
        "avg_stress":             _mean("stress_score"),
        "education_distribution": {k: round(v * scale) for k, v in edu_dist.items()},
        "occupation_distribution": {k: round(v * scale) for k, v in occ_dist.items()},
        "age_band_distribution":  {k: round(v * scale) for k, v in age_bands.items()},
    }


@router.delete(
    "/simulations/{sim_id}/population",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[PolicyMakerOrAbove],
)
async def delete_population(
    sim_id: str,
    current_user: CurrentUser,
    db=Depends(get_db),
) -> None:
    """Delete all citizens for a simulation. Irreversible."""
    await db.table("citizens").delete().eq("simulation_id", sim_id).execute()
