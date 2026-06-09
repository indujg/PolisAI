from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ServiceStatus(BaseModel):
    status: Literal["ok", "degraded", "down"]
    latency_ms: float | None = None
    detail: str | None = None


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded", "down"]
    version: str
    environment: str
    timestamp: datetime
    services: dict[str, ServiceStatus]


class LivenessResponse(BaseModel):
    status: Literal["ok"] = "ok"
