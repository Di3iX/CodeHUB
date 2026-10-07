#!/usr/bin/env bash
# Run this over the same SSH session after finishing
# DEPLOY_FROM_PHONE.md / scripts/bootstrap-vps.sh, to check every piece
# is actually up rather than guessing from scattered journalctl output.
#
#   bash scripts/healthcheck.sh
#
# Reads the same .env files the services use, so it's checking the
# real configured values, not assumptions.
set -uo pipefail

PASS="\033[32m✓\033[0m"
FAIL="\033[31m✗\033[0m"
WARN="\033[33m!\033[0m"
failures=0

check() {
  local label="$1"; shift
  if "$@" >/tmp/healthcheck-out 2>&1; then
    echo -e "$PASS $label"
  else
    echo -e "$FAIL $label"
    sed 's/^/    /' /tmp/healthcheck-out | head -5
    failures=$((failures + 1))
  fi
}

warn() {
  echo -e "$WARN $1"
}

echo "== Docker =="
check "Docker daemon is running" docker info
check "codehub-runtime-node image exists" docker image inspect codehub-runtime-node:latest
check "codehub-runtime-python image exists" docker image inspect codehub-runtime-python:latest
check "codehub-runtimes network exists" docker network inspect codehub-runtimes

echo
echo "== systemd services =="
check "codehub-runtime-manager is active" systemctl is-active --quiet codehub-runtime-manager
check "codehub-api-server is active" systemctl is-active --quiet codehub-api-server

echo
echo "== Config =="
API_ENV="${API_ENV:-$HOME/codehub/artifacts/api-server/.env}"
RUNTIME_ENV="${RUNTIME_ENV:-$HOME/codehub/artifacts/runtime-manager/.env}"

if [ -f "$API_ENV" ]; then
  echo -e "$PASS api-server .env found at $API_ENV"
  # shellcheck disable=SC1090
  set -a; source "$API_ENV"; set +a
else
  echo -e "$FAIL api-server .env not found — checked $API_ENV (set API_ENV=/path/to/.env if it's elsewhere)"
  failures=$((failures + 1))
fi

for var in COOKIE_SECRET GITHUB_CLIENT_ID GITHUB_CLIENT_SECRET GITHUB_TOKEN_ENCRYPTION_KEY RUNTIME_MANAGER_URL RUNTIME_MANAGER_INTERNAL_TOKEN DATABASE_URL; do
  if [ -n "${!var:-}" ]; then
    echo -e "$PASS $var is set"
  else
    echo -e "$FAIL $var is missing from $API_ENV"
    failures=$((failures + 1))
  fi
done

for var in ANTHROPIC_API_KEY TELEGRAM_BOT_TOKEN; do
  if [ -z "${!var:-}" ]; then
    warn "$var not set — AI Agent / Telegram Mini App will be unavailable (fine if you don't want them yet)"
  fi
done

echo
echo "== Database =="
if [ -n "${DATABASE_URL:-}" ] && command -v psql >/dev/null 2>&1; then
  check "Can connect to DATABASE_URL" psql "$DATABASE_URL" -c "select 1"
  check "runtime_instances table exists" psql "$DATABASE_URL" -c "select 1 from runtime_instances limit 1"
elif [ -z "${DATABASE_URL:-}" ]; then
  echo -e "$FAIL Skipped — DATABASE_URL not set"
else
  warn "psql not installed — skipping DB connectivity check (sudo apt-get install -y postgresql-client to enable it)"
fi

echo
echo "== HTTP =="
PORT="${PORT:-8080}"
check "api-server responds on 127.0.0.1:$PORT" curl -fsS "http://127.0.0.1:$PORT/api/healthz"

if [ -n "${APP_BASE_URL:-}" ]; then
  check "Public URL $APP_BASE_URL responds" curl -fsS -o /dev/null "$APP_BASE_URL"
else
  warn "APP_BASE_URL not set in .env — skipping public HTTPS check"
fi

if [ -f "$RUNTIME_ENV" ]; then
  # shellcheck disable=SC1090
  set -a; source "$RUNTIME_ENV"; set +a
  RM_PORT="${RUNTIME_MANAGER_PORT:-8090}"
  check "runtime-manager internal API responds on 127.0.0.1:$RM_PORT" curl -fsS "http://127.0.0.1:$RM_PORT/healthz"
else
  echo -e "$FAIL runtime-manager .env not found — checked $RUNTIME_ENV (set RUNTIME_ENV=/path/to/.env if it's elsewhere)"
  failures=$((failures + 1))
fi

echo
if [ "$failures" -eq 0 ]; then
  echo -e "$PASS All checks passed."
else
  echo -e "$FAIL $failures check(s) failed — see the indented output above each one."
  exit 1
fi
