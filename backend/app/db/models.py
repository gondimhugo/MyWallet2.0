from __future__ import annotations

from datetime import date, datetime, timezone
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import SQLModel, Field, Relationship, Column, String

def utcnow() -> datetime:
    return datetime.now(timezone.utc)

class TxType(str, Enum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"

class TxStatus(str, Enum):
    OPEN = "OPEN"
    PAID = "PAID"

class User(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    email: str = Field(sa_column=Column(String(320), unique=True, index=True, nullable=False))
    password_hash: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=utcnow)

class Account(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    name: str = Field(index=True)
    created_at: datetime = Field(default_factory=utcnow)

class Category(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    name: str = Field(index=True)
    color: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)

class Transaction(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)

    date: date = Field(index=True)
    amount_cents: int = Field(index=True, ge=0)
    type: TxType = Field(index=True)
    status: TxStatus = Field(default=TxStatus.OPEN, index=True)

    description: str = ""
    category_id: Optional[UUID] = Field(default=None, foreign_key="category.id")
    account_id: Optional[UUID] = Field(default=None, foreign_key="account.id")

    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    category: Optional[Category] = Relationship()
    account: Optional[Account] = Relationship()
