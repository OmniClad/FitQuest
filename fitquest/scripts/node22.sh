#!/usr/bin/env bash
set -euo pipefail

NODE_MAJOR=0
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"
fi

case "$NODE_MAJOR" in
  ''|*[!0-9]*) NODE_MAJOR=0 ;;
esac

export npm_config_cache="${npm_config_cache:-/tmp/fitquest-npm-cache}"

if [ "$NODE_MAJOR" -ge 22 ]; then
  exec node "$@"
fi

exec npx -y -p node@22 node "$@"
