#!/usr/bin/env bash
# .claude/check-build.sh
# Runs before any Bash tool use.
# If the command is a git commit, verifies yarn build:app passes first.
# Exits 0 → not a commit, or build passed (allow)
# Exits 2 → build failed (block)

set -euo pipefail

NODE="/Users/jonathan.gertig/.nvm/versions/node/v22.19.0/bin/node"
YARN="/Users/jonathan.gertig/.nvm/versions/node/v22.19.0/bin/yarn"
PROJECT="/Users/jonathan.gertig/Documents/Claude/Projects/Games"

CMD=$(cat /dev/stdin | "$NODE" -e "
  const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8').trim() || '{}');
  console.log(d.tool_input?.command || '');
" 2>/dev/null || true)

# Only run on git commit commands
if ! echo "$CMD" | grep -qE '^\s*git\s+commit'; then
  exit 0
fi

cd "$PROJECT"

echo "Running yarn build:app before commit…" >&2

PATH="/Users/jonathan.gertig/.nvm/versions/node/v22.19.0/bin:$PATH" \
  "$YARN" build:app >&2

if [ $? -ne 0 ]; then
  echo '{"decision":"block","reason":"yarn build:app failed — fix the build before committing."}'
  exit 2
fi

exit 0
