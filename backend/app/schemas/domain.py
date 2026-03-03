from datetime import date
from uuid import UUID

from pydantic import BaseModel

from app.db.models import Direction, Method, SalaryMode, TransactionKind


class AccountIn(BaseModel):
    name: str
    balance: float = 0


class AccountOut(AccountIn):
    id: UUID


class CardIn(BaseModel):
    name: str
    close_day: int
    due_day: int


class CardOut(CardIn):
    id: UUID


class SalaryIn(BaseModel):
    monthly_salary: float
    mode: SalaryMode
    day1: int
    day2: int | None = None
    amount1: float | None = None
    amount2: float | None = None
    default_method: Method = Method.transferencia
    default_account: str = "Conta Corrente"


class SalaryOut(SalaryIn):
    pass


class TransactionIn(BaseModel):
    date: date
    direction: Direction
    amount: float
    method: Method
    account: str = ""
    card: str = ""
    kind: TransactionKind = TransactionKind.normal
    category: str = ""
    subcategory: str = ""
    description: str = ""
    notes: str = ""


class TransactionOut(TransactionIn):
    id: UUID
    user_id: UUID
    invoice_key: str = ""
    invoice_close_iso: str = ""
    invoice_due_iso: str = ""
    installment_group_id: UUID | None = None
    installment_index: int | None = None
    installment_count: int | None = None
    purchase_total: float | None = None


class InstallmentIn(TransactionIn):
    installment_count: int


class PlanningInput(BaseModel):
    startISO: date
    horizonMode: str
    endISO: date | None = None
    includeInvoices: bool = True
    creditAsCash: bool = False
