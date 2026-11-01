/**
 * Cloudflare Pages Function: POST /api/lead
 * Приймає заявку з сайту й надсилає її в Telegram.
 *
 * Змінні середовища (Cloudflare → Settings → Variables and Secrets):
 *   TELEGRAM_BOT_TOKEN — токен бота від @BotFather (тип Secret)
 *   TELEGRAM_CHAT_ID   — id чату, куди надсилати заявки
 */

const FORMS = {
  visit: 'Запис на огляд',
  callback: 'Передзвоніть мені',
};

const MAX_BODY = 8 * 1024;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

// екрануємо все, що прийшло від користувача, — Telegram парсить HTML
const esc = value =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const clean = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// +380XXXXXXXXX → «+380 67 123 45 67»
function normalizePhone(raw) {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.startsWith('380')) d = d.slice(3);
  else if (d.startsWith('0')) d = d.slice(1);
  if (d.length !== 9) return null;
  return `+380 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7)}`;
}

export function buildMessage(lead) {
  const lines = [`<b>🌲 Krona Hills · ${esc(FORMS[lead.form])}</b>`, ''];
  lines.push(`<b>Ім'я:</b> ${esc(lead.name)}`);
  lines.push(`<b>Телефон:</b> <a href="tel:${lead.phone.replace(/\s/g, '')}">${esc(lead.phone)}</a>`);
  if (lead.apartment) lines.push(`<b>Квартира:</b> ${esc(lead.apartment)}`);
  if (lead.date || lead.time) lines.push(`<b>Огляд:</b> ${esc([lead.date, lead.time].filter(Boolean).join(', о '))}`);
  if (lead.form === 'visit') lines.push(`<b>Забрати від метро:</b> ${lead.pickup ? 'так' : 'ні'}`);
  if (lead.page) lines.push('', `<i>${esc(lead.page)}</i>`);
  return lines.join('\n');
}

export async function onRequestPost({ request, env }) {
  if (Number(request.headers.get('content-length') || 0) > MAX_BODY) {
    return json({ ok: false, error: 'too_large' }, 413);
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: 'bad_json' }, 400);
  }
  if (!data || typeof data !== 'object') return json({ ok: false, error: 'bad_json' }, 400);

  // пастка для ботів: людина це поле не бачить і не заповнює
  if (clean(data.company, 100)) return json({ ok: true });

  const lead = {
    form: FORMS[data.form] ? data.form : 'visit',
    name: clean(data.name, 80),
    phone: normalizePhone(data.phone),
    apartment: clean(data.apartment, 120),
    date: clean(data.date, 40),
    time: clean(data.time, 10),
    pickup: data.pickup === true,
    page: clean(data.page, 300),
  };
  if (lead.name.length < 2 || !lead.phone) return json({ ok: false, error: 'validation' }, 422);

  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    console.error('lead: TELEGRAM_BOT_TOKEN або TELEGRAM_CHAT_ID не задані');
    return json({ ok: false, error: 'not_configured' }, 500);
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: buildMessage(lead),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.error('lead: Telegram відповів', res.status, await res.text());
      return json({ ok: false, error: 'telegram' }, 502);
    }
  } catch (err) {
    console.error('lead: не вдалося звернутися до Telegram', err);
    return json({ ok: false, error: 'telegram' }, 502);
  }

  return json({ ok: true });
}
