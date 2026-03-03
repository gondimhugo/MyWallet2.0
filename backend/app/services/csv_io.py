from __future__ import annotations

import csv
import io
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlmodel import Session, select

from app.db.models import Transaction, Category, Account, TxType, TxStatus
from app.services.money import to_cents, from_cents

@dataclass
class ImportRowError:
    line: int
    error: str
    row: dict

def _parse_date(s: str):
    return datetime.strptime(s.strip(), "%Y-%m-%d").date()

def _parse_amount(s: str) -> float:
    s = s.strip().replace(".", "").replace(",", ".") if "," in s and "." in s else s.strip().replace(",", ".")
    return float(s)

def _get_or_create_category(session: Session, name: str) -> Optional[UUID]:
    name = (name or "").strip()
    if not name:
        return None
    cat = session.exec(select(Category).where(Category.name == name)).first()
    if not cat:
        cat = Category(name=name)
        session.add(cat)
        session.commit()
        session.refresh(cat)
    return cat.id

def _get_or_create_account(session: Session, name: str) -> Optional[UUID]:
    name = (name or "").strip()
    if not name:
        return None
    acc = session.exec(select(Account).where(Account.name == name)).first()
    if not acc:
        acc = Account(name=name)
        session.add(acc)
        session.commit()
        session.refresh(acc)
    return acc.id

def import_csv(session: Session, file_bytes: bytes):
    text = file_bytes.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))

    inserted = 0
    errors: list[ImportRowError] = []

    required = {"date", "amount", "type"}
    if not reader.fieldnames or not required.issubset(set([h.strip() for h in reader.fieldnames])):
        return {"inserted": 0, "errors": [{"line": 0, "error": "CSV inválido. Cabeçalho mínimo: date,amount,type", "row": {}}]}

    for idx, row in enumerate(reader, start=2):  # header = line 1
        try:
            d = _parse_date(row.get("date",""))
            amount = _parse_amount(row.get("amount","0"))
            tx_type = TxType(row.get("type","").strip().upper())
            status_raw = (row.get("status","OPEN") or "OPEN").strip().upper()
            status = TxStatus(status_raw) if status_raw in ("OPEN","PAID") else TxStatus.OPEN

            cat_id = None
            acc_id = None
            if "category_id" in row and row.get("category_id"):
                cat_id = UUID(str(row["category_id"]).strip())
            else:
                cat_id = _get_or_create_category(session, row.get("category",""))

            if "account_id" in row and row.get("account_id"):
                acc_id = UUID(str(row["account_id"]).strip())
            else:
                acc_id = _get_or_create_account(session, row.get("account",""))

            desc = (row.get("description","") or "").strip()

            tx = Transaction(
                date=d,
                amount_cents=to_cents(amount),
                type=tx_type,
                status=status,
                description=desc,
                category_id=cat_id,
                account_id=acc_id,
            )
            session.add(tx)
            session.commit()
            inserted += 1
        except Exception as e:
            errors.append(ImportRowError(line=idx, error=str(e), row=row))

    return {
        "inserted": inserted,
        "errors": [{"line": e.line, "error": e.error, "row": e.row} for e in errors],
    }

def export_csv(session: Session) -> bytes:
    out = io.StringIO()
    fieldnames = ["id","date","amount","type","status","category_id","account_id","description"]
    writer = csv.DictWriter(out, fieldnames=fieldnames)
    writer.writeheader()

    txs = session.exec(select(Transaction).order_by(Transaction.date.desc())).all()
    for t in txs:
        writer.writerow({
            "id": str(t.id),
            "date": t.date.isoformat(),
            "amount": f"{from_cents(t.amount_cents):.2f}",
            "type": t.type.value,
            "status": t.status.value,
            "category_id": str(t.category_id) if t.category_id else "",
            "account_id": str(t.account_id) if t.account_id else "",
            "description": t.description or "",
        })
    return out.getvalue().encode("utf-8")
