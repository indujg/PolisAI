"""
WorldSeeder — seeds businesses, infrastructure, institutions, and citizen
relationships for a simulation in one call.

Called automatically after population seeding OR manually via the API.

Scale targets (for 100k citizens):
  businesses:            ~2,000  (1 per 50 citizens)
  citizen_employment:    ~60,000 (employed fraction of workforce)
  citizen_relationships: ~300,000 (avg 3 per citizen)
  infrastructure:        ~50 nodes (10 types × 5 regions)
  institutions:          ~40 nodes (10 types × ~4 each)

All generation is deterministic from sim_id seed.
"""

from __future__ import annotations

import asyncio
import hashlib
import math
import random
import uuid
from typing import Any

from supabase._async.client import AsyncClient

from app.core.logging import get_logger

logger = get_logger(__name__)

_REGIONS = ["north", "south", "east", "west", "central"]

_BUSINESS_NAMES = {
    "agriculture": ["GreenFields Co", "HarvestPlus", "AgroVista", "FarmForward", "CropTech"],
    "manufacturing": ["IndusForge", "MetalWorks", "PrimeMfg", "BuildCore", "FabrikX"],
    "services": ["SwiftServe", "PeopleFirst", "ServiceHub", "QuickHelp", "ProAssist"],
    "technology": ["CodeNova", "TechSpark", "DataBridge", "SynapseAI", "PixelWave"],
    "healthcare": ["MediCare Plus", "HealthBridge", "CureAll", "VitalClinics", "PharmaSync"],
    "finance": ["CapitalFlow", "MoneyTree", "VaultBank", "TrustFund", "EquiGrow"],
    "energy": ["PowerGrid Co", "SolarEdge", "WindForce", "FuelSync", "AtomPlus"],
    "retail": ["MegaMart", "ShopNow", "RetailPlex", "BazaarX", "TradeCo"],
    "education": ["LearnHub", "MindForge", "EduPath", "SkillUp", "KnowledgeX"],
    "defense": ["ShieldCorp", "GuardForce", "ArmorTech", "SecureZone", "DefenseX"],
}

_INSTITUTION_NAMES = {
    "healthcare": ["National Health Authority", "Central Hospital", "Public Health Institute", "MedBoard"],
    "education": ["Ministry of Education", "National University", "Education Council", "Skills Board"],
    "military": ["National Defence Force", "Armed Forces HQ", "Border Security"],
    "police": ["National Police Service", "City Police Force", "Crime Investigation Dept"],
    "judiciary": ["Supreme Court", "High Court", "National Tribunal"],
    "central_bank": ["Reserve Bank", "National Treasury", "Monetary Authority"],
    "media": ["National Broadcasting Corp", "Press Council", "Media Regulatory Board"],
    "religion": ["National Religious Council", "Faith Foundation", "Spiritual Board"],
    "ngo": ["Citizens Welfare Trust", "Green Future NGO", "Social Justice Forum", "Aid Network"],
    "research": ["National Research Institute", "Science Academy", "Innovation Lab", "Tech Council"],
}

_INFRA_NAMES = {
    "roads": ["North Highway", "South Expressway", "East Bypass", "West Ring Road", "Central Avenue"],
    "railways": ["Metro Line 1", "City Rail East", "Northern Railway", "Southern Shuttle", "Express Link"],
    "airports": ["International Airport", "Domestic Terminal", "Cargo Airport", "Regional Airstrip"],
    "hospitals": ["City General Hospital", "Regional Medical Centre", "North Health Campus", "South Clinic"],
    "schools": ["Central Public School", "North Academy", "South Learning Centre", "East High School"],
    "power_grid": ["North Power Station", "South Grid Hub", "Solar Farm East", "Wind Park West"],
    "water_supply": ["City Water Works", "North Reservoir", "South Treatment Plant", "East Canal"],
    "internet": ["Fibre Hub Central", "North Data Centre", "Telecom Tower East", "ISP Exchange"],
    "housing": ["North Housing Complex", "South Residential Zone", "East Township", "West Estates"],
    "ports": ["Main Sea Port", "River Terminal", "Cargo Dock East", "Trade Port South"],
}

_INSERT_BATCH = 500
_INSERT_CONCURRENCY = 10


class WorldSeeder:
    def __init__(self, db: AsyncClient) -> None:
        self._db  = db
        self._sem = asyncio.Semaphore(_INSERT_CONCURRENCY)

    async def seed(self, sim_id: str, gov_id: str,
                   citizen_ids: list[str], replace: bool = False) -> dict[str, Any]:
        rng = _make_rng(sim_id)
        n_citizens = len(citizen_ids)

        if replace:
            await self._delete_all(sim_id)

        results = await asyncio.gather(
            self._seed_businesses(sim_id, gov_id, citizen_ids, rng),
            self._seed_infrastructure(sim_id, gov_id, rng),
            self._seed_institutions(sim_id, gov_id, rng),
            return_exceptions=True,
        )

        biz_result   = results[0] if not isinstance(results[0], Exception) else {"inserted": 0, "error": str(results[0])}
        infra_result = results[1] if not isinstance(results[1], Exception) else {"inserted": 0, "error": str(results[1])}
        inst_result  = results[2] if not isinstance(results[2], Exception) else {"inserted": 0, "error": str(results[2])}

        # Relationships need citizen_ids — run after businesses
        rel_result = await self._seed_relationships(sim_id, citizen_ids, rng)

        return {
            "simulation_id":       sim_id,
            "businesses":          biz_result,
            "infrastructure":      infra_result,
            "institutions":        inst_result,
            "relationships":       rel_result,
        }

    # ── Businesses + employment ──────────────────────────────────────────────

    async def _seed_businesses(self, sim_id: str, gov_id: str,
                                citizen_ids: list[str], rng: random.Random) -> dict:
        n_citizens  = len(citizen_ids)
        n_biz       = max(10, n_citizens // 50)
        sectors     = list(_BUSINESS_NAMES.keys())
        sizes       = ["micro", "small", "small", "medium", "medium", "large", "corporation"]

        biz_rows = []
        for _ in range(n_biz):
            sector = rng.choice(sectors)
            size   = rng.choice(sizes)
            emp_count = {"micro": rng.randint(1,9), "small": rng.randint(10,49),
                         "medium": rng.randint(50,249), "large": rng.randint(250,999),
                         "corporation": rng.randint(1000,5000)}[size]
            revenue = round(emp_count * rng.uniform(800_000, 2_500_000), 2)
            owner_id = rng.choice(citizen_ids) if rng.random() < 0.3 else None
            biz_rows.append({
                "id":               str(uuid.uuid4()),
                "simulation_id":    sim_id,
                "government_id":    gov_id,
                "owner_citizen_id": owner_id,
                "name":             rng.choice(_BUSINESS_NAMES[sector]),
                "sector":           sector,
                "size":             size,
                "revenue":          revenue,
                "profit_margin":    round(rng.uniform(2, 25), 2),
                "employee_count":   emp_count,
                "tax_rate":         round(rng.uniform(15, 35), 2),
                "region":           rng.choice(_REGIONS),
                "is_active":        True,
            })

        inserted_biz = await self._bulk_insert("businesses", biz_rows)

        # Employment: assign employed citizens to businesses
        employment_rows = []
        employed_set: set[str] = set()
        for biz in biz_rows:
            slots = min(biz["employee_count"], max(1, int(biz["employee_count"] * 0.8)))
            available = [c for c in citizen_ids if c not in employed_set]
            if not available:
                break
            chosen = rng.sample(available, min(slots, len(available)))
            for cid in chosen:
                employed_set.add(cid)
                employment_rows.append({
                    "id":          str(uuid.uuid4()),
                    "citizen_id":  cid,
                    "business_id": biz["id"],
                    "role":        _pick_role(biz["sector"], rng),
                    "salary":      round(rng.uniform(180_000, 1_500_000), 2),
                    "hired_tick":  0,
                    "is_active":   True,
                })

        inserted_emp = await self._bulk_insert("citizen_employment", employment_rows)

        return {
            "businesses_inserted":  inserted_biz,
            "employment_inserted":  inserted_emp,
            "employment_rate":      round(len(employed_set) / max(1, len(citizen_ids)) * 100, 2),
        }

    # ── Infrastructure ────────────────────────────────────────────────────────

    async def _seed_infrastructure(self, sim_id: str, gov_id: str,
                                    rng: random.Random) -> dict:
        rows = []
        for infra_type, names in _INFRA_NAMES.items():
            n = rng.randint(2, min(5, len(names)))
            chosen_names = rng.sample(names, n)
            for name in chosen_names:
                capacity = {"roads": 50_000, "railways": 20_000, "airports": 5_000,
                            "hospitals": 2_000, "schools": 3_000, "power_grid": 100_000,
                            "water_supply": 80_000, "internet": 200_000,
                            "housing": 10_000, "ports": 15_000}.get(infra_type, 5_000)
                rows.append({
                    "id":                str(uuid.uuid4()),
                    "simulation_id":     sim_id,
                    "government_id":     gov_id,
                    "name":              name,
                    "type":              infra_type,
                    "quality_score":     round(rng.uniform(40, 85), 2),
                    "capacity":          int(capacity * rng.uniform(0.7, 1.3)),
                    "utilization":       round(rng.uniform(30, 90), 2),
                    "maintenance_cost":  round(rng.uniform(500_000, 5_000_000), 2),
                    "construction_cost": round(rng.uniform(5_000_000, 50_000_000), 2),
                    "region":            rng.choice(_REGIONS),
                    "is_operational":    True,
                })

        inserted = await self._bulk_insert("infrastructure", rows)
        return {"inserted": inserted}

    # ── Institutions ─────────────────────────────────────────────────────────

    async def _seed_institutions(self, sim_id: str, gov_id: str,
                                  rng: random.Random) -> dict:
        rows = []
        for inst_type, names in _INSTITUTION_NAMES.items():
            n = rng.randint(1, min(3, len(names)))
            chosen_names = rng.sample(names, n)
            for name in chosen_names:
                rows.append({
                    "id":                  str(uuid.uuid4()),
                    "simulation_id":       sim_id,
                    "government_id":       gov_id,
                    "name":                name,
                    "type":                inst_type,
                    "funding":             round(rng.uniform(1_000_000, 50_000_000), 2),
                    "effectiveness_score": round(rng.uniform(35, 80), 2),
                    "trust_score":         round(rng.uniform(30, 75), 2),
                    "capacity":            rng.randint(500, 10_000),
                    "utilization":         round(rng.uniform(40, 95), 2),
                    "region":              rng.choice(_REGIONS),
                })

        inserted = await self._bulk_insert("institutions", rows)
        return {"inserted": inserted}

    # ── Relationships ─────────────────────────────────────────────────────────

    async def _seed_relationships(self, sim_id: str, citizen_ids: list[str],
                                   rng: random.Random) -> dict:
        # Sample for relationship generation — 10k is representative and fast
        sample = citizen_ids if len(citizen_ids) <= 10_000 else rng.sample(citizen_ids, 10_000)
        n = len(sample)
        target_rels = min(n * 3, 100_000)
        rel_types   = ["family", "friend", "colleague", "neighbor", "rival", "spouse"]
        rel_weights = [0.15, 0.30, 0.25, 0.20, 0.07, 0.03]

        seen: set[tuple[str, str]] = set()
        rows = []
        attempts = 0
        max_attempts = target_rels * 3

        while len(rows) < target_rels and attempts < max_attempts:
            attempts += 1
            a = rng.choice(sample)
            b = rng.choice(sample)
            if a == b:
                continue
            key = (min(a, b), max(a, b))
            if key in seen:
                continue
            seen.add(key)
            rows.append({
                "id":            str(uuid.uuid4()),
                "simulation_id": sim_id,
                "citizen_a_id":  a,
                "citizen_b_id":  b,
                "type":          rng.choices(rel_types, weights=rel_weights)[0],
                "strength":      round(rng.uniform(10, 90), 2),
            })

        inserted = await self._bulk_insert("citizen_relationships", rows)
        return {"inserted": inserted}

    # ── Cleanup ───────────────────────────────────────────────────────────────

    async def _delete_all(self, sim_id: str) -> None:
        # citizen_employment has no simulation_id — delete via business_ids
        biz_r = await self._db.table("businesses").select("id").eq("simulation_id", sim_id).execute()
        biz_ids = [r["id"] for r in (biz_r.data or [])]
        if biz_ids:
            for biz_id in biz_ids:
                await self._db.table("citizen_employment").delete().eq("business_id", biz_id).execute()
        for table in ["citizen_relationships", "businesses", "infrastructure", "institutions"]:
            await self._db.table(table).delete().eq("simulation_id", sim_id).execute()

    # ── Bulk insert helper ────────────────────────────────────────────────────

    async def _bulk_insert(self, table: str, rows: list[dict]) -> int:
        if not rows:
            return 0
        tasks = [
            self._insert_batch(table, rows[i:i + _INSERT_BATCH])
            for i in range(0, len(rows), _INSERT_BATCH)
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        errors = [r for r in results if isinstance(r, Exception)]
        if errors:
            logger.warning("world_seeder_insert_errors", table=table,
                           errors=[str(e) for e in errors[:3]])
        return sum(r for r in results if isinstance(r, int))

    async def _insert_batch(self, table: str, rows: list[dict]) -> int:
        async with self._sem:
            r = await self._db.table(table).insert(rows).execute()
            return len(r.data or rows)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _make_rng(sim_id: str) -> random.Random:
    seed = int(hashlib.md5(f"world:{sim_id}".encode()).hexdigest()[:16], 16)
    return random.Random(seed)


def _pick_role(sector: str, rng: random.Random) -> str:
    roles = {
        "technology":    ["Software Engineer", "Data Analyst", "DevOps", "Product Manager"],
        "healthcare":    ["Doctor", "Nurse", "Lab Technician", "Administrator"],
        "education":     ["Teacher", "Lecturer", "Counsellor", "Administrator"],
        "finance":       ["Analyst", "Accountant", "Trader", "Manager"],
        "agriculture":   ["Farmer", "Agronomist", "Field Worker", "Supervisor"],
        "manufacturing": ["Operator", "Technician", "Quality Inspector", "Engineer"],
        "services":      ["Customer Service", "Manager", "Coordinator", "Specialist"],
        "energy":        ["Engineer", "Technician", "Operator", "Safety Officer"],
        "retail":        ["Sales Associate", "Manager", "Cashier", "Inventory Clerk"],
        "defense":       ["Officer", "Analyst", "Engineer", "Logistics"],
    }
    return rng.choice(roles.get(sector, ["Employee"]))
