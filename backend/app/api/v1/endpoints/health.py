import time
from datetime import UTC, datetime

from fastapi import APIRouter

from app.config import get_settings
from app.db.supabase import check_supabase_health
from app.schemas.health import HealthResponse, LivenessResponse, ServiceStatus

router = APIRouter(tags=["health"])
settings = get_settings()


@router.get("/healthz", response_model=LivenessResponse, summary="Liveness probe")
async def liveness() -> LivenessResponse:
    """Always returns 200 if the process is running. Used by load balancers."""
    return LivenessResponse()


@router.get("/readyz", response_model=HealthResponse, summary="Readiness probe")
async def readiness() -> HealthResponse:
    """Checks all backing services. Returns 200 only when fully ready."""
    services: dict[str, ServiceStatus] = {}

    # Supabase
    start = time.perf_counter()
    db_ok = await check_supabase_health()
    db_latency = (time.perf_counter() - start) * 1000
    services["supabase"] = ServiceStatus(
        status="ok" if db_ok else "down",
        latency_ms=round(db_latency, 2),
    )

    overall = (
        "ok"
        if all(s.status == "ok" for s in services.values())
        else "degraded"
        if any(s.status == "ok" for s in services.values())
        else "down"
    )

    return HealthResponse(
        status=overall,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        timestamp=datetime.now(UTC),
        services=services,
    )
