from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field


# ── Enums ──────────────────────────────────────────────────────────────────────

class EducationLevel(StrEnum):
    NONE         = "none"
    PRIMARY      = "primary"
    SECONDARY    = "secondary"
    TERTIARY     = "tertiary"
    POSTGRADUATE = "postgraduate"


class PoliticalAlignment(StrEnum):
    FAR_LEFT     = "far_left"
    LEFT         = "left"
    CENTER_LEFT  = "center_left"
    CENTER       = "center"
    CENTER_RIGHT = "center_right"
    RIGHT        = "right"
    FAR_RIGHT    = "far_right"


class BusinessSector(StrEnum):
    AGRICULTURE   = "agriculture"
    MANUFACTURING = "manufacturing"
    SERVICES      = "services"
    TECHNOLOGY    = "technology"
    HEALTHCARE    = "healthcare"
    FINANCE       = "finance"
    ENERGY        = "energy"
    RETAIL        = "retail"
    EDUCATION     = "education"
    DEFENSE       = "defense"


class BusinessSize(StrEnum):
    MICRO       = "micro"
    SMALL       = "small"
    MEDIUM      = "medium"
    LARGE       = "large"
    CORPORATION = "corporation"


class GovernmentType(StrEnum):
    DEMOCRACY              = "democracy"
    REPUBLIC               = "republic"
    CONSTITUTIONAL_MONARCHY = "constitutional_monarchy"
    ABSOLUTE_MONARCHY      = "absolute_monarchy"
    AUTOCRACY              = "autocracy"
    OLIGARCHY              = "oligarchy"
    FEDERATION             = "federation"
    THEOCRACY              = "theocracy"


class InstitutionType(StrEnum):
    HEALTHCARE   = "healthcare"
    EDUCATION    = "education"
    MILITARY     = "military"
    POLICE       = "police"
    JUDICIARY    = "judiciary"
    CENTRAL_BANK = "central_bank"
    MEDIA        = "media"
    RELIGION     = "religion"
    NGO          = "ngo"
    RESEARCH     = "research"


class PolicyCategory(StrEnum):
    ECONOMIC       = "economic"
    SOCIAL         = "social"
    ENVIRONMENTAL  = "environmental"
    HEALTHCARE     = "healthcare"
    EDUCATION      = "education"
    SECURITY       = "security"
    INFRASTRUCTURE = "infrastructure"
    FOREIGN        = "foreign"
    TAX            = "tax"


class PolicyStatus(StrEnum):
    PROPOSED = "proposed"
    ACTIVE   = "active"
    REPEALED = "repealed"
    REJECTED = "rejected"
    EXPIRED  = "expired"


class SimulationStatus(StrEnum):
    DRAFT     = "draft"
    RUNNING   = "running"
    PAUSED    = "paused"
    COMPLETED = "completed"
    FAILED    = "failed"


class EventType(StrEnum):
    NATURAL_DISASTER          = "natural_disaster"
    ECONOMIC_CRISIS           = "economic_crisis"
    EPIDEMIC                  = "epidemic"
    WAR                       = "war"
    TECHNOLOGICAL_BREAKTHROUGH = "technological_breakthrough"
    SOCIAL_UNREST             = "social_unrest"
    ELECTION                  = "election"
    POLICY_CHANGE             = "policy_change"
    CULTURAL_SHIFT            = "cultural_shift"
    RESOURCE_SHORTAGE         = "resource_shortage"


class EventSeverity(StrEnum):
    MINOR        = "minor"
    MODERATE     = "moderate"
    MAJOR        = "major"
    CATASTROPHIC = "catastrophic"


class ElectionType(StrEnum):
    GENERAL     = "general"
    LOCAL       = "local"
    REFERENDUM  = "referendum"
    PRESIDENTIAL = "presidential"
    SENATE      = "senate"


class ElectionStatus(StrEnum):
    SCHEDULED  = "scheduled"
    ONGOING    = "ongoing"
    COMPLETED  = "completed"
    CANCELLED  = "cancelled"


class InfrastructureType(StrEnum):
    ROADS        = "roads"
    RAILWAYS     = "railways"
    AIRPORTS     = "airports"
    HOSPITALS    = "hospitals"
    SCHOOLS      = "schools"
    POWER_GRID   = "power_grid"
    WATER_SUPPLY = "water_supply"
    INTERNET     = "internet"
    HOUSING      = "housing"
    PORTS        = "ports"


class RelationshipType(StrEnum):
    FAMILY    = "family"
    FRIEND    = "friend"
    COLLEAGUE = "colleague"
    RIVAL     = "rival"
    SPOUSE    = "spouse"
    NEIGHBOR  = "neighbor"


# ── Embedded value objects ─────────────────────────────────────────────────────

class Demographics(BaseModel):
    ethnicity:      str | None = None
    religion:       str | None = None
    marital_status: str | None = None
    children:       int        = 0
    housing_type:   str | None = None


class PersonalityTraits(BaseModel):
    """Big Five (OCEAN) — each 0.0 to 1.0"""
    openness:          float = Field(default=0.5, ge=0.0, le=1.0)
    conscientiousness: float = Field(default=0.5, ge=0.0, le=1.0)
    extraversion:      float = Field(default=0.5, ge=0.0, le=1.0)
    agreeableness:     float = Field(default=0.5, ge=0.0, le=1.0)
    neuroticism:       float = Field(default=0.5, ge=0.0, le=1.0)


class SimulationMetrics(BaseModel):
    avg_happiness:    float = 50.0
    avg_health:       float = 50.0
    avg_income:       float = 0.0
    gdp:              float = 0.0
    unemployment_rate: float = 0.0
    gini_coefficient: float = 0.0
    crime_rate:       float = 0.0
    literacy_rate:    float = 0.0
    life_expectancy:  float = 70.0
    approval_rating:  float = 50.0


class EventImpact(BaseModel):
    happiness_delta:        float = 0.0
    health_delta:           float = 0.0
    gdp_delta:              float = 0.0
    affected_citizen_count: int   = 0
