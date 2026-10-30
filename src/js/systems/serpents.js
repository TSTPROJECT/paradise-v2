// SERPENTS — black vipers drawn in SVG that move with scroll. Three hosts:
// across the lobby (wander), under the corridor heading (divider) and down
// the biography timeline (spine). The body is lit as a glossy, scaled tube and
// casts a shadow; the head is a separate layer so it can sway, taste the air
// and strike at a pointer that comes too close without repainting the body.
// They only update while on screen and never take pointer events.
import { $, $$, clamp, lerp, reduced } from '../core/dom.js';
import { on } from '../core/bus.js';
import { play } from './sound.js';

const NS = 'http://www.w3.org/2000/svg';
// [from, to, width]: body bands measured back from the head as fractions of body
// length. Wider bands sit on top, so the body swells mid-length and narrows to
// a neck behind the head and a fine point at the tail.
const LAYERS = [[1, 0, 2.2], [.96, .004, 4.4], [.88, .008, 6.8], [.77, .012, 9.2], [.63, .018, 11.4], [.48, .028, 13], [.33, .055, 14.6]];
const STRIKE_MS = 460, STRIKE_REACH = 22, NOTICE = 230;

const KINDS = {
  wander: {
    scale: (w) => (w < 700 ? 1.15 : 1.55),
    body: (w) => Math.min(760, w * .62),
    build(w, h) {
      const pts = [], y0 = h - 64, amp = Math.min(26, h * .035), lambda = 270;
      for (let x = -160; x <= w + 180; x += 8) {
        const k = (x + 160) / (w + 340);
        pts.push([x, y0 - k * 26 + amp * Math.sin((x / lambda) * Math.PI * 2) + 9 * Math.sin(x / 97)]);
      }
      return pts;
    },
    progress: (r, vh, s) => lerp(s.L * .3, s.total + s.L, clamp((64 - r.top) / (r.height * .8))),
    rest: (s) => s.total * .62,
  },
  divider: {
    scale: () => 1.05,
    body: (w) => Math.min(360, w * .45),
    build(w, h) {
      const pts = [], y0 = h - 4;
      for (let x = w + 120; x >= -140; x -= 8) pts.push([x, y0 - 10 * Math.abs(Math.sin(x / 70))]);
      return pts;
    },
    progress: (r, vh, s) => lerp(0, s.total + s.L, clamp((vh * .92 - r.bottom) / (vh * .55))),
    rest: (s) => s.total * .55,
  },
  spine: {
    scale: () => .95,
    body: () => 460,
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
let raf = 0;
let px = -9999, py = -9999;

// ---------- markup ----------
function bodyMarkup(id) {
  const bands = (cls) => LAYERS.map(() => `<path class="${cls}"/>`).join('');
  return `
    <defs>
      <pattern id="${id}-sc" width="9" height="7" patternUnits="userSpaceOnUse">
        <path d="M0 3.5 L4.5 0 L9 3.5 L4.5 7 Z M-4.5 0 L0 -3.5 L4.5 0 L0 3.5 Z M4.5 0 L9 -3.5 L13.5 0 L9 3.5 Z M-4.5 7 L0 3.5 L4.5 7 L0 10.5 Z M4.5 7 L9 3.5 L13.5 7 L9 10.5 Z"
              fill="#070a08" stroke="#1b261f" stroke-width=".5"/>
        <path d="M2.4 3.5 H6.6 M-2.1 0 H2.1 M6.9 0 H11.1 M-2.1 7 H2.1 M6.9 7 H11.1" stroke="#2e4136" stroke-width=".35" opacity=".6"/>
      </pattern>
      <mask id="${id}-m" maskUnits="userSpaceOnUse"><g fill="none" stroke="#fff" stroke-linecap="round">${bands('m')}</g></mask>
      <filter id="${id}-f" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2.6" result="round"/>
        <feSpecularLighting in="round" surfaceScale="6" specularConstant="1.1" specularExponent="34" lighting-color="#9fb6a8" result="gloss">
          <feDistantLight azimuth="225" elevation="35"/>
        </feSpecularLighting>
        <feComposite in="gloss" in2="SourceAlpha" operator="in" result="sheen"/>
        <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="soft"/>
        <feOffset in="soft" dy="5" result="drop"/>
        <feComponentTransfer in="drop" result="shadow"><feFuncA type="linear" slope=".6"/></feComponentTransfer>
        <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/><feMergeNode in="sheen"/></feMerge>
      </filter>
    </defs>
    <path class="t" fill="none" stroke="none"/>
    <g filter="url(#${id}-f)">
      <g class="rim" fill="none" stroke="#141e18" stroke-linecap="round">${bands('r')}</g>
      <g class="b" fill="none" stroke="#040605" stroke-linecap="round">${bands('l')}</g>
      <rect class="scales" fill="url(#${id}-sc)" mask="url(#${id}-m)" opacity=".9"/>
      <path class="marks" fill="none" stroke="#0e1511" stroke-linecap="round" mask="url(#${id}-m)"/>
    </g>`;
}

function headMarkup(id) {
  const side = (k) => `
      <path d="M6 ${-10.6 * k} L16.8 ${-6.6 * k} L14.6 ${-5.2 * k} L7.2 ${-8 * k} Z" fill="#141d18" stroke="#3b5043" stroke-width=".5"/>
      <circle cx="12.2" cy="${-8.1 * k}" r="5.6" fill="url(#${id}-glow)"/>
      <ellipse cx="12.2" cy="${-8.1 * k}" rx="2.8" ry="2.1" fill="url(#${id}-eye)" stroke="#050505" stroke-width=".5"/>
      <ellipse cx="12.4" cy="${-8.1 * k}" rx=".55" ry="1.85" fill="#030303"/>
      <circle cx="13.1" cy="${-8.7 * k}" r=".45" fill="#fff6e0"/>
      <circle cx="21.4" cy="${-1.6 * k}" r=".55" fill="#000"/>`;
  return `
    <defs>
      <radialGradient id="${id}-eye"><stop offset="0" stop-color="#ffd884"/><stop offset=".5" stop-color="#c58d2c"/><stop offset="1" stop-color="#5b1a12"/></radialGradient>
      <radialGradient id="${id}-glow"><stop offset="0" stop-color="#c0263a" stop-opacity=".55"/><stop offset="1" stop-color="#c0263a" stop-opacity="0"/></radialGradient>
      <linearGradient id="${id}-hd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22302a"/><stop offset=".45" stop-color="#0a0f0c"/><stop offset="1" stop-color="#020303"/></linearGradient>
      <filter id="${id}-hs" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="4" stdDeviation="3.5" flood-color="#000" flood-opacity=".65"/></filter>
    </defs>
    <g class="h">
      <g class="serpent__strike">
        <g class="serpent__gape" opacity="0">
          <path d="M14 -8.5 C26 -12 38 -7 42 0 C38 7 26 12 14 8.5 Z" fill="#2b070d"/>
          <path d="M17 -6 C27 -8 34 -4.5 36.5 0 C34 4.5 27 8 17 6 Z" fill="#6f1420"/>
          <path d="M28 -7.4 Q32.5 -4.6 33.6 -1.2 M28 7.4 Q32.5 4.6 33.6 1.2" fill="none" stroke="#efe6d2" stroke-width="1.5" stroke-linecap="round"/>
        </g>
        <path class="serpent__tongue" d="M22 0 H37 M37 0 L42.5 -3.8 M37 0 L42.5 3.8" fill="none" stroke="#b3202f" stroke-width="1.4" stroke-linecap="round"/>
        <g filter="url(#${id}-hs)">
          <path d="M-12 -6.8 C-7 -9.2 -4.5 -11.8 2 -11.4 C10 -10.8 18 -7.4 23.2 -3.6 C25.8 -1.7 25.8 1.7 23.2 3.6 C18 7.4 10 10.8 2 11.4 C-4.5 11.8 -7 9.2 -12 6.8 Z"
                fill="url(#${id}-hd)" stroke="#2c3d33" stroke-width=".9"/>
        </g>
        <path d="M-2 0 H9 M9 -3.2 L14.5 0 L9 3.2 M2 -6.6 Q11 -5.4 19.5 -2.6 M2 6.6 Q11 5.4 19.5 2.6" fill="none" stroke="#2a3a31" stroke-width=".7"/>
        <path d="M-6 -4 C0 -6.4 8 -6.6 15 -4.2" fill="none" stroke="#3d5246" stroke-width="1.1" stroke-linecap="round" opacity=".55"/>
        ${side(1)}${side(-1)}
      </g>
    </g>`;
}

function create(host, i) {
  const kind = KINDS[host.dataset.serpentHost];
  if (!kind) return;
  const id = 'serpent' + i;
  const make = (cls, html) => {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', cls);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.innerHTML = html;
    return svg;
  };
  const body = make('serpent', bodyMarkup(id));
  const head = make('serpent serpent--head', headMarkup(id));
  host.insertBefore(head, host.firstChild);
  host.insertBefore(body, head);
  list.push({
    host, kind, svg: body, headSvg: head,
    track: $('.t', body),
    rim: $$('.rim path', body), body: $$('.l', body), mask: $$('.m', body),
    marks: $('.marks', body), scales: $('.scales', body),
    filter: $(`#${id}-f`, body), maskEl: $(`#${id}-m`, body), pattern: $(`#${id}-sc`, body),
    head: $('.h', head), strike: $('.serpent__strike', head), gape: $('.serpent__gape', head),
    total: 0, L: 0, S: 1, cur: null, built: false, active: false, moved: true,
    phase: Math.random() * 6.28, nextFlick: 0, strikeAt: -1e9, cooldown: 0, box: null,
  });
}

// ---------- geometry ----------
function target(s) {
  if (reduced()) return s.kind.rest(s);
  return s.kind.progress(s.host.getBoundingClientRect(), innerHeight, s);
}

function build(s) {
  const w = s.host.clientWidth, h = s.host.clientHeight;
  if (!w || !h) { s.built = false; return; }
  const S = s.S = s.kind.scale(w);
  const pts = s.kind.build(w, h, s.host);
  const d = 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
  s.track.setAttribute('d', d);
  [...s.rim, ...s.body, ...s.mask, s.marks].forEach((p) => p.setAttribute('d', d));
  LAYERS.forEach(([, , lw], i) => {
    s.body[i].setAttribute('stroke-width', (lw * S).toFixed(2));
    s.mask[i].setAttribute('stroke-width', (lw * S).toFixed(2));
    s.rim[i].setAttribute('stroke-width', ((lw + 2.2) * S).toFixed(2));
  });
  s.marks.setAttribute('stroke-width', (7.5 * S).toFixed(2));
  s.pattern.setAttribute('patternTransform', `rotate(28) scale(${(S * .95).toFixed(2)})`);
  // Filters, masks and texture only cover the track itself, not the whole host.
  const bb = s.track.getBBox(), pad = 30 * S;
  const region = { x: bb.x - pad, y: bb.y - pad, width: bb.width + pad * 2, height: bb.height + pad * 2 };
  for (const el of [s.filter, s.maskEl, s.scales]) for (const k in region) el.setAttribute(k, region[k].toFixed(0));
  const vb = `0 0 ${w} ${h}`;
  s.svg.setAttribute('viewBox', vb);
  s.headSvg.setAttribute('viewBox', vb);
  s.total = s.track.getTotalLength();
  s.L = s.kind.body(w);
  s.built = true;
  s.moved = true;
  if (s.cur === null) s.cur = target(s);
}

function dash(p, head, a, b, s) {
  const start = head - a * s.L, len = (a - b) * s.L;
  p.style.strokeDasharray = `${len.toFixed(1)} ${(s.total * 3).toFixed(0)}`;
  p.style.strokeDashoffset = (-start).toFixed(1);
}

function renderBody(s, head) {
  LAYERS.forEach(([a, b], i) => { dash(s.rim[i], head, a, b, s); dash(s.body[i], head, a, b, s); dash(s.mask[i], head, a, b, s); });
  // Dorsal blotches ride with the body instead of sliding along it.
  const on = 3 * s.S, off = 12 * s.S;
  s.marks.style.strokeDasharray = `${on.toFixed(1)} ${off.toFixed(1)}`;
  s.marks.style.strokeDashoffset = (-(head % (on + off)) + on).toFixed(1);
}

const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

function flick(s) {
  s.headSvg.classList.remove('is-flick');
  void s.headSvg.getBoundingClientRect();
  s.headSvg.classList.add('is-flick');
}

function strikeAmount(s, now) {
  const e = (now - s.strikeAt) / STRIKE_MS;
  if (e < 0 || e >= 1) return 0;
  return e < .22 ? easeOut(e / .22) : e < .42 ? 1 : 1 - easeInOut((e - .42) / .58);
}

function renderHead(s, now, head, k) {
  if (head < 2 || head > s.total) { s.head.style.display = 'none'; return; }
  s.head.style.display = '';
  const p = s.track.getPointAtLength(head), q = s.track.getPointAtLength(Math.max(0, head - 6));
  let ang = Math.atan2(p.y - q.y, p.x - q.x) * 180 / Math.PI;
  let x = p.x, y = p.y;
  const calm = reduced();

  if (!calm) {
    // Idle: the head never quite rests; it weaves a little and tastes the air.
    const sway = Math.sin(now / 820 + s.phase);
    ang += sway * 5;
    const rad = (ang + 90) * Math.PI / 180;
    x += Math.cos(rad) * sway * 1.4 * s.S; y += Math.sin(rad) * sway * 1.4 * s.S;
    if (now > s.nextFlick) { flick(s); s.nextFlick = now + 1800 + Math.random() * 3600; }

    // A pointer nearby: it turns to watch, flicks faster, and strikes if it comes too close.
    if (px > -9000 && s.box) {
      const dx = px - (s.box.left + x), dy = py - (s.box.top + y), dist = Math.hypot(dx, dy);
      if (dist < NOTICE) {
        const want = Math.atan2(dy, dx) * 180 / Math.PI;
        const delta = ((want - ang + 540) % 360) - 180;
        ang += clamp(delta, -55, 55) * (1 - dist / NOTICE);
        if (now > s.nextFlick - 1200) { flick(s); s.nextFlick = now + 700; }
        if (dist < 78 * s.S && now > s.cooldown) {
          s.strikeAt = now; s.cooldown = now + 3600;
          s.headSvg.classList.remove('is-flick');
          play('hiss');
        }
      }
    }
  }

  // The strike: the head rises toward the viewer with the jaws open.
  s.strike.setAttribute('transform', k ? `scale(${(1 + .3 * k).toFixed(3)})` : '');
  s.gape.setAttribute('opacity', k.toFixed(2));
  s.head.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${s.S})`);
}

// ---------- loop ----------
function frame(now) {
  raf = 0;
  let live = false;
  // Read every layout box first, then write, so the frame never thrashes layout.
  for (const s of list) {
    if (!s.active) continue;
    if (!s.built) build(s);
    if (s.built) s.box = s.svg.getBoundingClientRect();
  }
  for (const s of list) {
    if (!s.active || !s.built) continue;
    const t = target(s);
    if (s.cur === null) s.cur = t;
    const gap = t - s.cur;
    if (reduced() || Math.abs(gap) < .4) { if (s.cur !== t) s.moved = true; s.cur = t; }
    else { s.cur += gap * .14; s.moved = true; }
    // A strike throws the neck forward along the body: a fast lunge, a beat, a slow recoil.
    const k = reduced() ? 0 : strikeAmount(s, now);
    const head = s.cur + STRIKE_REACH * s.S * k;
    if (s.moved || k || s.lunging) { renderBody(s, head); s.moved = false; }
    s.lunging = k > 0;
    renderHead(s, now, head, k);
    live = true;
  }
  // Calm motion settles once and stops; otherwise the heads stay alive while on screen.
  if (live && !reduced()) request();
}
function request() { if (!raf) raf = requestAnimationFrame(frame); }

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
  document.documentElement.addEventListener('pointerleave', () => { px = py = -9999; });
  on('room-open', refresh);
  on('room-close', refresh);
}
