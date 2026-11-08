#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 server for PrintYourVibe.
#
#   sudo bash deploy/setup.sh yourdomain.in [branch]
#
# Installs Node.js 22 and Caddy (automatic HTTPS), turns on the firewall and
# automatic security updates, creates the app user and folders, the website
# service and the nightly clean-up and backup timers, and the `pyv` command.
# Safe to run again: steps that are already done are skipped.
set -euo pipefail

DOMAIN=${1:-}
BRANCH=${2:-main}
APP_USER=pyv
APP_DIR=/srv/printyourvibe
SRC=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

say() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31m%s\033[0m\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Run this with sudo: sudo bash deploy/setup.sh yourdomain.in"
[[ $DOMAIN =~ ^[a-z0-9-]+(\.[a-z0-9-]+)+$ ]] || die "Give your domain without https://, for example: sudo bash deploy/setup.sh printyourvibe.in"
# shellcheck disable=SC1091
. /etc/os-release
[[ ${ID:-} == ubuntu ]] || echo "Note: this script is written for Ubuntu 24.04; you're on ${PRETTY_NAME:-an unknown system}."
export DEBIAN_FRONTEND=noninteractive

say "Updating the system"
apt-get update -q
apt-get upgrade -yq
apt-get install -yq curl git ufw unattended-upgrades ca-certificates gnupg sqlite3 openssl debian-keyring debian-archive-keyring apt-transport-https

say "Turning on automatic security updates"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

ram_mb=$(awk '/MemTotal/ {print int($2 / 1024)}' /proc/meminfo)
if [[ $ram_mb -lt 3000 ]] && ! swapon --show | grep -q .; then
  say "Adding 2 GB of swap (this server has ${ram_mb} MB of memory; building the site needs more)"
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

say "Firewall: allowing SSH and web traffic only"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443 >/dev/null
ufw --force enable >/dev/null

if ! node -v 2>/dev/null | grep -q '^v22\.'; then
  say "Installing Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -yq nodejs
fi

if ! command -v caddy >/dev/null; then
  say "Installing Caddy"
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -q
  apt-get install -yq caddy
fi

say "Creating the app user and folders"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /bin/bash "$APP_USER"
mkdir -p "$APP_DIR"/{releases,bin,shared/data,shared/uploads}
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
[[ -f $APP_DIR/deploy.conf ]] || echo "BRANCH=$BRANCH" > "$APP_DIR/deploy.conf"
chown "$APP_USER:$APP_USER" "$APP_DIR/deploy.conf"

say "Settings file"
ENV_FILE=$APP_DIR/shared/.env.production
if [[ ! -f $ENV_FILE ]]; then
  secret=$(openssl rand -base64 32)
  sed -e "s#^NEXT_PUBLIC_SITE_URL=.*#NEXT_PUBLIC_SITE_URL=https://$DOMAIN#" \
      -e "s#^BETTER_AUTH_SECRET=.*#BETTER_AUTH_SECRET=$secret#" \
      -e "s#^BETTER_AUTH_URL=.*#BETTER_AUTH_URL=https://$DOMAIN#" \
      -e "s#^MAIL_FROM=.*#MAIL_FROM=PrintYourVibe <orders@$DOMAIN>#" \
      "$SRC/.env.example" > "$ENV_FILE"
  echo "Created $ENV_FILE with your address and a new sign-in secret."
else
  echo "$ENV_FILE already exists; leaving it as it is."
fi
chown "$APP_USER:$APP_USER" "$ENV_FILE"
chmod 600 "$ENV_FILE"

say "Deploy key, so the server can fetch the code from GitHub"
sudo -u "$APP_USER" -H bash -c '
  mkdir -p ~/.ssh && chmod 700 ~/.ssh
  [[ -f ~/.ssh/id_ed25519 ]] || ssh-keygen -q -t ed25519 -N "" -C "printyourvibe-server" -f ~/.ssh/id_ed25519
  ssh-keyscan -t ed25519 github.com 2>/dev/null >> ~/.ssh/known_hosts
  sort -u -o ~/.ssh/known_hosts ~/.ssh/known_hosts'
if [[ ! -d $APP_DIR/repo.git ]]; then
  origin=$(git -C "$SRC" remote get-url origin 2>/dev/null || true)
  # Fetch over SSH with the deploy key (a read-only key that only works for this repository).
  if [[ $origin =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then repo="git@github.com:${BASH_REMATCH[1]}/${BASH_REMATCH[2]}.git"; else repo=$origin; fi
  [[ -n $repo ]] || die "Couldn't tell which GitHub repository to use. Run this script from inside your clone of the code."
  echo
  echo "Add this key to GitHub: your repository → Settings → Deploy keys → Add deploy key"
  echo "(title: printyourvibe-server, leave \"Allow write access\" unticked):"
  echo
  cat "/home/$APP_USER/.ssh/id_ed25519.pub"
  echo
  read -r -p "Press Enter once the key is added... " _ || true
  sudo -u "$APP_USER" -H git clone --quiet --mirror "$repo" "$APP_DIR/repo.git" || die "Couldn't fetch $repo with the deploy key. Check the key is added, then run this script again."
fi

say "The pyv command and the deploy script"
install -o "$APP_USER" -g "$APP_USER" -m 755 "$SRC/deploy/deploy.sh" "$APP_DIR/bin/deploy.sh"
install -m 755 "$SRC/deploy/pyv" /usr/local/bin/pyv
cat > /etc/sudoers.d/printyourvibe <<EOF
# Let the app user restart the website after a deploy, and nothing else.
$APP_USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart printyourvibe, /usr/bin/systemctl start printyourvibe, /usr/bin/systemctl stop printyourvibe
EOF
chmod 440 /etc/sudoers.d/printyourvibe
visudo -cf /etc/sudoers.d/printyourvibe >/dev/null

say "Website service and nightly timers"
for unit in printyourvibe.service pyv-maintenance.service pyv-maintenance.timer pyv-backup.service pyv-backup.timer; do
  sed -e "s#@APP_DIR@#$APP_DIR#g" -e "s#@APP_USER@#$APP_USER#g" "$SRC/deploy/systemd/$unit" > "/etc/systemd/system/$unit"
done
systemctl daemon-reload
systemctl enable printyourvibe.service >/dev/null
systemctl enable --now pyv-maintenance.timer pyv-backup.timer >/dev/null

say "HTTPS with Caddy for $DOMAIN"
sed -e "s#@DOMAIN@#$DOMAIN#g" "$SRC/deploy/Caddyfile" > /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
systemctl reload caddy || systemctl restart caddy

say "Done. Next:"
cat <<EOF
  1. Fill in your settings (Razorpay, Resend, R2, ADMIN_EMAILS):
       sudo nano $ENV_FILE
  2. Put the store online:
       sudo pyv deploy
  3. Open https://$DOMAIN/admin and sign in with an email from ADMIN_EMAILS.

  Everyday commands: sudo pyv help
EOF
