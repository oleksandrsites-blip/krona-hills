#!/usr/bin/env bash
# Нарізка зображень для сайту.
#
# 1. Покладіть оригінали (JPG, PNG або HEIC, якнайбільші) у images/_src/<розділ>/<назва>.<розширення>:
#      images/_src/hero/hero-desktop.jpg          16:9
#      images/_src/hero/hero-mobile.jpg           4:5
#      images/_src/gallery/01-fasady.jpg          …
#      images/_src/interiors/01-kukhnia-vitalnia.jpg
#      images/_src/progress/2026-10/01.jpg
# 2. Запустіть:  bash tools/images.sh
#
# Скрипт зробить потрібні ширини у форматі AVIF (вбудований у macOS sips) і JPG як запасний,
# а якщо встановлено cwebp (brew install webp) — ще й WebP. Потім оновить js/images.js.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=images/_src
[ -d "$SRC" ] || { echo "Немає папки $SRC — покладіть туди оригінали"; exit 1; }

widths_for() { # ширини залежно від розділу
  case "$1" in
    hero/hero-desktop) echo "1280 2560" ;;
    hero/hero-mobile)  echo "720 1440" ;;
    *)                 echo "800 1600" ;;
  esac
}

has_cwebp=0; command -v cwebp >/dev/null && has_cwebp=1
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

find "$SRC" -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.heic' -o -iname '*.webp' \) | sort | while read -r src; do
  rel="${src#$SRC/}"            # gallery/01-fasady.jpg
  key="${rel%.*}"               # gallery/01-fasady
  out_dir="images/$(dirname "$key")"
  name="$(basename "$key")"
  mkdir -p "$out_dir"
  src_w=$(sips -g pixelWidth "$src" | awk '/pixelWidth/ {print $2}')

  for w in $(widths_for "$key"); do
    [ "$w" -gt "$src_w" ] && w=$src_w          # не збільшуємо маленькі оригінали
    base="$out_dir/$name-$w"
    sips --resampleWidth "$w" "$src" --out "$tmp/r.png" -s format png >/dev/null
    sips -s format avif -s formatOptions 60 "$tmp/r.png" --out "$base.avif" >/dev/null
    sips -s format jpeg -s formatOptions 80 "$tmp/r.png" --out "$base.jpg" >/dev/null
    [ $has_cwebp = 1 ] && cwebp -quiet -q 80 "$tmp/r.png" -o "$base.webp"
  done
  echo "  ✓ $key"
done

python3 tools/cf_build.py --manifest
echo "Готово. Перевірте сайт локально і закомітьте папку images/."
