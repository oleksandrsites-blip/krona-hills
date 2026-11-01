#!/usr/bin/env python3
"""Завантажує шрифти з Google Fonts у fonts/ і генерує css/fonts.css (self-host).

Беремо лише кирилицю й латиницю та лише ті товщини, що є в css/style.css.
Запуск (потрібен інтернет):  python3 tools/fonts.py
"""
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / 'fonts'
CSS_OUT = ROOT / 'css' / 'fonts.css'
API = ('https://fonts.googleapis.com/css2?family=Unbounded:wght@200;300;400'
       '&family=Onest:wght@300;400;500&family=IBM+Plex+Mono:wght@400;500&display=swap')
SUBSETS = {'cyrillic', 'latin'}
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def main():
    css = get(API).decode('utf-8')
    FONTS.mkdir(exist_ok=True)
    blocks = re.findall(r'/\* ([\w-]+) \*/\s*(@font-face\s*{[^}]+})', css)
    out, saved = [], {}
    for subset, block in blocks:
        if subset not in SUBSETS:
            continue
        family = re.search(r"font-family: '([^']+)'", block).group(1)
        url = re.search(r'url\((https://[^)]+\.woff2)\)', block).group(1)
        if url not in saved:
            name = f"{family.lower().replace(' ', '-')}-{subset}-{len(saved)}.woff2"
            (FONTS / name).write_bytes(get(url))
            saved[url] = name
        out.append(f'/* {family} · {subset} */\n' + block.replace(url, f'../fonts/{saved[url]}'))
    CSS_OUT.write_text('/* Згенеровано tools/fonts.py — self-host шрифти, font-display: swap */\n'
                       + '\n'.join(out) + '\n', encoding='utf-8')
    total = sum((FONTS / n).stat().st_size for n in saved.values())
    print(f'Шрифтів: {len(saved)} файлів, {total // 1024} КБ → fonts/, css/fonts.css')
    for n in saved.values():
        print('  ', n)


if __name__ == '__main__':
    main()
