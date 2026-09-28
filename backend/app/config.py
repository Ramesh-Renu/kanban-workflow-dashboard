from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://kanban:kanban@localhost:5440/kanban"

    # JWT
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_issuer: str = "orion-plg-api"
    access_token_minutes: int = 60
    refresh_token_days: int = 7

    # Login brute-force protection
    max_failed_logins: int = 5
    lockout_minutes: int = 15

    # Comma-separated list of allowed browser origins
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    # Also allow any origin matching this regex (default: localhost on any port, for dev).
    # Set to empty in production.
    cors_origin_regex: str = r"https?://(localhost|127\.0\.0\.1)(:\d+)?"

    # Optional: forward endpoints not yet implemented in Python to the existing backend.
    # Leave empty to answer them with 501.
    legacy_api_base_url: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
