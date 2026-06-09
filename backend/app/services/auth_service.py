from uuid import UUID

from supabase_auth.errors import AuthApiError
from supabase._async.client import AsyncClient

from app.core.exceptions import (
    ConflictError,
    NotFoundError,
    UnauthorizedError,
    ValidationError,
)
from app.core.logging import get_logger
from app.models.user import UserProfile, UserRole
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
)

logger = get_logger(__name__)


def _build_token_response(session) -> TokenResponse:  # type: ignore[no-untyped-def]
    return TokenResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        expires_in=session.expires_in or 3600,
    )


def _build_user_response(profile: UserProfile) -> UserResponse:
    return UserResponse(
        id=profile.id,
        email=profile.email,
        full_name=profile.full_name,
        role=profile.role,
        is_active=profile.is_active,
    )


async def _fetch_profile(supabase: AsyncClient, user_id: str) -> UserProfile:
    result = (
        await supabase.table("profiles")
        .select("id, email, full_name, role, is_active")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise NotFoundError("User profile not found")
    d = result.data
    return UserProfile(
        id=d["id"],
        email=d["email"],
        full_name=d.get("full_name"),
        role=UserRole(d["role"]),
        is_active=d["is_active"],
    )


class AuthService:
    def __init__(self, supabase: AsyncClient, supabase_admin: AsyncClient) -> None:
        self._sb = supabase
        self._admin = supabase_admin

    async def register(self, data: RegisterRequest) -> tuple[UserResponse, TokenResponse]:
        # Check duplicate first for a clean 409
        existing = (
            await self._admin.table("profiles")
            .select("id")
            .eq("email", data.email)
            .limit(1)
            .execute()
        )
        if existing.data:
            raise ConflictError("Email already registered")

        # Use admin API to create user with email pre-confirmed
        try:
            created = await self._admin.auth.admin.create_user({
                "email": data.email,
                "password": data.password,
                "user_metadata": {
                    "full_name": data.full_name,
                    "role": str(data.role),
                },
                "email_confirm": True,
            })
        except AuthApiError as exc:
            msg = str(exc).lower()
            if "already registered" in msg or "already exists" in msg:
                raise ConflictError("Email already registered")
            raise ValidationError(str(exc)) from exc

        if not created.user:
            raise ValidationError("Registration failed")

        # Create profile row
        await self._admin.table("profiles").insert({
            "id": created.user.id,
            "email": data.email,
            "full_name": data.full_name,
            "role": str(data.role),
            "is_active": True,
        }).execute()

        # Sign in immediately to issue tokens
        signed = await self._sb.auth.sign_in_with_password(
            {"email": data.email, "password": data.password}
        )
        if not signed.session:
            raise ValidationError("User created but sign-in failed")

        profile = await _fetch_profile(self._admin, created.user.id)
        logger.info("user_registered", user_id=str(profile.id), role=profile.role)
        return _build_user_response(profile), _build_token_response(signed.session)

    async def login(self, data: LoginRequest) -> tuple[UserResponse, TokenResponse]:
        try:
            result = await self._sb.auth.sign_in_with_password(
                {"email": data.email, "password": data.password}
            )
        except AuthApiError as exc:
            raise UnauthorizedError("Invalid email or password") from exc

        if not result.session:
            raise UnauthorizedError("Invalid email or password")

        profile = await _fetch_profile(self._sb, result.user.id)
        if not profile.is_active:
            await self._sb.auth.sign_out()
            raise UnauthorizedError("Account is deactivated")

        logger.info("user_logged_in", user_id=str(profile.id))
        return _build_user_response(profile), _build_token_response(result.session)

    async def logout(self, access_token: str) -> None:
        try:
            await self._sb.auth.sign_out()
        except AuthApiError:
            pass  # best-effort — token may already be expired
        logger.info("user_logged_out")

    async def refresh(self, data: RefreshRequest) -> tuple[UserResponse, TokenResponse]:
        try:
            result = await self._sb.auth.refresh_session(data.refresh_token)
        except AuthApiError as exc:
            raise UnauthorizedError("Invalid or expired refresh token") from exc

        if not result.session:
            raise UnauthorizedError("Could not refresh session")

        profile = await _fetch_profile(self._sb, result.user.id)
        return _build_user_response(profile), _build_token_response(result.session)

    async def get_me(self, access_token: str) -> UserResponse:
        try:
            result = await self._sb.auth.get_user(access_token)
        except AuthApiError as exc:
            raise UnauthorizedError("Invalid or expired token") from exc

        if not result.user:
            raise UnauthorizedError("User not found")

        profile = await _fetch_profile(self._sb, result.user.id)
        return _build_user_response(profile)

    async def update_profile(
        self, user_id: UUID, data: UpdateProfileRequest
    ) -> UserResponse:
        updates = {k: v for k, v in data.model_dump().items() if v is not None}
        if not updates:
            raise ValidationError("No fields to update")

        await (
            self._sb.table("profiles")
            .update(updates)
            .eq("id", str(user_id))
            .execute()
        )
        profile = await _fetch_profile(self._sb, str(user_id))
        return _build_user_response(profile)

    async def set_role(self, target_user_id: UUID, role: UserRole) -> UserResponse:
        """Admin-only: change a user's role."""
        await (
            self._admin.table("profiles")
            .update({"role": str(role)})
            .eq("id", str(target_user_id))
            .execute()
        )
        await self._admin.auth.admin.update_user_by_id(
            str(target_user_id), {"user_metadata": {"role": str(role)}}
        )
        profile = await _fetch_profile(self._admin, str(target_user_id))
        logger.info("role_updated", user_id=str(target_user_id), role=role)
        return _build_user_response(profile)

    async def deactivate_user(self, target_user_id: UUID) -> None:
        """Admin-only: deactivate a user account."""
        await (
            self._admin.table("profiles")
            .update({"is_active": False})
            .eq("id", str(target_user_id))
            .execute()
        )
        logger.info("user_deactivated", user_id=str(target_user_id))
