#!/usr/bin/env bash
# Inicia o painel admin (Next.js) em dev, rodando no terminal atual (foreground).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Iniciando o Admin em http://localhost:3001 (Ctrl+C para parar)"
exec pnpm dev:admin
