# Deploying CodeHub for free, entirely from a phone

Every step below is either "tap around in a mobile browser" or "type a
command over SSH from Termux/Termius". Nothing requires a laptop. The
heavy lifting (Docker builds, compiling) happens on the server, not on
your phone.

Budget: **$0**, except Anthropic API usage if you enable the AI Agent
(pay-per-request, not a subscription — a few cents for casual use).

---

## 1. Get a free server (Oracle Cloud, phone browser)

1. Go to https://signup.oraclecloud.com in your phone's browser.
2. Sign up for the **Always Free** tier. It asks for a card for identity
   verification only — nothing is charged as long as you stay on Always
   Free resources.
3. Once your account is active: **Menu → Compute → Instances → Create
   Instance**.
4. Under "Image and shape":
   - Image: **Ubuntu 22.04** (or newer)
   - Shape: click "Change shape" → **Ampere (ARM)** → `VM.Standard.A1.Flex`
     → set 4 OCPUs / 24GB memory (the full Always Free ARM allowance).
5. Under "Add SSH keys": choose **"Generate a key pair for me"**, then
   **download the private key** — your phone browser will save it as a
   `.key` file. You'll copy this into Termux in the next step.
6. Click **Create**. Wait ~1 minute, then copy the instance's **public
   IP address** from the instance details page.

**Open the firewall** (Oracle blocks everything but SSH by default, at
the cloud-network level — this trips almost everyone up):
- On the instance's page, click the subnet link → your **Security
  List** → **Add Ingress Rules**. Add two rules, source CIDR
  `0.0.0.0/0`, destination ports **80** and **443** (TCP).

## 2. SSH from your phone

**Android — Termux** (install from F-Droid, not the stale Play Store
build):
```
pkg install openssh
# move the downloaded private key into Termux's storage, e.g. via the Files app share sheet into Termux, then:
chmod 600 ~/storage/downloads/your-key.key
ssh -i ~/storage/downloads/your-key.key ubuntu@<your-server-ip>
```

**iOS — Termius** (free tier is enough): add a new host with the
server's IP, username `ubuntu`, and import the downloaded key file
directly in the app.

You're now at a shell prompt physically running on your Oracle server.
Everything from here happens in that SSH session.

## 3. Put the code on the server

If you don't already have this repo on GitHub, easiest path from a
phone: use the **GitHub mobile app** (or github.com in the browser) to
create a new repo and upload the project as a zip via "Add file →
Upload files" — GitHub will unpack it as a commit. Then, back in your
SSH session:

```
git clone https://github.com/<you>/<your-repo>.git ~/codehub
cd ~/codehub
```

## 4. Run the bootstrap script

```
bash scripts/bootstrap-vps.sh
```

This installs Docker, Node, pnpm, builds both Cloud Runtime images
(node, python), and builds the web frontend. Takes several minutes —
fine to lock your phone and come back, SSH stays connected (or use
`tmux` first if your connection is flaky: `tmux new -s codehub`, run
the script inside it, and `tmux attach -t codehub` if you get
disconnected).

## 5. Free Postgres (phone browser)

1. Go to https://neon.tech (or supabase.com), sign up, create a project.
2. Copy the connection string it gives you — that's your `DATABASE_URL`.

## 6. Free wildcard domain

No purchase needed. Your preview domain is just:
```
<your-server-ip-with-dashes-instead-of-dots>.nip.io
```
e.g. server IP `140.238.12.34` → `140-238-12-34.nip.io`. This (and any
subdomain of it) already resolves to your server, for free, forever —
no DNS setup step at all.

For the main app, you can use the plain IP-based nip.io domain too, or
if you already own a real domain, point an A record at the server IP
instead.

## 7. TLS certificates

```
sudo apt-get install -y certbot python3-certbot-nginx nginx
sudo certbot --nginx -d <your-app-domain> -d '*.<preview-domain>' \
  --manual --preferred-challenges dns
```
(the wildcard cert needs the DNS-01 challenge — certbot will print a
TXT record to add; since nip.io domains can't have custom TXT records,
use a **non-wildcard** cert per subdomain instead if you're on nip.io,
or switch to a real domain via Cloudflare — a free Cloudflare account
lets you manage DNS for a cheap/free domain and issue wildcard certs
through it instead.)

Then copy `deploy/nginx-codehub.conf` into `/etc/nginx/sites-available/`,
adjust the two `server_name`/cert paths, symlink it into
`sites-enabled/`, and `sudo systemctl reload nginx`.

## 8. GitHub OAuth App (phone browser)

1. github.com → your avatar → **Settings → Developer settings → OAuth
   Apps → New OAuth App**.
2. Homepage URL: `https://<your-app-domain>`
3. Authorization callback URL: `https://<your-app-domain>/api/github/oauth/callback`
4. Save the **Client ID**, generate and save the **Client Secret**.

## 9. Fill in the environment files

Back in your SSH session:
```
nano ~/codehub/artifacts/api-server/.env
```
Fill in everything `.env.example`'s api-server section lists —
generate the random secrets right there in the terminal:
```
openssl rand -hex 32      # for COOKIE_SECRET, RUNTIME_MANAGER_INTERNAL_TOKEN
openssl rand -base64 32   # for GITHUB_TOKEN_ENCRYPTION_KEY
```
Same for `artifacts/runtime-manager/.env` (matching
`RUNTIME_MANAGER_INTERNAL_TOKEN` value, `RUNTIME_PREVIEW_DOMAIN` = your
nip.io domain, `DATABASE_URL`).

`ANTHROPIC_API_KEY` and `TELEGRAM_BOT_TOKEN` are optional — skip them
if you don't want the AI Agent or Telegram Mini App yet; nothing else
breaks without them.

## 10. Push the database schema and start everything

```
cd ~/codehub
pnpm --filter @workspace/db run push
sudo cp deploy/codehub-*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now codehub-runtime-manager
sudo systemctl enable --now codehub-api-server
sudo systemctl status codehub-api-server   # should say "active (running)"
```

## 11. Open it on your phone

Visit `https://<your-app-domain>` in your phone's browser. You should
see CodeHub's mobile UI. Try connecting GitHub, creating a Cloud
Runtime, opening the terminal.

## Optional: Telegram Mini App

1. Message **@BotFather** on Telegram → `/newbot` (or use an existing
   bot) → copy the bot token into `TELEGRAM_BOT_TOKEN` in
   `api-server/.env`, restart the service:
   `sudo systemctl restart codehub-api-server`.
2. `/newapp` (or `/myapps` → your bot → Bot Settings → Menu Button) →
   set the Web App URL to `https://<your-app-domain>`.
3. Open your bot in Telegram — the Mini App now loads your CodeHub.

## Optional: desktop app

Don't build it on the server or your phone — push a tag instead and
let GitHub Actions build it for free:
```
git tag desktop-v0.1.0
git push --tags
```
Watch progress in the GitHub mobile app (or github.com) under
**Actions**. When it finishes, the installers are attached to a draft
**Release** — download the one for your OS from any browser.

---

## If something doesn't come up

Run the health check script first — it checks Docker, both images, both
systemd services, every required env var, the database connection, and
both HTTP endpoints in one pass, so you're not guessing which of those
to look at:
```
bash scripts/healthcheck.sh
```

If it points at something specific, dig into that one piece:
```
sudo journalctl -u codehub-api-server -n 100 --no-pager
sudo journalctl -u codehub-runtime-manager -n 100 --no-pager
docker ps -a
```
All still just SSH commands — the same session you've been using the
whole time.
