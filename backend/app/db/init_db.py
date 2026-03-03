from sqlmodel import Session, select

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import engine, create_db_and_tables
from app.db.models import User, Account, Category

def ensure_seed():
    create_db_and_tables()
    with Session(engine) as session:
        # admin user
        stmt = select(User).where(User.email == settings.ADMIN_EMAIL)
        user = session.exec(stmt).first()
        if not user:
            user = User(email=settings.ADMIN_EMAIL, password_hash=hash_password(settings.ADMIN_PASSWORD))
            session.add(user)

        # default accounts
        for acc_name in ["Caixa", "Banco", "Cartão"]:
            stmt = select(Account).where(Account.name == acc_name)
            if not session.exec(stmt).first():
                session.add(Account(name=acc_name))

        # default categories
        for cat_name in ["Moradia", "Transporte", "Alimentação", "Saúde", "Lazer", "Outros", "Salário"]:
            stmt = select(Category).where(Category.name == cat_name)
            if not session.exec(stmt).first():
                session.add(Category(name=cat_name))

        session.commit()

if __name__ == "__main__":
    ensure_seed()
