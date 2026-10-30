#!/bin/bash
# Prepares a Claude Code cloud session to run `pnpm test`. Local sessions are left alone.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# Install only when something that decides the install changed since the last success.
hashes=node_modules/.session-start.sha256
if ! sha256sum --check --status "$hashes" 2>/dev/null; then
  rm -f "$hashes"

  # CI=true keeps pnpm non-interactive and holds it to the committed lockfile.
  CI=true pnpm install --frozen-lockfile

  git ls-files -z -- .claude/hooks/session-start.sh pnpm-lock.yaml pnpm-workspace.yaml patches \
    'package.json' '**/package.json' \
    | xargs -0 sha256sum > "$hashes" || rm -f "$hashes"
fi

# The cloud image ships one Chromium under /opt/pw-browsers and blocks Playwright's download
# CDN, so the build this repo's Playwright expects can never be installed. vitest.config.ts
# launches this binary instead whenever the variable is set.
if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -x /opt/pw-browsers/chromium ]; then
  echo 'export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium' >> "$CLAUDE_ENV_FILE"
fi
