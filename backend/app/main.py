from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import api_router
from app.core.config import settings
from app.db.models import Base
from app.db.schema_compat import ensure_accounts_columns, ensure_transactions_columns
from app.db.session import engine

app = FastAPI(title=settings.app_name, version='4.0.0')
app.add_middleware(
    CORSMiddleware,
    allow_origins=[x.strip() for x in settings.cors_origins.split(',')],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
app.include_router(api_router)


@app.get('/health')
def health():
    return {'status': 'ok'}


@app.on_event('startup')
def startup_schema_checks():
    # If the app is started without running migrations first (common in local/dev),
    # ensure the base schema exists so writes actually persist instead of failing.
    Base.metadata.create_all(bind=engine)
    ensure_accounts_columns(engine)
    ensure_transactions_columns(engine)
