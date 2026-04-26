"""Domain logic for loans (granted/taken) used by Planning."""

from __future__ import annotations

from datetime import date

from app.db.models import Loan, LoanDirection, LoanInterestMode, LoanStatus


def months_between(start: date, end: date) -> int:
    """Whole months between two dates (rounded toward zero, never negative)."""
    if end <= start:
        return 0
    months = (end.year - start.year) * 12 + (end.month - start.month)
    if end.day < start.day:
        months -= 1
    return max(0, months)


def expected_return(loan: Loan) -> float:
    """Total amount due at due_date including accrued interest."""
    n = months_between(loan.start_date, loan.due_date)
    rate = loan.interest_rate or 0
    principal = loan.principal or 0
    if n <= 0 or rate <= 0:
        return round(principal, 2)
    if loan.interest_mode == LoanInterestMode.compound:
        return round(principal * ((1 + rate) ** n), 2)
    return round(principal * (1 + rate * n), 2)


def interest_amount(loan: Loan) -> float:
    return round(expected_return(loan) - (loan.principal or 0), 2)


def outstanding_amount(loan: Loan) -> float:
    return round(max(0.0, expected_return(loan) - (loan.repaid_amount or 0)), 2)


def serialize_loan(loan: Loan) -> dict:
    return {
        "id": loan.id,
        "user_id": loan.user_id,
        "direction": loan.direction,
        "counterparty": loan.counterparty,
        "principal": loan.principal,
        "interest_rate": loan.interest_rate,
        "interest_mode": loan.interest_mode,
        "start_date": loan.start_date,
        "due_date": loan.due_date,
        "status": loan.status,
        "repaid_amount": loan.repaid_amount,
        "linked_account_id": loan.linked_account_id,
        "notes": loan.notes,
        "expected_return": expected_return(loan),
        "interest_amount": interest_amount(loan),
        "months": months_between(loan.start_date, loan.due_date),
        "outstanding": outstanding_amount(loan),
    }


def schedule(loan: Loan) -> list[dict]:
    """Month-by-month accrual schedule from start_date to due_date."""
    n = months_between(loan.start_date, loan.due_date)
    rate = loan.interest_rate or 0
    principal = loan.principal or 0
    rows: list[dict] = [
        {
            "month": 0,
            "date": loan.start_date.isoformat(),
            "interest_period": 0.0,
            "interest_accrued": 0.0,
            "balance": round(principal, 2),
        }
    ]
    balance = principal
    accrued = 0.0
    for i in range(1, n + 1):
        if loan.interest_mode == LoanInterestMode.compound:
            interest_period = round(balance * rate, 2)
            balance = round(balance + interest_period, 2)
        else:
            interest_period = round(principal * rate, 2)
            balance = round(principal + interest_period * i, 2)
        accrued = round(accrued + interest_period, 2)
        # Move forward i months from start_date for the row date.
        y = loan.start_date.year + (loan.start_date.month - 1 + i) // 12
        m = (loan.start_date.month - 1 + i) % 12 + 1
        # Clamp day to month length without importing calendar (kept minimal).
        from calendar import monthrange

        d = min(loan.start_date.day, monthrange(y, m)[1])
        rows.append(
            {
                "month": i,
                "date": date(y, m, d).isoformat(),
                "interest_period": interest_period,
                "interest_accrued": accrued,
                "balance": balance,
            }
        )
    return rows


def derive_status(loan: Loan, today: date | None = None) -> LoanStatus:
    """Compute up-to-date status without persisting."""
    today = today or date.today()
    total = expected_return(loan)
    repaid = loan.repaid_amount or 0
    if repaid >= total - 0.005:
        return LoanStatus.paid
    if today > loan.due_date:
        return LoanStatus.overdue
    if repaid > 0:
        return LoanStatus.partial
    return LoanStatus.active


def planning_event(loan: Loan, today: date | None = None) -> dict | None:
    """Convert a loan into a forecast event for planning_run.

    Returns None if the loan is fully paid or the outstanding amount is zero.
    Direction:
      - taken    => saída (out) na due_date (devo pagar)
      - granted  => entrada (in) na due_date (devem me pagar)
    """
    if derive_status(loan, today) == LoanStatus.paid:
        return None
    outstanding = outstanding_amount(loan)
    if outstanding <= 0.005:
        return None
    label_role = "Empréstimo tomado" if loan.direction == LoanDirection.taken else "Empréstimo concedido"
    label = f"{label_role} - {loan.counterparty or 'sem contraparte'}"
    if loan.direction == LoanDirection.taken:
        return {
            "date": loan.due_date.isoformat(),
            "label": label,
            "in": 0,
            "out": outstanding,
            "forecast": True,
        }
    return {
        "date": loan.due_date.isoformat(),
        "label": label,
        "in": outstanding,
        "out": 0,
        "forecast": True,
    }
