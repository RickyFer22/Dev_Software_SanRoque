#!/usr/bin/env bash
# Baja del despliegue ANTERIOR en devsoftware.munisanroque.ar.
# Detiene/elimina el contenedor viejo para que Traefik deje de enrutar ese dominio.
# Correr en el VPS. No toca el nuevo stack de vivisanroque.
set -uo pipefail

OLD_PATH="${OLD_PROJECT_PATH:-/opt/projects/dev-software-sanroque}"
OLD_CONTAINERS=("portal_sanroque_web" "portal_sanroque")

echo "==========================================================="
echo "[teardown] Dando de baja devsoftware.munisanroque.ar"
echo "==========================================================="

# 1. Bajar el stack viejo vía compose si el directorio existe
if [ -d "$OLD_PATH" ]; then
  echo "[1/3] Bajando stack en $OLD_PATH ..."
  if [ -f "$OLD_PATH/docker-compose.yml" ]; then
    ( cd "$OLD_PATH" && \
      docker compose -f docker-compose.yml -f docker-compose.vps.yml down --remove-orphans 2>/dev/null \
      || docker compose down --remove-orphans 2>/dev/null \
      || true )
  fi
else
  echo "[1/3] No existe $OLD_PATH (quizás ya fue removido)."
fi

# 2. Forzar eliminación de contenedores viejos por nombre, por si quedaron sueltos
echo "[2/3] Eliminando contenedores viejos por nombre..."
for c in "${OLD_CONTAINERS[@]}"; do
  if docker ps -a --format '{{.Names}}' | grep -qx "$c"; then
    docker rm -f "$c" 2>/dev/null && echo "   - removido: $c"
  fi
done

# 3. Recordatorios manuales (no automatizamos para no romper otros sitios)
echo "[3/3] Pendientes manuales:"
echo "   - Verificá que Traefik ya no enrute devsoftware: 'docker logs traefik --tail 30'"
echo "   - Eliminá el registro DNS de devsoftware.munisanroque.ar si ya no se usará."
echo "   - Opcional: borrá el directorio viejo -> sudo rm -rf $OLD_PATH"
echo "   - Si tenías el CI/CD viejo apuntando a ese path, ya quedó reemplazado por el nuevo workflow."

echo "==========================================================="
echo "[teardown] devsoftware dado de baja (revisá los pendientes)."
echo "==========================================================="
