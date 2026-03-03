# Gastos v3.0 (Monorepo) — React + FastAPI

Este repositório é um **esqueleto robusto** para seu app financeiro:
- **Frontend**: React + TypeScript + Vite (UI responsiva, tabelas com scroll horizontal, gráficos simples)
- **Backend**: FastAPI + SQLModel (API tipada, validações com Pydantic, regras centralizadas)
- **Banco**: SQLite por padrão (muda fácil para Postgres)
- **Qualidade**: lint/typecheck/testes (backend), base para testes no frontend

## 1) Requisitos
- Node.js 18+
- Python 3.11+ (recomendado)
- (Opcional) Docker e Docker Compose

## 2) Rodar local (sem Docker)

### Backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
python -m app.db.init_db
uvicorn app.main:app --reload --port 8000
```

A API abre em:
- Swagger: http://localhost:8000/docs
- OpenAPI: http://localhost:8000/openapi.json

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

O frontend abre em:
- http://localhost:5173

## 3) Rodar com Docker
```bash
docker compose up --build
```
- Frontend: http://localhost:5173
- Backend: http://localhost:8000

## 4) O que já vem pronto
Backend:
- Autenticação JWT (login + refresh)
- CRUD de Transações
- CRUD de Categorias e Contas
- Dashboard básico (`/summary`) com agregações por período
- Importação CSV (`/import/csv`) com relatório de erros por linha
- Exportação CSV (`/export/csv`)

Frontend:
- Login
- Dashboard (consome `/summary`)
- Transações (listar/criar/editar/deletar)
- Import/Export CSV
- Layout responsivo e com **scroll horizontal apenas onde faz sentido** (tabelas)

## 5) CSV (formato canônico)
Cabeçalho esperado (mínimo):
```
date,amount,type,category,account,description,status
```
- `date`: YYYY-MM-DD
- `amount`: número (use ponto ou vírgula, ambos aceitos)
- `type`: INCOME | EXPENSE
- `status`: OPEN | PAID (opcional; se vazio assume OPEN)

## 6) Próximos passos recomendados
- Trocar SQLite por Postgres em produção (variável `DATABASE_URL`)
- Implementar Planejamento e Faturas de cartão como entidades próprias
- Adicionar Playwright (e2e) e Vitest (unit) no frontend
- Conectar Sentry (front e back) para rastrear erros em produção

---
Gerado automaticamente como base para evolução incremental.
