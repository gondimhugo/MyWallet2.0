from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_db
from app.db.models import Loan, LoanStatus, User
from app.schemas.domain import LoanIn, LoanRepayIn
from app.services.loans import (
    derive_status,
    expected_return,
    schedule,
    serialize_loan,
)

router = APIRouter()


def _validate_loan_payload(payload: LoanIn) -> None:
    if payload.principal <= 0:
        raise HTTPException(400, "Informe um principal maior que zero.")
    if payload.interest_rate < 0:
        raise HTTPException(400, "Taxa de juros não pode ser negativa.")
    if payload.due_date < payload.start_date:
        raise HTTPException(400, "A data de retorno deve ser igual ou posterior à data inicial.")


def _get_owned_loan(db: Session, user: User, loan_id: UUID) -> Loan:
    loan = db.get(Loan, loan_id)
    if not loan or loan.user_id != user.id:
        raise HTTPException(404, "Empréstimo não encontrado.")
    return loan


@router.get("/loans")
def list_loans(
    direction: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    stmt = select(Loan).where(Loan.user_id == user.id)
    if direction:
        stmt = stmt.where(Loan.direction == direction)
    if status:
        stmt = stmt.where(Loan.status == status)
    rows = db.scalars(stmt.order_by(Loan.due_date.asc())).all()
    today = date.today()
    payload: list[dict] = []
    for loan in rows:
        new_status = derive_status(loan, today)
        if loan.status != new_status:
            loan.status = new_status
        payload.append(serialize_loan(loan))
    db.commit()
    return payload


@router.post("/loans")
def create_loan(
    payload: LoanIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    _validate_loan_payload(payload)
    loan = Loan(
        user_id=user.id,
        direction=payload.direction,
        counterparty=payload.counterparty,
        principal=payload.principal,
        interest_rate=payload.interest_rate,
        interest_mode=payload.interest_mode,
        start_date=payload.start_date,
        due_date=payload.due_date,
        linked_account_id=payload.linked_account_id,
        notes=payload.notes,
        status=LoanStatus.active,
        repaid_amount=0,
    )
    loan.status = derive_status(loan)
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return serialize_loan(loan)


@router.put("/loans/{loan_id}")
def update_loan(
    loan_id: UUID,
    payload: LoanIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    _validate_loan_payload(payload)
    loan = _get_owned_loan(db, user, loan_id)
    loan.direction = payload.direction
    loan.counterparty = payload.counterparty
    loan.principal = payload.principal
    loan.interest_rate = payload.interest_rate
    loan.interest_mode = payload.interest_mode
    loan.start_date = payload.start_date
    loan.due_date = payload.due_date
    loan.linked_account_id = payload.linked_account_id
    loan.notes = payload.notes
    loan.status = derive_status(loan)
    db.commit()
    db.refresh(loan)
    return serialize_loan(loan)


@router.delete("/loans/{loan_id}")
def delete_loan(
    loan_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    loan = _get_owned_loan(db, user, loan_id)
    db.delete(loan)
    db.commit()
    return {"ok": True}


@router.post("/loans/{loan_id}/repay")
def repay_loan(
    loan_id: UUID,
    payload: LoanRepayIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if payload.amount <= 0:
        raise HTTPException(400, "Valor do pagamento deve ser maior que zero.")
    loan = _get_owned_loan(db, user, loan_id)
    total = expected_return(loan)
    new_repaid = round((loan.repaid_amount or 0) + payload.amount, 2)
    if new_repaid > total + 0.005:
        raise HTTPException(
            400,
            f"Pagamento excede o saldo devedor (restante: R$ {round(total - (loan.repaid_amount or 0), 2)}).",
        )
    loan.repaid_amount = new_repaid
    loan.status = derive_status(loan)
    db.commit()
    db.refresh(loan)
    return serialize_loan(loan)


@router.get("/loans/{loan_id}/schedule")
def loan_schedule(
    loan_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    loan = _get_owned_loan(db, user, loan_id)
    return {
        "loan": serialize_loan(loan),
        "rows": schedule(loan),
    }
