from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "MyWallet API"
    database_url: str = "sqlite:///./mywallet.db"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 30
    refresh_token_expire_minutes: int = 60 * 24 * 7
    # Allow common local dev ports for the frontend (Vite may pick 5173 or 5174)
    cors_origins: str = "http://localhost:5173,http://localhost:5174"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


settings = Settings()
