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
const mobileCta = document.getElementById('mobileCta');

function setMenu(open) {
  document.body.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', open);
  burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
  mobileMenu.setAttribute('aria-hidden', !open);
}
burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

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

  for (let L = 0; L < 4; L++) {
    const g = svgEl('g', {}, svg);
    g.depth = depth[L];
    layers.push(g);

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
  svgEl('rect', { y: 680, width: W, height: 220, fill: 'url(#fog)' }, svg);

  // вечір настає: вікна вмикаються по одному
  const lit = windows.filter(() => rand() < .3);
  lit.sort(() => rand() - .5).forEach((w, i) => {
    setTimeout(() => w.setAttribute('opacity', .9), reduceMotion ? 0 : 900 + i * 55);
  });
  if (!reduceMotion) {
    setInterval(() => {
      const w = windows[Math.floor(rand() * windows.length)];
      w.setAttribute('opacity', w.getAttribute('opacity') > 0 ? 0 : .9);
    }, 900);
  }

  return { layers };
})();

/* ---------------------------------------------------------
   Паралакс першого екрана: рух миші + скрол
   --------------------------------------------------------- */
(() => {
  const hero = document.getElementById('top');
  const content = document.getElementById('heroContent');
  let targetX = 0, x = 0, heroVisible = true;

  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }).observe(hero);
  hero.addEventListener('mousemove', e => { targetX = e.clientX / innerWidth - .5; });

  function frame() {
    if (heroVisible) {
      const y = scrollY;
      x += (targetX - x) * .05;
      scene.layers.forEach(g => {
        // дальні шари відстають при скролі — виникає глибина
        g.setAttribute('transform', `translate(${(-x * 60 * g.depth).toFixed(2)} ${(y * (1 - g.depth) * .45).toFixed(2)})`);
      });
      content.style.transform = `translateY(${y * .3}px)`;
      content.style.opacity = Math.max(0, 1 - y / (innerHeight * .6));
    }
    requestAnimationFrame(frame);
  }
  if (!reduceMotion) frame();
})();

/* ---------------------------------------------------------
   Стан навігації і мобільної кнопки при скролі
   --------------------------------------------------------- */
function onScroll() {
  nav.classList.toggle('scrolled', scrollY > 40);
  // поруч із формою запису плаваюча кнопка не потрібна
  const formNear = document.getElementById('visit').getBoundingClientRect().top < innerHeight * .9;
  mobileCta.classList.toggle('on', scrollY > innerHeight * .8 && !formNear);
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
  if (reduceMotion) words.forEach(w => w.classList.add('on'));
  else { addEventListener('scroll', update, { passive: true }); update(); }
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
      const t = Math.min(1, (now - start) / dur);
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
  if (matchMedia('(hover: none)').matches) frame.querySelector('.map-hint').textContent = 'Торкніться будинку';

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

  const treeGroup = svgEl('g', {}, svg);
  trees.forEach(([x, y, moved]) => {
    const delay = ((x + y) / 1200 * 1.4).toFixed(2) + 's';
    const c = moved
      ? svgEl('circle', { class: 't', cx: x.toFixed(1), cy: y.toFixed(1), r: 2.6, fill: 'none', stroke: '#D2B57C', 'stroke-width': .9 }, treeGroup)
      : svgEl('circle', { class: 't', cx: x.toFixed(1), cy: y.toFixed(1), r: (1.6 + rand() * 1.5).toFixed(2), fill: '#E6DFD2' }, treeGroup);
    c.style.setProperty('--o', moved ? 1 : (.35 + rand() * .5).toFixed(2));
    c.style.transitionDelay = delay;
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
      tip.style.left = `${br.left - fr.left + br.width / 2}px`;
      tip.style.top = `${br.top - fr.top}px`;
      tip.innerHTML = `<b>${h.title} · 7 поверхів</b>${h.info}`;
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
    if (e.isIntersecting) { svg.classList.add('show'); io.disconnect(); }
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
   5. Квартири: дані, плани, фільтр, вікно квартири
   --------------------------------------------------------- */
const money = n => Math.round(n).toLocaleString('uk-UA') + ' грн';
const millions = n => (n / 1e6).toLocaleString('uk-UA', { maximumFractionDigits: 2 }) + ' млн грн';

// Кімнати у відносних одиницях: [x, y, ширина, висота, назва]
const PLANS = {
  k1:  { rooms: [[0, 0, 58, 40, 'Кухня-вітальня'], [58, 0, 42, 40, 'Спальня'], [0, 40, 36, 26, 'Передпокій'], [36, 40, 24, 26, 'Ванна'], [60, 40, 40, 26, 'Гардероб']], extra: [8, -10, 40, 10, 'Балкон'] },
  k1b: { rooms: [[0, 0, 62, 42, 'Кухня-вітальня'], [62, 0, 38, 42, 'Спальня'], [0, 42, 40, 28, 'Передпокій'], [40, 42, 26, 28, 'Ванна'], [66, 42, 34, 28, 'Гардероб']] },
  k2:  { rooms: [[0, 0, 46, 40, 'Кухня-вітальня'], [46, 0, 27, 40, 'Спальня'], [73, 0, 27, 40, 'Спальня'], [0, 40, 50, 26, 'Передпокій'], [50, 40, 24, 26, 'Ванна'], [74, 40, 26, 26, 'Гардероб']], extra: [6, -10, 34, 10, 'Балкон'] },
  k2b: { rooms: [[0, 0, 46, 42, 'Кухня-вітальня'], [46, 0, 27, 42, 'Спальня'], [73, 0, 27, 42, 'Спальня'], [0, 42, 46, 28, 'Передпокій'], [46, 42, 27, 28, 'Ванна'], [73, 42, 27, 28, 'Санвузол']] },
  k3:  { rooms: [[0, 0, 40, 40, 'Кухня-вітальня'], [40, 0, 30, 40, 'Спальня'], [70, 0, 30, 40, 'Спальня'], [0, 40, 30, 30, 'Передпокій'], [30, 40, 36, 30, 'Дитяча'], [66, 40, 18, 30, 'Ванна'], [84, 40, 16, 30, 'Гардероб']], extra: [4, -10, 30, 10, 'Балкон'] },
  k4:  { rooms: [[0, 0, 44, 40, 'Кухня-вітальня'], [44, 0, 26, 40, 'Спальня'], [70, 0, 26, 40, 'Спальня'], [96, 0, 26, 40, 'Кабінет'], [0, 40, 34, 28, 'Передпокій'], [34, 40, 34, 28, 'Дитяча'], [68, 40, 28, 28, 'Ванна'], [96, 40, 26, 28, 'Гардероб']], extra: [0, -20, 122, 20, 'Тераса'] },
};

const FLATS = [
  { rooms: 1, area: 42,  price: 1890000, plan: 'k1',  house: 1, floors: '2–7', view: 'ліс',  tags: ['Балкон'], left: 6 },
  { rooms: 1, area: 48,  price: 2150000, plan: 'k1b', house: 2, floors: '1–7', view: 'двір', tags: ['Гардероб'], left: 9 },
  { rooms: 2, area: 58,  price: 2610000, plan: 'k2',  house: 1, floors: '2–7', view: 'ліс',  tags: ['Балкон'], left: 4 },
  { rooms: 2, area: 64,  price: 2880000, plan: 'k2',  house: 3, floors: '1–7', view: 'ліс',  tags: ['Балкон', 'Гардероб'], left: 11 },
  { rooms: 2, area: 71,  price: 3190000, plan: 'k2b', house: 4, floors: '1–7', view: 'двір', tags: ['Дві ванні'], left: 8 },
  { rooms: 3, area: 86,  price: 3870000, plan: 'k3',  house: 2, floors: '2–7', view: 'ліс',  tags: ['Балкон', 'Гардероб'], left: 3 },
  { rooms: 3, area: 94,  price: 4230000, plan: 'k3',  house: 4, floors: '2–7', view: 'ліс',  tags: ['Гардероб', 'Дитяча'], left: 5 },
  { rooms: 4, area: 118, price: 5430000, plan: 'k4',  house: 1, floors: '7',   view: 'ліс',  tags: ['Тераса 32 м²', 'Кабінет'], left: 2 },
];

const roomsWord = n => n === 1 ? 'кімната' : n < 5 ? 'кімнати' : 'кімнат';

function planSVG(key, area, withLabels) {
  const { rooms, extra } = PLANS[key];
  const W = Math.max(...rooms.map(r => r[0] + r[2]));
  const H = Math.max(...rooms.map(r => r[1] + r[3]));
  const top = extra ? extra[1] : 0;
  const total = rooms.reduce((s, r) => s + r[2] * r[3], 0);
  let out = `<svg class="plan" viewBox="-4 ${top - 4} ${W + 8} ${H - top + 8}" aria-hidden="true">`;

  if (extra) {
    const [x, y, w, h, name] = extra;
    out += `<rect class="balc" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
    if (withLabels) out += `<text x="${x + w / 2}" y="${y + h / 2 + 1}" font-size="2.6" text-anchor="middle">${name}</text>`;
  }
  rooms.forEach(([x, y, w, h, name], i) => {
    out += `<rect class="room${i === 0 ? ' living' : ''}" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
    if (y === 0) out += `<line class="wnd" x1="${x + w * .25}" y1="0" x2="${x + w * .75}" y2="0"/>`;
    if (withLabels) {
      const fs = Math.min(2.8, w / 7);
      const m2 = (area * (w * h) / total).toFixed(1).replace('.', ',');
      out += `<text x="${x + w / 2}" y="${y + h / 2 - 1}" font-size="${fs}" text-anchor="middle">${name}</text>`;
      out += `<text class="area" x="${x + w / 2}" y="${y + h / 2 + fs + .6}" font-size="${fs * 1.15}" text-anchor="middle">${m2} м²</text>`;
    }
  });
  out += `<rect class="outer" x="0" y="0" width="${W}" height="${H}"/></svg>`;
  return out;
}

(() => {
  const grid = document.getElementById('flatsGrid');
  const tabs = document.querySelectorAll('#roomTabs button');
  const forestBtn = document.getElementById('forestOnly');
  const modal = document.getElementById('flatModal');
  const body = document.getElementById('flatModalBody');
  let rooms = 'all', forestOnly = false;

  // кількість планувань біля кожної вкладки
  tabs.forEach(b => {
    const n = b.dataset.rooms === 'all' ? FLATS.length : FLATS.filter(f => f.rooms === +b.dataset.rooms).length;
    b.insertAdjacentHTML('beforeend', `<sup>${n}</sup>`);
  });

  function render() {
    const list = FLATS.filter(f => (rooms === 'all' || f.rooms === +rooms) && (!forestOnly || f.view === 'ліс'));
    grid.innerHTML = list.length ? list.map((f, i) => `
      <button type="button" class="flat" data-i="${FLATS.indexOf(f)}" style="animation-delay:${i * 50}ms">
        ${f.left <= 5 ? `<span class="flat-left">Лишилось ${f.left}</span>` : ''}
        <span class="flat-plan">${planSVG(f.plan, f.area, false)}</span>
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

  function open(f) {
    const monthly = f.price * .7 / 14;
    body.innerHTML = `
      <button type="button" class="fm-close" aria-label="Закрити" data-close>
        <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M1 1l12 12M13 1 1 13"/></svg>
      </button>
      <div class="fm-plan">${planSVG(f.plan, f.area, true)}</div>
      <div>
        <p class="label label-gold">Будинок ${f.house} · вид на ${f.view}</p>
        <h3 class="fm-title" id="flatTitle">${f.rooms} ${roomsWord(f.rooms)}, ${f.area} м²</h3>
        <ul class="fm-specs">
          <li><span>Поверхи</span><span>${f.floors}</span></li>
          <li><span>Кухня-вітальня</span><span>${(f.area * PLANS[f.plan].rooms[0][2] * PLANS[f.plan].rooms[0][3] / PLANS[f.plan].rooms.reduce((s, r) => s + r[2] * r[3], 0)).toFixed(1).replace('.', ',')} м²</span></li>
          <li><span>Особливості</span><span>${f.tags.join(', ')}</span></li>
          <li><span>Здача</span><span>${f.house <= 2 ? 'грудень 2027' : 'вересень 2028'}</span></li>
        </ul>
        <p class="fm-price">${money(f.price)}</p>
        <p class="fm-monthly">У розстрочку: 30% внесок, далі <b>${money(monthly)}/міс</b></p>
        <div class="fm-actions">
          <a class="btn btn-gold" href="#visit" data-close data-flat="${f.rooms} ${roomsWord(f.rooms)}, ${f.area} м², будинок ${f.house}">Записатися на огляд</a>
          <a class="btn btn-ghost" href="#terms" data-calc="${f.price}">Розрахувати платіж</a>
        </div>
      </div>`;
    modal.showModal();
  }

  grid.addEventListener('click', e => {
    const card = e.target.closest('.flat');
    if (card) open(FLATS[+card.dataset.i]);
  });
  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.closest('[data-close]')) modal.close();
    const flatLink = e.target.closest('[data-flat]');
    if (flatLink) window.setVisitFlat?.(flatLink.dataset.flat);
    const calcLink = e.target.closest('[data-calc]');
    if (calcLink) { modal.close(); window.setCalcPrice?.(+calcLink.dataset.calc); }
  });
  // свайп вниз закриває вікно на телефоні
  let startY = null;
  modal.addEventListener('touchstart', e => { if (modal.scrollTop <= 0) startY = e.touches[0].clientY; }, { passive: true });
  modal.addEventListener('touchend', e => {
    if (startY !== null && e.changedTouches[0].clientY - startY > 90) modal.close();
    startY = null;
  });

  render();
})();

/* ---------------------------------------------------------
   6. Калькулятор: розстрочка або іпотека
   --------------------------------------------------------- */
(() => {
  const $ = id => document.getElementById(id);
  const inPrice = $('inPrice'), inDown = $('inDown'), inTerm = $('inTerm');
  const planBtns = document.querySelectorAll('#calc .seg button');
  let plan = 'installment';

  const fill = input => input.style.setProperty('--p', `${(input.value - input.min) / (input.max - input.min) * 100}%`);

  function update() {
    const price = +inPrice.value, down = price * inDown.value / 100, loan = price - down;
    let monthly, sub;
    if (plan === 'installment') {
      monthly = loan / inTerm.value;
      $('outTerm').textContent = `${inTerm.value} міс.`;
      sub = 'Переплата: <b>0 грн</b>';
    } else {
      const r = .07 / 12, n = inTerm.value * 12;
      monthly = loan * r / (1 - Math.pow(1 + r, -n));
      $('outTerm').textContent = `${inTerm.value} р.`;
      sub = `Ставка <b>7% річних</b> · кредит ${millions(loan)}`;
    }
    $('outPrice').textContent = millions(price);
    $('outDown').textContent = `${inDown.value}% · ${money(down)}`;
    $('outMonthly').textContent = money(monthly);
    $('outSub').innerHTML = sub;
    [inPrice, inDown, inTerm].forEach(fill);
  }

  planBtns.forEach(btn => btn.addEventListener('click', () => {
    plan = btn.dataset.plan;
    planBtns.forEach(b => b.setAttribute('aria-pressed', b === btn));
    if (plan === 'installment') {
      Object.assign(inDown, { min: 30 }); Object.assign(inTerm, { min: 6, max: 24, value: 14 });
    } else {
      Object.assign(inDown, { min: 20 }); Object.assign(inTerm, { min: 5, max: 20, value: 15 });
    }
    update();
  }));
  [inPrice, inDown, inTerm].forEach(i => i.addEventListener('input', update));

  // викликається з вікна квартири: підставити її ціну
  window.setCalcPrice = price => {
    inPrice.value = price;
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
   9. Форма запису на огляд
   Дані нікуди не надсилаються: це демо для портфоліо.
   Для справжнього сайту — підключити відправку в handleSubmit.
   --------------------------------------------------------- */
(() => {
  const form = document.getElementById('visitForm');
  const done = document.getElementById('visitDone');
  const name = document.getElementById('vfName');
  const phone = document.getElementById('vfPhone');
  const days = document.getElementById('vfDays');
  const times = document.getElementById('vfTimes');
  const flatBox = document.getElementById('vfFlat');
  const flatText = document.getElementById('vfFlatText');

  // найближчі 7 днів, починаючи з завтра
  const wd = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const mon = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];
  const monFull = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-pressed', i === 1);
    b.dataset.label = `${d.getDate()} ${monFull[d.getMonth()]}`;
    b.innerHTML = `<small>${i === 1 ? 'Завтра' : wd[d.getDay()]}</small>${d.getDate()} ${mon[d.getMonth()]}`;
    days.appendChild(b);
  }

  // вибір одного варіанта в ряду
  [days, times].forEach(row => row.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    row.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
  }));

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
  phone.addEventListener('focus', () => { if (!phone.value) phone.value = '+380 '; });
  phone.addEventListener('blur', () => { if (phone.value.trim() === '+380') phone.value = ''; });
  phone.addEventListener('input', () => {
    phone.value = formatPhone(phone.value).text;
    if (phone.parentElement.classList.contains('invalid')) validate();
  });
  name.addEventListener('input', () => { if (name.parentElement.classList.contains('invalid')) validate(); });

  function validate() {
    const okName = name.value.trim().length >= 2;
    const okPhone = formatPhone(phone.value).digits === 9;
    name.parentElement.classList.toggle('invalid', !okName);
    phone.parentElement.classList.toggle('invalid', !okPhone);
    return okName && okPhone ? true : (okName ? phone : name);
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const result = validate();
    if (result !== true) { result.focus(); return; }

    const btn = form.querySelector('.vf-submit');
    btn.disabled = true;
    btn.textContent = 'Надсилаємо…';

    setTimeout(() => {
      const day = days.querySelector('[aria-pressed="true"]').dataset.label;
      const time = times.querySelector('[aria-pressed="true"]').textContent;
      const pickup = document.getElementById('vfPickup').checked ? ' Зустрінемо вас біля метро.' : '';
      document.getElementById('vdTitle').textContent = 'Дякуємо, заявку прийнято!';
      document.getElementById('vdText').textContent =
        `Чекаємо вас ${day} о ${time}.${pickup} Менеджер зателефонує протягом 15 хвилин, щоб підтвердити.`;
      form.hidden = true;
      done.hidden = false;
      done.focus();
      btn.disabled = false;
      btn.textContent = 'Записатися на огляд';
    }, 700);
  });

  document.getElementById('vdAgain').addEventListener('click', () => {
    done.hidden = true;
    form.hidden = false;
    name.focus();
  });

  // квартира з вікна квартири
  window.setVisitFlat = text => {
    flatText.textContent = text;
    flatBox.hidden = false;
  };
  document.getElementById('vfFlatClear').addEventListener('click', () => { flatBox.hidden = true; });
})();

/* ---------------------------------------------------------
   Демо-посилання: документи показуємо на огляді
   --------------------------------------------------------- */
(() => {
  const toast = document.getElementById('toast');
  let timer;
  document.querySelectorAll('[data-demo]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    toast.textContent = 'Документи покажемо на огляді або надішлемо в месенджер';
    toast.classList.add('on');
    clearTimeout(timer);
    timer = setTimeout(() => toast.classList.remove('on'), 2600);
  }));
})();
