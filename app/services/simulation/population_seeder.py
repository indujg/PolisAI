"""
PopulationSeeder — bulk-generates realistic citizens for a simulation.

Generates up to MAX_POPULATION citizens using:
  - Age-stratified demographics (census-like distribution)
  - Income correlated with age, education, occupation
  - Personality traits (Big Five) drawn from realistic distributions
  - Deterministic from sim_id seed for reproducibility

Performance:
  - Generates rows in Python (CPU-only, fast)
  - Inserts in batches of INSERT_BATCH_SIZE using Supabase bulk insert
  - Concurrent batch inserts (INSERT_CONCURRENCY parallel writers)

Estimated time for 100k citizens: ~30-60s depending on Supabase latency.
"""

from __future__ import annotations

import asyncio
import hashlib
import math
import random
import uuid
from typing import Any

from supabase._async.client import AsyncClient

from app.core.exceptions import ConflictError, ValidationError
from app.core.logging import get_logger

logger = get_logger(__name__)

# How many rows per single Supabase insert call
INSERT_BATCH_SIZE    = 1000
# Max concurrent insert calls
INSERT_CONCURRENCY   = 10


# ── Demographic distributions ──────────────────────────────────────────────────

_EDUCATION_LEVELS = ["none", "primary", "secondary", "tertiary", "postgraduate"]
_EDUCATION_WEIGHTS = [0.03, 0.12, 0.45, 0.30, 0.10]

_ALIGNMENTS = [
    "far_left", "left", "center_left", "center",
    "center_right", "right", "far_right"
]
_ALIGNMENT_WEIGHTS = [0.05, 0.15, 0.20, 0.25, 0.15, 0.15, 0.05]

_FIRST_NAMES = [
    "Induj", "Shrit",
    "Aarav", "Aditi", "Arjun", "Ananya", "Amit", "Anjali", "Arun", "Aisha",
    "Deepak", "Divya", "Dev", "Disha", "Gaurav", "Geeta", "Harsh", "Hina",
    "Karan", "Kavya", "Kunal", "Komal", "Manish", "Meera", "Nikhil", "Neha",
    "Pankaj", "Priya", "Rahul", "Riya", "Rajesh", "Rohini", "Sanjay", "Simran",
    "Suresh", "Sneha", "Tarun", "Tanya", "Vikram", "Vidya", "Yogesh", "Yashika",
]

_LAST_NAMES = [
    "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Patel", "Mehta", "Joshi",
    "Nair", "Reddy", "Iyer", "Pillai", "Rao", "Bose", "Das", "Chatterjee",
    "Mishra", "Tiwari", "Pandey", "Chaudhary", "Shah", "Malhotra", "Kapoor",
    "Bhatia", "Saxena", "Srivastava", "Agarwal", "Khanna", "Bansal", "Chopra",
]

_OCCUPATIONS = [
    "student", "engineer", "teacher", "doctor", "farmer",
    "trader", "laborer", "manager", "entrepreneur", "retired",
    "government_worker", "healthcare_worker", "artist", "unemployed",
]
_OCCUPATION_WEIGHTS = [
    0.08, 0.12, 0.08, 0.04, 0.06,
    0.07, 0.10, 0.08, 0.05, 0.08,
    0.07, 0.06, 0.04, 0.07,
]

# (min_age, max_age, weight)
_AGE_BANDS = [
    (18, 24, 0.12),
    (25, 34, 0.18),
    (35, 44, 0.17),
    (45, 54, 0.16),
    (55, 64, 0.14),
    (65, 80, 0.13),
    (81, 100, 0.10),
]

# Base annual income by occupation (INR)
_INCOME_BY_OCCUPATION = {
    "student": 60_000,    "engineer": 900_000,   "teacher": 420_000,
    "doctor":  1_200_000, "farmer":   180_000,   "trader":  360_000,
    "laborer": 150_000,   "manager":  780_000,   "entrepreneur": 600_000,
    "retired": 180_000,   "government_worker": 480_000,
    "healthcare_worker": 540_000, "artist": 240_000, "unemployed": 60_000,
}


class PopulationSeeder:
    def __init__(self, db: AsyncClient) -> None:
        self._db   = db
        self._sem  = asyncio.Semaphore(INSERT_CONCURRENCY)

    async def seed(
        self,
        sim_id: str,
        n: int,
        replace: bool = False,
        overrides: dict | None = None,
    ) -> dict[str, Any]:
        """
        Seed n citizens for the given simulation.

        Args:
            sim_id:    target simulation
            n:         number of citizens to generate (1 – MAX_POPULATION)
            replace:   if True, delete existing citizens first
            overrides: demographic parameter overrides:
                mean_age, income_multiplier, happiness_baseline,
                health_baseline, high_education_rate
        """
        from app.config import get_settings
        max_pop = get_settings().MAX_POPULATION

        if not 1 <= n <= max_pop:
            raise ValidationError(f"Population must be between 1 and {max_pop:,}")

        # Check existing count
        existing = await self._count_existing(sim_id)
        if existing > 0 and not replace:
            raise ConflictError(
                f"Simulation already has {existing:,} citizens. "
                "Pass replace=true to delete and re-seed."
            )
        if existing > 0 and replace:
            await self._delete_all(sim_id)
            logger.info("population_cleared", sim_id=sim_id, deleted=existing)

        ov = overrides or {}
        # Generate all citizen dicts in-memory (no DB yet)
        logger.info("population_generating", sim_id=sim_id, n=n, overrides=ov)
        rng   = _make_rng(sim_id)
        rows  = [_generate_citizen(sim_id, rng, ov) for _ in range(n)]

        # Bulk insert concurrently
        n_batches = math.ceil(n / INSERT_BATCH_SIZE)
        tasks = [
            self._insert_batch(rows[i * INSERT_BATCH_SIZE : (i + 1) * INSERT_BATCH_SIZE])
            for i in range(n_batches)
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        errors   = sum(1 for r in results if isinstance(r, Exception))
        inserted = sum(r for r in results if isinstance(r, int))

        logger.info("population_seeded", sim_id=sim_id,
                    inserted=inserted, errors=errors, batches=n_batches)

        return {
            "simulation_id": sim_id,
            "requested":     n,
            "inserted":      inserted,
            "batches":       n_batches,
            "errors":        errors,
        }

    async def _insert_batch(self, rows: list[dict]) -> int:
        async with self._sem:
            try:
                r = await self._db.table("citizens").insert(rows).execute()
                return len(r.data or rows)
            except Exception as exc:
                logger.error("population_batch_insert_error", error=str(exc))
                raise

    async def _count_existing(self, sim_id: str) -> int:
        r = await (
            self._db.table("citizens")
            .select("id", count="exact")
            .eq("simulation_id", sim_id)
            .execute()
        )
        return r.count or 0

    async def _delete_all(self, sim_id: str) -> None:
        await (
            self._db.table("citizens")
            .delete()
            .eq("simulation_id", sim_id)
            .execute()
        )


# ── Generator ─────────────────────────────────────────────────────────────────

def _make_rng(sim_id: str) -> random.Random:
    """Deterministic RNG seeded from sim_id — same sim always produces same citizens."""
    seed = int(hashlib.md5(sim_id.encode()).hexdigest()[:16], 16)
    return random.Random(seed)


def _generate_citizen(sim_id: str, rng: random.Random,
                      overrides: dict | None = None) -> dict[str, Any]:
    ov = overrides or {}

    # Age — respect mean_age override by shifting the band selection
    if "mean_age" in ov:
        target_mean = float(ov["mean_age"])
        age = int(_clamp(rng.gauss(target_mean, 15), 18, 100))
        # find which band this age falls in for metadata
        band = next((b for b in _AGE_BANDS if b[0] <= age <= b[1]),
                    (age, age, 0.1))
    else:
        band = rng.choices(_AGE_BANDS, weights=[b[2] for b in _AGE_BANDS])[0]
        age  = rng.randint(band[0], band[1])

    # Education — high_education_rate override shifts toward tertiary/postgrad
    edu_weights = _EDUCATION_WEIGHTS[:]
    if "high_education_rate" in ov:
        rate = float(ov["high_education_rate"])
        # tertiary + postgrad should sum to rate
        total_high = edu_weights[3] + edu_weights[4]
        if total_high > 0:
            scale = rate / total_high
            edu_weights[3] *= scale
            edu_weights[4] *= scale
            # renormalise lower levels to fill remainder
            remainder = 1.0 - rate
            low_sum   = edu_weights[0] + edu_weights[1] + edu_weights[2]
            if low_sum > 0:
                for i in range(3):
                    edu_weights[i] = edu_weights[i] / low_sum * remainder
    edu_weights  = _adjust_edu_weights(age, edu_weights)
    education    = rng.choices(_EDUCATION_LEVELS, weights=edu_weights)[0]

    # Occupation (students < 25, retired > 64)
    occupation   = _pick_occupation(age, education, rng)

    # Income: base + age premium + education premium + noise + override multiplier
    base_income  = _INCOME_BY_OCCUPATION.get(occupation, 300_000)
    age_factor   = 1.0 + min(age - 25, 30) * 0.008 if age > 25 else 0.7
    edu_factor   = {
        "none": 0.6, "primary": 0.75, "secondary": 1.0,
        "tertiary": 1.35, "postgraduate": 1.65,
    }.get(education, 1.0)
    income_mult  = float(ov.get("income_multiplier", 1.0))
    noise        = rng.gauss(1.0, 0.18)
    income       = max(30_000, round(base_income * age_factor * edu_factor
                                     * income_mult * noise, -2))

    # Wealth: accumulated savings (~0.5–10× annual income depending on age)
    wealth_ratio = rng.uniform(0.5, min(10, 0.5 + age * 0.12))
    wealth       = round(income * wealth_ratio, -2)

    # Scores — respect baseline overrides
    happiness_mean = float(ov.get("happiness_baseline", 58))
    health_mean    = float(ov.get("health_baseline", max(0, 100 - age * 0.45)))
    happiness = _clamp(rng.gauss(happiness_mean, 14), 0, 100)
    health    = _clamp(rng.gauss(health_mean, 10), 0, 100)
    stress    = _clamp(rng.gauss(42, 15), 0, 100)

    # Big Five personality traits
    traits = {
        "openness":          round(_clamp(rng.gauss(0.55, 0.18), 0, 1), 3),
        "conscientiousness": round(_clamp(rng.gauss(0.60, 0.17), 0, 1), 3),
        "extraversion":      round(_clamp(rng.gauss(0.50, 0.20), 0, 1), 3),
        "agreeableness":     round(_clamp(rng.gauss(0.58, 0.16), 0, 1), 3),
        "neuroticism":       round(_clamp(rng.gauss(0.40, 0.18), 0, 1), 3),
    }

    # Demographics
    gender     = rng.choice(["male", "female", "other"])
    district   = rng.choice(["north", "south", "east", "west", "central"])
    first_name = rng.choice(_FIRST_NAMES)
    last_name  = rng.choice(_LAST_NAMES)

    return {
        "id":                 str(uuid.uuid4()),
        "simulation_id":      sim_id,
        "first_name":         first_name,
        "last_name":          last_name,
        "gender":             gender,
        "age":                age,
        "income":             income,
        "wealth":             wealth,
        "happiness_score":    round(happiness, 2),
        "health_score":       round(health, 2),
        "stress_score":       round(stress, 2),
        "education_level":    education,
        "occupation":         occupation,
        "political_alignment": rng.choices(_ALIGNMENTS, weights=_ALIGNMENT_WEIGHTS)[0],
        "voting_likelihood":  round(_clamp(rng.gauss(55, 20), 0, 100), 1),
        "personality_traits": traits,
        "demographics":       {
            "district": district,
            "age_band": f"{band[0]}-{band[1]}",
        },
        "is_alive": True,
    }


def _adjust_edu_weights(age: int, weights: list[float]) -> list[float]:
    """Shift education distribution: very young → less tertiary/postgrad."""
    if age < 22:
        weights[3] *= 0.3
        weights[4] *= 0.1
        weights[2] *= 1.5
    elif age < 28:
        weights[4] *= 0.5
    return weights


def _pick_occupation(age: int, education: str, rng: random.Random) -> str:
    if age < 22:
        return rng.choices(["student", "laborer", "artist"], weights=[0.7, 0.2, 0.1])[0]
    if age >= 65:
        return rng.choices(["retired", "laborer", "artist"], weights=[0.75, 0.15, 0.10])[0]
    # Filter occupation pool based on education
    pool_weights = _OCCUPATION_WEIGHTS[:]
    # Doctors and engineers require higher education
    if education in ("none", "primary"):
        pool_weights[3] *= 0.05   # doctor
        pool_weights[1] *= 0.10   # engineer
        pool_weights[8] *= 0.20   # entrepreneur
    return rng.choices(_OCCUPATIONS, weights=pool_weights)[0]


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))
