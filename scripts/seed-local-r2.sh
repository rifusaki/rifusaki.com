#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "" || "${2:-}" == "" ]]; then
  cat <<'USAGE'
Usage: scripts/seed-local-r2.sh <bucket-binding> <source-dir> [key-prefix]

Example:
  scripts/seed-local-r2.sh PHOTOS_BUCKET ./tmp/local-photos
USAGE
  exit 1
fi

binding="$1"
source_dir="$2"
key_prefix="${3:-}"
persist_dir=".wrangler/state"

if [[ ! -d "$source_dir" ]]; then
  echo "Source directory not found: $source_dir" >&2
  exit 1
fi

uploaded=0

while IFS= read -r -d '' file; do
  rel_path="${file#$source_dir/}"
  key="$rel_path"

  if [[ -n "$key_prefix" ]]; then
    key="${key_prefix%/}/${rel_path}"
  fi

  npx wrangler r2 object put "${binding}/${key}" \
    --file "$file" \
    --local \
    --persist-to "$persist_dir" >/dev/null

  uploaded=$((uploaded + 1))
  echo "Uploaded: ${binding}/${key}"
done < <(
  find "$source_dir" -type f \
    \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.webp" -o -iname "*.avif" -o -iname "*.gif" \) \
    -print0
)

echo "Done. Uploaded ${uploaded} image(s) to local R2 state at ${persist_dir}."
