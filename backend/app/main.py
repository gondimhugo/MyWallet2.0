from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import api_router

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version="3.0.0",
        default_response_class=None,  # keep FastAPI default
    )

    origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app

app = create_app()
