#!/usr/bin/env bash
# Inicia a API (NestJS) em dev, rodando no terminal atual (foreground).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Iniciando a API em http://localhost:8080 (Ctrl+C para parar)"
echo "    Swagger: http://localhost:8080/api/docs"
exec pnpm dev:api
