"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # SQLAlchemy URL. Defaults to a local Postgres; overridden in Docker.
    # Tests override this with an in-memory SQLite URL.
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/clauses"

    # CORS origins allowed to call the API (the Angular dev server by default).
    cors_origins: list[str] = ["http://localhost:4200", "http://localhost:80"]


settings = Settings()
