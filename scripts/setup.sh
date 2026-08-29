#!/usr/bin/env bash
# Configuração inicial do projeto (instala deps, banco, migrations e seed).
# Roda uma única vez após clonar o projeto.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Instalando dependências ..."
pnpm install

if [ ! -f .env ]; then
  echo "==> Criando .env a partir de .env.example ..."
  cp .env.example .env
fi

echo "==> Garantindo bancos locais (e_horta e e_horta_test) ..."
for DB in e_horta e_horta_test; do
  if PGPASSWORD=admin123 psql -h localhost -U root -d postgres -tAc \
    "SELECT 1 FROM pg_database WHERE datname='$DB'" | grep -q 1; then
    echo "    Banco '$DB' já existe."
  else
    PGPASSWORD=admin123 psql -h localhost -U root -d postgres -c "CREATE DATABASE $DB;"
    echo "    Banco '$DB' criado."
  fi
done

echo "==> Gerando Prisma Client ..."
pnpm db:generate

echo "==> Aplicando migrations no PostgreSQL local ..."
pnpm db:migrate

echo "==> Populando o banco com o seed (idempotente) ..."
pnpm db:seed

echo
echo "Setup concluído! Agora suba cada serviço em um terminal próprio:"
echo "  pnpm infra:minio     # MinIO (upload de imagens) — terminal 1"
echo "  pnpm dev:api         # API porta 8080               — terminal 2"
echo "  pnpm dev:web         # Loja porta 3000              — terminal 3"
echo "  pnpm dev:admin       # Admin porta 3001             — terminal 4"
