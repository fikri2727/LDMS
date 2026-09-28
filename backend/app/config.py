from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    database_url: str
    session_secret: str
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    frontend_origin: str = "http://localhost:5173"
    cookie_secure: bool = False

    @property
    def sqlalchemy_url(self) -> str:
        """Prisma-style URL -> SQLAlchemy/psycopg URL (drops the Prisma-only pgbouncer flag)."""
        url = self.database_url.strip().strip('"')
        url = url.replace("?pgbouncer=true", "").replace("&pgbouncer=true", "")
        if url.startswith("postgresql://"):
            url = "postgresql+psycopg://" + url[len("postgresql://"):]
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()
