from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, EmailStr


class UserRole(StrEnum):
    ADMIN = "admin"
    POLICY_MAKER = "policy_maker"
    RESEARCHER = "researcher"
    CITIZEN = "citizen"


ROLE_HIERARCHY: dict[UserRole, int] = {
    UserRole.ADMIN: 4,
    UserRole.POLICY_MAKER: 3,
    UserRole.RESEARCHER: 2,
    UserRole.CITIZEN: 1,
}


class UserProfile(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str | None = None
    role: UserRole = UserRole.CITIZEN
    is_active: bool = True

    @property
    def role_level(self) -> int:
        return ROLE_HIERARCHY[self.role]

    def has_role(self, *roles: UserRole) -> bool:
        return self.role in roles

    def has_min_role(self, min_role: UserRole) -> bool:
        return self.role_level >= ROLE_HIERARCHY[min_role]
