#!/usr/bin/env bash
# .claude/check-coverage.sh
# Run after Write/Edit tool use.
# Compares the new coverage summary against a stored baseline.
# Exits 0  → coverage is stable or improved  (silent)
# Exits 2  → coverage dropped  (asyncRewake wakes Claude with the message)

set -euo pipefail

PROJECT="/Users/jonathan.gertig/Documents/Claude/Projects/Games"
BASELINE="$PROJECT/.claude/coverage-baseline.json"
SUMMARY="$PROJECT/coverage/coverage-summary.json"
NODE="/Users/jonathan.gertig/.nvm/versions/node/v22.19.0/bin/node"
NPM="/Users/jonathan.gertig/.nvm/versions/node/v22.19.0/bin/npm"

cd "$PROJECT"

# ── Only run when a .ts/.tsx file was edited ─────────────────────────────────
FILE=$(cat /dev/stdin | "$NODE" -e "
  const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8').trim() || '{}');
  console.log(d.tool_input?.file_path || '');
" 2>/dev/null || true)

if [[ "$FILE" != *.ts && "$FILE" != *.tsx ]]; then
  exit 0
fi

# ── Run coverage (allow threshold errors — the hook is the real gate) ─────────
PATH="/Users/jonathan.gertig/.nvm/versions/node/v22.19.0/bin:$PATH" \
  "$NPM" run test:coverage --silent 2>/dev/null || true

if [[ ! -f "$SUMMARY" ]]; then
  exit 0
fi

# ── Extract totals from summary ───────────────────────────────────────────────
read_pct() {
  "$NODE" -e "
    const s = JSON.parse(require('fs').readFileSync('$SUMMARY','utf8'));
    console.log(s.total['$1'].pct);
  " 2>/dev/null || echo "0"
}

NEW_LINES=$(read_pct lines)
NEW_FUNCS=$(read_pct functions)
NEW_BRANCH=$(read_pct branches)
NEW_STMTS=$(read_pct statements)

# ── Seed baseline if it doesn't exist yet ────────────────────────────────────
if [[ ! -f "$BASELINE" ]]; then
  "$NODE" -e "
    const fs = require('fs');
    fs.writeFileSync('$BASELINE', JSON.stringify({
      lines: $NEW_LINES, functions: $NEW_FUNCS,
      branches: $NEW_BRANCH, statements: $NEW_STMTS
    }, null, 2));
  "
  exit 0
fi

# ── Compare against baseline ──────────────────────────────────────────────────
RESULT=$("$NODE" -e "
  const fs = require('fs');
  const base = JSON.parse(fs.readFileSync('$BASELINE', 'utf8'));
  const cur  = {
    lines:      $NEW_LINES,
    functions:  $NEW_FUNCS,
    branches:   $NEW_BRANCH,
    statements: $NEW_STMTS,
  };

  const TOLERANCE = 0.5; // allow tiny float noise
  const drops = Object.keys(cur).filter(k => cur[k] < base[k] - TOLERANCE);

  if (drops.length === 0) {
    // Update baseline if anything improved
    const improved = Object.keys(cur).some(k => cur[k] > base[k] + TOLERANCE);
    if (improved) {
      fs.writeFileSync('$BASELINE', JSON.stringify(cur, null, 2));
    }
    process.exit(0);
  }

  const msg = drops.map(k =>
    \`  \${k}: \${cur[k].toFixed(2)}% (was \${base[k].toFixed(2)}%)\`
  ).join('\n');

  // asyncRewake protocol: print a JSON systemMessage, then exit 2
  console.log(JSON.stringify({
    systemMessage: [
      '⚠️  Test coverage dropped after your last edit:',
      msg,
      '',
      'Please add or update tests to restore coverage before continuing.'
    ].join('\n')
  }));
  process.exit(2);
") || CODE=$?

echo "$RESULT"
exit ${CODE:-0}
