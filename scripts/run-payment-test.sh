#!/usr/bin/env bash
# Boots a production build with mock Stripe + mock Upstash credentials
# and runs the payment end-to-end test against it. No real money, no real keys,
# no network calls off the machine.
set -euo pipefail
cd "$(dirname "$0")/.."

MOCK_PORT="${MOCK_PORT:-3999}"
APP_PORT="${APP_PORT:-3100}"

export MOCK_PORT
export APP_URL="http://127.0.0.1:${APP_PORT}"

# Test-only values. Real ones live in Vercel and are never in this repo.
export STRIPE_API_BASE="http://127.0.0.1:${MOCK_PORT}/v1"
# The suite runs twice. Use a different KIND of key each time so both are
# exercised: sk_ is a full secret key, rk_ a restricted one. Matching only sk_
# once meant an rk_test_ key was reported as LIVE MODE, which is the expensive
# direction to be wrong in.
if [[ "${STORAGE:-upstash}" == "supabase" ]]; then
  export STRIPE_SECRET_KEY="rk_test_mock"
else
  export STRIPE_SECRET_KEY="sk_test_mock"
fi
# So the suite can read back what the setup page says about that key.
export ROZU_SETUP=1
export STRIPE_PRICE_SOLO="price_test_solo"
export STRIPE_PRICE_COUPLE="price_test_couple"
# Deliberately its own id: gift is a separate product now, and a test that
# reused the solo price could not tell the two apart.
export STRIPE_PRICE_GIFT="price_test_gift"
export STRIPE_WEBHOOK_SECRET="whsec_test-$(openssl rand -hex 8)"
export ROZU_TOKEN_SECRET="test-token-secret-$(openssl rand -hex 16)"
export ROZU_PREVIEW_KEY="test-preview-key-$(openssl rand -hex 12)"
# Which storage driver to exercise. Both are run by `npm run test:payment`.
STORAGE="${STORAGE:-upstash}"
if [[ "$STORAGE" == "supabase" ]]; then
  export SUPABASE_URL="http://127.0.0.1:${MOCK_PORT}"
  export SUPABASE_SERVICE_ROLE_KEY="test-service-role-key"
else
  export KV_REST_API_URL="http://127.0.0.1:${MOCK_PORT}/kv"
  export KV_REST_API_TOKEN="test-kv-token"
fi
echo "### storage backing: $STORAGE"
# Deliberately unset: a paid order must still be delivered (as the
# deterministic fallback) when the model is unreachable.
unset ANTHROPIC_API_KEY || true

cleanup() {
  if [[ -n "${APP_PID:-}" ]]; then
    # next start forks a worker into the same process group; killing only the
    # parent leaves that worker holding the port.
    kill -TERM -- "-$APP_PID" 2>/dev/null || kill "$APP_PID" 2>/dev/null || true
    # next start forks a worker; wait for the port to actually be released so a
    # back-to-back second run does not collide with it.
    for _ in $(seq 1 20); do
      curl -fsS "$APP_URL" -o /dev/null 2>/dev/null || break
      sleep 0.5
    done
  fi
}
trap cleanup EXIT

# A server left over from a previous run would answer on this port with the
# previous run's secrets, and every webhook assertion would fail for a reason
# that has nothing to do with the code under test. Refuse to start instead.
if curl -fsS "$APP_URL" -o /dev/null 2>/dev/null; then
  echo "ERROR: something is already listening on $APP_URL — stop it first" >&2
  exit 1
fi

LOG="${LOG:-$(mktemp -p "${TMPDIR:-/tmp}" rozu-paytest-XXXXXX)}"
setsid npx next start -p "$APP_PORT" >"$LOG" 2>&1 &
APP_PID=$!

READY=0
for _ in $(seq 1 60); do
  if curl -fsS "$APP_URL" -o /dev/null 2>/dev/null; then READY=1; break; fi
  # Fail fast if the server died rather than waiting out the full timeout.
  if ! kill -0 "$APP_PID" 2>/dev/null; then break; fi
  sleep 0.5
done
if [[ "$READY" != "1" ]]; then
  echo "ERROR: server did not come up. Log:" >&2
  cat "$LOG" >&2
  exit 1
fi

STATUS=0
node scripts/payment-test.mjs || STATUS=$?

echo
echo "--- server log ($STORAGE) ---"
cat "$LOG"
exit $STATUS
