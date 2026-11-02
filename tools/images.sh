#!/usr/bin/env bash
# Нарізка зображень для сайту.
#
# 1. Покладіть оригінали (JPG, PNG або WebP, якнайбільші) у images/_src/<розділ>/<назва>.<розширення>:
#      images/_src/hero/hero-desktop.jpg          16:9
#      images/_src/hero/hero-mobile.jpg           4:5
#      images/_src/gallery/01-fasady.jpg          …
#      images/_src/interiors/01-kukhnia-vitalnia.jpg
#      images/_src/progress/2026-10/01.jpg
# 2. Запустіть:  bash tools/images.sh
#
# Скрипт зробить потрібні ширини в AVIF, WebP і JPG і оновить js/images.js.
# Потрібен Pillow:  pip3 install pillow
# (вбудований у macOS sips для AVIF не годиться — частину файлів записує чорними).
set -euo pipefail
cd "$(dirname "$0")/.."
PY="${PYTHON:-python3}"
exec "$PY" tools/images.py
