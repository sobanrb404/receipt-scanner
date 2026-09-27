"""Central app settings, loaded from environment variables / .env."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://receipts_user:receipts_dev_pw@localhost:5432/receipts_db"

    jwt_secret_key: str = "dev-only-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"

    upload_dir: str = "./uploads"


settings = Settings()
