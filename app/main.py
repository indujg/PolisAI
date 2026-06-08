from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware

from app.api.v1.router import api_router
from app.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import get_logger, setup_logging
from app.core.middleware import register_middleware
from app.db.supabase import close_supabase, init_supabase

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    setup_logging(log_level=settings.LOG_LEVEL, log_format=settings.LOG_FORMAT)
    logger = get_logger(__name__)
    logger.info("starting_up", app=settings.APP_NAME, env=settings.ENVIRONMENT)

    await init_supabase(
        url=settings.SUPABASE_URL,
        anon_key=settings.SUPABASE_ANON_KEY,
        service_role_key=settings.SUPABASE_SERVICE_ROLE_KEY,
    )

    logger.info("startup_complete")
    yield

    logger.info("shutting_down")
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

    # Middleware (order: outermost = last registered)
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    register_middleware(app, settings)

    # Exception handlers
    register_exception_handlers(app)

    # Routers
    app.include_router(api_router)

    return app


app = create_app()
