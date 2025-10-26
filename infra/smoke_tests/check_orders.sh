#!/usr/bin/env bash
set -euo pipefail

API=${API:-http://localhost:8000}
USERNAME=${USERNAME:-admin@example.com}
PASSWORD=${PASSWORD:-changeme}

echo "[smoke] API: $API"

echo "[smoke] Logging in..."
# Try JSON login first
TOK_JSON=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" -d "{\"username\": \"$USERNAME\", \"password\": \"$PASSWORD\"}" || true)
TOK=$(printf "%s" "$TOK_JSON" | python3 -c "import sys,json
try:
 d=json.load(sys.stdin)
 print(d.get('access') or d.get('access_token') or d.get('token') or '')
except Exception:
 print('')")
if [ -z "$TOK" ]; then
  echo "[smoke] JSON login failed, trying form login..."
  TOK_FORM=$(curl -s -X POST "$API/auth/login" -d "username=$USERNAME" -d "password=$PASSWORD" || true)
    TOK=$(printf "%s" "$TOK_FORM" | python3 -c "import sys,json
try:
 d=json.load(sys.stdin)
 print(d.get('access') or d.get('access_token') or d.get('token') or '')
except Exception:
 print('')")
fi

if [ -z "$TOK" ]; then
  echo "[smoke] ERROR: failed to obtain access token"
  echo "Response (json):"; echo "$TOK_JSON"; exit 2
fi

echo "[smoke] Token length: ${#TOK}"

# Fetch orders
echo "[smoke] Fetching /orders"
ORDERS=$(curl -s -H "Authorization: Bearer $TOK" "$API/orders")
printf "%s" "$ORDERS" > /tmp/_smoke_orders.json

python3 - <<'PY'
import sys,json
p='/tmp/_smoke_orders.json'
try:
    d=json.load(open(p))
except Exception as e:
    print('[smoke] ERROR: invalid JSON from /orders:', e)
    sys.exit(3)
# support pagination wrapper
orders = d.get('data') if isinstance(d, dict) and 'data' in d else d
if not orders:
    print('[smoke] WARN: no orders returned (empty list)')
    sys.exit(4)
first = orders[0]
if not first.get('church_name'):
    print('[smoke] ERROR: first order missing church_name')
    sys.exit(5)
items = first.get('items') or []
if not items:
    print('[smoke] ERROR: first order has no items')
    sys.exit(6)
if 'product_name' not in items[0]:
    print('[smoke] ERROR: first item missing product_name')
    sys.exit(7)
print('[smoke] OK: church_name and product_name present in first order')
# basic total sanity: sum subtotals or unit_price*qty
s=0.0
for it in items:
    st = it.get('subtotal')
    if st is None:
        try:
            qty = float(it.get('qty') or 0)
            up = float(it.get('unit_price') or 0)
            s += qty*up
        except Exception:
            pass
    else:
        try:
            s += float(st)
        except Exception:
            pass
print('[smoke] Computed items total (first order):', s)
# if order has a top-level total field, check it's close
ototal = None
if isinstance(first, dict):
    ot = first.get('total')
    if ot is not None:
        try:
            ototal = float(ot)
            if abs(ototal - s) > 0.01:
                print('[smoke] WARN: order.total differs from computed items total:', ototal, 'vs', s)
            else:
                print('[smoke] OK: order.total matches computed items total')
        except Exception:
            print('[smoke] WARN: order.total present but not numeric')
print('[smoke] SMOKE TEST COMPLETE')
PY

exit 0
