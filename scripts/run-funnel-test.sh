#!/usr/bin/env bash
# Boots a production build in preview mode and checks that the funnel events
# actually reach a pixel. Same shape as run-payment-test.sh; no real keys, no
# network calls off the machine.
set -euo pipefail
cd "$(dirname "$0")/.."

APP_PORT="${APP_PORT:-3141}"
export APP_URL="http://127.0.0.1:${APP_PORT}"

# Test-only values.
export ROZU_TOKEN_SECRET="test-token-secret-$(openssl rand -hex 16)"
export ROZU_PREVIEW_KEY="test-preview-key-$(openssl rand -hex 12)"
# Deliberately unset: the routine must still be delivered as the deterministic
# fallback, and ViewRoutine must still fire, when the model is unreachable.
unset ANTHROPIC_API_KEY || true
# No pixel IDs. The test injects its own recorder, so a real pixel would only
# add a network call and a source of flake.
unset NEXT_PUBLIC_TIKTOK_PIXEL_ID NEXT_PUBLIC_LINKEDIN_PARTNER_ID || true

cleanup() {
  if [[ -n "${APP_PID:-}" ]]; then
    # next start forks a worker into the same process group; killing only the
    # parent leaves that worker holding the port.
    kill -TERM -- "-$APP_PID" 2>/dev/null || kill "$APP_PID" 2>/dev/null || true
    for _ in $(seq 1 20); do
      curl -fsS "$APP_URL" -o /dev/null 2>/dev/null || break
      sleep 0.5
    done
  fi
}
trap cleanup EXIT

if curl -fsS "$APP_URL" -o /dev/null 2>/dev/null; then
  echo "ERROR: something is already listening on $APP_URL — stop it first" >&2
  exit 1
fi

LOG="${LOG:-$(mktemp -p "${TMPDIR:-/tmp}" rozu-funnel-XXXXXX)}"
setsid npx next start -p "$APP_PORT" >"$LOG" 2>&1 &
APP_PID=$!

READY=0
for _ in $(seq 1 60); do
  if curl -fsS "$APP_URL" -o /dev/null 2>/dev/null; then READY=1; break; fi
  if ! kill -0 "$APP_PID" 2>/dev/null; then break; fi
  sleep 0.5
done
if [[ "$READY" != "1" ]]; then
  echo "ERROR: server did not come up. Log:" >&2
  cat "$LOG" >&2
  exit 1
fi

STATUS=0
node scripts/funnel-smoke.mjs || STATUS=$?

echo
echo "--- server log ---"
cat "$LOG"
exit $STATUS
