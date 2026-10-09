#!/bin/sh
# Daily PostgreSQL dump with a fixed lifetime. Run by the "backup" service of docker-compose.yml.
#   backup.sh        one dump now, then one every 24 hours
#   backup.sh once   one dump now and exit (before a migration)
# Connection settings come from the standard PG* variables. A dump is written under a
# temporary name and renamed only when pg_dump succeeded, so a partial file is never
# mistaken for a backup. Dumps older than BACKUP_RETENTION_DAYS are deleted: that is what
# bounds how long an erased account can still exist in a backup.
set -eu

directory=/backups
retention_days="${BACKUP_RETENTION_DAYS:-30}"

dump() {
    name="tidysense-$(date -u +%Y%m%dT%H%M%SZ).dump"
    if pg_dump --format=custom --file "$directory/$name.partial"; then
        mv "$directory/$name.partial" "$directory/$name"
        echo "BACKUP_SUCCEEDED. File: $name"
    else
        rm -f "$directory/$name.partial"
        echo "BACKUP_FAILED." >&2
        return 1
    fi
    find "$directory" -name 'tidysense-*.dump' -mtime "+$retention_days" -delete
    find "$directory" -name '*.partial' -mtime +1 -delete
}

if [ "${1:-}" = "once" ]; then
    dump
    exit
fi

while true; do
    # A failed dump is reported and tried again the next day; the loop keeps running.
    dump || true
    sleep 86400
done
