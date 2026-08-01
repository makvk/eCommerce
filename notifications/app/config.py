from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://postgres:your_pass@localhost:5433/notifications_db"
    app_name: str = "ecommerce-notifications"


settings = Settings()
