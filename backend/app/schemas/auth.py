from uuid import UUID

from pydantic import EmailStr, Field, field_validator

from app.models.user import UserRole
from app.schemas.base import BaseSchema, TimestampedSchema


# --- Requests ---

class RegisterRequest(BaseSchema):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    full_name: str | None = Field(default=None, max_length=255)
    role: UserRole = UserRole.CITIZEN

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class LoginRequest(BaseSchema):
    email: EmailStr
    password: str


class RefreshRequest(BaseSchema):
    refresh_token: str


class UpdateProfileRequest(BaseSchema):
    full_name: str | None = Field(default=None, max_length=255)


class RoleUpdateRequest(BaseSchema):
    role: UserRole


# --- Responses ---

class TokenResponse(BaseSchema):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseSchema):
    id: UUID
    email: EmailStr
    full_name: str | None
    role: UserRole
    is_active: bool


class AuthResponse(BaseSchema):
    user: UserResponse
    tokens: TokenResponse


class MessageResponse(BaseSchema):
    message: str
