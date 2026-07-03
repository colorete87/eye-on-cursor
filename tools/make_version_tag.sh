#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Djinn Alexio
# SPDX-License-Identifier: GPL-3.0-or-later
set -euo pipefail

CHANGELOG="${1:-$(dirname "$(realpath "$0")")/../CHANGELOG.md}"
METADATA="${2:-$(dirname "$(realpath "$0")")/../src/metadata.json}"

if [[ ! -f "$CHANGELOG" ]]; then
  echo "Error: '$CHANGELOG' not found." >&2
  exit 1
fi

if [[ ! -f "$METADATA" ]]; then
  echo "Error: '$METADATA' not found." >&2
  exit 1
fi

# Extract the first versioned section header, e.g. "## [2.0.0] - 2026-05-17"
# Skips [Unreleased].
header=$(grep -m1 -E '^\s*## \[[0-9]+\.[0-9]+\.[0-9]+\]' "$CHANGELOG")

if [[ -z "$header" ]]; then
  echo "Error: No versioned release section found in '$CHANGELOG'." >&2
  exit 1
fi

# Parse the version number from the header
version=$(echo "$header" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
tag="v${version}"

# Extract the body: everything after the header line up to (not including)
# the next ## section or end of file.
body=$(awk "
  /^\s*## \[${version}\]/ { found=1; next }
  found && /^\s*## /      { exit }
  found                   { print }
" "$CHANGELOG" | sed -e 's/[[:space:]]*$//' | sed -e '/./,$!d' | sed -e ':a; /^[[:space:]]*$/{$d; N; ba}')

if [[ -z "$body" ]]; then
  echo "Error: Body for version ${version} is empty." >&2
  exit 1
fi

# Extract shell-version array from metadata.json
shell_versions=$(awk '
  /"shell-version"/ { in_arr=1; next }
  in_arr && /\]/    { exit }
  in_arr && /"/     { gsub(/[^0-9]/, ""); printf "%s**%s**", sep, $0; sep=", " }
' "$METADATA")

if [[ -z "$shell_versions" ]]; then
  echo "Error: No shell-version found in '$METADATA'." >&2
  exit 1
fi


full_body="Supported GNOME Versions: ${shell_versions}

${body}"

echo "=== Tag name ==="
echo "$tag"
echo ""
echo "=== Tag message ==="
echo "$full_body"
echo ""

read -rp "Create signed tag '$tag'? [y/N] " confirm
if [[ "${confirm,,}" != "y" ]]; then
  echo "Aborted."
  exit 0
fi

# Ensure '#' lines aren't swallowed by git as comments
current_comment_char=$(git config --global core.commentChar 2>/dev/null || echo "#")
needs_reset=false

if [[ "$current_comment_char" == "#" ]]; then
  git config --global core.commentChar ";"
  needs_reset=true
fi

restore_comment_char() {
  if $needs_reset; then
    git config --global core.commentChar "#"
  fi
}
trap restore_comment_char EXIT

git tag -a "$tag" -s -m "$full_body"

echo ""
echo "✓ Signed tag '$tag' created."
echo ""
echo "Push with:"
echo "  git push origin $tag"
