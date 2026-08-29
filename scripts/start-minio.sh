#!/usr/bin/env bash
# Inicia o MinIO local (rodando no terminal atual, em foreground).
# Escuta em localhost:9000 (API/S3) e localhost:9001 (console).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MINIO_BIN="${MINIO_BIN:-$HOME/.local/bin/minio}"
DATA_DIR="${MINIO_DATA_DIR:-$ROOT_DIR/minio-data}"

# Credenciais (mesmas do .env / docker-compose original).
export MINIO_ROOT_USER="${MINIO_ROOT_USER:-ehorta_minio}"
export MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-ehorta_minio_dev_2024}"

if [ ! -x "$MINIO_BIN" ]; then
  echo "MinIO não encontrado em '$MINIO_BIN'."
  echo "Instale com:"
  echo "  mkdir -p ~/.local/bin"
  echo "  curl -Lo ~/.local/bin/minio https://dl.min.io/server/minio/release/linux-amd64/minio"
  echo "  chmod +x ~/.local/bin/minio"
  exit 1
fi

mkdir -p "$DATA_DIR"

echo "==> Iniciando MinIO (Ctrl+C para parar) ..."
echo "    API/S3 : http://localhost:9000"
echo "    Console: http://localhost:9001"
exec "$MINIO_BIN" server "$DATA_DIR" --console-address ":9001"
