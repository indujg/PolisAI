"""
CitizenBehaviorEngine — computes how each citizen changes per simulation tick.

All formulas are deterministic given the citizen's state + active context.
Randomness uses a seeded hash so replays are reproducible.
"""

import hashlib
import math
from dataclasses import dataclass, field


# ── Data containers ────────────────────────────────────────────────────────────

@dataclass
class CitizenState:
    id: str
    age: int
    income: float
    wealth: float
    happiness_score: float
    health_score: float
    stress_score: float
    education_level: str
    political_alignment: str
    voting_likelihood: float
    occupation: str | None
    personality_traits: dict
    demographics: dict
    is_alive: bool = True


@dataclass
class PolicyContext:
    id: str
    category: str
    status: str
    budget_impact: float
    popularity_score: float


@dataclass
class EventContext:
    id: str
    type: str
    severity: str
    impact: dict
    tick: int
    duration_ticks: int


@dataclass
class CitizenDelta:
    """Computed changes for one citizen for one tick. All values are deltas."""
    citizen_id:          str
    happiness_delta:     float = 0.0
    health_delta:        float = 0.0
    wealth_delta:        float = 0.0
    stress_delta:        float = 0.0
    income_delta:        float = 0.0
    voting_delta:        float = 0.0
    alignment_shift:     str | None = None   # new alignment if changed
    education_upgrade:   bool = False
    decision_log:        list[str] = field(default_factory=list)


# ── Severity multipliers ───────────────────────────────────────────────────────

_SEVERITY_MULT = {"minor": 0.25, "moderate": 0.5, "major": 1.0, "catastrophic": 2.0}

_ALIGNMENT_ORDER = [
    "far_left", "left", "center_left", "center", "center_right", "right", "far_right"
]

# Which policy categories shift alignment left vs right
_POLICY_LEFT_SHIFT  = {"social", "healthcare", "education", "environmental"}
_POLICY_RIGHT_SHIFT = {"tax", "economic", "security"}


def _pseudo_random(citizen_id: str, tick: int, salt: str = "") -> float:
    """Deterministic [0, 1) float from citizen_id + tick + salt."""
    h = hashlib.md5(f"{citizen_id}:{tick}:{salt}".encode()).hexdigest()
    return int(h[:8], 16) / 0xFFFFFFFF


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def _openness(traits: dict) -> float:
    return traits.get("openness", 0.5)

def _neuroticism(traits: dict) -> float:
    return traits.get("neuroticism", 0.5)

def _conscientiousness(traits: dict) -> float:
    return traits.get("conscientiousness", 0.5)


# ── Main engine ────────────────────────────────────────────────────────────────

class CitizenBehaviorEngine:
    """
    Stateless engine. Call compute_delta() for each citizen each tick.
    Designed to be called in bulk via process_batch().
    """

    # Baseline income growth per tick (fraction)
    INCOME_GROWTH_RATE    = 0.0002
    # Wealth accumulates a fraction of income each tick
    WEALTH_SAVE_RATE      = 0.05
    # Base health decay per tick (aging)
    HEALTH_DECAY_PER_TICK = 0.01
    # Base happiness reversion toward 50 (mean reversion)
    HAPPINESS_REVERSION   = 0.02

    def compute_delta(
        self,
        citizen: CitizenState,
        tick: int,
        policies: list[PolicyContext],
        events: list[EventContext],
        government_approval: float = 50.0,
        unemployment_rate: float   = 5.0,
    ) -> CitizenDelta:
        delta = CitizenDelta(citizen_id=citizen.id)

        self._update_wealth(citizen, tick, delta, unemployment_rate)
        self._update_health(citizen, tick, delta)
        self._update_stress(citizen, tick, delta)
        self._react_to_policies(citizen, tick, policies, delta)
        self._react_to_events(citizen, tick, events, delta)
        self._update_happiness(citizen, tick, delta, government_approval)
        self._maybe_upgrade_education(citizen, tick, delta)
        self._maybe_shift_alignment(citizen, tick, policies, delta)

        # Clamp all scores
        delta.happiness_delta = _clamp(
            citizen.happiness_score + delta.happiness_delta
        ) - citizen.happiness_score
        delta.health_delta = _clamp(
            citizen.health_score + delta.health_delta
        ) - citizen.health_score
        delta.stress_delta = _clamp(
            citizen.stress_score + delta.stress_delta
        ) - citizen.stress_score

        return delta

    # ── Component updates ──────────────────────────────────────────────────────

    def _update_wealth(
        self,
        c: CitizenState,
        tick: int,
        d: CitizenDelta,
        unemployment_rate: float,
    ) -> None:
        rng = _pseudo_random(c.id, tick, "wealth")

        # Income grows slightly each tick; conscientiousness amplifies this
        growth = c.income * self.INCOME_GROWTH_RATE * (0.5 + _conscientiousness(c.personality_traits))
        # Random income shock: ±2% based on market conditions
        shock = c.income * 0.02 * (rng - 0.5)
        d.income_delta = growth + shock

        # Wealth = savings from income minus living expenses
        living_expenses = c.income * 0.6  # 60% of income spent on living
        savings = (c.income + d.income_delta - living_expenses / 52) * self.WEALTH_SAVE_RATE
        d.wealth_delta = savings

        # High unemployment reduces income
        if unemployment_rate > 10:
            d.income_delta -= c.income * 0.01 * (unemployment_rate - 10) / 10
            d.decision_log.append(f"income_hit_unemployment:{unemployment_rate:.1f}%")

    def _update_health(self, c: CitizenState, tick: int, d: CitizenDelta) -> None:
        # Natural decay accelerates after 60
        age_factor = 1.0 + max(0, (c.age - 60) / 40)
        d.health_delta -= self.HEALTH_DECAY_PER_TICK * age_factor

        # High stress hurts health
        if c.stress_score > 70:
            d.health_delta -= (c.stress_score - 70) * 0.005

        # Wealth buys healthcare
        if c.wealth > 100_000:
            d.health_delta += 0.02

    def _update_stress(self, c: CitizenState, tick: int, d: CitizenDelta) -> None:
        # Mean reversion toward 40
        target = 40.0
        d.stress_delta += (target - c.stress_score) * 0.03

        # Low income raises stress
        if c.income < 20_000:
            d.stress_delta += (20_000 - c.income) / 20_000 * 0.5

        # Neuroticism amplifies stress
        d.stress_delta *= (0.5 + _neuroticism(c.personality_traits))

    def _react_to_policies(
        self,
        c: CitizenState,
        tick: int,
        policies: list[PolicyContext],
        d: CitizenDelta,
    ) -> None:
        for policy in policies:
            if policy.status != "active":
                continue

            impact = _SEVERITY_MULT.get("minor", 0.25)  # policies = minor by default

            # Economic policies: affect income and happiness based on alignment
            if policy.category == "economic":
                if c.political_alignment in ("left", "far_left", "center_left"):
                    # Left-leaning dislikes pure economic liberalisation
                    d.happiness_delta -= 0.3 * impact
                else:
                    d.happiness_delta += 0.3 * impact
                # budget_impact trickles down as income change
                d.income_delta += (policy.budget_impact / 1_000_000) * c.income * 0.01

            elif policy.category == "social":
                if c.political_alignment in ("left", "far_left", "center_left", "center"):
                    d.happiness_delta += 0.5 * impact
                else:
                    d.happiness_delta -= 0.2 * impact

            elif policy.category == "healthcare":
                d.health_delta += 0.2 * impact
                d.happiness_delta += 0.3 * impact

            elif policy.category == "education":
                if c.education_level in ("none", "primary", "secondary"):
                    d.happiness_delta += 0.4 * impact
                d.stress_delta -= 0.1 * impact

            elif policy.category == "tax":
                # Tax increase: reduce take-home income
                d.income_delta -= c.income * abs(policy.budget_impact) / 100_000_000
                d.happiness_delta -= 0.3 * impact
                if c.political_alignment in ("right", "far_right"):
                    d.happiness_delta -= 0.3  # extra displeasure

            elif policy.category == "security":
                d.stress_delta -= 0.2 * impact
                if c.political_alignment in ("left", "far_left"):
                    d.happiness_delta -= 0.2  # civil liberties concern

            d.decision_log.append(f"policy_reaction:{policy.category}:{policy.id[:8]}")

    def _react_to_events(
        self,
        c: CitizenState,
        tick: int,
        events: list[EventContext],
        d: CitizenDelta,
    ) -> None:
        for event in events:
            if tick < event.tick or tick > event.tick + event.duration_ticks:
                continue

            mult = _SEVERITY_MULT.get(event.severity, 0.5)
            impact = event.impact

            d.happiness_delta += impact.get("happiness_delta", 0) * mult * 0.01
            d.health_delta    += impact.get("health_delta", 0)    * mult * 0.01

            # Wealth hit from disasters / crises
            if event.type in ("natural_disaster", "economic_crisis", "war"):
                loss_pct = mult * 0.02  # up to 4% wealth loss per tick
                d.wealth_delta -= c.wealth * loss_pct
                d.stress_delta  += mult * 2.0
                d.decision_log.append(f"event_impact:{event.type}:{event.id[:8]}")

            elif event.type == "technological_breakthrough":
                d.income_delta += c.income * mult * 0.005
                d.happiness_delta += mult * 1.0
                if _openness(c.personality_traits) > 0.6:
                    d.happiness_delta += 0.5  # open-minded citizens enjoy it more

            elif event.type == "epidemic":
                d.health_delta -= mult * 1.5
                d.stress_delta += mult * 3.0

    def _update_happiness(
        self,
        c: CitizenState,
        tick: int,
        d: CitizenDelta,
        government_approval: float,
    ) -> None:
        # Mean reversion toward 50
        d.happiness_delta += (50.0 - c.happiness_score) * self.HAPPINESS_REVERSION

        # Wealth effect (log scale)
        if c.wealth > 0:
            wealth_boost = math.log10(max(c.wealth, 1)) * 0.1
            d.happiness_delta += min(wealth_boost, 2.0)

        # Health directly correlates with happiness
        d.happiness_delta += (c.health_score - 50) * 0.02

        # Stress inversely affects happiness
        d.happiness_delta -= (c.stress_score - 40) * 0.03

        # Government approval effect (citizens feel the mood)
        d.happiness_delta += (government_approval - 50) * 0.01

        # Random daily variation
        rng = _pseudo_random(c.id, tick, "happiness")
        d.happiness_delta += (rng - 0.5) * 0.5

    def _maybe_upgrade_education(
        self, c: CitizenState, tick: int, d: CitizenDelta
    ) -> None:
        levels = ["none", "primary", "secondary", "tertiary", "postgraduate"]
        current_idx = levels.index(c.education_level) if c.education_level in levels else 2

        if current_idx >= 4 or c.age < 18:
            return

        # Probability of upgrading: driven by conscientiousness, wealth, youth
        base_prob = 0.0002
        wealth_factor  = min(c.wealth / 200_000, 1.0)
        age_factor     = max(0, 1 - (c.age - 18) / 40)
        prob = base_prob * (0.5 + _conscientiousness(c.personality_traits)) * (0.5 + wealth_factor) * age_factor

        rng = _pseudo_random(c.id, tick, "education")
        if rng < prob:
            d.education_upgrade = True
            d.happiness_delta += 3.0
            d.decision_log.append(f"education_upgrade:{levels[current_idx]}→{levels[current_idx+1]}")

    def _maybe_shift_alignment(
        self,
        c: CitizenState,
        tick: int,
        policies: list[PolicyContext],
        d: CitizenDelta,
    ) -> None:
        if not _ALIGNMENT_ORDER.__contains__(c.political_alignment):
            return

        idx   = _ALIGNMENT_ORDER.index(c.political_alignment)
        shift = 0  # -1 = move left, +1 = move right

        for policy in policies:
            if policy.status != "active":
                continue
            if policy.category in _POLICY_LEFT_SHIFT and policy.budget_impact < 0:
                # Costly social programs frustrate some
                if c.wealth > 200_000:
                    shift += 1
            elif policy.category in _POLICY_RIGHT_SHIFT:
                if c.income < 30_000:
                    shift -= 1  # low earners pushed left by austerity

        rng = _pseudo_random(c.id, tick, "alignment")
        # Only shift once every ~500 ticks on average
        if abs(shift) > 0 and rng < 0.002:
            new_idx = _clamp(idx + (1 if shift > 0 else -1), 0, 6)
            new_alignment = _ALIGNMENT_ORDER[int(new_idx)]
            if new_alignment != c.political_alignment:
                d.alignment_shift = new_alignment
                d.decision_log.append(f"alignment_shift:{c.political_alignment}→{new_alignment}")

    def process_batch(
        self,
        citizens: list[CitizenState],
        tick: int,
        policies: list[PolicyContext],
        events: list[EventContext],
        government_approval: float = 50.0,
        unemployment_rate: float   = 5.0,
    ) -> list[CitizenDelta]:
        return [
            self.compute_delta(c, tick, policies, events, government_approval, unemployment_rate)
            for c in citizens if c.is_alive
        ]
