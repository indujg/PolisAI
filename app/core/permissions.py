from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.logging import get_logger
from app.db.supabase import get_supabase, get_supabase_admin
from app.models.user import UserProfile, UserRole
from app.services.auth_service import AuthService, _fetch_profile

logger = get_logger(__name__)


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> UserProfile:
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError("Missing or malformed Authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    supabase = get_supabase()

    try:
        result = await supabase.auth.get_user(token)
        if not result.user:
            raise UnauthorizedError("Invalid or expired token")
    except UnauthorizedError:
        raise
    except Exception as exc:
        raise UnauthorizedError("Token validation failed") from exc

    profile = await _fetch_profile(get_supabase_admin(), result.user.id)
    if not profile.is_active:
        raise UnauthorizedError("Account is deactivated")

    return profile


CurrentUser = Annotated[UserProfile, Depends(get_current_user)]


def require_roles(*roles: UserRole) -> Callable:
    """Dependency factory: user must have one of the given roles."""
    async def _check(user: CurrentUser) -> UserProfile:
        if not user.has_role(*roles):
            raise ForbiddenError(
                f"Role '{user.role}' is not permitted. Required: {[r.value for r in roles]}"
            )
        return user

    return Depends(_check)


def require_min_role(min_role: UserRole) -> Callable:
    """Dependency factory: user must have at least min_role in the hierarchy."""
    async def _check(user: CurrentUser) -> UserProfile:
        if not user.has_min_role(min_role):
            raise ForbiddenError(
                f"Role '{user.role}' has insufficient privileges. Minimum: '{min_role}'"
            )
        return user

    return Depends(_check)


# Pre-built role dependencies
AdminOnly = require_roles(UserRole.ADMIN)
PolicyMakerOrAbove = require_min_role(UserRole.POLICY_MAKER)
ResearcherOrAbove = require_min_role(UserRole.RESEARCHER)
AnyAuthenticated = Depends(get_current_user)
