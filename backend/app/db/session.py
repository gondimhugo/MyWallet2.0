from app.core.config import settings
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


def _build_engine():
    url = settings.database_url
    connect_args: dict = {}
    engine_kwargs: dict = {"future": True}

    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    else:
        # Managed Postgres providers (Render, Heroku, Neon...) close idle
        # connections aggressively. Recycle every 5 minutes and pre-ping so we
        # don't hand out a dead connection to a request handler.
        engine_kwargs["pool_pre_ping"] = True
        engine_kwargs["pool_recycle"] = 300

    return create_engine(url, connect_args=connect_args, **engine_kwargs)


engine = _build_engine()
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
