#!/usr/bin/env bash
set -euo pipefail

# Aplica as migrações antes de subir o uvicorn.
alembic upgrade head

# `exec` faz o uvicorn herdar o PID 1 e receber os sinais (SIGTERM) do Render
# corretamente para um shutdown gracioso.
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
