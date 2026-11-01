#!/usr/bin/env bash
# Перегенерувати PDF-зразки в docs/ з шаблону tools/doc-sample.html.
# Потрібен запущений локальний сервер:  python3 -m http.server 8766
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p docs
for pair in "dozvil:dozvil-na-budivnytstvo" "pravo:pravo-vlasnosti-na-zemliu" "deklaratsiia:proiektna-deklaratsiia"; do
  "$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=2000 \
    --print-to-pdf="docs/${pair#*:}.pdf" "http://127.0.0.1:8766/tools/doc-sample.html?doc=${pair%%:*}" >/dev/null 2>&1
  echo "  ✓ docs/${pair#*:}.pdf"
done
