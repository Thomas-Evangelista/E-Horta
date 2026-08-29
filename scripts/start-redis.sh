#!/usr/bin/env bash
# Inicia o Redis local (serviço do sistema) e informa a porta.
set -euo pipefail

echo "==> Iniciando Redis (serviço do sistema) ..."
if systemctl is-active --quiet redis-server; then
  echo "Redis já está em execução."
else
  sudo systemctl start redis-server
  echo "Redis iniciado."
fi

if redis-cli ping > /dev/null 2>&1; then
  echo "Redis OK em localhost:6379."
else
  echo "!! Não consegui responder ao PING no Redis."
  exit 1
fi

echo
echo "Para acompanhar os logs do Redis em um terminal separado:"
echo "  redis-cli MONITOR"
