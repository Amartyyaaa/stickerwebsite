#!/usr/bin/env bash
# Put a new version of the store online, or go back to the previous one.
# Run it through the pyv command:
#
#   sudo pyv deploy      fetch the branch in deploy.conf, build it, switch to it
#   sudo pyv rollback    switch back to the previous release
#
# Each release is built in its own folder under releases/, sharing the
# database, uploads and settings in shared/. The store only switches once the
# build has worked, so a failed deploy leaves the running store untouched.
set -euo pipefail

APP_DIR=${PYV_APP_DIR:-/srv/printyourvibe}
SERVICE=${PYV_SERVICE:-printyourvibe}
PORT=${PYV_PORT:-3000}
KEEP=${PYV_KEEP:-5}
BRANCH=main
cd "$APP_DIR"
# shellcheck disable=SC1091
[[ -f deploy.conf ]] && . ./deploy.conf

say() { printf '\n==> %s\n' "$*"; }

# Restart the website and wait for its health check. Tests can swap in their own command.
restart() {
  if [[ -n ${PYV_RESTART_CMD:-} ]]; then
    bash -c "$PYV_RESTART_CMD"
  else
    sudo /usr/bin/systemctl restart "$SERVICE"
  fi
  for _ in $(seq 1 90); do
    if curl -fsS "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
      say "The store is up"
      return 0
    fi
    sleep 1
  done
  echo "The store didn't answer within 90 seconds. See what happened with: sudo pyv logs" >&2
  return 1
}

# Point "current" at a release in one step, so there's never a moment without one.
switch_to() {
  ln -sfn "$1" current.new
  mv -T current.new current
}

releases() { find releases -mindepth 1 -maxdepth 1 -type d -printf 'releases/%f\n' | sort; }
current=$(readlink current 2>/dev/null || true)

if [[ ${1:-} == --rollback ]]; then
  previous=$(releases | awk -v cur="$current" '$0 == cur { print prev; exit } { prev = $0 }')
  [[ -n $previous ]] || { echo "There's no earlier release to go back to." >&2; exit 1; }
  say "Going back from ${current#releases/} to ${previous#releases/}"
  switch_to "$previous"
  restart
  say "Done: ${previous#releases/} is live. (Database changes from newer releases stay; they only ever add things.)"
  exit 0
fi

say "Fetching the $BRANCH branch"
git --git-dir=repo.git fetch --prune --quiet origin '+refs/heads/*:refs/heads/*'
rev=$(git --git-dir=repo.git rev-parse --short=7 "refs/heads/$BRANCH")
release="releases/$(date -u +%Y%m%d-%H%M%S)-$rev"
mkdir -p "$release"
git --git-dir=repo.git archive "refs/heads/$BRANCH" | tar -x -C "$release"
basename "$release" > "$release/RELEASE"
ln -s ../../shared/data "$release/data"
ln -s ../../shared/uploads "$release/uploads"
ln -s ../../shared/.env.production "$release/.env.production"

fail() {
  echo >&2
  echo "Deploy stopped: $1. The store is still running ${current#releases/}." >&2
  rm -rf "${APP_DIR:?}/$release"
  exit 1
}

cd "$release"
say "Installing packages"
npm ci --no-audit --no-fund --loglevel=error || fail "installing packages failed"
say "Updating the database"
NODE_ENV=production npm run --silent db:migrate || fail "updating the database failed"
NODE_ENV=production npm run --silent db:seed || fail "adding new product types failed"
say "Building the site (this takes a few minutes)"
npm run build || fail "the build failed"
cd "$APP_DIR"

say "Switching to ${release#releases/}"
switch_to "$release"
# Keep this script up to date for next time (a rename, so the copy that's running now isn't disturbed).
install -m 755 "$release/deploy/deploy.sh" bin/deploy.sh.new && mv -f bin/deploy.sh.new bin/deploy.sh
restart || exit 1

old=$(releases | head -n "-$KEEP")
for r in $old; do
  [[ $r == "$(readlink current)" ]] || rm -rf "${APP_DIR:?}/$r"
done
say "Done: ${release#releases/} is live"
