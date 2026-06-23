#!/usr/bin/env bash
# Despliegue del Portal Turístico de San Roque en el VPS.
# Idempotente: se puede correr cuantas veces haga falta.
set -euo pipefail

# Raíz del repo = un nivel arriba de deploy/scripts/
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

COMPOSE_BASE="deploy/docker-compose.yml"
COMPOSE_VPS="deploy/docker-compose.vps.yml"
ENV_FILE="deploy/.env"

echo "==========================================================="
echo "[deploy] Portal San Roque -> vivisanroque.munisanroque.ar"
echo "==========================================================="

if [ ! -f "$ENV_FILE" ]; then
  echo "[ERROR] Falta $ENV_FILE. Copialo de deploy/.env.example y completá OWM_API_KEY."
  exit 1
fi

echo "[1/5] Actualizando código desde GitHub (HTTPS, repo público)..."
git remote set-url origin "https://github.com/RickyFer22/Dev_Software_SanRoque.git" 2>/dev/null || true
git fetch origin main && git reset --hard origin/main || echo "[WARN] git fetch falló; continúo con los archivos locales."

echo "[2/5] Asegurando red docker externa 'web' (Traefik)..."
docker network inspect web >/dev/null 2>&1 || docker network create web

echo "[3/5] Construyendo imágenes..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_BASE" -f "$COMPOSE_VPS" build

echo "[4/5] Levantando contenedores..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_BASE" -f "$COMPOSE_VPS" up -d --remove-orphans

echo "[5/5] Estado:"
sleep 4
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_BASE" -f "$COMPOSE_VPS" ps

echo "==========================================================="
echo "[deploy] Listo. URL: https://vivisanroque.munisanroque.ar"
echo "==========================================================="
