#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <new-repo-git-url> [branch]"
  echo "Example: $0 https://github.com/you/tracking-studio.git main"
  exit 1
fi

URL="$1"
BRANCH="${2:-main}"

if git remote get-url neworigin &>/dev/null; then
  echo "Remote 'neworigin' already exists ($(git remote get-url neworigin))"
  echo "To replace it: git remote remove neworigin && $0 \"$URL\" \"$BRANCH\""
  exit 1
fi

git remote add neworigin "$URL"
echo "Added remote neworigin -> $URL"
git push -u neworigin "$BRANCH"
echo "Pushed $BRANCH to neworigin. Next: open the repo on the host and confirm files."
