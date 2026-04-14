from __future__ import annotations

from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic_settings import BaseSettings, SettingsConfigDict


def _normalize_database_url(url: str) -> str:
    """Normalize a database URL so SQLAlchemy always gets a driver-qualified
    scheme and Render's managed Postgres works out of the box.

    - ``postgres://`` and ``postgresql://`` are rewritten to ``postgresql+psycopg://``
      (psycopg3 is the driver we ship in requirements.txt).
    - When the host points to Render's external Postgres (``*.render.com``) we
      force ``sslmode=require`` because Render only accepts SSL from the outside.
      Render's internal hostnames (``dpg-*`` without a domain) are left untouched
      so the internal non-TLS connection keeps working.
    """

    if not url:
        return url

    # Rewrite scheme: accept the URLs Render copy-pastes (``postgres://`` or
    # ``postgresql://``) and upgrade them to the psycopg3 driver used by
    # SQLAlchemy 2.x in this project.
    scheme, rest = url.split("://", 1) if "://" in url else (url, "")
    if scheme in {"postgres", "postgresql"}:
        scheme = "postgresql+psycopg"
    normalized = f"{scheme}://{rest}" if rest else url

    # Only touch Postgres URLs further.
    if not scheme.startswith("postgresql"):
        return normalized

    parts = urlsplit(normalized)
    host = (parts.hostname or "").lower()

    # Render's managed Postgres requires SSL for any host reachable outside the
    # private network. We detect that by the public domain suffix.
    if host.endswith(".render.com"):
        query = dict(parse_qsl(parts.query, keep_blank_values=True))
        query.setdefault("sslmode", "require")
        normalized = urlunsplit(parts._replace(query=urlencode(query)))

    return normalized


class Settings(BaseSettings):
    app_name: str = "MyWallet API"
    database_url: str = "sqlite:///./mywallet.db"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 30
    refresh_token_expire_minutes: int = 60 * 24 * 7
    # Allow common local dev ports for the frontend (Vite may pick 5173 or 5174)
    cors_origins: str = "http://localhost:5173,http://localhost:5174"
    # Regex that also matches Vercel preview/production URLs by default. Set
    # CORS_ORIGIN_REGEX to override (e.g. to add a custom domain).
    cors_origin_regex: str = (
        r"https://([a-z0-9-]+\.)*vercel\.app|"
        r"https://([a-z0-9-]+\.)*onrender\.com"
    )

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    def model_post_init(self, __context) -> None:  # type: ignore[override]
        object.__setattr__(self, "database_url", _normalize_database_url(self.database_url))


settings = Settings()
