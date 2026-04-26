from __future__ import annotations

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Direction(str, enum.Enum):
    entrada = "Entrada"
    saida = "Saída"


class Method(str, enum.Enum):
    debito = "Débito"
    pix = "Pix"
    dinheiro = "Dinheiro"
    transferencia = "Transferência"
    credito = "Crédito"


class TransactionKind(str, enum.Enum):
    normal = "Normal"
    pagamento_fatura = "PagamentoFatura"
    salario = "Salario"


class SalaryMode(str, enum.Enum):
    quinzenal = "quinzenal"
    mensal = "mensal"


class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    password_reset_token_hash: Mapped[str | None] = mapped_column(
        String(128), nullable=True, index=True
    )
    password_reset_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    accounts: Mapped[list[Account]] = relationship(
        back_populates="user", cascade="all,delete"
    )
    cards: Mapped[list[Card]] = relationship(
        back_populates="user", cascade="all,delete"
    )


class Account(Base):
    __tablename__ = "accounts"
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(String(120))
    bank: Mapped[str] = mapped_column(String(120), default="")
    account_type: Mapped[str] = mapped_column(String(50), default="Corrente")
    card_types: Mapped[str] = mapped_column(String(255), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    credit_limit: Mapped[float] = mapped_column(Float, default=0)
    credit_used: Mapped[float] = mapped_column(Float, default=0)
    close_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    due_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    balance: Mapped[float] = mapped_column(Float, default=0)

    user: Mapped[User] = relationship(back_populates="accounts")


class Card(Base):
    __tablename__ = "cards"
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(String(120))
    close_day: Mapped[int] = mapped_column(Integer)
    due_day: Mapped[int] = mapped_column(Integer)

    user: Mapped[User] = relationship(back_populates="cards")


class SalaryProfile(Base):
    __tablename__ = "salary_profiles"
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    monthly_salary: Mapped[float] = mapped_column(Float, default=0)
    mode: Mapped[SalaryMode] = mapped_column(
        Enum(SalaryMode), default=SalaryMode.mensal
    )
    day1: Mapped[int] = mapped_column(Integer, default=5)
    day2: Mapped[int | None] = mapped_column(Integer, nullable=True)
    amount1: Mapped[float | None] = mapped_column(Float, nullable=True)
    amount2: Mapped[float | None] = mapped_column(Float, nullable=True)
    default_method: Mapped[Method] = mapped_column(
        Enum(Method), default=Method.transferencia
    )
    default_account: Mapped[str] = mapped_column(String(120), default="Conta Corrente")


class Transaction(Base):
    __tablename__ = "transactions"
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    date: Mapped[date] = mapped_column(Date, index=True)
    direction: Mapped[Direction] = mapped_column(Enum(Direction), index=True)
    amount: Mapped[float] = mapped_column(Float)
    method: Mapped[Method] = mapped_column(Enum(Method), index=True)
    account: Mapped[str] = mapped_column(String(120), default="")
    account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    card: Mapped[str] = mapped_column(String(120), default="")
    card_account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    kind: Mapped[TransactionKind] = mapped_column(
        Enum(TransactionKind), default=TransactionKind.normal
    )
    category: Mapped[str] = mapped_column(String(120), default="")
    subcategory: Mapped[str] = mapped_column(String(120), default="")
    description: Mapped[str] = mapped_column(String(255), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    invoice_key: Mapped[str] = mapped_column(String(100), default="")
    invoice_close_iso: Mapped[str] = mapped_column(String(20), default="")
    invoice_due_iso: Mapped[str] = mapped_column(String(20), default="")
    installment_group_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    installment_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    installment_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    purchase_total: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
