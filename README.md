# Krona Hills — лендинг житлового кварталу

Концепт-проєкт для портфоліо: односторінковий сайт вигаданого житлового комплексу в сосновому лісі за 22 хвилини від центру Києва. Компанія, ціни і дані вигадані.

Дизайн, тексти й верстка — з нуля, без шаблонів і бібліотек. Ілюстрації (нічна сцена, карти, планування, будинок, що будується) намальовані кодом у SVG; для рендерів і фото є підготовлені місця.

Живий сайт: https://krona-hills.pages.dev

## Структура

```
index.html, 404.html      сторінки
css/ js/ fonts/           стилі, скрипти, шрифти (self-host)
images/                   рендери й фото (див. нижче)
docs/                     PDF-документи (зразки)
og/                       зображення для соцмереж
functions/api/lead.js     прийом заявок → Telegram (Cloudflare Pages Function)
tools/                    збірка й допоміжні скрипти
```

## Деплой — Cloudflare Pages

Автодеплой з GitHub, гілка `main`.

| Налаштування | Значення |
|---|---|
| Framework preset | None |
| Build command | `bash tools/cf-build.sh` |
| Build output directory | `public` |

Змінні середовища (Settings → Variables and Secrets):

| Змінна | Що це |
|---|---|
| `TELEGRAM_BOT_TOKEN` | токен бота від @BotFather (тип Secret) |
| `TELEGRAM_CHAT_ID` | id чату, куди падають заявки |
| `SITE_URL` | адреса сайту без `/` в кінці; за замовчуванням `https://krona-hills.pages.dev` |

Збірка (`tools/cf_build.py`) копіює в `public/` лише файли сайту, підставляє `SITE_URL` у canonical, OG, sitemap і robots, складає список наявних зображень і вставляє рендер першого екрана з preload.

## Зображення

Файли кладуться в `images/<розділ>/` за схемою `<назва>-<ширина>.<формат>`, напр. `images/gallery/01-fasady-1600.webp`. Поки файлу немає, на сайті показується акуратна заглушка; щойно файл з'являється — він підхоплюється сам.

Найпростіше: покласти оригінали (JPG/PNG) в `images/_src/<розділ>/<назва>.jpg` і запустити `bash tools/images.sh` — він наріже потрібні розміри в AVIF, WebP і JPG (потрібен `pip3 install pillow`). Оригінали в git не потрапляють.

## Локальний перегляд

```bash
python3 tools/cf_build.py --manifest && python3 -m http.server 8000
```

Відкрийте http://localhost:8000. Форма заявки локально відповість помилкою — функція `/api/lead` працює лише на Cloudflare.

## Допоміжні скрипти (tools/)

| Скрипт | Що робить |
|---|---|
| `cf-build.sh` / `cf_build.py` | збірка для Cloudflare Pages |
| `images.sh` / `images.py` | нарізка оригіналів з `images/_src/` у AVIF, WebP і JPG |
| `fonts.py` | завантажує шрифти з Google Fonts у `fonts/` (self-host) |
| `make-og.sh` | перегенерує `og/og-cover.png` (1200×630); якщо є рендер — він стає фоном |
| `make-docs.sh` | перегенерує PDF-зразки документів у `docs/` |
| `lead-test.html` | перевірка функції `/api/lead` у браузері без Cloudflare |

Для `make-og.sh`, `make-docs.sh` і `lead-test.html` потрібен локальний сервер: `python3 -m http.server 8766`.
