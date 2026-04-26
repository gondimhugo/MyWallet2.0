from datetime import date
from uuid import UUID

from pydantic import BaseModel

from app.db.models import (
    Direction,
    LoanDirection,
    LoanInterestMode,
    LoanStatus,
    Method,
    SalaryMode,
    TransactionKind,
)


class AccountIn(BaseModel):
    name: str
    bank: str = "bradesco"
    account_type: str = "Corrente"
    card_types: list[str] = []
    notes: str = ""
    credit_limit: float = 0
    credit_used: float = 0
    close_day: int | None = None
    due_day: int | None = None
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
    account_id: UUID | None = None
    card: str = ""
    card_account_id: UUID | None = None
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
    includeLoans: bool = True


class LoanIn(BaseModel):
    direction: LoanDirection = LoanDirection.taken
    counterparty: str = ""
    principal: float
    interest_rate: float = 0
    interest_mode: LoanInterestMode = LoanInterestMode.simple
    start_date: date
    due_date: date
    linked_account_id: UUID | None = None
    notes: str = ""


class LoanRepayIn(BaseModel):
    amount: float
    payment_date: date | None = None


class LoanOut(BaseModel):
    id: UUID
    user_id: UUID
    direction: LoanDirection
    counterparty: str
    principal: float
    interest_rate: float
    interest_mode: LoanInterestMode
    start_date: date
    due_date: date
    status: LoanStatus
    repaid_amount: float
    linked_account_id: UUID | None
    notes: str
    expected_return: float
    interest_amount: float
    months: int
    outstanding: float

    model_config = {"from_attributes": True}
