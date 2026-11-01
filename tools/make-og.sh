#!/usr/bin/env bash
# Перегенерувати og/og-cover.png (1200×630) з шаблону tools/og.html.
# Якщо в images/hero/ вже є рендер — він стане фоном.
# Потрібен запущений локальний сервер:  python3 -m http.server 8766
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p og
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1200,630 --virtual-time-budget=4000 --run-all-compositor-stages-before-draw \
  --screenshot=og/og-cover.png "http://127.0.0.1:8766/tools/og.html" >/dev/null 2>&1
echo "  ✓ og/og-cover.png"
