#!/usr/bin/env bash
# Boots a production build with mock Lemon Squeezy + mock Upstash credentials
# and runs the payment end-to-end test against it. No real money, no real keys,
# no network calls off the machine.
set -euo pipefail
cd "$(dirname "$0")/.."

MOCK_PORT="${MOCK_PORT:-3999}"
APP_PORT="${APP_PORT:-3100}"

export MOCK_PORT
export APP_URL="http://127.0.0.1:${APP_PORT}"

# Test-only values. Real ones live in Vercel and are never in this repo.
export LEMONSQUEEZY_API_BASE="http://127.0.0.1:${MOCK_PORT}/v1"
export LEMONSQUEEZY_API_KEY="test-key"
export LEMONSQUEEZY_STORE_ID="10000"
export LEMONSQUEEZY_VARIANT_SOLO="20001"
export LEMONSQUEEZY_VARIANT_COUPLE="20002"
export LEMONSQUEEZY_WEBHOOK_SECRET="test-webhook-secret-$(openssl rand -hex 8)"
export ROZU_TOKEN_SECRET="test-token-secret-$(openssl rand -hex 16)"
export KV_REST_API_URL="http://127.0.0.1:${MOCK_PORT}/kv"
export KV_REST_API_TOKEN="test-kv-token"
# Deliberately unset: a paid order must still be delivered (as the
# deterministic fallback) when the model is unreachable.
unset ANTHROPIC_API_KEY || true

cleanup() { [[ -n "${APP_PID:-}" ]] && kill "$APP_PID" 2>/dev/null || true; }
trap cleanup EXIT

npx next start -p "$APP_PORT" >/tmp/rozu-paytest-server.log 2>&1 &
APP_PID=$!

for _ in $(seq 1 60); do
  if curl -fsS "$APP_URL" -o /dev/null 2>/dev/null; then break; fi
  sleep 0.5
done

node scripts/payment-test.mjs
STATUS=$?

echo
echo "--- server log ---"
cat /tmp/rozu-paytest-server.log
exit $STATUS
