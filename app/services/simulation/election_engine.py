"""
ElectionEngine — runs elections automatically every N ticks.

Flow:
  1. Scheduler calls maybe_run_election(sim_id, tick) each tick
  2. If tick % ELECTION_INTERVAL == 0, schedules a new election
  3. On the scheduled tick, resolves the election:
     - Samples citizens for voting (respects voting_likelihood)
     - Tallies by political_alignment
     - Winner = alignment bloc leader (most-aligned citizen in majority bloc)
     - Updates government approval_rating
     - Broadcasts result via WebSocket
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from supabase._async.client import AsyncClient

from app.core.logging import get_logger

logger = get_logger(__name__)

ELECTION_INTERVAL = 20   # ticks between elections
VOTER_SAMPLE_SIZE = 2000  # citizens sampled per election (fast, representative)

_ALIGNMENT_PARTY = {
    "far_left":    "Progressive Alliance",
    "left":        "Labour Front",
    "center_left": "Social Democrats",
    "center":      "National Unity Party",
    "center_right": "Conservative Party",
    "right":       "Liberty Party",
    "far_right":   "Nationalist Front",
}

_ALIGNMENT_ORDER = [
    "far_left", "left", "center_left", "center",
    "center_right", "right", "far_right",
]


class ElectionEngine:
    def __init__(self, db: AsyncClient) -> None:
        self._db = db

    async def maybe_run_election(self, sim_id: str, gov_id: str, tick: int) -> dict | None:
        """Call every tick. Returns election result dict if an election ran, else None."""
        if tick % ELECTION_INTERVAL != 0 or tick == 0:
            return None
        return await self._run_election(sim_id, gov_id, tick)

    async def _run_election(self, sim_id: str, gov_id: str, tick: int) -> dict[str, Any]:
        logger.info("election_starting", sim_id=sim_id, tick=tick)

        # Sample citizens for voting
        r = await (
            self._db.table("citizens")
            .select("id, political_alignment, voting_likelihood, happiness_score")
            .eq("simulation_id", sim_id)
            .eq("is_alive", True)
            .limit(VOTER_SAMPLE_SIZE)
            .execute()
        )
        citizens = r.data or []

        # Tally votes weighted by voting_likelihood
        tally: dict[str, float] = {}
        voters = 0
        for c in citizens:
            prob = float(c.get("voting_likelihood", 50)) / 100
            # Happiness below 40 suppresses turnout
            if float(c.get("happiness_score", 50)) < 40:
                prob *= 0.6
            if __import__("random").random() < prob:
                alignment = c.get("political_alignment", "center")
                tally[alignment] = tally.get(alignment, 0) + 1
                voters += 1

        if not tally:
            tally = {"center": 1}
            voters = 1

        winner_alignment = max(tally, key=lambda k: tally[k])
        turnout_rate = round(voters / max(1, len(citizens)) * 100, 2)

        # Find a representative winner citizen from winning alignment
        winner_r = await (
            self._db.table("citizens")
            .select("id, first_name, last_name")
            .eq("simulation_id", sim_id)
            .eq("political_alignment", winner_alignment)
            .eq("is_alive", True)
            .limit(1)
            .execute()
        )
        winner_citizen = (winner_r.data or [{}])[0]
        winner_id = winner_citizen.get("id")
        winner_name = (
            f"{winner_citizen.get('first_name', '')} {winner_citizen.get('last_name', '')}".strip()
            or "Unknown"
        )

        # Build results breakdown
        total_votes = sum(tally.values())
        results = {
            alignment: {
                "party":      _ALIGNMENT_PARTY.get(alignment, alignment),
                "votes":      int(v),
                "percentage": round(v / total_votes * 100, 2),
            }
            for alignment, v in sorted(tally.items(), key=lambda x: -x[1])
        }

        # Persist election record
        election_id = str(uuid.uuid4())
        await self._db.table("elections").insert({
            "id":             election_id,
            "simulation_id":  sim_id,
            "government_id":  gov_id,
            "name":           f"General Election — Tick {tick}",
            "type":           "general",
            "status":         "completed",
            "scheduled_tick": tick,
            "completed_tick": tick,
            "turnout_rate":   turnout_rate,
            "winner_id":      winner_id,
            "results":        results,
        }).execute()

        # Update government approval based on election outcome
        # Winner getting >50% → high approval; close race → moderate
        winner_pct = results[winner_alignment]["percentage"]
        new_approval = min(90, max(20, 40 + (winner_pct - 50) * 0.8))
        await (
            self._db.table("governments")
            .update({"approval_rating": round(new_approval, 2)})
            .eq("id", gov_id)
            .execute()
        )

        result = {
            "election_id":       election_id,
            "tick":              tick,
            "winner_alignment":  winner_alignment,
            "winner_party":      _ALIGNMENT_PARTY.get(winner_alignment, winner_alignment),
            "winner_name":       winner_name,
            "winner_percentage": winner_pct,
            "turnout_rate":      turnout_rate,
            "new_approval":      round(new_approval, 2),
            "results":           results,
        }

        logger.info("election_completed", sim_id=sim_id, tick=tick,
                    winner=winner_alignment, turnout=turnout_rate)

        # Broadcast result
        try:
            from app.ws.broadcaster import get_broadcaster
            await get_broadcaster().publish(
                f"polis:sim:{sim_id}:election",
                __import__("app.ws.events", fromlist=["WSEvent"]).WSEvent(
                    type="election_result",
                    sim_id=sim_id,
                    tick=tick,
                    data=result,
                ),
            )
        except Exception:
            pass

        return result

    async def get_elections(self, sim_id: str, limit: int = 20,
                             offset: int = 0) -> list[dict]:
        r = await (
            self._db.table("elections")
            .select("*")
            .eq("simulation_id", sim_id)
            .order("scheduled_tick", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return r.data or []

    async def get_latest(self, sim_id: str) -> dict | None:
        r = await (
            self._db.table("elections")
            .select("*")
            .eq("simulation_id", sim_id)
            .eq("status", "completed")
            .order("completed_tick", desc=True)
            .limit(1)
            .execute()
        )
        data = r.data or []
        return data[0] if data else None
