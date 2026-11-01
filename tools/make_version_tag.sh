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

# Only allow tagging from the main branch
current_branch=$(git symbolic-ref --short -q HEAD || true)
if [[ "$current_branch" != "main" ]]; then
  echo "Error: must be on the 'main' branch to create a release tag (currently on '${current_branch:-detached HEAD}')." >&2
  exit 1
fi

# Make sure local main matches the remote, so the tag points at a commit that has been pushed
if ! git fetch origin main --quiet; then
  echo "Error: could not fetch 'origin/main' to check that the local branch is in sync." >&2
  exit 1
fi

local_head=$(git rev-parse HEAD)
remote_head=$(git rev-parse origin/main)
if [[ "$local_head" != "$remote_head" ]]; then
  if git merge-base --is-ancestor "$local_head" "$remote_head"; then
    echo "Error: local main is behind origin/main. Pull first." >&2
  elif git merge-base --is-ancestor "$remote_head" "$local_head"; then
    echo "Error: local main is ahead of origin/main. Push first." >&2
  else
    echo "Error: local main and origin/main have diverged. Reconcile them first." >&2
  fi
  exit 1
fi

# Extract the first versioned section header, e.g. "## [2.0.0] - 2026-05-17"
# Skips [Unreleased].
header=$(grep -m1 -E '^\s*## \[[0-9]+\.[0-9]+\.[0-9]+\]' "$CHANGELOG" || true)

if [[ -z "$header" ]]; then
  echo "Error: No versioned release section found in '$CHANGELOG'." >&2
  exit 1
fi

# Parse the version number from the header
version=$(echo "$header" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
tag="v${version}"

# Stop if the tag already exists locally
if git rev-parse -q --verify "refs/tags/${tag}" > /dev/null; then
  echo "Error: tag '$tag' already exists locally. Did you forget to add a new section to '$CHANGELOG'?" >&2
  exit 1
fi

# Stop if the tag already exists on the remote
# (`ls-remote --exit-code` returns 2 when no ref matches, and other non-zero codes on failure)
remote_status=0
git ls-remote --exit-code --tags origin "refs/tags/${tag}" > /dev/null || remote_status=$?
if [[ "$remote_status" -eq 0 ]]; then
  echo "Error: tag '$tag' already exists on 'origin'. Did you forget to add a new section to '$CHANGELOG'?" >&2
  exit 1
elif [[ "$remote_status" -ne 2 ]]; then
  echo "Error: could not check 'origin' for an existing '$tag' tag." >&2
  exit 1
fi

# Extract the body: everything after the header line up to but not including the next ## section.
body=$(awk "
  /^\s*## \[${version}\]/ { found=1; next }
  found && /^\s*## /      { exit }
  found                   { print }
" "$CHANGELOG" | sed -e 's/[[:space:]]*$//' | sed -e '/./,$!d' | sed -e ':a; /^[[:space:]]*$/{$d; N; ba}')

if [[ -z "$body" ]]; then
  echo "Error: Body for version ${version} is empty." >&2
  exit 1
fi

# Extract the shell-version array from metadata.json. Works for both single-line and multi-line
# arrays.
# Output: **49**, **50**
shell_versions=$(
  tr -d '\n' < "$METADATA" \
    | grep -oE '"shell-version"[[:space:]]*:[[:space:]]*\[[^]]*\]' \
    | grep -oE '"[0-9]+(\.[0-9]+)*"' \
    | tr -d '"' \
    | sed 's/.*/**&**/' \
    | paste -sd, - \
    | sed 's/,/, /g' \
    || true
)

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
