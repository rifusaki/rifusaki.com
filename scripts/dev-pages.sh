#!/usr/bin/env bash
set -euo pipefail

# Cloudflare/Wrangler settings
: "${CF_PAGES_PORT:=8788}"

# Jekyll upstream server used by `wrangler pages dev` proxy mode.
: "${JEKYLL_HOST:=127.0.0.1}"
: "${JEKYLL_PORT:=4000}"

# We must ensure we use the correct ruby environment and start Jekyll in the background
# The ruby errors show it is defaulting to homebrew ruby 3.4.0 instead of rbenv ruby 3.1.6
if command -v rbenv > /dev/null; then
  eval "$(rbenv init -)"
fi

echo "Starting Jekyll in the background..."
bundle _2.5.7_ exec jekyll serve --host "${JEKYLL_HOST}" --port "${JEKYLL_PORT}" --livereload &
JEKYLL_PID=$!

function cleanup() {
  echo "Shutting down Jekyll (PID: $JEKYLL_PID)..."
  kill $JEKYLL_PID 2>/dev/null || true
}
trap cleanup EXIT

# We must wait for Jekyll to build and bind
echo "Waiting 5 seconds for Jekyll to initialize..."
sleep 5

# Start wrangler using the static directory output of Jekyll
# Wrangler will serve the static files from _site and also execute functions from functions/
# --remote connects to the real Cloudflare R2 bucket (replaces the removed wrangler.toml
# r2_buckets[].remote field, which is unsupported by the Pages build pipeline).
echo "Starting Wrangler dev server..."
exec npx wrangler pages dev _site \
  --port="${CF_PAGES_PORT}" \
  --remote
