from uuid import UUID
from pydantic import BaseModel

class AccountCreate(BaseModel):
    name: str

class AccountRead(BaseModel):
    id: UUID
    name: str

class CategoryCreate(BaseModel):
    name: str
    color: str | None = None

class CategoryRead(BaseModel):
    id: UUID
    name: str
    color: str | None = None
