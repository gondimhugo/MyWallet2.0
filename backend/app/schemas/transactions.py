from datetime import date
from uuid import UUID
from pydantic import BaseModel, Field
from app.db.models import TxType, TxStatus

class TransactionCreate(BaseModel):
    date: date
    amount: float = Field(..., description="Valor em reais (ex: 10.50). Será convertido para centavos.")
    type: TxType
    status: TxStatus = TxStatus.OPEN
    description: str = ""
    category_id: UUID | None = None
    account_id: UUID | None = None

class TransactionUpdate(BaseModel):
    date: date | None = None
    amount: float | None = None
    type: TxType | None = None
    status: TxStatus | None = None
    description: str | None = None
    category_id: UUID | None = None
    account_id: UUID | None = None

class TransactionRead(BaseModel):
    id: UUID
    date: date
    amount: float
    type: TxType
    status: TxStatus
    description: str
    category_id: UUID | None
    account_id: UUID | None

class SummaryResponse(BaseModel):
    from_date: date
    to_date: date
    income_total: float
    expense_total: float
    net_total: float
    by_category: list[dict]
