#!/usr/bin/env bash
# Inicia a loja (Next.js) em dev, rodando no terminal atual (foreground).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Iniciando a loja (Web) em http://localhost:3000 (Ctrl+C para parar)"
exec pnpm dev:web
