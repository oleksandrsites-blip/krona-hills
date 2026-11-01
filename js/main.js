/* =========================================================
   Krona Hills — інтерактив
   ========================================================= */

const NS = 'http://www.w3.org/2000/svg';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function svgEl(tag, attrs = {}, parent) {
  const node = document.createElementNS(NS, tag);
  for (const key in attrs) node.setAttribute(key, attrs[key]);
  if (parent) parent.appendChild(node);
  return node;
}

// Псевдовипадкові числа з зерном: сцена однакова при кожному завантаженні
function seeded(seed) {
  return () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

/* ---------------------------------------------------------
   Навігація і мобільне меню
   --------------------------------------------------------- */
const nav = document.getElementById('nav');
const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobileMenu');

// поки меню відкрите, решта сторінки «вимкнена» (inert): фокус не тікає за меню
const behindMenu = [document.querySelector('main'), document.querySelector('footer'), ...nav.querySelectorAll('.logo, .menu, .nav-right')];

function setMenu(open) {
  const wasOpen = document.body.classList.contains('menu-open');
  if (open === wasOpen) return;
  document.documentElement.classList.toggle('menu-open', open);
  document.body.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', open);
  burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
  mobileMenu.setAttribute('aria-hidden', !open);
  mobileMenu.inert = !open;
  behindMenu.forEach(el => { el.inert = open; });
  if (open) mobileMenu.querySelector('a').focus({ preventScroll: true });
  else burger.focus({ preventScroll: true });
}
mobileMenu.inert = true;
burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', e => {
  if (e.key === 'Escape') setMenu(false);
  // Tab по колу: меню ↔ кнопка закриття
  if (e.key === 'Tab' && document.body.classList.contains('menu-open')) {
    const items = [burger, ...mobileMenu.querySelectorAll('a')];
    const i = items.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
    else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
  }
});
// на широкому екрані меню не потрібне — закриваємо, якщо повернули телефон чи розтягнули вікно
matchMedia('(min-width: 1100px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

/* ---------------------------------------------------------
   1. Нічна сцена: пагорби, сосни, будинки з вікнами
   --------------------------------------------------------- */
const scene = (() => {
  const svg = document.getElementById('scene');
  const W = 1600;
  const rand = seeded(7);
  const defs = svgEl('defs', {}, svg);

  const sky = svgEl('linearGradient', { id: 'sky', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  [['0', '#0A0D0B'], ['.55', '#151C18'], ['.78', '#2A2A1F'], ['1', '#0D100E']]
    .forEach(([o, c]) => svgEl('stop', { offset: o, 'stop-color': c }, sky));
  svgEl('rect', { width: W, height: 900, fill: 'url(#sky)' }, svg);

  // ледь помітні зорі
  let stars = '';
  for (let i = 0; i < 90; i++) {
    const x = rand() * W, y = rand() * 420, r = rand() * .9 + .3;
    stars += `M${x} ${y}m-${r} 0a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 -${2 * r} 0`;
  }
  svgEl('path', { d: stars, fill: '#E6DFD2', opacity: .35 }, svg);

  // лінія пагорба для шару L (0 — найдальший)
  const ridge = (x, L) => {
    const base = [560, 640, 720, 800][L], amp = [70, 60, 48, 30][L], p = L * 1.7;
    return base - amp * (.6 * Math.sin(x * .0021 + p) + .3 * Math.sin(x * .0057 + p * 2) + .1 * Math.sin(x * .013 + p));
  };
  const pine = (x, y, h) => {
    const w = h * .36;
    let d = `M${x - w * .035} ${y - h * .14}h${w * .07}V${y + 4}h${-w * .07}Z`;
    for (let t = 0; t < 4; t++) {
      const top = y - h + t * h * .18, bottom = top + h * .38, hw = w * (.16 + t * .11);
      d += `M${x} ${top}L${x - hw} ${bottom}L${x + hw} ${bottom}Z`;
    }
    return d;
  };

  const colors = ['#222A25', '#19201C', '#121714', '#0A0D0B'];
  const depth = [.15, .35, .6, 1];
  const layers = [];
  const windows = [];

  // кожен пагорб — окремий шар-картинка: при паралаксі браузер лише зсуває готові шари,
  // а не перемальовує всю сцену на кожному кадрі
  const hero = svg.parentElement;
  const content = document.getElementById('heroContent');
  const newLayer = (d, i) => {
    const layer = svgEl('svg', { class: `scene-layer l${i}`, viewBox: `0 0 ${W} 900`, preserveAspectRatio: 'xMidYMax slice', 'aria-hidden': 'true' });
    hero.insertBefore(layer, content);
    layer.depth = d;
    layers.push(layer);
    return layer;
  };

  for (let L = 0; L < 4; L++) {
    const g = newLayer(depth[L], L);

    // будинки стоять за третім пагорбом, між соснами
    if (L === 2) {
      [[470, 96], [610, 84], [920, 104], [1070, 90]].forEach(([x, w]) => {
        const top = Math.min(ridge(x, 2), ridge(x + w, 2)) - 78;
        svgEl('rect', { x, y: top, width: w, height: 150, fill: '#1B201C' }, g);
        svgEl('rect', { x: x - 3, y: top - 3, width: w + 6, height: 3, fill: '#232922' }, g);
        for (let r = 0; r < 7; r++) {
          for (let c = 0; c < 6; c++) {
            windows.push(svgEl('rect', {
              class: 'win',
              x: x + 6 + c * (w - 12) / 6, y: top + 7 + r * 10,
              width: (w - 12) / 6 - 4, height: 5.5,
              fill: rand() < .2 ? '#F3D9A4' : '#E9C987',
              opacity: 0,
            }, g));
          }
        }
      });
    }

    let d = 'M-120 900';
    for (let x = -120; x <= W + 120; x += 20) d += `L${x} ${ridge(x, L).toFixed(1)}`;
    svgEl('path', { d: d + `L${W + 120} 900Z`, fill: colors[L] }, g);

    let trees = '';
    const count = [46, 38, 30, 16][L], hMin = [34, 52, 78, 150][L], hMax = [60, 90, 120, 240][L];
    for (let k = 0; k < count; k++) {
      const x = rand() * (W + 240) - 120;
      trees += pine(x, ridge(x, L) + 6, hMin + rand() * (hMax - hMin));
    }
    svgEl('path', { d: trees, fill: colors[L] }, g);
  }

  // туман унизу, щоб сцена м'яко перетікала в наступний блок
  const fog = svgEl('linearGradient', { id: 'fog', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  svgEl('stop', { offset: 0, 'stop-color': '#0D100E', 'stop-opacity': 0 }, fog);
  svgEl('stop', { offset: 1, 'stop-color': '#0D100E', 'stop-opacity': 1 }, fog);
  svgEl('rect', { y: 680, width: W, height: 220, fill: 'url(#fog)' }, layers[3]);

  // вечір настає: вікна вмикаються по одному
  const lit = windows.filter(() => rand() < .3);
  lit.sort(() => rand() - .5).forEach((w, i) => {
    setTimeout(() => w.setAttribute('opacity', .9), reduceMotion ? 0 : 900 + i * 55);
  });
  if (!reduceMotion) {
    let heroOn = true;
    new IntersectionObserver(([e]) => { heroOn = e.isIntersecting; }).observe(hero);
    setInterval(() => {
      if (!heroOn || document.hidden) return;
      const w = windows[Math.floor(rand() * windows.length)];
      w.setAttribute('opacity', w.getAttribute('opacity') > 0 ? 0 : .9);
    }, 900);
  }

  // найближчий пагорб — окремим шаром над текстом: при скролі текст ховається за нього
  const front = document.getElementById('sceneFront');
  const frontRidge = x => 792 - 46 * (.6 * Math.sin(x * .0019 + .8) + .3 * Math.sin(x * .0051 + 2.1) + .1 * Math.sin(x * .012));
  const fg = svgEl('g', {}, front);
  front.depth = 1;
  layers.push(front);
  let fd = 'M-120 900';
  for (let x = -120; x <= W + 120; x += 16) fd += `L${x} ${frontRidge(x).toFixed(1)}`;
  let fp = '';
  for (let k = 0; k < 22; k++) {
    const x = rand() * (W + 240) - 120;
    fp += pine(x, frontRidge(x) + 8, 34 + rand() * 40);
  }
  svgEl('path', { d: fd + `L${W + 120} 900Z`, fill: '#0D100E' }, fg);
  svgEl('path', { d: fp, fill: '#0D100E' }, fg);

  return { layers };
})();

/* ---------------------------------------------------------
   Паралакс першого екрана: рух миші + скрол
   --------------------------------------------------------- */
(() => {
  const hero = document.getElementById('top');
  const content = document.getElementById('heroContent');
  const hill = document.getElementById('heroFront');
  const meta = hero.querySelector('.hero-meta');
  let targetX = 0, x = 0, heroVisible = true, lastX = null, lastY = null;
  const cssSink = CSS.supports('animation-timeline: scroll()');

  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }).observe(hero);
  hero.addEventListener('mousemove', e => { targetX = e.clientX / innerWidth - .5; });

  function frame() {
    if (heroVisible) {
      const y = scrollY;
      x += (targetX - x) * .05;
      if (Math.abs(targetX - x) < .0005) x = targetX;
      if (x !== lastX || y !== lastY) {
        lastX = x; lastY = y;
        scene.layers.forEach(layer => {
          // дальні шари відстають при скролі — виникає глибина
          layer.style.transform = `translate3d(${(-x * 54 * layer.depth).toFixed(1)}px, ${(y * (1 - layer.depth) * .4).toFixed(1)}px, 0)`;
        });
        // запасний варіант для браузерів без анімації від скролу: текст опускається за пагорб
        if (!cssSink) {
          content.style.transform = `translateY(${y * .6}px)`;
          hill.style.transform = `translateY(${-y * .45}px)`;
          meta.style.opacity = Math.max(0, 1 - y / (innerHeight * .22));
        }
      }
    }
    requestAnimationFrame(frame);
  }
  // на телефонах сцена статична: прив'язка до скролу смикається, коли ховається панель браузера
  const desktop = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 900px)').matches;
  if (!reduceMotion && desktop) frame();
})();

/* ---------------------------------------------------------
   Стан навігації при скролі
   --------------------------------------------------------- */
function onScroll() {
  nav.classList.toggle('scrolled', scrollY > 40);
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------------------------------------------------------
   2. Маніфест: слова «загоряються» в міру скролу
   --------------------------------------------------------- */
(() => {
  const el = document.getElementById('manifesto');
  const accent = ['між', 'соснами,'];
  el.innerHTML = el.textContent.trim().split(/\s+/)
    .map(w => `<span class="w${accent.includes(w) ? ' accent' : ''}">${w}</span>`)
    .join(' ');
  const words = [...el.querySelectorAll('.w')];

  function update() {
    const r = el.getBoundingClientRect();
    // від моменту, коли текст на 85% висоти екрана, до 35%
    const p = (innerHeight * .85 - r.top) / (innerHeight * .5 + r.height * .5);
    const n = Math.round(Math.min(1, Math.max(0, p)) * words.length);
    words.forEach((w, i) => w.classList.toggle('on', i < n));
  }
  let queued = false;
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; update(); }); } };
  if (reduceMotion) words.forEach(w => w.classList.add('on'));
  else { addEventListener('scroll', onScroll, { passive: true }); update(); }
})();

/* ---------------------------------------------------------
   Лічильники
   --------------------------------------------------------- */
(() => {
  const fmt = n => n.toLocaleString('uk-UA');
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const end = +e.target.dataset.count, start = performance.now(), dur = reduceMotion ? 1 : 1800;
    (function tick(now) {
      const t = Math.max(0, Math.min(1, (now - start) / dur));
      e.target.textContent = fmt(Math.round(end * (1 - Math.pow(1 - t, 4))));
      if (t < 1) requestAnimationFrame(tick);
    })(start);
  }), { rootMargin: '0px 0px -15% 0px' });
  document.querySelectorAll('[data-count]').forEach(el => io.observe(el));
})();

/* ---------------------------------------------------------
   Карта ділянки: 1284 сосни і чотири будинки в прогалинах
   --------------------------------------------------------- */
(() => {
  const svg = document.getElementById('map');
  const tip = document.getElementById('mapTip');
  const frame = svg.parentElement;
  const rand = seeded(2027);

  const boundary = [[40, 90], [150, 30], [330, 20], [500, 40], [600, 110], [620, 260], [590, 420], [520, 520], [330, 548], [150, 530], [50, 440], [20, 280]];
  const houses = [
    { x: 200, y: 170, w: 112, h: 46, a: -18, n: 1, title: 'Будинок 1', info: '48 квартир · 1 черга, грудень 2027' },
    { x: 438, y: 156, w: 100, h: 44, a: 12, n: 2, title: 'Будинок 2', info: '52 квартири · 1 черга, грудень 2027' },
    { x: 196, y: 384, w: 120, h: 46, a: 8, n: 3, title: 'Будинок 3', info: '56 квартир · 2 черга, вересень 2028' },
    { x: 446, y: 392, w: 104, h: 46, a: -10, n: 4, title: 'Будинок 4', info: '58 квартир · 2 черга, вересень 2028' },
  ];
  const roadD = 'M318 548 C320 470 300 330 316 280 C330 230 312 180 318 110';

  const inside = (x, y) => {
    let hit = false;
    for (let i = 0, j = boundary.length - 1; i < boundary.length; j = i++) {
      const [xi, yi] = boundary[i], [xj, yj] = boundary[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  };
  const edgeDist = (x, y) => {
    let min = Infinity;
    for (let i = 0, j = boundary.length - 1; i < boundary.length; j = i++) {
      const [ax, ay] = boundary[j], [bx, by] = boundary[i];
      const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
      min = Math.min(min, Math.hypot(x - ax - t * (bx - ax), y - ay - t * (by - ay)));
    }
    return min;
  };
  const inHouse = (x, y, m) => houses.some(h => {
    const r = -h.a * Math.PI / 180, dx = x - h.x, dy = y - h.y;
    const u = dx * Math.cos(r) - dy * Math.sin(r), v = dx * Math.sin(r) + dy * Math.cos(r);
    return Math.abs(u) < h.w / 2 + m && Math.abs(v) < h.h / 2 + m;
  });

  // точки дороги, щоб тримати її вільною від дерев
  const roadPath = svgEl('path', { d: roadD, class: 'road' });
  svg.appendChild(roadPath);
  const roadLen = roadPath.getTotalLength();
  const roadPts = [];
  for (let s = 0; s <= roadLen; s += 8) { const p = roadPath.getPointAtLength(s); roadPts.push([p.x, p.y]); }
  const onRoad = (x, y) => roadPts.some(([px, py]) => Math.hypot(x - px, y - py) < 13);

  // розставляємо дерева з мінімальною відстанню між ними (через сітку)
  const CELL = 8, grid = new Map(), trees = [];
  const key = (x, y) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
  const free = (x, y, d) => {
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
      const list = grid.get(`${cx + i},${cy + j}`);
      if (list && list.some(([tx, ty]) => Math.hypot(x - tx, y - ty) < d)) return false;
    }
    return true;
  };
  const add = (x, y, moved) => {
    trees.push([x, y, moved]);
    const k = key(x, y);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push([x, y]);
  };

  // спершу 77 пересаджених — уздовж межі ділянки
  for (let tries = 0, placed = 0; placed < 77 && tries < 40000; tries++) {
    const x = rand() * 640, y = rand() * 560;
    if (inside(x, y) && edgeDist(x, y) < 18 && edgeDist(x, y) > 5 && free(x, y, 10)) { add(x, y, true); placed++; }
  }
  // потім решта, 1207 сосен, які стоять де стояли
  for (let tries = 0, placed = 0; placed < 1207 && tries < 120000; tries++) {
    const x = rand() * 640, y = rand() * 560;
    if (inside(x, y) && edgeDist(x, y) > 4 && !inHouse(x, y, 12) && !onRoad(x, y) && free(x, y, 8.4)) { add(x, y, false); placed++; }
  }

  // межа ділянки
  svgEl('path', {
    d: 'M' + boundary.map(p => p.join(' ')).join('L') + 'Z',
    fill: 'none', stroke: 'rgba(230,223,210,.18)', 'stroke-dasharray': '2 4',
  }, svg);

  // сосни — окремим шаром під картою: проявляється цілком (одна легка анімація
  // замість 1284 окремих, які змушували перемальовувати карту на кожному кадрі)
  const treeLayer = svgEl('svg', { class: 'map-trees', viewBox: '0 0 640 560', 'aria-hidden': 'true' });
  frame.insertBefore(treeLayer, svg);
  trees.forEach(([x, y, moved]) => {
    if (moved) svgEl('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 2.6, fill: 'none', stroke: '#D2B57C', 'stroke-width': .9 }, treeLayer);
    else {
      const c = svgEl('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: (1.6 + rand() * 1.5).toFixed(2), fill: '#E6DFD2' }, treeLayer);
      c.setAttribute('opacity', (.35 + rand() * .5).toFixed(2));
    }
  });

  // будинки
  houses.forEach(h => {
    const g = svgEl('g', { class: 'b', transform: `translate(${h.x} ${h.y}) rotate(${h.a})`, tabindex: 0, role: 'button', 'aria-label': `${h.title}: ${h.info}` }, svg);
    svgEl('rect', { class: 'b-shape', x: -h.w / 2, y: -h.h / 2, width: h.w, height: h.h }, g);
    const t = svgEl('text', { class: 'b-num', x: -h.w / 2 + 8, y: -h.h / 2 + 16 }, g);
    t.textContent = `0${h.n}`;

    const show = () => {
      svg.querySelectorAll('.b.active').forEach(b => b.classList.remove('active'));
      g.classList.add('active');
      const fr = frame.getBoundingClientRect(), br = g.getBoundingClientRect();
      tip.innerHTML = `<b>${h.title} · 7 поверхів</b>${h.info}`;
      // підказка не виходить за межі карти (інакше на телефоні сторінка їде вбік)
      const half = tip.offsetWidth / 2, x = br.left - fr.left + br.width / 2;
      tip.style.left = `${Math.min(Math.max(x, half), fr.width - half)}px`;
      tip.style.top = `${br.top - fr.top}px`;
      tip.classList.add('on');
    };
    const hide = () => { g.classList.remove('active'); tip.classList.remove('on'); };
    g.addEventListener('mouseenter', show);
    g.addEventListener('mouseleave', hide);
    g.addEventListener('focus', show);
    g.addEventListener('blur', hide);
    g.addEventListener('click', e => { e.stopPropagation(); g.classList.contains('active') ? hide() : show(); });
  });
  document.addEventListener('click', () => { svg.querySelectorAll('.b.active').forEach(b => b.classList.remove('active')); tip.classList.remove('on'); });

  // підписи: в'їзд, північ, масштаб
  const label = (x, y, text, anchor = 'start') => { const t = svgEl('text', { class: 'm-label', x, y, 'text-anchor': anchor }, svg); t.textContent = text; };
  label(330, 545, "В'ЇЗД");
  svgEl('path', { d: 'M600 30v18M594 38l6-8 6 8', stroke: '#8E9389', fill: 'none', 'stroke-width': 1 }, svg);
  label(600, 64, 'N', 'middle');
  svgEl('path', { d: 'M30 535h50M30 531v8M80 531v8', stroke: '#8E9389', fill: 'none', 'stroke-width': 1 }, svg);
  label(30, 524, '50 М');

  // показ карти, коли вона з'являється на екрані
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { svg.classList.add('show'); frame.classList.add('show'); io.disconnect(); }
  }, { rootMargin: '0px 0px -25% 0px' });
  io.observe(svg);
})();

/* ---------------------------------------------------------
   3. Локація: перемикач «На авто / Без авто» і підсвітка місць
   --------------------------------------------------------- */
(() => {
  const map = document.getElementById('locMap');
  const list = document.getElementById('locList');
  const buttons = document.querySelectorAll('.location .seg button');

  buttons.forEach(btn => btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    buttons.forEach(b => b.setAttribute('aria-pressed', b === btn));
    map.classList.toggle('transit', mode === 'transit');
    list.querySelectorAll('.loc-t').forEach(t => {
      t.classList.add('swap');
      setTimeout(() => { t.textContent = t.dataset[mode]; t.classList.remove('swap'); }, 200);
    });
    list.querySelectorAll('small').forEach(s => { s.textContent = s.dataset[mode]; });
  }));

  const highlight = p => {
    map.querySelectorAll('[data-p]').forEach(el => el.classList.toggle('hl', el.dataset.p === p));
    list.querySelectorAll('li').forEach(li => li.classList.toggle('hl', li.dataset.p === p));
  };
  list.querySelectorAll('li').forEach(li => {
    li.addEventListener('mouseenter', () => highlight(li.dataset.p));
    li.addEventListener('mouseleave', () => highlight(null));
    li.addEventListener('click', () => highlight(li.classList.contains('hl') ? null : li.dataset.p));
  });

  const route = map.querySelector('.route-car');
  route.style.setProperty('--len', Math.ceil(route.getTotalLength()));

  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { map.classList.add('show'); io.disconnect(); }
  }, { rootMargin: '0px 0px -25% 0px' });
  io.observe(map);
})();

/* ---------------------------------------------------------
   4. Квартал: ілюстрація «двір без машин»
   --------------------------------------------------------- */
(() => {
  const svg = document.getElementById('courtyard');
  const rand = seeded(11);

  // територія
  svgEl('rect', { x: 24, y: 20, width: 356, height: 196, rx: 14, fill: 'none', stroke: 'rgba(230,223,210,.18)', 'stroke-dasharray': '3 4' }, svg);

  // сосни
  for (let i = 0; i < 140; i++) {
    const x = 34 + rand() * 336, y = 30 + rand() * 176;
    const inBuilding = [[70, 44, 90, 34], [250, 44, 90, 34], [70, 160, 90, 34], [250, 160, 90, 34]]
      .some(([bx, by, bw, bh]) => x > bx - 6 && x < bx + bw + 6 && y > by - 6 && y < by + bh + 6);
    if (!inBuilding && Math.abs(y - 118) > 10) svgEl('circle', { cx: x, cy: y, r: 1.4 + rand() * 1.6, fill: '#E6DFD2', opacity: .25 + rand() * .4 }, svg);
  }

  // пішохідна доріжка
  const walk = 'M40 118 C110 100 160 136 210 118 S310 100 368 118';
  svgEl('path', { d: walk, fill: 'none', stroke: 'rgba(230,223,210,.35)', 'stroke-dasharray': '2 5' }, svg);

  // будинки
  [[70, 44], [250, 44], [70, 160], [250, 160]].forEach(([x, y]) => {
    svgEl('rect', { x, y, width: 90, height: 34, fill: 'rgba(210,181,124,.12)', stroke: '#D2B57C', 'stroke-width': 1 }, svg);
  });

  // в'їзд і рампа в паркінг
  svgEl('path', { d: 'M0 226H40', stroke: '#4E544D', 'stroke-width': 10 }, svg);
  svgEl('path', { d: 'M40 220h22l10 12H40z', fill: '#D2B57C', opacity: .3 }, svg);
  const label = (x, y, text, fill = '#8E9389') => {
    const t = svgEl('text', { x, y, fill, 'font-family': 'IBM Plex Mono', 'font-size': 9, 'letter-spacing': 1 }, svg);
    t.textContent = text;
  };
  label(80, 233, 'ПАРКІНГ ↓', '#D2B57C');
  label(178, 112, 'ДВІР');

  if (reduceMotion) return;

  // машина заїжджає під землю і зникає
  const car = svgEl('rect', { x: -7, y: -3.5, width: 14, height: 7, rx: 2, fill: '#D2B57C' }, svg);
  svgEl('animateMotion', { dur: '4s', repeatCount: 'indefinite', path: 'M-20 226 H52 L66 232', keyTimes: '0;.6;1', keyPoints: '0;.85;1', calcMode: 'linear' }, car);
  svgEl('animate', { attributeName: 'opacity', dur: '4s', repeatCount: 'indefinite', values: '1;1;0;0', keyTimes: '0;.6;.75;1' }, car);

  // люди гуляють доріжкою
  [[0, 14], [5, 18], [9, 16]].forEach(([begin, dur]) => {
    const p = svgEl('circle', { r: 2.4, fill: '#E6DFD2' }, svg);
    svgEl('animateMotion', { dur: `${dur}s`, begin: `-${begin}s`, repeatCount: 'indefinite', path: walk }, p);
  });
})();

/* ---------------------------------------------------------
   Свайп-стрічка карток на мобільному: індикатор прогресу
   --------------------------------------------------------- */
(() => {
  const track = document.getElementById('qCards');
  const bar = document.querySelector('#qDots i');
  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    const share = track.clientWidth / track.scrollWidth;
    bar.style.width = `${share * 100}%`;
    bar.style.transform = `translateX(${max > 0 ? (track.scrollLeft / max) * (1 / share - 1) * 100 : 0}%)`;
  };
  track.addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
})();

/* ---------------------------------------------------------
   5. Квартири: дані, плани, фільтр, сортування, вікно квартири
   --------------------------------------------------------- */
const NUM = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 });
const NUM1 = new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const MLN = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 });
const money = n => NUM.format(Math.round(n)) + ' грн';
const millions = n => MLN.format(n / 1e6) + ' млн грн';
const m2 = n => NUM1.format(n) + ' м²';

// Кімнати у відносних одиницях: [x, y, ширина, висота, назва]; extra — балкон або тераса
const PLANS = {
  k1:  { rooms: [[0, 0, 58, 40, 'Кухня-вітальня'], [58, 0, 42, 40, 'Спальня'], [0, 40, 36, 26, 'Передпокій'], [36, 40, 24, 26, 'Ванна'], [60, 40, 40, 26, 'Гардероб']], extra: [8, -10, 40, 10, 'Балкон'] },
  k1b: { rooms: [[0, 0, 62, 42, 'Кухня-вітальня'], [62, 0, 38, 42, 'Спальня'], [0, 42, 40, 28, 'Передпокій'], [40, 42, 26, 28, 'Ванна'], [66, 42, 34, 28, 'Гардероб']] },
  k2:  { rooms: [[0, 0, 46, 40, 'Кухня-вітальня'], [46, 0, 27, 40, 'Спальня'], [73, 0, 27, 40, 'Спальня'], [0, 40, 50, 26, 'Передпокій'], [50, 40, 24, 26, 'Ванна'], [74, 40, 26, 26, 'Гардероб']], extra: [6, -10, 34, 10, 'Балкон'] },
  k2b: { rooms: [[0, 0, 46, 42, 'Кухня-вітальня'], [46, 0, 27, 42, 'Спальня'], [73, 0, 27, 42, 'Спальня'], [0, 42, 46, 28, 'Передпокій'], [46, 42, 27, 28, 'Ванна'], [73, 42, 27, 28, 'Санвузол']] },
  k3:  { rooms: [[0, 0, 40, 40, 'Кухня-вітальня'], [40, 0, 30, 40, 'Спальня'], [70, 0, 30, 40, 'Спальня'], [0, 40, 30, 30, 'Передпокій'], [30, 40, 36, 30, 'Дитяча'], [66, 40, 18, 30, 'Ванна'], [84, 40, 16, 30, 'Гардероб']], extra: [4, -10, 30, 10, 'Балкон'] },
  k4:  { rooms: [[0, 0, 44, 40, 'Кухня-вітальня'], [44, 0, 26, 40, 'Спальня'], [70, 0, 26, 40, 'Спальня'], [96, 0, 26, 40, 'Кабінет'], [0, 40, 34, 28, 'Передпокій'], [34, 40, 34, 28, 'Дитяча'], [68, 40, 28, 28, 'Ванна'], [96, 40, 26, 28, 'Гардероб']], extra: [0, -20, 122, 20, 'Тераса'] },
};

// id — для посилання на конкретну квартиру: ?apt=2k-64
// outdoor — площа балкона чи тераси (не входить у загальну площу)
const FLATS = [
  { id: '1k-42',  rooms: 1, area: 42,  price: 1890000, plan: 'k1',  house: 1, floor: '3 з 7', view: 'ліс',  outdoor: 3.2, tags: ['Балкон'], left: 6 },
  { id: '1k-48',  rooms: 1, area: 48,  price: 2150000, plan: 'k1b', house: 2, floor: '2 з 7', view: 'двір', outdoor: 0,   tags: ['Гардероб'], left: 9 },
  { id: '2k-58',  rooms: 2, area: 58,  price: 2610000, plan: 'k2',  house: 1, floor: '4 з 7', view: 'ліс',  outdoor: 3.6, tags: ['Балкон'], left: 4 },
  { id: '2k-64',  rooms: 2, area: 64,  price: 2880000, plan: 'k2',  house: 3, floor: '5 з 7', view: 'ліс',  outdoor: 3.8, tags: ['Балкон', 'Гардероб'], left: 11 },
  { id: '2k-71',  rooms: 2, area: 71,  price: 3190000, plan: 'k2b', house: 4, floor: '2 з 7', view: 'двір', outdoor: 0,   tags: ['Дві ванні'], left: 8 },
  { id: '3k-86',  rooms: 3, area: 86,  price: 3870000, plan: 'k3',  house: 2, floor: '6 з 7', view: 'ліс',  outdoor: 3.4, tags: ['Балкон', 'Гардероб'], left: 3 },
  { id: '3k-94',  rooms: 3, area: 94,  price: 4230000, plan: 'k3',  house: 4, floor: '4 з 7', view: 'ліс',  outdoor: 3.6, tags: ['Гардероб', 'Дитяча'], left: 5 },
  { id: '4k-118', rooms: 4, area: 118, price: 5430000, plan: 'k4',  house: 1, floor: '7 з 7', view: 'ліс',  outdoor: 32,  tags: ['Тераса 32 м²', 'Кабінет'], left: 2 },
];

const roomsWord = n => n === 1 ? 'кімната' : n < 5 ? 'кімнати' : 'кімнат';
const flatLabel = f => `${f.rooms} ${roomsWord(f.rooms)}, ${f.area} м², будинок ${f.house}`;

// Площі кімнат: пропорційно до плану, округлені до 0,1 м² так, щоб сума точно дорівнювала загальній площі
function roomAreas(f) {
  const { rooms, extra } = PLANS[f.plan];
  const total = rooms.reduce((s, r) => s + r[2] * r[3], 0);
  const tenths = rooms.map(r => f.area * 10 * r[2] * r[3] / total);
  const rounded = tenths.map(Math.floor);
  let rest = Math.round(f.area * 10) - rounded.reduce((a, b) => a + b, 0);
  tenths.map((t, i) => [t - Math.floor(t), i]).sort((a, b) => b[0] - a[0])
    .forEach(([, i]) => { if (rest-- > 0) rounded[i]++; });
  const list = rooms.map((r, i) => ({ name: r[4], area: rounded[i] / 10 }));
  if (extra && f.outdoor) list.push({ name: extra[4], area: f.outdoor, outdoor: true });
  return list;
}

function planSVG(f, withLabels) {
  const { rooms, extra } = PLANS[f.plan];
  const areas = roomAreas(f);
  const W = Math.max(...rooms.map(r => r[0] + r[2]));
  const H = Math.max(...rooms.map(r => r[1] + r[3]));
  const top = extra ? extra[1] : 0;
  const label = withLabels ? `role="img" aria-label="План квартири: ${areas.map(a => `${a.name} ${m2(a.area)}`).join(', ')}"` : 'aria-hidden="true"';
  let out = `<svg class="plan" viewBox="-4 ${top - 4} ${W + 8} ${H - top + 8}" ${label}>`;

  if (extra) {
    const [x, y, w, h, name] = extra;
    out += `<rect class="balc" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
    if (withLabels) out += `<text x="${x + w / 2}" y="${y + h / 2 + 1}" font-size="2.6" text-anchor="middle">${name}${f.outdoor ? ' · ' + m2(f.outdoor) : ''}</text>`;
  }
  rooms.forEach(([x, y, w, h, name], i) => {
    out += `<rect class="room${i === 0 ? ' living' : ''}" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
    if (y === 0) out += `<line class="wnd" x1="${x + w * .25}" y1="0" x2="${x + w * .75}" y2="0"/>`;
    if (withLabels) {
      const fs = Math.min(2.8, w / 7);
      out += `<text x="${x + w / 2}" y="${y + h / 2 - 1}" font-size="${fs}" text-anchor="middle">${name}</text>`;
      out += `<text class="area" x="${x + w / 2}" y="${y + h / 2 + fs + .6}" font-size="${fs * 1.15}" text-anchor="middle">${m2(areas[i].area)}</text>`;
    }
  });
  out += `<rect class="outer" x="0" y="0" width="${W}" height="${H}"/></svg>`;
  return out;
}

(() => {
  const grid = document.getElementById('flatsGrid');
  const tabs = document.querySelectorAll('#roomTabs button');
  const forestBtn = document.getElementById('forestOnly');
  const sortSel = document.getElementById('flatSort');
  const modal = document.getElementById('flatModal');
  const body = document.getElementById('flatModalBody');
  let rooms = 'all', forestOnly = false, sort = '';

  // кількість планувань біля кожної вкладки
  tabs.forEach(b => {
    const n = b.dataset.rooms === 'all' ? FLATS.length : FLATS.filter(f => f.rooms === +b.dataset.rooms).length;
    b.insertAdjacentHTML('beforeend', `<sup>${n}</sup>`);
  });

  const SORTS = {
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    'area-asc': (a, b) => a.area - b.area,
    'area-desc': (a, b) => b.area - a.area,
  };

  function render() {
    const list = FLATS.filter(f => (rooms === 'all' || f.rooms === +rooms) && (!forestOnly || f.view === 'ліс'));
    if (SORTS[sort]) list.sort(SORTS[sort]);
    grid.innerHTML = list.length ? list.map((f, i) => `
      <button type="button" class="flat" data-id="${f.id}" style="animation-delay:${i * 50}ms" aria-label="${flatLabel(f)}, від ${millions(f.price)} — відкрити планування">
        ${f.left <= 5 ? `<span class="flat-left">Лишилось ${f.left}</span>` : ''}
        <span class="flat-plan">${planSVG(f, false)}</span>
        <span class="flat-rooms">${f.rooms} ${roomsWord(f.rooms)} · вид на ${f.view}</span>
        <span class="flat-area">${f.area} <small>м²</small></span>
        <span class="flat-price">від ${millions(f.price)}</span>
        <span class="flat-tags">${f.tags.map(t => `<span>${t}</span>`).join('')}</span>
      </button>`).join('')
      : '<p class="flats-empty">Таких планувань зараз немає — менеджер підбере схожі.</p>';
  }

  tabs.forEach(b => b.addEventListener('click', () => {
    rooms = b.dataset.rooms;
    tabs.forEach(t => t.setAttribute('aria-pressed', t === b));
    render();
  }));
  forestBtn.addEventListener('click', () => {
    forestOnly = !forestOnly;
    forestBtn.setAttribute('aria-pressed', forestOnly);
    render();
  });
  sortSel.addEventListener('change', () => { sort = sortSel.value; render(); });

  // посилання на квартиру: ?apt=2k-64 (решта параметрів зберігається)
  const setAptParam = id => {
    const url = new URL(location.href);
    if (id) url.searchParams.set('apt', id); else url.searchParams.delete('apt');
    history.replaceState(null, '', url);
  };

  function open(f) {
    const monthly = f.price * .7 / 14;
    const areas = roomAreas(f);
    body.innerHTML = `
      <button type="button" class="fm-close" aria-label="Закрити" data-close>
        <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M1 1l12 12M13 1 1 13"/></svg>
      </button>
      <div class="fm-plan">${planSVG(f, true)}</div>
      <div class="fm-info">
        <p class="label label-gold">Будинок ${f.house} · вид на ${f.view}${f.left <= 5 ? ` · <span class="fm-left">лишилось ${f.left}</span>` : ''}</p>
        <h3 class="fm-title" id="flatTitle">${f.rooms} ${roomsWord(f.rooms)}, ${f.area} м²</h3>
        <ul class="fm-specs">
          <li><span>Поверх</span><span>${f.floor}</span></li>
          <li><span>Вид з вікон</span><span>${f.view === 'ліс' ? 'на сосновий ліс' : 'у двір без машин'}</span></li>
          <li><span>Ціна за м²</span><span>${money(f.price / f.area)}</span></li>
          <li><span>Здача</span><span>${f.house <= 2 ? 'грудень 2027' : 'вересень 2028'}</span></li>
        </ul>
        <details class="fm-expl" open>
          <summary>Експлікація площ</summary>
          <ul>${areas.map(a => `<li${a.outdoor ? ' class="out"' : ''}><span>${a.name}</span><span>${m2(a.area)}</span></li>`).join('')}
            <li class="sum"><span>Загальна площа</span><span>${m2(f.area)}</span></li>
          </ul>
        </details>
        <p class="fm-price">${money(f.price)}</p>
        <p class="fm-monthly">У розстрочку: 30% внесок, далі <b>${money(monthly)}/міс</b></p>
        <div class="fm-actions">
          <a class="btn btn-gold" href="#visit" data-close data-apt="${f.id}">Записатися на огляд цієї квартири</a>
          <a class="btn btn-ghost" href="#terms" data-calc="${f.price}">Розрахувати платіж</a>
        </div>
        <button type="button" class="fm-share" data-share="${f.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>
          Скопіювати посилання на квартиру
        </button>
      </div>`;
    setAptParam(f.id);
    if (!modal.open) modal.showModal();
    modal.scrollTop = 0;
  }

  grid.addEventListener('click', e => {
    const card = e.target.closest('.flat');
    if (card) open(FLATS.find(f => f.id === card.dataset.id));
  });
  modal.addEventListener('close', () => setAptParam(null));
  modal.addEventListener('click', async e => {
    if (e.target === modal || e.target.closest('[data-close]')) modal.close();
    const aptLink = e.target.closest('[data-apt]');
    if (aptLink) {
      const f = FLATS.find(x => x.id === aptLink.dataset.apt);
      window.setVisitFlat?.(flatLabel(f), f.id);
    }
    const calcLink = e.target.closest('[data-calc]');
    if (calcLink) { e.preventDefault(); modal.close(); window.setCalcPrice?.(+calcLink.dataset.calc); }
    const share = e.target.closest('[data-share]');
    if (share) {
      const url = new URL(location.href);
      url.hash = '';
      url.search = `?apt=${share.dataset.share}`;
      try {
        if (navigator.share && matchMedia('(hover: none)').matches) await navigator.share({ title: 'Krona Hills', url: url.href });
        else { await navigator.clipboard.writeText(url.href); window.showToast?.('Посилання на квартиру скопійовано'); }
      } catch (err) { /* користувач закрив вікно «Поділитися» */ }
    }
  });
  // свайп вниз закриває вікно на телефоні
  let startY = null;
  modal.addEventListener('touchstart', e => { if (modal.scrollTop <= 0) startY = e.touches[0].clientY; }, { passive: true });
  modal.addEventListener('touchend', e => {
    if (startY !== null && e.changedTouches[0].clientY - startY > 90) modal.close();
    startY = null;
  });

  render();

  // відкриваємо квартиру з посилання
  const aptParam = new URLSearchParams(location.search).get('apt');
  const fromLink = FLATS.find(f => f.id === aptParam);
  if (fromLink) {
    document.getElementById('flats').scrollIntoView();
    open(fromLink);
  }
})();

/* ---------------------------------------------------------
   6. Калькулятор: розстрочка 0% або іпотека (ануїтет)
   --------------------------------------------------------- */
(() => {
  const $ = id => document.getElementById(id);
  const inPrice = $('inPrice'), inDown = $('inDown'), inTerm = $('inTerm');
  const planBtns = document.querySelectorAll('#calc .seg button');
  const PLANS_CALC = {
    // розстрочка: внесок 30–90%, строк 6–24 міс. (до здачі будинку)
    installment: { down: [30, 90], term: [6, 24], termDefault: 14 },
    // іпотека: внесок 20–90%, строк 5–20 років, 7% річних
    mortgage: { down: [20, 90], term: [5, 20], termDefault: 15, rate: .07 },
  };
  let plan = 'installment';

  const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v));
  const fill = input => input.style.setProperty('--p', `${(input.value - input.min) / (input.max - input.min) * 100}%`);

  function update() {
    const cfg = PLANS_CALC[plan];
    const price = +inPrice.value;
    const downPct = clamp(+inDown.value, cfg.down);
    const term = clamp(+inTerm.value, cfg.term);
    const down = price * downPct / 100, loan = price - down;
    let monthly, sub;
    if (plan === 'installment') {
      monthly = loan / term;
      $('outTerm').textContent = `${term} міс.`;
      sub = 'Переплата: <b>0 грн</b>';
    } else {
      // ануїтет: A = S · r / (1 − (1 + r)^−n)
      const r = cfg.rate / 12, n = term * 12;
      monthly = loan * r / (1 - Math.pow(1 + r, -n));
      const overpay = monthly * n - loan;
      $('outTerm').textContent = `${term} р.`;
      sub = `Переплата: <b>${money(overpay)}</b> · ${NUM.format(cfg.rate * 100)}% річних · кредит ${millions(loan)}`;
    }
    $('outPrice').textContent = millions(price);
    $('outDown').textContent = `${downPct}% · ${money(down)}`;
    $('outMonthly').textContent = money(monthly);
    $('outSub').innerHTML = sub;
    [inPrice, inDown, inTerm].forEach(fill);
  }

  planBtns.forEach(btn => btn.addEventListener('click', () => {
    plan = btn.dataset.plan;
    const cfg = PLANS_CALC[plan];
    planBtns.forEach(b => b.setAttribute('aria-pressed', b === btn));
    inDown.min = cfg.down[0]; inDown.max = cfg.down[1];
    inDown.value = clamp(+inDown.value, cfg.down);
    inTerm.min = cfg.term[0]; inTerm.max = cfg.term[1];
    inTerm.value = cfg.termDefault;
    update();
  }));
  [inPrice, inDown, inTerm].forEach(i => i.addEventListener('input', update));

  // викликається з вікна квартири: підставити її ціну
  window.setCalcPrice = price => {
    inPrice.value = clamp(price, [+inPrice.min, +inPrice.max]);
    update();
    document.getElementById('terms').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  update();
})();

/* ---------------------------------------------------------
   7. Хід будівництва: будинок росте поверх за поверхом
   --------------------------------------------------------- */
(() => {
  const section = document.getElementById('progress');
  const svg = document.getElementById('prBuilding');
  const caption = document.getElementById('prCaption');
  const buttons = document.querySelectorAll('#houses .house');

  // now: поверх, який будують зараз; 0 — паркінг, -1 — фундамент
  const HOUSES = [
    { now: 6,  stage: 'Монолітний каркас, 6 поверх', next: 'Покрівля — січень 2027' },
    { now: 5,  stage: 'Монолітний каркас, 5 поверх', next: 'Каркас завершимо в грудні 2026' },
    { now: 0,  stage: 'Підземний паркінг', next: 'Перший поверх — грудень 2026' },
    { now: -1, stage: 'Фундамент', next: 'Паркінг — лютий 2027' },
  ];

  const GROUND = 288, FH = 31, X = 108, W = 150, TOP = 40;
  const floorY = f => GROUND - f * FH;

  // статична частина: земля, кран
  svgEl('path', { d: `M4 ${GROUND}H316`, stroke: 'rgba(230,223,210,.35)', 'stroke-width': 1 }, svg);
  let lattice = `M284 ${GROUND}V${TOP}M294 ${GROUND}V${TOP}`;
  for (let y = GROUND; y > TOP + 10; y -= 16) lattice += `M284 ${y}L294 ${y - 16}`;
  svgEl('path', { class: 'crane', d: lattice + `M190 ${TOP}H316M294 ${TOP}L306 ${TOP - 16}L316 ${TOP}M190 ${TOP}L294 ${TOP - 18}` }, svg);
  const cable = svgEl('rect', { x: 219.5, y: TOP, width: 1, height: GROUND - TOP, fill: '#D2B57C' }, svg);
  cable.style.transformOrigin = `0 ${TOP}px`;
  cable.style.transition = 'transform .9s cubic-bezier(.2,.7,.1,1)';
  const hook = svgEl('path', { class: 'hook', d: `M216 ${GROUND}h8v5h-8z` }, svg);

  const layer = svgEl('g', {}, svg);
  const label = (x, y, text, cls = 'lbl', anchor = 'end') => {
    const t = svgEl('text', { class: cls, x, y, 'text-anchor': anchor }, layer);
    t.textContent = text;
  };

  function draw(i) {
    const h = HOUSES[i];
    layer.innerHTML = '';
    const state = level => level < h.now ? 'done' : level === h.now ? 'now' : 'todo';

    // фундамент і паркінг під землею
    svgEl('rect', { class: `fl fl-${state(-1)}`, x: X - 10, y: GROUND + 34, width: W + 20, height: 6 }, layer);
    svgEl('rect', { class: `fl fl-${state(0)}`, x: X - 10, y: GROUND + 2, width: W + 20, height: 30 }, layer);
    label(X - 16, GROUND + 22, 'ПАРКІНГ', h.now === 0 ? 'lbl lbl-now' : 'lbl');

    for (let f = 1; f <= 7; f++) {
      const s = state(f), y = floorY(f);
      const r = svgEl('rect', { class: `fl fl-${s}`, x: X, y, width: W, height: FH - 2 }, layer);
      r.style.animationDelay = `${f * 60}ms`;
      if (s === 'done') {
        for (let c = 0; c < 5; c++) svgEl('rect', { class: 'wd', x: X + 12 + c * 27, y: y + 9, width: 14, height: 11 }, layer);
      }
      if (s === 'now') label(X + W / 2, y + 18, `${f} ПОВЕРХ · ЗАРАЗ`, 'lbl lbl-now', 'middle');
      else if (f === 7 || f === 1) label(X - 8, y + 19, `${f}`);
    }

    // кран опускає гак на поточний рівень
    const hookY = h.now >= 1 ? floorY(h.now) - 6 : GROUND - 6;
    cable.style.transform = `scaleY(${(hookY - TOP) / (GROUND - TOP)})`;
    hook.style.transform = `translateY(${hookY - GROUND}px)`;

    caption.innerHTML = `<span>Зараз: <b>${h.stage}</b></span><span>Далі: <b>${h.next}</b></span>`;
  }

  buttons.forEach(b => b.addEventListener('click', () => {
    buttons.forEach(x => x.setAttribute('aria-pressed', x === b));
    draw(+b.dataset.h);
  }));

  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { section.classList.add('seen'); io.disconnect(); }
  }, { rootMargin: '0px 0px -25% 0px' });
  io.observe(section);

  draw(0);
})();

/* ---------------------------------------------------------
   8. Питання: плавне відкриття, відкрите лише одне
   --------------------------------------------------------- */
(() => {
  const items = [...document.querySelectorAll('.faq-list details')];
  const ease = 'cubic-bezier(.2,.7,.1,1)';

  // відповідь загортаємо в обгортку, висоту якої анімуємо
  items.forEach(d => {
    const wrap = document.createElement('div');
    wrap.className = 'faq-a';
    wrap.appendChild(d.querySelector('p'));
    d.appendChild(wrap);
    d.classList.toggle('on', d.open);
  });

  function expand(d) {
    const wrap = d.querySelector('.faq-a');
    d.open = true;
    d.classList.add('on');
    if (reduceMotion) return;
    wrap.animate(
      [{ height: '0px', opacity: 0 }, { height: `${wrap.scrollHeight}px`, opacity: 1 }],
      { duration: 480, easing: ease }
    );
  }
  function collapse(d) {
    const wrap = d.querySelector('.faq-a');
    d.classList.remove('on');
    if (reduceMotion) { d.open = false; return; }
    const anim = wrap.animate(
      [{ height: `${wrap.offsetHeight}px`, opacity: 1 }, { height: '0px', opacity: 0 }],
      { duration: 380, easing: ease }
    );
    anim.onfinish = () => { if (!d.classList.contains('on')) d.open = false; };
  }

  items.forEach(d => d.querySelector('summary').addEventListener('click', e => {
    e.preventDefault();
    if (d.classList.contains('on')) collapse(d);
    else {
      items.forEach(o => { if (o !== d && o.classList.contains('on')) collapse(o); });
      expand(d);
    }
  }));
})();

/* ---------------------------------------------------------
   9. Заявки: «Запис на огляд» і «Передзвоніть мені»
   Надсилаються на /api/lead (Cloudflare Pages Function) → Telegram
   --------------------------------------------------------- */
// маска телефону: +380 (XX) XXX XX XX
function formatPhone(value) {
  let d = value.replace(/\D/g, '');
  if (d.startsWith('380')) d = d.slice(3);
  else if (d.startsWith('0')) d = d.slice(1);
  d = d.slice(0, 9);
  let out = '+380';
  if (d.length) out += ` (${d.slice(0, 2)}`;
  if (d.length >= 2) out += ')';
  if (d.length > 2) out += ` ${d.slice(2, 5)}`;
  if (d.length > 5) out += ` ${d.slice(5, 7)}`;
  if (d.length > 7) out += ` ${d.slice(7, 9)}`;
  return { text: out, digits: d.length };
}

// перевірка імені й телефону; повертає true або перше поле з помилкою
function checkFields(nameEl, phoneEl) {
  const okName = nameEl.value.trim().length >= 2;
  const okPhone = formatPhone(phoneEl.value).digits === 9;
  nameEl.closest('.input').classList.toggle('invalid', !okName);
  phoneEl.closest('.input').classList.toggle('invalid', !okPhone);
  return okName && okPhone ? true : (okName ? phoneEl : nameEl);
}

function wireFields(nameEl, phoneEl) {
  phoneEl.addEventListener('focus', () => { if (!phoneEl.value) phoneEl.value = '+380 '; });
  phoneEl.addEventListener('blur', () => { if (phoneEl.value.trim() === '+380') phoneEl.value = ''; });
  phoneEl.addEventListener('input', () => {
    phoneEl.value = formatPhone(phoneEl.value).text;
    if (phoneEl.closest('.input').classList.contains('invalid')) checkFields(nameEl, phoneEl);
  });
  nameEl.addEventListener('input', () => {
    if (nameEl.closest('.input').classList.contains('invalid')) checkFields(nameEl, phoneEl);
  });
}

async function sendLead(payload) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, page: location.href }),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    return res.ok && data.ok === true;
  } catch (e) {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// спільна логіка відправки: блокування кнопки, «Надсилаємо…», помилка з альтернативою
function handleLeadForm(form, collect, onSuccess) {
  const btn = form.querySelector('[type="submit"]');
  const label = btn.textContent;
  const err = form.querySelector('.form-error');
  const nameEl = form.elements.name, phoneEl = form.elements.phone;
  let sending = false;
  wireFields(nameEl, phoneEl);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (sending) return;
    const check = checkFields(nameEl, phoneEl);
    if (check !== true) { check.focus(); return; }

    sending = true;
    err.hidden = true;
    btn.disabled = true;
    btn.textContent = 'Надсилаємо…';
    const ok = await sendLead({
      ...collect(),
      name: nameEl.value.trim(),
      phone: phoneEl.value,
      company: form.elements.company.value, // пастка для ботів
    });
    sending = false;
    btn.disabled = false;
    btn.textContent = label;
    if (ok) onSuccess();
    else { err.hidden = false; err.focus(); }
  });
}

// --- запис на огляд ---
(() => {
  const form = document.getElementById('visitForm');
  const done = document.getElementById('visitDone');
  const days = document.getElementById('vfDays');
  const times = document.getElementById('vfTimes');
  const flatBox = document.getElementById('vfFlat');
  const flatText = document.getElementById('vfFlatText');
  const aptInput = document.getElementById('vfApt');

  const wd = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const mon = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];
  const monFull = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
  const slotButtons = [...times.querySelectorAll('button')];
  const LEAD_MIN = 60; // на сьогодні — не раніше ніж за годину

  // слот сьогодні ще доступний?
  const slotOk = (btn, date) => {
    const [h, m] = btn.textContent.split(':').map(Number);
    const at = new Date(date); at.setHours(h, m, 0, 0);
    return at - Date.now() > LEAD_MIN * 60000;
  };

  // дні: сьогодні (якщо ще є вільний час) + 7 наступних
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const startOffset = slotButtons.some(b => slotOk(b, today)) ? 0 : 1;
  for (let i = startOffset; i < startOffset + 7; i++) {
    const d = new Date(today); d.setDate(d.getDate() + i);
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-pressed', i === startOffset);
    b.dataset.date = d.toISOString();
    b.dataset.label = `${d.getDate()} ${monFull[d.getMonth()]}`;
    const tag = i === 0 ? 'Сьогодні' : i === 1 ? 'Завтра' : wd[d.getDay()];
    b.innerHTML = `<small>${tag}</small>${d.getDate()} ${mon[d.getMonth()]}`;
    days.appendChild(b);
  }

  // на сьогодні минулий час недоступний
  function refreshSlots() {
    const day = days.querySelector('[aria-pressed="true"]');
    const isToday = new Date(day.dataset.date).getTime() === today.getTime();
    slotButtons.forEach(b => { b.disabled = isToday && !slotOk(b, today); });
    const chosen = times.querySelector('[aria-pressed="true"]');
    if (!chosen || chosen.disabled) {
      const first = slotButtons.find(b => !b.disabled);
      slotButtons.forEach(b => b.setAttribute('aria-pressed', b === first));
    }
  }

  [days, times].forEach(row => row.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    row.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    if (row === days) refreshSlots();
  }));
  refreshSlots();

  const chosen = () => ({
    day: days.querySelector('[aria-pressed="true"]').dataset.label,
    time: times.querySelector('[aria-pressed="true"]').textContent,
  });

  handleLeadForm(form, () => ({
    form: 'visit',
    apartment: aptInput.value,
    date: chosen().day,
    time: chosen().time,
    pickup: document.getElementById('vfPickup').checked,
  }), () => {
    const { day, time } = chosen();
    const pickup = document.getElementById('vfPickup').checked ? ' Зустрінемо вас біля метро.' : '';
    document.getElementById('vdTitle').textContent = 'Дякуємо, заявку прийнято!';
    document.getElementById('vdText').textContent =
      `Чекаємо вас ${day} о ${time}.${pickup} Менеджер зателефонує протягом 15 хвилин, щоб підтвердити.`;
    form.hidden = true;
    done.hidden = false;
    done.focus();
  });

  document.getElementById('vdAgain').addEventListener('click', () => {
    done.hidden = true;
    form.hidden = false;
    form.elements.name.focus();
  });

  // квартира з вікна квартири
  window.setVisitFlat = (text, id) => {
    flatText.textContent = text;
    aptInput.value = id ? `${id} · ${text}` : text;
    flatBox.hidden = false;
  };
  document.getElementById('vfFlatClear').addEventListener('click', () => { flatBox.hidden = true; aptInput.value = ''; });
})();

// --- «Передзвоніть мені» ---
(() => {
  const form = document.getElementById('cbForm');
  const done = document.getElementById('cbDone');
  handleLeadForm(form, () => ({ form: 'callback' }), () => {
    form.hidden = true;
    done.hidden = false;
    done.focus();
  });
})();

/* ---------------------------------------------------------
   Демо-посилання: документи показуємо на огляді
   --------------------------------------------------------- */
(() => {
  const toast = document.getElementById('toast');
  let timer;
  window.showToast = text => {
    toast.textContent = text;
    toast.classList.add('on');
    clearTimeout(timer);
    timer = setTimeout(() => toast.classList.remove('on'), 2600);
  };
  document.querySelectorAll('[data-demo]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    toast.textContent = 'Документи покажемо на огляді або надішлемо в месенджер';
    toast.classList.add('on');
    clearTimeout(timer);
    timer = setTimeout(() => toast.classList.remove('on'), 2600);
  }));
})();

/* ---------------------------------------------------------
   Нескінченні анімації — на паузу, коли їх не видно
   --------------------------------------------------------- */
(() => {
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    e.target.classList.toggle('paused', !e.isIntersecting);
    // рух у дворі (машина, люди) — SVG-анімація, її зупиняємо окремо
    if (e.target.pauseAnimations) e.isIntersecting ? e.target.unpauseAnimations() : e.target.pauseAnimations();
  }));
  ['locMap', 'prBuilding', 'courtyard'].forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
})();

/* ---------------------------------------------------------
   Зображення: вставляємо лише ті, що реально є (js/images.js),
   на місці решти — заглушка з підписом
   --------------------------------------------------------- */
const IMAGES = window.KRONA_IMAGES || {};
const PH_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 6 11h3l-4 6h14l-4-6h3z"/><path d="M12 17v4"/></svg>';

function pictureHTML(key, alt, sizes, eager) {
  const img = IMAGES[key];
  if (!img || !img.w.length || !img.f.length) return '';
  const set = f => img.w.map(w => `images/${key}-${w}.${f} ${w}w`).join(', ');
  const fallback = img.f[img.f.length - 1];
  const sources = img.f.slice(0, -1).map(f => `<source type="image/${f}" srcset="${set(f)}" sizes="${sizes}">`).join('');
  const load = eager ? 'fetchpriority="high"' : 'loading="lazy"';
  return `<picture>${sources}<img src="images/${key}-${img.w[img.w.length - 1]}.${fallback}" srcset="${set(fallback)}" sizes="${sizes}" alt="${alt}" ${load} decoding="async"></picture>`;
}

function fillMedia(el, sizes) {
  const { img: key, alt = '', cap = '', kind } = el.dataset;
  el.querySelectorAll('picture, .ph').forEach(n => n.remove());
  const pic = pictureHTML(key, alt, sizes);
  if (pic) {
    el.insertAdjacentHTML('afterbegin', pic);
    const im = el.querySelector('img');
    const done = () => el.classList.add('is-loaded');
    if (im.complete && im.naturalWidth) done(); else im.addEventListener('load', done, { once: true });
  } else {
    el.classList.remove('is-loaded');
    el.insertAdjacentHTML('afterbegin', `<span class="ph"><span class="ph-in">${PH_ICON}<b>${cap}</b><small>${kind === 'photo' ? 'Фото з майданчика незабаром' : 'Візуалізація готується'}</small></span></span>`);
  }
  return !!pic;
}

(() => {
  const SIZES = {
    gallery: '(min-width: 1100px) 50vw, (min-width: 640px) 50vw, 82vw',
    interiors: '(min-width: 900px) 50vw, (min-width: 640px) 50vw, 78vw',
    progress: '(min-width: 640px) 50vw, 100vw',
  };
  document.querySelectorAll('[data-lb] .media').forEach(el => {
    const group = el.closest('[data-lb]').dataset.lb.split('-')[0];
    fillMedia(el, SIZES[group] || '100vw');
    el.setAttribute('aria-label', `${el.dataset.cap} — відкрити на весь екран`);
    el.insertAdjacentHTML('beforeend', `<span class="render-tag">${el.dataset.tag || 'Візуалізація'}</span>`);
    if (el.classList.contains('g-item')) el.insertAdjacentHTML('beforeend', `<span class="g-cap">${el.dataset.cap}</span>`);
  });

  // рендер першого екрана: на Cloudflare його вставляє збірка, локально — цей код
  const hero = document.getElementById('top');
  if (!document.getElementById('heroPhoto') && (IMAGES['hero/hero-desktop'] || IMAGES['hero/hero-mobile'])) {
    const desk = IMAGES['hero/hero-desktop'] ? 'hero/hero-desktop' : 'hero/hero-mobile';
    const mob = IMAGES['hero/hero-mobile'] ? 'hero/hero-mobile' : desk;
    const set = (k, f) => IMAGES[k].w.map(w => `images/${k}-${w}.${f} ${w}w`).join(', ');
    let html = '<picture class="hero-photo" id="heroPhoto">';
    if (desk !== mob) IMAGES[desk].f.forEach(f => { html += `<source media="(min-width: 900px)" type="image/${f}" srcset="${set(desk, f)}" sizes="100vw">`; });
    IMAGES[mob].f.forEach(f => { html += `<source type="image/${f}" srcset="${set(mob, f)}" sizes="100vw">`; });
    const fb = IMAGES[desk].f[IMAGES[desk].f.length - 1];
    html += `<img src="images/${desk}-${IMAGES[desk].w[IMAGES[desk].w.length - 1]}.${fb}" alt="Візуалізація: будинки Krona Hills серед сосон" fetchpriority="high" decoding="async"></picture><span class="render-tag hero-tag">Візуалізація</span>`;
    document.getElementById('scene').insertAdjacentHTML('afterend', html);
  }
  if (document.getElementById('heroPhoto')) hero.classList.add('has-photo');
})();

/* ---------------------------------------------------------
   Фото з майданчика: вкладки місяців
   --------------------------------------------------------- */
(() => {
  const tabs = [...document.querySelectorAll('.pp-tabs [role="tab"]')];
  const select = tab => {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
  };
  tabs.forEach((t, i) => {
    t.tabIndex = i === 0 ? 0 : -1;
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', e => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      const next = tabs[(i + step + tabs.length) % tabs.length];
      select(next); next.focus();
    });
  });
})();

/* ---------------------------------------------------------
   Лайтбокс: свайп на телефоні, стрілки на клавіатурі, Esc
   --------------------------------------------------------- */
(() => {
  const lb = document.getElementById('lightbox');
  const media = document.getElementById('lbMedia');
  const cap = document.getElementById('lbCap');
  const count = document.getElementById('lbCount');
  let items = [], index = 0, opener = null;

  const ratio = el => {
    const [a, b] = (el.style.getPropertyValue('--ar') || '3/2').split('/').map(Number);
    return a / b || 1.5;
  };

  function show(i) {
    index = (i + items.length) % items.length;
    const src = items[index];
    Object.assign(media.dataset, { img: src.dataset.img, alt: src.dataset.alt, cap: src.dataset.cap, kind: src.dataset.kind || '' });
    media.style.setProperty('--ar', src.style.getPropertyValue('--ar'));
    media.style.setProperty('--arn', ratio(src));
    lb.querySelector('.lb-cap').style.setProperty('--arn', ratio(src));
    fillMedia(media, '100vw');
    cap.textContent = src.dataset.cap;
    count.textContent = `${index + 1} / ${items.length}`;
    lb.querySelectorAll('.lb-nav').forEach(b => { b.hidden = items.length < 2; });
  }

  document.addEventListener('click', e => {
    const item = e.target.closest('[data-lb] .media');
    if (!item) return;
    items = [...item.closest('[data-lb]').querySelectorAll('.media')];
    opener = item;
    show(items.indexOf(item));
    lb.showModal();
  });
  lb.addEventListener('click', e => {
    if (e.target.closest('[data-lb-close]') || e.target === lb) lb.close();
    const step = e.target.closest('[data-lb-step]');
    if (step) show(index + +step.dataset.lbStep);
  });
  lb.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') show(index + 1);
    if (e.key === 'ArrowLeft') show(index - 1);
  });
  lb.addEventListener('close', () => opener?.focus({ preventScroll: true }));

  // свайп
  let x0 = null, y0 = 0;
  media.addEventListener('pointerdown', e => { x0 = e.clientX; y0 = e.clientY; });
  media.addEventListener('pointerup', e => {
    if (x0 === null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
    x0 = null;
  });
  media.addEventListener('pointercancel', () => { x0 = null; });
})();
