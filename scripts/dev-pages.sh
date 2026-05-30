#!/bin/zsh
set -euo pipefail

# Ensure rbenv Ruby takes precedence over system Ruby
export PATH="$HOME/.rbenv/bin:$HOME/.rbenv/shims:$PATH"
eval "$(rbenv init -)"

# Cloudflare/Wrangler settings
: "${CF_PAGES_PORT:=8788}"

# Jekyll upstream server used by `wrangler pages dev` proxy mode.
: "${JEKYLL_HOST:=127.0.0.1}"
: "${JEKYLL_PORT:=4000}"

echo "Starting Jekyll in the background..."
bundle exec jekyll serve --host "${JEKYLL_HOST}" --port "${JEKYLL_PORT}" --livereload &
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
# The R2 binding uses remote = true in wrangler.toml to connect to the real bucket.
echo "Starting Wrangler dev server..."
exec npx wrangler pages dev _site \
  --port="${CF_PAGES_PORT}"
