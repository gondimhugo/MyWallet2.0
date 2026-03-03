from __future__ import annotations

import calendar
from collections import defaultdict
from datetime import date, timedelta

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.db.models import Card, Direction, Method, SalaryProfile, Transaction, TransactionKind


def clamp_day(year: int, month: int, day: int) -> date:
    return date(year, month, min(day, calendar.monthrange(year, month)[1]))


def next_month(year: int, month: int) -> tuple[int, int]:
    return (year + (month // 12), (month % 12) + 1)


def compute_invoice(card: Card, purchase_date: date) -> tuple[str, str, str]:
    close = clamp_day(purchase_date.year, purchase_date.month, card.close_day)
    if purchase_date > close:
        y, m = next_month(close.year, close.month)
        close = clamp_day(y, m, card.close_day)
    y, m = next_month(close.year, close.month)
    due = clamp_day(y, m, card.due_day)
    key = f"{card.name}|{due.strftime('%Y-%m')}"
    return key, close.isoformat(), due.isoformat()


def cash_balance(db: Session, user_id) -> float:
    txs = db.scalars(select(Transaction).where(Transaction.user_id == user_id)).all()
    bal = 0.0
    for t in txs:
        if t.direction == Direction.entrada:
            bal += t.amount
        elif not (t.method == Method.credito and t.kind == TransactionKind.normal and t.direction == Direction.saida):
            bal -= t.amount
    return round(bal, 2)


def invoice_index(db: Session, user_id):
    txs = db.scalars(select(Transaction).where(Transaction.user_id == user_id)).all()
    idx = defaultdict(lambda: {"purchases": 0.0, "payments": 0.0, "invoice_due_iso": "", "card": ""})
    for t in txs:
        if not t.invoice_key:
            continue
        row = idx[t.invoice_key]
        row["card"] = t.card
        row["invoice_due_iso"] = t.invoice_due_iso
        if t.method == Method.credito and t.kind == TransactionKind.normal and t.direction == Direction.saida:
            row["purchases"] += t.amount
        if t.kind == TransactionKind.pagamento_fatura and t.direction == Direction.saida:
            row["payments"] += t.amount
    out = []
    today = date.today().isoformat()
    for key, row in idx.items():
        open_val = max(0, row["purchases"] - row["payments"])
        if open_val <= 0.01:
            status = "Fechada"
        elif row["invoice_due_iso"] and row["invoice_due_iso"] < today:
            status = "Vencida"
        else:
            status = "Em aberto"
        out.append({"invoice_key": key, **row, "open": round(open_val, 2), "status": status})
    order = {"Vencida": 0, "Em aberto": 1, "Fechada": 2}
    return sorted(out, key=lambda x: (order[x["status"]], x["invoice_due_iso"]))


def kpis(db: Session, user_id, start: date, end: date):
    txs = db.scalars(select(Transaction).where(and_(Transaction.user_id == user_id, Transaction.date >= start, Transaction.date <= end))).all()
    entradas = sum(t.amount for t in txs if t.direction == Direction.entrada)
    saidas = sum(t.amount for t in txs if t.direction == Direction.saida)
    gastos = sum(t.amount for t in txs if t.direction == Direction.saida and t.kind != TransactionKind.pagamento_fatura)
    pagamentos = sum(t.amount for t in txs if t.direction == Direction.saida and t.kind == TransactionKind.pagamento_fatura)
    return {"entradas": entradas, "saidas": saidas, "saldo": entradas - saidas, "gastos_sem_fatura": gastos, "pagamentos_fatura": pagamentos}


def debt_windows(db: Session, user_id):
    salary = db.get(SalaryProfile, user_id)
    if not salary:
        return {"cashNow": cash_balance(db, user_id), "windows": [], "breakdownByCard": {}}
    inv = [i for i in invoice_index(db, user_id) if i["open"] > 0.01 and i["invoice_due_iso"]]
    today = date.today()
    days = [salary.day1] if salary.mode.value == "mensal" else [salary.day1, salary.day2 or salary.day1]
    pay_dates = []
    cursor = today
    while len(pay_dates) < 2:
        for d in sorted(days):
            dt = clamp_day(cursor.year, cursor.month, d)
            if dt >= today and dt not in pay_dates:
                pay_dates.append(dt)
        cursor = clamp_day(*next_month(cursor.year, cursor.month), 1)
    pay_dates = sorted(pay_dates)[:2]
    windows, start = [], today
    cash = cash_balance(db, user_id)
    breakdown = defaultdict(float)
    for pay in pay_dates:
        salary_expected = salary.monthly_salary if salary.mode.value == "mensal" else (salary.amount1 or salary.monthly_salary / 2 if pay.day == salary.day1 else salary.amount2 or salary.monthly_salary / 2)
        due = [i for i in inv if start <= date.fromisoformat(i["invoice_due_iso"]) <= pay]
        total_due = sum(i["open"] for i in due)
        for d in due:
            breakdown[d["card"]] += d["open"]
        windows.append({"windowStart": start.isoformat(), "windowEnd": pay.isoformat(), "cashNow": round(cash, 2), "salaryExpected": round(salary_expected, 2), "invoicesDue": due, "cashAfterPay": round(cash + salary_expected - total_due, 2)})
        cash = cash + salary_expected - total_due
        start = pay + timedelta(days=1)
    return {"cashNow": cash_balance(db, user_id), "windows": windows, "breakdownByCard": breakdown}


def planning_run(db: Session, user_id, params):
    start = params.startISO
    end = params.endISO or (start + timedelta(days=30 if params.horizonMode in ["days30", "nextSalary", "nextDue"] else 60))
    txs = db.scalars(select(Transaction).where(and_(Transaction.user_id == user_id, Transaction.date >= start, Transaction.date <= end))).all()
    base = cash_balance(db, user_id)
    events = []
    for t in txs:
        out = t.amount if t.direction == Direction.saida else 0
        if t.method == Method.credito and t.kind == TransactionKind.normal and t.direction == Direction.saida and not params.creditAsCash:
            out = 0
        events.append({"date": t.date.isoformat(), "label": t.description or t.kind.value, "in": t.amount if t.direction == Direction.entrada else 0, "out": out, "forecast": False})
    if params.includeInvoices:
        for i in invoice_index(db, user_id):
            if i["open"] > 0.01 and i["invoice_due_iso"]:
                due = date.fromisoformat(i["invoice_due_iso"])
                if start <= due <= end:
                    events.append({"date": due.isoformat(), "label": f"Pagamento fatura {i['invoice_key']}", "in": 0, "out": i["open"], "forecast": True})
    events.sort(key=lambda x: x["date"])
    running, min_cash, min_date = base, base, start.isoformat()
    series = []
    d = start
    while d <= end:
        for e in [x for x in events if x["date"] == d.isoformat()]:
            running += e["in"] - e["out"]
        if running < min_cash:
            min_cash, min_date = running, d.isoformat()
        series.append({"date": d.isoformat(), "cash": round(running, 2)})
        d += timedelta(days=1)
    return {
        "baseCash": round(base, 2), "minCash": round(min_cash, 2), "minDateISO": min_date,
        "endCash": round(running, 2), "projectedIn": round(sum(e["in"] for e in events), 2), "projectedOut": round(sum(e["out"] for e in events), 2),
        "series": series, "events": events,
    }
