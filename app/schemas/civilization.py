from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.models.civilization import (
    BusinessSector, BusinessSize, Demographics, EducationLevel,
    ElectionStatus, ElectionType, EventImpact, EventSeverity, EventType,
    GovernmentType, InfrastructureType, InstitutionType, PersonalityTraits,
    PoliticalAlignment, PolicyCategory, PolicyStatus, RelationshipType,
    SimulationMetrics, SimulationStatus,
)
from app.schemas.base import BaseSchema


# ── Simulation ─────────────────────────────────────────────────────────────────

class SimulationCreate(BaseSchema):
    name:            str  = Field(..., min_length=1, max_length=255)
    description:     str | None = None
    population_size: int  = Field(default=1000, ge=10, le=1_000_000)
    tick_rate:       int  = Field(default=1, ge=1, le=100)
    config:          dict = Field(default_factory=dict)


class SimulationUpdate(BaseSchema):
    name:        str | None = Field(default=None, max_length=255)
    description: str | None = None
    status:      SimulationStatus | None = None
    config:      dict | None = None


class SimulationResponse(BaseSchema):
    id:              UUID
    owner_id:        UUID
    name:            str
    description:     str | None
    status:          SimulationStatus
    current_tick:    int
    tick_rate:       int
    population_size: int
    config:          dict
    started_at:      datetime | None
    completed_at:    datetime | None
    created_at:      datetime
    updated_at:      datetime


# ── Government ─────────────────────────────────────────────────────────────────

class GovernmentCreate(BaseSchema):
    simulation_id:   UUID
    name:            str   = Field(..., min_length=1, max_length=255)
    type:            GovernmentType = GovernmentType.DEMOCRACY
    budget:          float = Field(default=0.0, ge=0)
    debt:            float = Field(default=0.0, ge=0)
    gdp:             float = Field(default=0.0, ge=0)
    region:          str | None = None


class GovernmentResponse(BaseSchema):
    id:              UUID
    simulation_id:   UUID
    name:            str
    type:            GovernmentType
    budget:          float
    debt:            float
    tax_revenue:     float
    approval_rating: float
    gdp:             float
    region:          str | None
    created_at:      datetime
    updated_at:      datetime


# ── Citizen ────────────────────────────────────────────────────────────────────

class CitizenCreate(BaseSchema):
    simulation_id:      UUID
    government_id:      UUID | None = None
    first_name:         str   = Field(..., min_length=1, max_length=100)
    last_name:          str   = Field(..., min_length=1, max_length=100)
    age:                int   = Field(..., ge=0, le=130)
    gender:             str   = Field(..., max_length=50)
    occupation:         str | None = None
    region:             str | None = None
    demographics:       Demographics       = Field(default_factory=Demographics)
    personality_traits: PersonalityTraits  = Field(default_factory=PersonalityTraits)
    income:             float = Field(default=0.0, ge=0)
    wealth:             float = Field(default=0.0, ge=0)
    education_level:    EducationLevel    = EducationLevel.SECONDARY
    happiness_score:    float = Field(default=50.0, ge=0, le=100)
    health_score:       float = Field(default=50.0, ge=0, le=100)
    stress_score:       float = Field(default=50.0, ge=0, le=100)
    political_alignment: PoliticalAlignment = PoliticalAlignment.CENTER
    voting_likelihood:  float = Field(default=50.0, ge=0, le=100)


class CitizenUpdate(BaseSchema):
    occupation:         str | None = None
    income:             float | None = Field(default=None, ge=0)
    happiness_score:    float | None = Field(default=None, ge=0, le=100)
    health_score:       float | None = Field(default=None, ge=0, le=100)
    stress_score:       float | None = Field(default=None, ge=0, le=100)
    political_alignment: PoliticalAlignment | None = None
    education_level:    EducationLevel | None = None
    is_alive:           bool | None = None


class CitizenResponse(BaseSchema):
    id:                 UUID
    simulation_id:      UUID
    government_id:      UUID | None
    first_name:         str
    last_name:          str
    age:                int
    gender:             str
    occupation:         str | None
    region:             str | None
    demographics:       dict
    personality_traits: dict
    income:             float
    wealth:             float
    education_level:    EducationLevel
    happiness_score:    float
    health_score:       float
    stress_score:       float
    political_alignment: PoliticalAlignment
    voting_likelihood:  float
    is_alive:           bool
    created_at:         datetime
    updated_at:         datetime


# ── Business ───────────────────────────────────────────────────────────────────

class BusinessCreate(BaseSchema):
    simulation_id:    UUID
    government_id:    UUID | None = None
    owner_citizen_id: UUID | None = None
    name:             str    = Field(..., min_length=1, max_length=255)
    sector:           BusinessSector
    size:             BusinessSize  = BusinessSize.SMALL
    revenue:          float  = Field(default=0.0, ge=0)
    profit_margin:    float  = Field(default=0.0, ge=0, le=100)
    employee_count:   int    = Field(default=1, ge=0)
    tax_rate:         float  = Field(default=20.0, ge=0, le=100)
    region:           str | None = None


class BusinessResponse(BaseSchema):
    id:               UUID
    simulation_id:    UUID
    government_id:    UUID | None
    owner_citizen_id: UUID | None
    name:             str
    sector:           BusinessSector
    size:             BusinessSize
    revenue:          float
    profit_margin:    float
    employee_count:   int
    tax_rate:         float
    region:           str | None
    is_active:        bool
    created_at:       datetime
    updated_at:       datetime


# ── Institution ────────────────────────────────────────────────────────────────

class InstitutionCreate(BaseSchema):
    simulation_id:      UUID
    government_id:      UUID | None = None
    name:               str   = Field(..., min_length=1, max_length=255)
    type:               InstitutionType
    funding:            float = Field(default=0.0, ge=0)
    effectiveness_score: float = Field(default=50.0, ge=0, le=100)
    trust_score:        float = Field(default=50.0, ge=0, le=100)
    capacity:           int   = Field(default=1000, ge=1)
    region:             str | None = None


class InstitutionResponse(BaseSchema):
    id:                 UUID
    simulation_id:      UUID
    government_id:      UUID | None
    name:               str
    type:               InstitutionType
    funding:            float
    effectiveness_score: float
    trust_score:        float
    capacity:           int
    utilization:        float
    region:             str | None
    created_at:         datetime
    updated_at:         datetime


# ── Policy ─────────────────────────────────────────────────────────────────────

class PolicyCreate(BaseSchema):
    simulation_id:   UUID
    government_id:   UUID
    name:            str   = Field(..., min_length=1, max_length=255)
    category:        PolicyCategory
    description:     str | None = None
    budget_impact:   float = 0.0
    popularity_score: float = Field(default=50.0, ge=0, le=100)


class PolicyUpdate(BaseSchema):
    name:            str | None = Field(default=None, min_length=1, max_length=255)
    description:     str | None = None
    budget_impact:   float | None = None
    popularity_score: float | None = Field(default=None, ge=0, le=100)


class PolicyActivateRequest(BaseSchema):
    current_tick: int = Field(default=0, ge=0)


class PolicySimulateRequest(BaseSchema):
    n_ticks: int = Field(default=10, ge=1, le=200)


class PolicySimulateResponse(BaseSchema):
    policy_id:         str
    n_ticks:           int
    current_metrics:   dict
    projected_metrics: dict
    delta:             dict
    confidence_score:  float
    key_insights:      list[str]


class PolicyResponse(BaseSchema):
    id:              UUID
    simulation_id:   UUID
    government_id:   UUID
    name:            str
    category:        PolicyCategory
    description:     str | None
    status:          PolicyStatus
    budget_impact:   float
    popularity_score: float
    enacted_tick:    int | None
    repealed_tick:   int | None
    created_at:      datetime
    updated_at:      datetime


# ── Event ──────────────────────────────────────────────────────────────────────

class EventCreate(BaseSchema):
    simulation_id:   UUID
    name:            str   = Field(..., min_length=1, max_length=255)
    type:            EventType
    severity:        EventSeverity = EventSeverity.MINOR
    description:     str | None = None
    tick:            int   = Field(default=0, ge=0)
    duration_ticks:  int   = Field(default=1, ge=1)
    affected_region: str | None = None
    impact:          EventImpact = Field(default_factory=EventImpact)


class EventResponse(BaseSchema):
    id:              UUID
    simulation_id:   UUID
    name:            str
    type:            EventType
    severity:        EventSeverity
    description:     str | None
    tick:            int
    duration_ticks:  int
    affected_region: str | None
    impact:          dict
    is_active:       bool
    created_at:      datetime


# ── Election ───────────────────────────────────────────────────────────────────

class ElectionCreate(BaseSchema):
    simulation_id:   UUID
    government_id:   UUID
    name:            str  = Field(..., min_length=1, max_length=255)
    type:            ElectionType   = ElectionType.GENERAL
    scheduled_tick:  int  = Field(..., ge=0)


class ElectionUpdate(BaseSchema):
    status:         ElectionStatus | None = None
    completed_tick: int | None = None
    turnout_rate:   float | None = Field(default=None, ge=0, le=100)
    winner_id:      UUID | None = None
    results:        dict | None = None


class ElectionResponse(BaseSchema):
    id:              UUID
    simulation_id:   UUID
    government_id:   UUID
    name:            str
    type:            ElectionType
    status:          ElectionStatus
    scheduled_tick:  int
    completed_tick:  int | None
    turnout_rate:    float
    winner_id:       UUID | None
    results:         dict
    created_at:      datetime
    updated_at:      datetime


# ── Infrastructure ─────────────────────────────────────────────────────────────

class InfrastructureCreate(BaseSchema):
    simulation_id:     UUID
    government_id:     UUID | None = None
    name:              str   = Field(..., min_length=1, max_length=255)
    type:              InfrastructureType
    quality_score:     float = Field(default=50.0, ge=0, le=100)
    capacity:          int   = Field(default=1000, ge=1)
    maintenance_cost:  float = Field(default=0.0, ge=0)
    construction_cost: float = Field(default=0.0, ge=0)
    region:            str | None = None


class InfrastructureResponse(BaseSchema):
    id:                UUID
    simulation_id:     UUID
    government_id:     UUID | None
    name:              str
    type:              InfrastructureType
    quality_score:     float
    capacity:          int
    utilization:       float
    maintenance_cost:  float
    construction_cost: float
    region:            str | None
    is_operational:    bool
    created_at:        datetime
    updated_at:        datetime


# ── Simulation Result ──────────────────────────────────────────────────────────

class SimulationResultCreate(BaseSchema):
    simulation_id:  UUID
    tick:           int  = Field(..., ge=0)
    metrics:        SimulationMetrics = Field(default_factory=SimulationMetrics)
    policy_snapshot: list[str] = Field(default_factory=list)
    event_snapshot:  list[str] = Field(default_factory=list)


class SimulationResultResponse(BaseSchema):
    id:              UUID
    simulation_id:   UUID
    tick:            int
    metrics:         dict
    policy_snapshot: list
    event_snapshot:  list
    created_at:      datetime


# ── Citizen Relationship ───────────────────────────────────────────────────────

class CitizenRelationshipCreate(BaseSchema):
    simulation_id: UUID
    citizen_a_id:  UUID
    citizen_b_id:  UUID
    type:          RelationshipType
    strength:      float = Field(default=50.0, ge=0, le=100)


class CitizenRelationshipResponse(BaseSchema):
    id:            UUID
    simulation_id: UUID
    citizen_a_id:  UUID
    citizen_b_id:  UUID
    type:          RelationshipType
    strength:      float
    created_at:    datetime
