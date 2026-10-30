// SERPENTS — black snakes drawn in SVG that move with scroll. Three hosts:
// across the lobby (wander), under the corridor heading (divider) and down
// the biography timeline (spine). They only update while on screen, never
// take pointer events, and turn their heads toward a nearby mouse pointer.
import { $, $$, clamp, lerp, reduced } from '../core/dom.js';
import { on } from '../core/bus.js';

const NS = 'http://www.w3.org/2000/svg';
// [from, to, width]: body segments measured back from the head as fractions of body length
const LAYERS = [[1, 0, 3], [.9, .02, 6.5], [.74, .03, 10], [.56, .05, 13], [.36, .06, 14.5]];

const KINDS = {
  wander: {
    body: (w) => Math.min(580, w * .55),
    build(w, h) {
      const pts = [], y0 = h - 54, amp = Math.min(22, h * .03), lambda = 250;
      for (let x = -140; x <= w + 160; x += 8) {
        const k = (x + 140) / (w + 300);
        pts.push([x, y0 - k * 26 + amp * Math.sin((x / lambda) * Math.PI * 2) + 8 * Math.sin(x / 97)]);
      }
      return pts;
    },
    progress: (r, vh, s) => lerp(s.L * .3, s.total + s.L, clamp((64 - r.top) / (r.height * .8))),
    rest: (s) => s.total * .62,
  },
  divider: {
    body: (w) => Math.min(340, w * .45),
    build(w, h) {
      const pts = [], y0 = h - 2;
      for (let x = w + 120; x >= -140; x -= 8) pts.push([x, y0 - 9 * Math.abs(Math.sin(x / 70))]);
      return pts;
    },
    progress: (r, vh, s) => lerp(0, s.total + s.L, clamp((vh * .92 - r.bottom) / (vh * .55))),
    rest: (s) => s.total * .55,
  },
  spine: {
    body: () => 440,
    build(w, h, host) {
      const sx = parseFloat(getComputedStyle(host).getPropertyValue('--spine')) || 34;
      const pts = [];
      for (let y = -60; y <= h + 40; y += 8) pts.push([sx + 11 * Math.sin(y / 46) + 4 * Math.sin(y / 17), y]);
      return pts;
    },
    progress: (r, vh, s) => lerp(s.L * .55, s.total, clamp((vh * .58 - r.top) / r.height)),
    rest: (s) => s.L * 1.2,
  },
};

const list = [];
let ticking = false;
let px = -9999, py = -9999;

function create(host, i) {
  const kind = KINDS[host.dataset.serpentHost];
  if (!kind) return;
  const id = 'serpent' + i;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'serpent');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const layerPaths = (cls) => LAYERS.map(([, , w]) => `<path class="${cls}" stroke-width="${w}"/>`).join('');
  const rimPaths = LAYERS.map(([, , w]) => `<path stroke-width="${w + 2.4}"/>`).join('');
  svg.innerHTML = `
    <defs>
      <pattern id="${id}-sc" width="7" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
        <path d="M0 3 Q1.75 .4 3.5 3 Q5.25 .4 7 3" fill="none" stroke="#34463b" stroke-width=".6"/>
      </pattern>
      <mask id="${id}-m" maskUnits="userSpaceOnUse" x="-200" y="-200" width="6000" height="20000"><g fill="none" stroke="#fff" stroke-linecap="round">${layerPaths('m')}</g></mask>
    </defs>
    <path class="t" fill="none" stroke="none"/>
    <g class="rim" fill="none" stroke="#24332a" stroke-linecap="round" opacity=".9">${rimPaths}</g>
    <g class="b" fill="none" stroke="#050706" stroke-linecap="round">${layerPaths('l')}</g>
    <rect x="-200" y="-200" width="6000" height="20000" fill="url(#${id}-sc)" mask="url(#${id}-m)" opacity=".7"/>
    <path class="ridge" fill="none" stroke="#1b261f" stroke-width="2" stroke-linecap="round"/>
    <g class="h">
      <path class="serpent__tongue" d="M21 0 H31 L35 -3 M31 0 L35 3" fill="none" stroke="#8A2433" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M-7 -7.6 C3 -10.2 15 -8.4 21.5 -3.2 C24.5 -1 24.5 1 21.5 3.2 C15 8.4 3 10.2 -7 7.6 Z" fill="#050706" stroke="#24332a" stroke-width="1.2"/>
      <path d="M1 -5.4 C8 -6.6 14 -5.6 18.5 -2.4 M1 5.4 C8 6.6 14 5.6 18.5 2.4" fill="none" stroke="#1b261f" stroke-width=".9"/>
      <circle cx="12.5" cy="-3.7" r="1.75" fill="#B79A62"/><circle cx="12.9" cy="-4" r=".55" fill="#efe6d2"/>
    </g>`;
  host.insertBefore(svg, host.firstChild);
  list.push({
    host, kind, svg,
    track: $('.t', svg),
    rim: $$('.rim path', svg), body: $$('.l', svg), mask: $$('.m', svg),
    ridge: $('.ridge', svg), head: $('.h', svg),
    total: 0, L: 0, cur: null, built: false, active: false, lastFlick: 0,
  });
}

function target(s) {
  if (reduced()) return s.kind.rest(s);
  return s.kind.progress(s.host.getBoundingClientRect(), innerHeight, s);
}

function build(s) {
  const w = s.host.clientWidth, h = s.host.clientHeight;
  if (!w || !h) { s.built = false; return; }
  const pts = s.kind.build(w, h, s.host);
  const d = 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
  s.track.setAttribute('d', d);
  [...s.rim, ...s.body, ...s.mask, s.ridge].forEach((p) => p.setAttribute('d', d));
  s.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  s.total = s.track.getTotalLength();
  s.L = s.kind.body(w);
  s.built = true;
  if (s.cur === null) s.cur = target(s);
  render(s);
}

function dash(p, head, a, b, s) {
  const start = head - a * s.L, len = (a - b) * s.L;
  p.style.strokeDasharray = `${len.toFixed(1)} ${(s.total * 3).toFixed(0)}`;
  p.style.strokeDashoffset = (-start).toFixed(1);
}

function render(s) {
  const head = s.cur;
  LAYERS.forEach(([a, b], i) => { dash(s.rim[i], head, a, b, s); dash(s.body[i], head, a, b, s); dash(s.mask[i], head, a, b, s); });
  dash(s.ridge, head, .62, .07, s);
  if (head < 2 || head > s.total) { s.head.style.display = 'none'; return; }
  s.head.style.display = '';
  const p = s.track.getPointAtLength(head), q = s.track.getPointAtLength(Math.max(0, head - 6));
  let ang = Math.atan2(p.y - q.y, p.x - q.x) * 180 / Math.PI;
  // Curiosity: the head turns toward a nearby pointer and tastes the air.
  if (!reduced() && px > -9000) {
    const box = s.svg.getBoundingClientRect();
    const dx = px - (box.left + p.x), dy = py - (box.top + p.y), dist = Math.hypot(dx, dy);
    if (dist < 170) {
      const want = Math.atan2(dy, dx) * 180 / Math.PI;
      const delta = ((want - ang + 540) % 360) - 180;
      ang += clamp(delta, -30, 30) * (1 - dist / 170);
      const now = performance.now();
      if (now - s.lastFlick > 1400) {
        s.lastFlick = now;
        s.svg.classList.remove('is-flick'); void s.svg.getBoundingClientRect(); s.svg.classList.add('is-flick');
      }
    }
  }
  s.head.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${ang.toFixed(1)})`);
}

function tick() {
  ticking = false;
  let again = false;
  for (const s of list) {
    if (!s.active) continue;
    if (!s.built) build(s);
    if (!s.built) continue;
    const t = target(s);
    if (s.cur === null) s.cur = t;
    s.cur += (t - s.cur) * (reduced() ? 1 : .14);
    if (Math.abs(t - s.cur) > .4) again = true; else s.cur = t;
    render(s);
  }
  if (again) request();
}
function request() { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }

export function refresh() { list.forEach((s) => { s.built = false; }); request(); }

export function initSerpents() {
  $$('[data-serpent-host]').forEach(create);
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { const s = list.find((x) => x.host === en.target); if (s) s.active = en.isIntersecting; });
    request();
  }, { rootMargin: '120px 0px' });
  list.forEach((s) => io.observe(s.host));
  const ro = new ResizeObserver((entries) => {
    entries.forEach((en) => { const s = list.find((x) => x.host === en.target); if (s) s.built = false; });
    request();
  });
  list.forEach((s) => ro.observe(s.host));
  // One passive capture listener covers the page and every room's own scroller.
  document.addEventListener('scroll', () => { if (list.some((s) => s.active)) request(); }, { passive: true, capture: true });
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    px = e.clientX; py = e.clientY;
    if (list.some((s) => s.active)) request();
  }, { passive: true });
  on('room-open', refresh);
  on('room-close', refresh);
}
