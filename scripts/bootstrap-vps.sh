#!/usr/bin/env bash
# One-shot setup for a fresh Ubuntu 22.04+ VPS (works great on Oracle
# Cloud's Always Free Ampere ARM instance — genuinely free forever, and
# the only realistic free way to get real Docker access; see
# .env.example and each artifact's README for why that's required).
#
# Run this FROM THE SERVER over SSH — e.g. from your phone via Termux
# (Android) or Termius/Blink Shell (iOS):
#   ssh you@your-server-ip
#   curl -fsSL https://raw.githubusercontent.com/<you>/<repo>/main/scripts/bootstrap-vps.sh | bash
# or, after cloning the repo onto the server:
#   bash scripts/bootstrap-vps.sh
#
# Nothing here needs a local Rust/Docker/Node toolchain on YOUR phone —
# it all runs on the server. The only thing that can't happen this way
# is compiling the desktop app itself (needs a real Rust toolchain on
# each target OS) — see .github/workflows/desktop-release.yml for a
# free, phone-triggerable way to do that instead.
set -euo pipefail

REPO_DIR="${REPO_DIR:-$HOME/codehub}"
REPO_URL="${REPO_URL:-}" # set this env var to your repo's git URL if not already cloned

echo "==> Installing Docker Engine"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
fi

echo "==> Installing Node.js 22 + pnpm"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
if ! command -v pnpm >/dev/null 2>&1; then
  sudo npm install -g pnpm@9
fi

echo "==> Getting the code"
if [ -n "$REPO_URL" ] && [ ! -d "$REPO_DIR" ]; then
  git clone "$REPO_URL" "$REPO_DIR"
fi
cd "$REPO_DIR"

echo "==> Installing dependencies and building libraries"
pnpm install
pnpm run typecheck || true # non-fatal here; surfaces problems early without blocking setup

echo "==> Building the two enabled Cloud Runtime images (node, python)"
docker build -t codehub-runtime-node:latest \
  -f artifacts/runtime-manager/docker/runtime-node.Dockerfile artifacts/runtime-manager/docker
docker build -t codehub-runtime-python:latest \
  -f artifacts/runtime-manager/docker/runtime-python.Dockerfile artifacts/runtime-manager/docker

echo "==> Creating the workspaces directory Cloud Runtime writes project files into"
sudo mkdir -p /var/lib/codehub/runtimes
sudo chown "$USER":"$USER" /var/lib/codehub/runtimes

echo "==> Building the web frontend (adjust PORT/BASE_PATH if you changed them)"
PORT=5173 BASE_PATH=/ pnpm --filter codehub run build

cat <<'EOF'

==> Server-side setup done. What's left is filling in secrets/URLs, which
    is one file, not more shell commands:

  1. Copy .env.example to .env(.local) files for api-server and
     runtime-manager (see the file's own comments for which var goes
     where), fill in COOKIE_SECRET / GITHUB_TOKEN_ENCRYPTION_KEY /
     RUNTIME_MANAGER_INTERNAL_TOKEN (openssl rand -hex 32 / -base64 32),
     DATABASE_URL, and — if you want them — ANTHROPIC_API_KEY and
     TELEGRAM_BOT_TOKEN.

  2. Free Postgres: sign up at neon.tech or supabase.com from your
     phone's browser, create a project, copy its connection string into
     DATABASE_URL. Then:
       pnpm --filter @workspace/db run push

  3. Free wildcard DNS (no domain purchase needed) for the preview
     proxy: point RUNTIME_PREVIEW_DOMAIN at "<your-server-ip>.nip.io"
     (or sslip.io) — these resolve *.<ip>.nip.io to <ip> automatically,
     for free, forever. If you already own a domain, a real wildcard A
     record works too.

  4. TLS: `sudo apt-get install -y certbot` then issue a cert for your
     domain(s) — see deploy/nginx-codehub.conf, which already has the
     nginx config for both the app domain and the wildcard preview
     domain.

  5. Install the two systemd units in deploy/ (paths inside them assume
     this repo lives at /opt/codehub — adjust WorkingDirectory/ExecStart
     if REPO_DIR is different):
       sudo cp deploy/codehub-*.service /etc/systemd/system/
       sudo systemctl daemon-reload
       sudo systemctl enable --now codehub-runtime-manager
       sudo systemctl enable --now codehub-api-server

All of steps 1-5 are just editing text files and running short commands
over the same SSH session — no local build tooling needed on your phone
at any point.
EOF
