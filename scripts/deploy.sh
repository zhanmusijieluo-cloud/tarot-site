#!/usr/bin/env bash
# 直接部署本地代码到 Vercel 生产环境（不依赖 GitHub push）
set -e
cd "$(dirname "$0")/.." || exit 1
TOKEN="$(node -e "console.log(JSON.parse(require('fs').readFileSync(process.env.LOCALAPPDATA+'/hermes/mcp-tokens/vercel.json','utf8')).access_token)")"
echo "token len: ${#TOKEN}"
export VERCEL_TOKEN="$TOKEN"
echo "=== deploying to production (need deploy) ==="
npx --yes vercel deploy --prod --yes 2>&1 | tail -30
echo "=== EXIT: $? ==="
