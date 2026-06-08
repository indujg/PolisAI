from typing import AsyncGenerator

from supabase._async.client import AsyncClient, create_client
from supabase.lib.client_options import ClientOptions

from app.core.logging import get_logger

logger = get_logger(__name__)

_supabase_client: AsyncClient | None = None
_supabase_admin_client: AsyncClient | None = None


async def init_supabase(url: str, anon_key: str, service_role_key: str) -> None:
    global _supabase_client, _supabase_admin_client

    options = ClientOptions(
        auto_refresh_token=True,
        persist_session=False,
    )

    _supabase_client = await create_client(url, anon_key, options=options)
    _supabase_admin_client = await create_client(url, service_role_key, options=options)

    logger.info("supabase_initialized", url=url)


async def close_supabase() -> None:
    global _supabase_client, _supabase_admin_client
    # supabase-py manages its own httpx sessions; signal clean shutdown
    _supabase_client = None
    _supabase_admin_client = None
    logger.info("supabase_closed")


def get_supabase() -> AsyncClient:
    if _supabase_client is None:
        raise RuntimeError("Supabase client not initialized. Call init_supabase() first.")
    return _supabase_client


def get_supabase_admin() -> AsyncClient:
    if _supabase_admin_client is None:
        raise RuntimeError("Supabase admin client not initialized.")
    return _supabase_admin_client


async def check_supabase_health() -> bool:
    try:
        client = get_supabase()
        await client.table("_health_check").select("1").limit(1).execute()
        return True
    except Exception as exc:
        # 42P01 = table does not exist — DB is reachable, just no sentinel table yet
        msg = str(exc)
        if "42P01" in msg or "does not exist" in msg:
            return True
        logger.error("supabase_health_check_failed", error=msg)
        return False
