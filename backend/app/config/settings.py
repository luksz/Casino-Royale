from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Casino Royale"
    environment: str = "development"
    debug: bool = True
    database_url: str = "sqlite+aiosqlite:///./casino_royale.db"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"]
    starting_balance: int = 10_000
    rng_seed: Optional[int] = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
