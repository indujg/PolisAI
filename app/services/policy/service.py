"""
PolicyService — business logic for the Policy Management Engine.

Responsibilities:
  - CRUD with validation (can't delete active policies, etc.)
  - Activate / deactivate with tick-stamp
  - Simulate: run the analytical ImpactModel against live metrics
"""

from __future__ import annotations

from supabase._async.client import AsyncClient

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationError
from app.core.logging import get_logger
from app.services.policy import impact_model

logger = get_logger(__name__)

# Statuses that are safe to delete
_DELETABLE_STATUSES = {"proposed", "rejected", "repealed"}


class PolicyService:
    def __init__(self, db: AsyncClient) -> None:
        self._db = db

    # ── Queries ────────────────────────────────────────────────────────────────

    async def get(self, policy_id: str) -> dict:
        r = (
            await self._db.table("policies")
            .select("*")
            .eq("id", policy_id)
            .limit(1)
            .execute()
        )
        if not r.data:
            raise NotFoundError("Policy not found")
        return r.data[0]

    async def list(
        self,
        simulation_id: str,
        status: str | None = None,
        category: str | None = None,
        government_id: str | None = None,
    ) -> list[dict]:
        q = (
            self._db.table("policies")
            .select("*")
            .eq("simulation_id", simulation_id)
            .order("created_at", desc=True)
        )
        if status:
            q = q.eq("status", status)
        if category:
            q = q.eq("category", category)
        if government_id:
            q = q.eq("government_id", government_id)
        r = await q.execute()
        return r.data or []

    # ── Mutations ──────────────────────────────────────────────────────────────

    async def create(self, data: dict) -> dict:
        sim_id  = str(data["simulation_id"])
        gov_id  = str(data["government_id"])

        # Validate simulation exists
        sim = await self._db.table("simulations").select("id, status").eq("id", sim_id).single().execute()
        if not sim.data:
            raise NotFoundError("Simulation not found")

        # Validate government belongs to simulation
        gov = (
            await self._db.table("governments")
            .select("id")
            .eq("id", gov_id)
            .eq("simulation_id", sim_id)
            .single()
            .execute()
        )
        if not gov.data:
            raise ValidationError("Government does not belong to this simulation")

        # Check name uniqueness within simulation
        dup = (
            await self._db.table("policies")
            .select("id")
            .eq("simulation_id", sim_id)
            .eq("name", data["name"])
            .execute()
        )
        if dup.data:
            raise ConflictError(f"Policy '{data['name']}' already exists in this simulation")

        row = {
            "simulation_id":   sim_id,
            "government_id":   gov_id,
            "name":            data["name"],
            "category":        data["category"],
            "description":     data.get("description"),
            "budget_impact":   data.get("budget_impact", 0.0),
            "popularity_score": data.get("popularity_score", 50.0),
            "status":          "proposed",
        }
        r = await self._db.table("policies").insert(row).execute()
        logger.info("policy_created", policy_id=r.data[0]["id"], sim_id=sim_id)
        return r.data[0]

    async def update(self, policy_id: str, updates: dict) -> dict:
        policy = await self.get(policy_id)

        if policy["status"] == "active" and "budget_impact" in updates:
            raise ForbiddenError("Cannot change budget_impact of an active policy — deactivate first")

        r = (
            await self._db.table("policies")
            .update(updates)
            .eq("id", policy_id)
            .execute()
        )
        if not r.data:
            raise NotFoundError("Policy not found")
        return r.data[0]

    async def delete(self, policy_id: str) -> None:
        policy = await self.get(policy_id)

        if policy["status"] not in _DELETABLE_STATUSES:
            raise ForbiddenError(
                f"Cannot delete a policy with status '{policy['status']}'. "
                "Deactivate it first."
            )
        await self._db.table("policies").delete().eq("id", policy_id).execute()
        logger.info("policy_deleted", policy_id=policy_id)

    # ── Lifecycle ──────────────────────────────────────────────────────────────

    async def activate(self, policy_id: str, current_tick: int) -> dict:
        policy = await self.get(policy_id)

        if policy["status"] == "active":
            raise ConflictError("Policy is already active")
        if policy["status"] == "repealed":
            raise ForbiddenError("Cannot re-activate a repealed policy")

        r = (
            await self._db.table("policies")
            .update({"status": "active", "enacted_tick": current_tick})
            .eq("id", policy_id)
            .execute()
        )
        logger.info("policy_activated", policy_id=policy_id, tick=current_tick)
        return r.data[0]

    async def deactivate(self, policy_id: str, current_tick: int) -> dict:
        policy = await self.get(policy_id)

        if policy["status"] != "active":
            raise ConflictError("Policy is not active")

        r = (
            await self._db.table("policies")
            .update({"status": "repealed", "repealed_tick": current_tick})
            .eq("id", policy_id)
            .execute()
        )
        logger.info("policy_deactivated", policy_id=policy_id, tick=current_tick)
        return r.data[0]

    # ── Simulation (Impact Model) ──────────────────────────────────────────────

    async def simulate(self, policy_id: str, n_ticks: int = 10) -> impact_model.PolicyProjection:
        """
        Project this policy's effects over n_ticks using the analytical impact model.
        Uses the latest tick's actual metrics as the baseline.
        """
        policy = await self.get(policy_id)
        sim_id = policy["simulation_id"]

        # Get latest simulation metrics snapshot
        current_metrics = await self._get_current_metrics(sim_id)

        projection = impact_model.project(
            policy_id=policy_id,
            category=policy["category"],
            budget_impact=float(policy.get("budget_impact") or 0),
            popularity_score=float(policy.get("popularity_score") or 50),
            current_metrics=current_metrics,
            n_ticks=n_ticks,
        )
        logger.info(
            "policy_simulated",
            policy_id=policy_id, n_ticks=n_ticks,
            confidence=projection.confidence_score,
        )
        return projection

    async def _get_current_metrics(self, sim_id: str) -> dict:
        """Fetch latest tick result metrics, fall back to simulation defaults."""
        r = (
            await self._db.table("simulation_results")
            .select("metrics")
            .eq("simulation_id", sim_id)
            .order("tick", desc=True)
            .limit(1)
            .execute()
        )
        if r.data:
            return r.data[0]["metrics"] or {}

        # No results yet — derive from raw citizen aggregates
        agg = (
            await self._db.table("citizens")
            .select("happiness_score, health_score, income, wealth")
            .eq("simulation_id", sim_id)
            .eq("is_alive", True)
            .execute()
        )
        rows = agg.data or []
        if not rows:
            return _default_metrics()

        n = len(rows)
        return {
            "avg_happiness":    sum(r["happiness_score"] or 50 for r in rows) / n,
            "avg_health":       sum(r["health_score"] or 50 for r in rows) / n,
            "avg_income":       sum(float(r["income"] or 0) for r in rows) / n,
            "gdp":              sum(float(r["income"] or 0) for r in rows) * 52,
            "unemployment_rate": 5.0,
            "gini_coefficient": 0.35,
            "crime_rate":       10.0,
            "literacy_rate":    70.0,
            "life_expectancy":  72.0,
            "approval_rating":  50.0,
            "population":       n,
        }


def _default_metrics() -> dict:
    return {
        "avg_happiness": 50.0, "avg_health": 50.0, "avg_income": 30000.0,
        "gdp": 30_000_000.0, "unemployment_rate": 5.0, "gini_coefficient": 0.35,
        "crime_rate": 10.0, "literacy_rate": 70.0, "life_expectancy": 72.0,
        "approval_rating": 50.0, "population": 0,
    }
