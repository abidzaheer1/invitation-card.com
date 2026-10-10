#!/usr/bin/env bash
# Nightly PostgreSQL backup. Add to root's crontab on the server:
#   0 3 * * * /opt/invitation-card/backup.sh >> /var/log/invitation-backup.log 2>&1
# Remember to copy /opt/invitation-card/backups off the server as well
# (rsync, rclone, or download them), because a backup on the same disk is not enough.
set -euo pipefail

cd /opt/invitation-card
mkdir -p backups
STAMP=$(date +%Y%m%d-%H%M%S)

docker compose exec -T db pg_dump -U invitation -d invitation --no-owner \
  | gzip > "backups/invitation-$STAMP.sql.gz"

docker run --rm -v invitation-card_uploads:/data:ro -v "$PWD/backups":/out alpine \
  tar czf "/out/uploads-$STAMP.tar.gz" -C /data . 

# Keep the last 14 days.
find backups -name 'uploads-*.tar.gz' -mtime +14 -delete
find backups -name 'invitation-*.sql.gz' -mtime +14 -delete
echo "Backup written: backups/invitation-$STAMP.sql.gz"
