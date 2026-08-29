#!/usr/bin/env bash
# Inicia o PostgreSQL local (serviço do sistema).
# Usuário definido na instalação: root / admin123
set -euo pipefail

echo "==> Iniciando PostgreSQL (serviço do sistema) ..."
if systemctl is-active --quiet postgresql; then
  echo "PostgreSQL já está em execução."
else
  sudo systemctl start postgresql
  echo "PostgreSQL iniciado."
fi

echo "==> Verificando conexão em localhost:5432 ..."
if PGPASSWORD=admin123 psql -h localhost -U root -d postgres -c "SELECT 1" > /dev/null 2>&1; then
  echo "PostgreSQL OK em localhost:5432 (usuário root)."
else
  echo "!! Não consegui conectar. Confira usuário/senha e se o serviço subiu."
  exit 1
fi

echo
echo "Para acompanhar a emissão de logs em um terminal separado:"
echo "  sudo journalctl -u postgresql -f"
