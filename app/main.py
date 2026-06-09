from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware

from app.api.v1.router import api_router, ws_router
from app.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import get_logger, setup_logging
from app.core.middleware import register_middleware
from app.core.rate_limiter import RateLimitMiddleware
from app.db.supabase import close_supabase, init_supabase

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    setup_logging(log_level=settings.LOG_LEVEL, log_format=settings.LOG_FORMAT)
    logger = get_logger(__name__)
    logger.info("starting_up", app=settings.APP_NAME, env=settings.ENVIRONMENT)

    # Database
    await init_supabase(
        url=settings.SUPABASE_URL,
        anon_key=settings.SUPABASE_ANON_KEY,
        service_role_key=settings.SUPABASE_SERVICE_ROLE_KEY,
    )

    # Cache layer (Redis if configured, LRU fallback)
    from app.cache.cache import get_cache
    await get_cache().startup()
    logger.info("cache_initialized")

    # Agent registry
    from app.agents.registry import build_default_registry
    build_default_registry()
    logger.info("agents_initialized")

    # WebSocket broadcaster
    from app.ws.broadcaster import get_broadcaster
    await get_broadcaster().startup()
    logger.info("broadcaster_initialized")

    logger.info("startup_complete")
    yield

    # ── Graceful shutdown ──────────────────────────────────────────────────────
    logger.info("shutting_down")

    # Pause all running simulations before shutdown
    from app.services.simulation.scheduler import get_scheduler
    await get_scheduler().shutdown_all()
    logger.info("scheduler_shutdown")

    await get_broadcaster().shutdown()
    await get_cache().shutdown()
    await close_supabase()
    logger.info("shutdown_complete")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=settings.APP_DESCRIPTION,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        openapi_url="/openapi.json" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # ── Middleware (innermost first — outermost = registered last) ─────────────
    # 1. GZip — compress large responses
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    # 2. Rate limiter — 429 before any business logic runs
    app.add_middleware(
        RateLimitMiddleware,
        max_requests=settings.RATE_LIMIT_REQUESTS,
        window_seconds=settings.RATE_LIMIT_WINDOW_SECONDS,
    )
    # 3. CORS, security headers, request-ID, logging
    register_middleware(app, settings)

    # ── Exception handlers ─────────────────────────────────────────────────────
    register_exception_handlers(app)

    # ── Routers ────────────────────────────────────────────────────────────────
    app.include_router(api_router)
    app.include_router(ws_router)   # WebSocket routes at /ws/...

    return app


app = create_app()
