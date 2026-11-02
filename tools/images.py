#!/usr/bin/env python3
"""Нарізка зображень для сайту (потрібен Pillow 11.2+:  pip3 install pillow).

Бере оригінали з images/_src/<розділ>/<назва>.<розширення> і робить потрібні ширини
у трьох форматах: AVIF, WebP і JPG як запасний. Потім оновлює js/images.js.

Запуск:  python3 tools/images.py   (або bash tools/images.sh)
"""
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageOps, features

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'images' / '_src'
EXT = {'.jpg', '.jpeg', '.png', '.webp', '.heic'}

WIDTHS = {'hero/hero-desktop': [1280, 2560], 'hero/hero-mobile': [720, 1440]}
DEFAULT_WIDTHS = [800, 1600]


def main():
    if not SRC.exists():
        sys.exit(f'Немає папки {SRC} — покладіть туди оригінали')
    if not features.check('avif'):
        sys.exit('Pillow без підтримки AVIF — оновіть:  pip3 install -U pillow')

    for src in sorted(p for p in SRC.rglob('*') if p.suffix.lower() in EXT):
        key = src.relative_to(SRC).with_suffix('').as_posix()      # gallery/01-fasady
        out_dir = ROOT / 'images' / Path(key).parent
        out_dir.mkdir(parents=True, exist_ok=True)
        img = ImageOps.exif_transpose(Image.open(src)).convert('RGB')

        for w in WIDTHS.get(key, DEFAULT_WIDTHS):
            w = min(w, img.width)                                  # не збільшуємо маленькі оригінали
            r = img.resize((w, round(img.height * w / img.width)), Image.LANCZOS)
            base = out_dir / f'{Path(key).name}-{w}'
            r.save(f'{base}.avif', quality=60, speed=6)
            r.save(f'{base}.webp', quality=80, method=6)
            r.save(f'{base}.jpg', quality=82, optimize=True, progressive=True)
        print(f'  ✓ {key}')

    subprocess.run([sys.executable, str(ROOT / 'tools' / 'cf_build.py'), '--manifest'], check=True)
    print('Готово. Перевірте сайт локально і закомітьте папку images/.')


if __name__ == '__main__':
    main()
