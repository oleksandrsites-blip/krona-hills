#!/usr/bin/env bash
# Збірка для Cloudflare Pages.
# Налаштування проєкту: Framework preset — None,
# Build command — bash tools/cf-build.sh, Build output directory — public.
# Адреса сайту береться зі змінної SITE_URL (за замовчуванням https://krona-hills.pages.dev).
set -euo pipefail
cd "$(dirname "$0")/.."
python3 tools/cf_build.py
