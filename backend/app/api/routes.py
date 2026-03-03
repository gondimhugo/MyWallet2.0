from fastapi import APIRouter

from app.api.routers import accounts, auth, cards, dashboard, invoices, planning, salary, settings, transactions, users

api_router = APIRouter(prefix='/api')
api_router.include_router(auth.router, prefix='/auth', tags=['auth'])
api_router.include_router(users.router, tags=['users'])
api_router.include_router(accounts.router, tags=['accounts'])
api_router.include_router(cards.router, tags=['cards'])
api_router.include_router(transactions.router, tags=['transactions'])
api_router.include_router(invoices.router, tags=['invoices'])
api_router.include_router(dashboard.router, tags=['dashboard'])
api_router.include_router(planning.router, tags=['planning'])
api_router.include_router(salary.router, tags=['salary'])
api_router.include_router(settings.router, tags=['settings'])
