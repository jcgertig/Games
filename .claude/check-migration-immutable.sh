#!/usr/bin/env bash
# .claude/check-migration-immutable.sh
# Blocks Write/Edit tool use on existing migration files.
# Exits 0  → not a migration file, or file is new (allow)
# Exits 2  → existing migration file being modified (block)

set -euo pipefail

NODE="/Users/jonathan.gertig/.nvm/versions/node/v22.19.0/bin/node"

FILE=$(cat /dev/stdin | "$NODE" -e "
  const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8').trim() || '{}');
  console.log(d.tool_input?.file_path || '');
" 2>/dev/null || true)

# Only care about .sql files inside supabase/migrations/
if ! echo "$FILE" | grep -qE 'supabase/migrations/[^/]+\.sql$'; then
  exit 0
fi

# Allow writing brand-new files (they don't exist yet)
if [ ! -f "$FILE" ]; then
  exit 0
fi

# Existing migration file — block the edit
echo '{"decision":"block","reason":"Migration files are immutable once created. Add a new migration file instead of modifying '"$FILE"'."}'
exit 2
