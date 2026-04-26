from pydantic import BaseModel, EmailStr, Field, field_validator


def _validate_password_strength(value: str) -> str:
    if len(value) < 6:
        raise ValueError("A senha deve ter ao menos 6 caracteres")
    if len(value) > 128:
        raise ValueError("A senha é muito longa")
    if value.strip() != value:
        raise ValueError("A senha não pode começar ou terminar com espaços")
    return value


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    full_name: str = Field(default="", max_length=120)

    @field_validator("password")
    @classmethod
    def _password(cls, v: str) -> str:
        return _validate_password_strength(v)

    @field_validator("full_name")
    @classmethod
    def _full_name(cls, v: str) -> str:
        return v.strip()


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshIn(BaseModel):
    refresh_token: str


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ForgotPasswordOut(BaseModel):
    message: str
    # In a production deployment with SMTP configured this token is delivered
    # only by email. Until then the API also returns it so the demo flow can
    # complete end-to-end without an email provider.
    reset_token: str | None = None


class ResetPasswordIn(BaseModel):
    token: str
    password: str

    @field_validator("password")
    @classmethod
    def _password(cls, v: str) -> str:
        return _validate_password_strength(v)


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _password(cls, v: str) -> str:
        return _validate_password_strength(v)
