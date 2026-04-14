# MyWallet 2.0

Monorepo completo para controle financeiro com **React + TypeScript (Vite)** no frontend e **FastAPI + SQLAlchemy + Alembic + Postgres** no backend.

## Funcionalidades
- Dashboard com KPIs, dívida por salário e gráficos.
- Lançamentos com métodos Débito/Pix/Dinheiro/Transferência/Crédito.
- Faturas derivadas por `invoice_key` com status (Vencida, Em aberto, Fechada).
- Múltiplos cartões e contas.
- Perfil de salário (mensal/quinzenal).
- Planejamento de caixa com horizonte configurável.
- Auth JWT (register/login/refresh/logout).

## Estrutura
```txt
/backend
  app/
    api/routers/
    core/
    db/
    schemas/
    services/
  alembic/
/frontend
  src/ui/pages/
  src/lib/
```

## Rodar com Docker (recomendado)
```bash
docker compose up --build
```
- Frontend: http://localhost:5173
- Backend docs: http://localhost:8000/docs

## Rodar local
### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Deploy (Render + Vercel)

### 1. Backend no Render
1. No painel Render → **New** → **Blueprint** → conecte este repositório.
   O `render.yaml` na raiz cria o serviço `mywallet-backend`.
2. Em **Environment**, defina:
   - `DATABASE_URL` = URL **interna** do seu Postgres no Render
     (ex: `postgresql://admin:SENHA@dpg-xxxxxxxxxxxxxxxxxxxx-a/mywallet_os4m`).
     O backend converte automaticamente para o driver `psycopg`.
   - `CORS_ORIGINS` (opcional) = URL exata do frontend (ex: `https://mywallet.vercel.app`).
     `*.vercel.app` e `*.onrender.com` já são aceitos via regex padrão.
3. Após o deploy, valide: `https://<seu-backend>.onrender.com/health`.

### 2. Frontend no Vercel
1. **New Project** → importe o repositório.
2. **Root Directory:** mantenha em `/` (raiz). O `vercel.json` cuida do build.
3. **Environment Variables:**
   - `VITE_API_URL` = `https://<seu-backend>.onrender.com/api`
4. Faça o deploy. SPA routing já está configurado via rewrites.

## Endpoints principais
- `POST /api/auth/register|login|refresh|logout`
- `GET/PUT /api/me`
- `GET/POST/PUT/DELETE /api/accounts`
- `GET/POST/PUT/DELETE /api/cards`
- `GET/POST/DELETE /api/transactions`
- `POST /api/transactions/installments`
- `GET /api/invoices`, `POST /api/invoices/pay`
- `GET /api/dashboard/kpis`, `GET /api/dashboard/balance`, `GET /api/dashboard/debt`
- `POST /api/planning/run`
- `GET /api/salary-profile`, `PUT /api/salary-profile`
- `GET /api/settings/export-csv`, `POST /api/settings/import-csv`, `POST /api/settings/reset`
