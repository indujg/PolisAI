from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Body, Depends, Header, Query, status

from app.core.permissions import AdminOnly, CurrentUser, require_roles
from app.db.supabase import get_supabase, get_supabase_admin
from app.models.user import UserProfile, UserRole
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    RoleUpdateRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def _get_auth_service() -> AuthService:
    return AuthService(get_supabase(), get_supabase_admin())


AuthServiceDep = Annotated[AuthService, Depends(_get_auth_service)]


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, svc: AuthServiceDep) -> AuthResponse:
    user, tokens = await svc.register(body)
    return AuthResponse(user=user, tokens=tokens)


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, svc: AuthServiceDep) -> AuthResponse:
    user, tokens = await svc.login(body)
    return AuthResponse(user=user, tokens=tokens)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    svc: AuthServiceDep,
    authorization: Annotated[str | None, Header()] = None,
) -> MessageResponse:
    token = (authorization or "").removeprefix("Bearer ").strip()
    await svc.logout(token)
    return MessageResponse(message="Logged out successfully")


@router.post("/refresh", response_model=AuthResponse)
async def refresh(body: RefreshRequest, svc: AuthServiceDep) -> AuthResponse:
    user, tokens = await svc.refresh(body)
    return AuthResponse(user=user, tokens=tokens)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser) -> UserResponse:
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
    )


@router.patch("/me", response_model=UserResponse)
async def update_me(
    body: UpdateProfileRequest,
    current_user: CurrentUser,
    svc: AuthServiceDep,
) -> UserResponse:
    return await svc.update_profile(current_user.id, body)


# --- Admin endpoints ---

@router.put(
    "/users/{user_id}/role",
    response_model=UserResponse,
    dependencies=[AdminOnly],
)
async def set_user_role(
    user_id: UUID,
    svc: AuthServiceDep,
    role: Annotated[UserRole | None, Query()] = None,
    body: Annotated[RoleUpdateRequest | None, Body()] = None,
) -> UserResponse:
    requested_role = body.role if body else role
    if requested_role is None:
        from app.core.exceptions import ValidationError
        raise ValidationError("Role is required")
    return await svc.set_role(user_id, requested_role)


@router.delete(
    "/users/{user_id}",
    response_model=MessageResponse,
    dependencies=[AdminOnly],
)
async def deactivate_user(user_id: UUID, svc: AuthServiceDep) -> MessageResponse:
    await svc.deactivate_user(user_id)
    return MessageResponse(message=f"User {user_id} deactivated")
