Backup scripts for cns-ccb

Files:
- backup.sh: Run once or from cron to produce a timestamped database dump and global objects dump.

Usage (manual):

```bash
cd /root/app/cns-ccb
./infra/backup/backup.sh
```

Cron example (runs daily at 02:00 UTC):

```cron
0 2 * * * cd /root/app/cns-ccb && ./infra/backup/backup.sh >> /var/log/ccb_backup.log 2>&1
```

Notes:
- The script uses `docker compose -f infra/docker-compose.yml` to find the `db` container, runs `pg_dump` and `pg_dumpall` inside it, and copies artifacts to `infra/backups` in the repo directory.
- By default the script keeps 14 days of backups; override KEEP_DAYS env var if needed.
- Ensure the user that runs cron has permission to run docker commands (be in the docker group or run as root).
