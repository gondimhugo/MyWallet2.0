from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_ENV: str = "dev"
    APP_NAME: str = "Gastos v3.0"
    CORS_ORIGINS: str = "http://localhost:5173"

    DATABASE_URL: str = "sqlite:///./data/app.sqlite3"

    JWT_SECRET: str = "change_me"
    JWT_ALG: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 14

    ADMIN_EMAIL: str = "admin@gastos.local"
    ADMIN_PASSWORD: str = "admin123"

settings = Settings()
