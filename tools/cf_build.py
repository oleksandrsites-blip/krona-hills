#!/usr/bin/env python3
"""Збірка сайту для Cloudflare Pages.

Що робить:
  1. копіює в public/ лише файли сайту (без _behance, _concepts, README, tools);
  2. підставляє адресу сайту з змінної SITE_URL замість __SITE_URL__
     (canonical, OG, sitemap, robots) — одне місце, щоб потім перейти на свій домен;
  3. шукає зображення в images/ і пише список наявних у js/images.js,
     щоб сайт не запитував файли, яких ще немає;
  4. якщо є рендер першого екрана — вставляє його в HTML з preload.

Запуск:
  python3 tools/cf_build.py             — повна збірка в public/
  python3 tools/cf_build.py --manifest  — лише оновити js/images.js для локального перегляду
"""
import json
import os
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public'
DEFAULT_URL = 'https://krona-hills.pages.dev'

SITE_FILES = ['index.html', '404.html', 'favicon.svg', 'robots.txt', 'sitemap.xml', '_headers',
              'css', 'js', 'fonts', 'images', 'docs', 'og']
TEXT_EXT = {'.html', '.xml', '.txt', '.js', '.css', '.json'}

# images/<розділ>/<назва>-<ширина>.<формат>, напр. images/gallery/01-fasady-1600.webp
IMG_RE = re.compile(r'^(?P<name>.+)-(?P<w>\d{3,4})\.(?P<f>avif|webp|jpe?g|png)$')
FORMAT_ORDER = ['avif', 'webp', 'jpg', 'png']
HERO_ALT = 'Візуалізація: будинки Krona Hills серед сосон'


def scan_images(base):
    found = {}
    images_dir = base / 'images'
    if not images_dir.exists():
        return {}
    for p in sorted(images_dir.rglob('*')):
        if not p.is_file() or '_src' in p.parts:
            continue
        m = IMG_RE.match(p.name)
        if not m:
            continue
        key = f"{p.parent.relative_to(images_dir).as_posix()}/{m['name']}"
        entry = found.setdefault(key, {'w': set(), 'f': set()})
        entry['w'].add(int(m['w']))
        entry['f'].add('jpg' if m['f'] == 'jpeg' else m['f'])
    return {k: {'w': sorted(v['w']), 'f': [f for f in FORMAT_ORDER if f in v['f']]}
            for k, v in found.items()}


def manifest_js(images):
    return ('// Згенеровано tools/cf_build.py — вручну не редагуйте.\n'
            '// Список зображень, які реально лежать у images/.\n'
            'window.KRONA_IMAGES = ' + json.dumps(images, ensure_ascii=False, indent=1) + ';\n')


def srcset(key, img, fmt):
    return ', '.join(f'images/{key}-{w}.{fmt} {w}w' for w in img['w'])


def hero_markup(images):
    """Повертає (preload-теги, <picture>) для рендеру першого екрана або порожні рядки."""
    desk, mob = images.get('hero/hero-desktop'), images.get('hero/hero-mobile')
    if not desk and not mob:
        return '', ''
    main_key, main = ('hero/hero-desktop', desk) if desk else ('hero/hero-mobile', mob)
    mob_key, mob_img = ('hero/hero-mobile', mob) if mob else (main_key, main)

    sources, preloads = [], []
    if desk and mob:
        for f in desk['f']:
            sources.append(f'<source media="(min-width: 900px)" type="image/{f}" '
                           f'srcset="{srcset("hero/hero-desktop", desk, f)}" sizes="100vw">')
    for f in mob_img['f']:
        sources.append(f'<source type="image/{f}" srcset="{srcset(mob_key, mob_img, f)}" sizes="100vw">')

    def preload(key, img, media=''):
        f = img['f'][0]
        return (f'<link rel="preload" as="image" type="image/{f}" imagesrcset="{srcset(key, img, f)}" '
                f'imagesizes="100vw"{media} fetchpriority="high">')

    if desk and mob:
        preloads = [preload('hero/hero-desktop', desk, ' media="(min-width: 900px)"'),
                    preload('hero/hero-mobile', mob, ' media="(max-width: 899.98px)"')]
    else:
        preloads = [preload(main_key, main)]

    fallback = main['f'][-1]
    img = (f'<img src="images/{main_key}-{main["w"][-1]}.{fallback}" alt="{HERO_ALT}" '
           f'fetchpriority="high" decoding="async">')
    picture = (f'<picture class="hero-photo" id="heroPhoto">{"".join(sources)}{img}</picture>'
               '<span class="render-tag hero-tag">Візуалізація</span>')
    return '\n  '.join(preloads), picture


def write_manifest(base, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(manifest_js(scan_images(base)), encoding='utf-8')


def build():
    site_url = (os.environ.get('SITE_URL') or DEFAULT_URL).rstrip('/')
    shutil.rmtree(OUT, ignore_errors=True)
    OUT.mkdir()

    for item in SITE_FILES:
        src = ROOT / item
        if not src.exists():
            continue
        if src.is_dir():
            shutil.copytree(src, OUT / item, ignore=shutil.ignore_patterns('_src', '.DS_Store', '*.md'))
        else:
            shutil.copy2(src, OUT / item)

    images = scan_images(ROOT)
    write_manifest(ROOT, OUT / 'js' / 'images.js')
    preload, picture = hero_markup(images)

    for p in OUT.rglob('*'):
        if not p.is_file() or p.suffix not in TEXT_EXT:
            continue
        text = p.read_text(encoding='utf-8')
        new = text.replace('__SITE_URL__', site_url)
        if p.name == 'index.html':
            new = new.replace('<!--HERO_PRELOAD-->', preload).replace('<!--HERO_PICTURE-->', picture)
        if new != text:
            p.write_text(new, encoding='utf-8')

    print(f'Готово: public/ · {site_url} · зображень: {len(images)}'
          + (' · рендер першого екрана є' if picture else ''))


if __name__ == '__main__':
    if '--manifest' in sys.argv:
        write_manifest(ROOT, ROOT / 'js' / 'images.js')
        print('js/images.js оновлено')
    else:
        build()
