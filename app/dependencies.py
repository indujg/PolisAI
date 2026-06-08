from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from supabase._async.client import AsyncClient

from app.config import Settings, get_settings
from app.core.exceptions import UnauthorizedError
from app.db.supabase import get_supabase, get_supabase_admin


# --- Config ---

SettingsDep = Annotated[Settings, Depends(get_settings)]


# --- Supabase clients ---

def supabase_client_dep() -> AsyncClient:
    return get_supabase()


def supabase_admin_dep() -> AsyncClient:
    return get_supabase_admin()


SupabaseDep = Annotated[AsyncClient, Depends(supabase_client_dep)]
SupabaseAdminDep = Annotated[AsyncClient, Depends(supabase_admin_dep)]


# --- Auth ---

async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    supabase: SupabaseDep = Depends(supabase_client_dep),
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError("Missing or malformed Authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        response = await supabase.auth.get_user(token)
        if not response.user:
            raise UnauthorizedError("Invalid or expired token")
        return {"id": response.user.id, "email": response.user.email, "token": token}
    except UnauthorizedError:
        raise
    except Exception as exc:
        raise UnauthorizedError("Token validation failed") from exc


CurrentUserDep = Annotated[dict, Depends(get_current_user)]
