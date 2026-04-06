#!/usr/bin/env bash
#
# D1 Database Backup
# ==================
# Exports the natal-chart D1 database as a SQL dump to a local directory.
# Keeps the last N backups (default 30) and removes older ones.
#
# Prerequisites:
#   - CLOUDFLARE_API_TOKEN environment variable set
#   - npx wrangler available (pnpm install in the repo)
#
# Usage:
#   # Manual run
#   CLOUDFLARE_API_TOKEN="your-token" bash scripts/backup-d1.sh
#
#   # Cron (nightly at 3am) — add with: crontab -e
#   0 3 * * * CLOUDFLARE_API_TOKEN="your-token" /home/john/src/natal-chart/scripts/backup-d1.sh
#
# Backups are saved to: backups/d1/natal-chart-db-YYYY-MM-DD-HHMMSS.sql

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKER_DIR="$REPO_ROOT/packages/worker"
BACKUP_DIR="$REPO_ROOT/backups/d1"
KEEP_DAYS=30
DB_NAME="natal-chart-db"
TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}-${TIMESTAMP}.sql"
LOG_FILE="$BACKUP_DIR/backup.log"

# ─── Preflight ───────────────────────────────────────────────────────────────

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "$(date -Iseconds) ERROR: CLOUDFLARE_API_TOKEN not set" | tee -a "$LOG_FILE" 2>/dev/null
  exit 1
fi

mkdir -p "$BACKUP_DIR"

# ─── Export ──────────────────────────────────────────────────────────────────

echo "$(date -Iseconds) Starting backup of $DB_NAME..." >> "$LOG_FILE"

cd "$WORKER_DIR"
if npx wrangler d1 export "$DB_NAME" --remote --output "$BACKUP_FILE" 2>>"$LOG_FILE"; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "$(date -Iseconds) Backup complete: $BACKUP_FILE ($SIZE)" >> "$LOG_FILE"
  echo "Backup saved: $BACKUP_FILE ($SIZE)"
else
  echo "$(date -Iseconds) ERROR: Backup failed" >> "$LOG_FILE"
  echo "ERROR: Backup failed. Check $LOG_FILE for details."
  exit 1
fi

# ─── Compress ────────────────────────────────────────────────────────────────

gzip "$BACKUP_FILE"
echo "$(date -Iseconds) Compressed: ${BACKUP_FILE}.gz" >> "$LOG_FILE"

# ─── Prune Old Backups ──────────────────────────────────────────────────────

DELETED=0
find "$BACKUP_DIR" -name "${DB_NAME}-*.sql.gz" -mtime +$KEEP_DAYS -delete -print 2>/dev/null | while read -r f; do
  echo "$(date -Iseconds) Pruned: $f" >> "$LOG_FILE"
  DELETED=$((DELETED + 1))
done

TOTAL=$(find "$BACKUP_DIR" -name "${DB_NAME}-*.sql.gz" | wc -l)
echo "$(date -Iseconds) Backups retained: $TOTAL" >> "$LOG_FILE"
echo "Backups retained: $TOTAL (keeping last $KEEP_DAYS days)"
