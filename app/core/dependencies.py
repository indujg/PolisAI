"""
Canonical dependency injection container.

All FastAPI Depends() calls should import from here.
app/dependencies.py is a backwards-compat shim that re-exports from this module.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from supabase._async.client import AsyncClient

from app.config import Settings, get_settings
from app.db.supabase import get_supabase, get_supabase_admin

# Re-export everything that app/dependencies.py had
# so existing imports keep working without change.
from app.core.permissions import CurrentUser, get_current_user  # noqa: F401


# ── Config ─────────────────────────────────────────────────────────────────────

SettingsDep = Annotated[Settings, Depends(get_settings)]


# ── Database clients ───────────────────────────────────────────────────────────

def supabase_client_dep() -> AsyncClient:
    return get_supabase()


def supabase_admin_dep() -> AsyncClient:
    return get_supabase_admin()


SupabaseDep      = Annotated[AsyncClient, Depends(supabase_client_dep)]
SupabaseAdminDep = Annotated[AsyncClient, Depends(supabase_admin_dep)]


# ── Generic DB dep (used by analytics, policy, etc.) ──────────────────────────

def get_db() -> AsyncClient:
    """Return the admin Supabase client. Use for all service-layer DB access."""
    return get_supabase_admin()


DBDep = Annotated[AsyncClient, Depends(get_db)]
