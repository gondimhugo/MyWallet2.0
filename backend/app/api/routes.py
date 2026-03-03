from fastapi import APIRouter

from app.api.routers import auth, transactions, catalog, csvio

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(catalog.router, prefix="/catalog", tags=["catalog"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(csvio.router, tags=["csv"])
