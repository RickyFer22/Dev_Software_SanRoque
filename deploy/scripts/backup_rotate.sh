#!/usr/bin/env bash
set -euo pipefail
# Script sencillo para rotar backups y mantener N copias
DATA_DIR=${1:-/var/lib/sanroque/admin_data}
BACKUP_DIR=${2:-${DATA_DIR}/backups}
KEEP=${3:-7}

mkdir -p "$BACKUP_DIR"
TS=$(date -u +"%Y%m%dT%H%M%SZ")
FILE="$BACKUP_DIR/admin-backup-$TS.json"

echo "Creating backup to $FILE"
if [ -f "$DATA_DIR/admin.json" ]; then
  cp "$DATA_DIR/admin.json" "$FILE"
else
  echo "No admin.json found in $DATA_DIR" >&2
  exit 1
fi

echo "Rotating backups, keeping $KEEP copies"
ls -1t "$BACKUP_DIR"/admin-backup-*.json 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -f --
echo "Backup complete"
