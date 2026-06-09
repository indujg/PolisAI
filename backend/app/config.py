from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    APP_NAME: str = "PolisAI"
    APP_VERSION: str = "0.1.0"
    APP_DESCRIPTION: str = "AI-powered societal digital twin platform"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = False
    SECRET_KEY: str = Field(..., min_length=32)

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 1
    ALLOWED_ORIGINS: str = ""

    # Supabase
    SUPABASE_URL: str = Field(...)
    SUPABASE_ANON_KEY: str = Field(...)
    SUPABASE_SERVICE_ROLE_KEY: str = Field(...)
    SUPABASE_DB_URL: str = Field(...)  # postgresql+asyncpg://...

    # Logging
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    LOG_FORMAT: Literal["json", "text"] = "json"

    # OpenAI Agents SDK
    OPENAI_API_KEY: str = Field(default="", description="OpenAI API key for AI generation features")
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_MAX_TOKENS: int = 1024
    OPENAI_TEMPERATURE: float = 0.7
    AI_MAX_CONCURRENT: int = 5       # semaphore for rate limiting
    AI_MAX_RETRIES: int = 3
    AI_RETRY_DELAY: float = 1.0      # seconds, doubles on each retry

    # WebSocket / Redis
    REDIS_URL: str = Field(default="", description="Redis URL for PubSub (optional)")
    WS_HEARTBEAT_INTERVAL: int = 30   # seconds between heartbeats

    # Citizen scale
    CITIZEN_CONCURRENCY: int = 20    # max concurrent page-read+compute+write tasks
    CITIZEN_PAGE_SIZE:   int = 500   # rows per Supabase page (also batch upsert size)
    MAX_POPULATION:      int = 100_000

    # Rate limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    @property
    def allowed_origins(self) -> list[str]:
        if not self.ALLOWED_ORIGINS:
            return ["*"]
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
