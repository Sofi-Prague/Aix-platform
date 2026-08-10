from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Central config. Values are pulled from environment variables
    (see docker-compose.yml for local dev defaults).
    """

    app_name: str = "AIX Platform API"
    environment: str = "development"

    database_url: str = "postgresql://aix:aix_dev_password@localhost:5432/aix"
    redis_url: str = "redis://localhost:6379/0"

    # Auth — replace with real secret management before anything but local dev
    jwt_secret: str = "change-me-in-.env"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    allowed_origins: str = "http://localhost:3000"

    cloudflare_account_id: str | None = None
    cloudflare_ai_token: str | None = None
    cloudflare_ai_model: str = (
        "@cf/meta/llama-3.1-8b-instruct-fast"
    )

    class Config:
        env_file = ".env"


settings = Settings()
