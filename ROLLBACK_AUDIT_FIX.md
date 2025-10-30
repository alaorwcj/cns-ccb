# Rollback Guide - Audit Module 7-Day Filter

## Overview
This document describes how to rollback the audit module changes implemented on October 29, 2025.

## Changes Made (Commit 95d69d0)

### Backend Changes
1. **main.py**: Registered `AuditMiddleware` to enable audit logging
2. **api/routes/audit.py**: Added automatic 7-day filter when `start_date` not provided

### Frontend Changes
1. **AuditLogs.tsx**: 
   - Added default 7-day date range on component load
   - Added visual badge "📅 Últimos 7 dias"
   - Modified clearFilters to reset to 7-day default

### Rollback Point
- **Tag**: `v1.4.0-pre-audit-fix`
- **Created**: October 29, 2025 18:16 UTC
- **Purpose**: Snapshot before audit module changes

## Current Behavior (After Changes)
- ✅ Audit middleware is ACTIVE (logs being created)
- ✅ Default filter shows only last 7 days (7 logs from 456 total)
- ✅ Custom date ranges still work for accessing older logs
- ✅ Frontend initializes with last 7 days dates
- ✅ Visual indicator shows active 7-day filter

## Previous Behavior (Before Changes)
- ❌ Audit middleware was NOT registered (no logs created)
- ❌ No default filter (returned all historical logs)
- ❌ Frontend had empty date fields by default
- ❌ No visual indication of filtering

## Rollback Instructions

### Option 1: Full Rollback (Recommended)
Completely revert to the pre-fix state:

```bash
cd /root/app/cns-ccb

# Reset to the tagged version
git reset --hard v1.4.0-pre-audit-fix

# Rebuild containers with old code
./manage.sh rebuild

# Verify rollback
git log --oneline -5
```

**Result**: System returns to state before audit fixes, middleware will be inactive again.

### Option 2: Selective Rollback (Keep Middleware, Remove Filter)
If you want to keep audit logging active but remove the 7-day filter:

```bash
cd /root/app/cns-ccb

# Keep main.py (middleware registration)
git checkout v1.4.0-pre-audit-fix -- backend/app/api/routes/audit.py
git checkout v1.4.0-pre-audit-fix -- frontend/app/src/routes/audit/AuditLogs.tsx

# Rebuild only affected containers
./manage.sh rebuild

# Commit the partial rollback
git add -A
git commit -m "rollback: remove 7-day filter, keep audit middleware active"
```

**Result**: Audit logs will continue to be created, but no default 7-day filter applied.

### Option 3: Adjust Filter Duration
Change the 7-day filter to a different duration:

1. Edit `backend/app/api/routes/audit.py` line ~45:
```python
# Change from 7 days to desired duration
seven_days_ago = datetime.utcnow() - timedelta(days=30)  # Example: 30 days
```

2. Edit `frontend/app/src/routes/audit/AuditLogs.tsx` line ~20:
```typescript
// Change badge and default dates
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 30);  // Example: 30 days

// Update badge text at line ~183
<span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
  📅 Últimos 30 dias
</span>
```

3. Rebuild:
```bash
./manage.sh rebuild
```

## Verification After Rollback

### Check Current Version
```bash
cd /root/app/cns-ccb
git log --oneline -1
git describe --tags
```

### Test Audit Endpoint (After Full Rollback)
```bash
# Login
TOKEN=$(curl -X POST "https://cns.admsiga.org.br/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@example.com","password":"changeme"}' \
  -k -s | grep -o '"access":"[^"]*' | cut -d'"' -f4)

# Check audit logs (should return all logs if rollback successful)
curl -k "https://cns.admsiga.org.br/api/audit?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" -s | python3 -m json.tool
```

**Expected after full rollback**: 
- Audit middleware not registered (no new logs created)
- No automatic 7-day filter (returns all historical logs)

### Check Container Status
```bash
./manage.sh status
docker logs cns-api --tail 20
```

## Troubleshooting

### Problem: Rollback doesn't apply
**Solution**: Ensure containers are rebuilt after git reset
```bash
./manage.sh rebuild
docker logs cns-api --tail 50
```

### Problem: Frontend still shows 7-day filter
**Solution**: Clear browser cache or force refresh (Ctrl+Shift+R)
```bash
# Check if old frontend files are cached
docker exec cns-web ls -la /usr/share/nginx/html/assets/
```

### Problem: Audit logs still being created after rollback
**Solution**: Verify middleware is not registered in main.py
```bash
grep -n "AuditMiddleware" backend/app/main.py
# Should show NO results after full rollback
```

## Database Considerations

The rollback does NOT affect existing audit logs in the database. All historical logs (456 total) remain intact.

If you want to clean up recent test logs:
```bash
PGPASSWORD='Apx7G05Le2n6TM4kN06G7VMPP' psql -h localhost -p 5433 -U ccb -d ccb -c \
  "DELETE FROM audit_log WHERE timestamp >= '2025-10-29 18:00:00' AND action LIKE '%SUCCESS';"
```

**⚠️ Warning**: Be very careful with DELETE operations. Always backup first:
```bash
./manage.sh backup-db
```

## Support

If rollback fails or you need assistance:

1. Check git status: `git status`
2. Check current tag: `git describe --tags --always`
3. View recent commits: `git log --oneline -10`
4. Check container logs: `docker logs cns-api --tail 100`
5. Restore from backup if needed: See `MANUAL_DOCKER.md` section on database restore

## Related Documentation

- `MANUAL_DOCKER.md` - Complete Docker management guide
- `README_QUICKSTART.md` - Quick reference for common commands
- `manage.sh` - Automation script for all operations

## Change History

- **2025-10-29 18:35 UTC**: Audit fix implemented (commit 95d69d0)
- **2025-10-29 18:16 UTC**: Rollback tag created (v1.4.0-pre-audit-fix)
- **2025-10-29 18:20 UTC**: Audit middleware registered and tested
- **2025-10-29 18:28 UTC**: 7-day filter verified working (7/456 logs shown)
