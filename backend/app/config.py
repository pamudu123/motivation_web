from functools import lru_cache

from pydantic import AliasChoices, Field, HttpUrl, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")
    supabase_url: HttpUrl
    supabase_publishable_key: str = Field(
        min_length=10,
        validation_alias=AliasChoices("SUPABASE_PUBLISHABLE_KEY", "SUPABASE_KEY"),
    )
    supabase_secret_key: SecretStr | None = None
    app_origin: str = "http://localhost:3000"
    request_timeout: float = 12


@lru_cache
def get_settings() -> Settings:
    return Settings()
