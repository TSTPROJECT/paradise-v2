// 05 — Paradise Club: the elevator steps floor by floor, then draws that
// floor's corridor and an atmospheric maze. The unlabeled button reaches the
// floor that is not in the directory, where the brass key waits (secret 3).
import { $, $$, lerp, reduced } from '../core/dom.js';
import { store } from '../core/store.js';
import { emit } from '../core/bus.js';
import { FLOORS, ORDER } from '../data/floors.js';
import { play } from '../systems/sound.js';
import { discover } from '../systems/secrets.js';
import { keyFound } from '../systems/router.js';

const GILT = '#B79A62', BLOOD = '#8A2433', BONE = '#E9E1D0';

function rng(seed) {
  let a = seed * 2654435761 >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function drawMap(svg, f) {
  const R = rng(f.seed), cols = 12, rows = 8, cs = 28, ox = 12, oy = 8;
  const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
  const walls = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) walls.push({ x, y, r: true, b: true });
  const W = (x, y) => walls[y * cols + x];
  const stack = [[0, rows - 1]]; seen[rows - 1][0] = true;
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy, dx, dy])
      .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < cols && ny < rows && !seen[ny][nx]);
    if (!n.length) { stack.pop(); continue; }
    const [nx, ny, dx, dy] = n[Math.floor(R() * n.length)];
    if (dx === 1) W(x, y).r = false; if (dx === -1) W(nx, ny).r = false;
    if (dy === 1) W(x, y).b = false; if (dy === -1) W(nx, ny).b = false;
    seen[ny][nx] = true; stack.push([nx, ny]);
  }
  let d = `M${ox} ${oy} H${ox + cols * cs} M${ox} ${oy} V${oy + rows * cs}`;
  walls.forEach((c) => {
    const X = ox + c.x * cs, Y = oy + c.y * cs;
    if (c.r) d += ` M${X + cs} ${Y} V${Y + cs}`;
    if (c.b) d += ` M${X} ${Y + cs} H${X + cs}`;
  });
  let rooms = '';
  for (let i = 0; i < 5; i++) {
    const x = 1 + Math.floor(R() * (cols - 2)), y = Math.floor(R() * (rows - 1));
    const num = f.hidden ? '???' : `${f.prefix}-${String(Math.floor(R() * 90) + 10)}`;
    rooms += `<rect x="${ox + x * cs + 4}" y="${oy + y * cs + 4}" width="${cs - 8}" height="${cs - 8}" fill="${f.hidden ? '#3a0d14' : '#1B2E23'}" opacity=".85"/>`
      + `<text x="${ox + x * cs + cs / 2}" y="${oy + y * cs + cs / 2 + 2}" text-anchor="middle" font-size="5.5" fill="${BONE}" opacity=".75" font-family="Jost, sans-serif" letter-spacing=".5">${num}</text>`;
  }
  const yy = oy + (rows - .5) * cs;
  svg.innerHTML = `${rooms}<path class="floor__walls" d="${d}" fill="none" stroke="${f.hidden ? BLOOD : GILT}" stroke-width="1.1" opacity=".55" stroke-linecap="square"/>`
    + `<circle cx="${ox + cs / 2}" cy="${yy}" r="4" fill="${BLOOD}"/><circle class="floor__ping" cx="${ox + cs / 2}" cy="${yy}" r="8" fill="none" stroke="${BLOOD}"/>`
    + `<text x="${ox + cs + 2}" y="${yy + 3}" font-size="7" fill="${BONE}" font-family="Jost, sans-serif" letter-spacing="1.5">YOU ARE HERE</text>`;
}

function drawCorridor(svg, f) {
  const R = rng(f.seed + 101), vx = 300, vy = 122, W = 600, H = 260;
  const wallTop = (x, left) => left ? lerp(0, vy - 26, x / (vx - 40)) : lerp(0, vy - 26, (W - x) / (vx - 40));
  const wallBot = (x, left) => left ? lerp(H, vy + 30, x / (vx - 40)) : lerp(H, vy + 30, (W - x) / (vx - 40));
  const depth = (i) => 1 - 1 / (1 + i * .55);
  let doors = '';
  for (let side = 0; side < 2; side++) {
    const left = side === 0;
    for (let i = 0; i < 6; i++) {
      const t1 = depth(i + .25), t2 = depth(i + .75);
      const x1 = left ? t1 * (vx - 40) : W - t1 * (vx - 40);
      const x2 = left ? t2 * (vx - 40) : W - t2 * (vx - 40);
      const b1 = wallBot(x1, left), b2 = wallBot(x2, left);
      const top1 = b1 - (b1 - wallTop(x1, left)) * .72, top2 = b2 - (b2 - wallTop(x2, left)) * .72;
      const lit = R() > .72;
      doors += `<path d="M${x1} ${b1} L${x1} ${top1} L${x2} ${top2} L${x2} ${b2} Z" fill="${lit ? '#1f3027' : '#0e1712'}" stroke="${GILT}" stroke-opacity=".32" stroke-width=".8"/>`;
      const fs = Math.max(3, 9 * (1 - t1));
      const num = f.hidden ? '░░' : `${f.prefix}${String(i * 2 + side + 1).padStart(2, '0')}`;
      doors += `<text x="${(x1 + x2) / 2}" y="${top1 + (b1 - top1) * .18}" text-anchor="middle" font-size="${fs.toFixed(1)}" fill="${GILT}" opacity=".75" font-family="Jost, sans-serif">${num}</text>`;
      if (lit) doors += `<path d="M${x1} ${b1} L${x2} ${b2}" stroke="${f.hidden ? '#d0566a' : '#e8cf9c'}" stroke-opacity=".5" stroke-width="1.2"/>`;
    }
  }
  let lights = '';
  for (let i = 0; i < 6; i++) {
    const t = depth(i + .5), y = lerp(0, vy - 26, t) + 4;
    lights += `<ellipse cx="${vx}" cy="${y}" rx="${(24 * (1 - t)).toFixed(1)}" ry="${(3 * (1 - t) + .6).toFixed(1)}" fill="${f.hidden ? BLOOD : '#e9dcc0'}" opacity="${(.5 * (1 - t) + .1).toFixed(2)}"/>`;
  }
  const end = f.hidden ? '#2a0a10' : '#0f1c16';
  svg.innerHTML = `
    <defs><linearGradient id="cf" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${f.hidden ? '#2a0b11' : '#17241d'}"/><stop offset="1" stop-color="#050706"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="#050706"/>
    <path d="M0 ${H} L${vx - 40} ${vy + 30} L${vx + 40} ${vy + 30} L${W} ${H} Z" fill="url(#cf)"/>
    <path d="M0 0 L${vx - 40} ${vy - 26} L${vx + 40} ${vy - 26} L${W} 0 Z" fill="#070a08"/>
    <path d="M0 0 L${vx - 40} ${vy - 26} L${vx - 40} ${vy + 30} L0 ${H} Z" fill="#0b120e"/>
    <path d="M${W} 0 L${vx + 40} ${vy - 26} L${vx + 40} ${vy + 30} L${W} ${H} Z" fill="#0b120e"/>
    <rect x="${vx - 40}" y="${vy - 26}" width="80" height="56" fill="${end}" stroke="${GILT}" stroke-opacity=".3"/>
    <rect x="${vx - 9}" y="${vy - 8}" width="18" height="38" fill="#020302" stroke="${GILT}" stroke-opacity=".25"/>
    ${lights}${doors}
    <g stroke="${GILT}" stroke-opacity=".18" fill="none"><path d="M0 ${H} L${vx - 40} ${vy + 30} M${W} ${H} L${vx + 40} ${vy + 30} M0 0 L${vx - 40} ${vy - 26} M${W} 0 L${vx + 40} ${vy - 26}"/></g>
    <text x="${vx}" y="${vy - 32}" text-anchor="middle" font-size="7" letter-spacing="2" fill="${GILT}" opacity=".6" font-family="Jost, sans-serif">${f.hidden ? 'NO EXIT' : 'EXIT ?'}</text>`;
}

export function initClub() {
  const panel = $('.elevator__panel');
  if (!panel) return;
  const disp = $('[data-elev-floor]'), arrow = $('[data-elev-arrow]'), needle = $('[data-elev-needle]');
  const box = $('[data-floor-box]');
  const codeEl = $('[data-floor-code]'), titleEl = $('[data-floor-title]'), textEl = $('[data-floor-text]');
  const roomsEl = $('[data-floor-rooms]'), clearEl = $('[data-floor-clear]');
  const mapSvg = $('[data-floor-map]'), corridorSvg = $('[data-corridor-art]');
  const keyBox = $('[data-keyfind]');
  let cur = 'G', timer = 0;

  const setNeedle = (key) => {
    if (!needle) return;
    const i = ORDER.indexOf(key);
    needle.style.setProperty('--a', (-75 + i * 25) + 'deg');
  };

  function show(key) {
    const f = FLOORS[key];
    codeEl.textContent = f.label;
    titleEl.textContent = f.title;
    textEl.textContent = f.text;
    roomsEl.textContent = f.rooms;
    clearEl.textContent = f.clear;
    drawMap(mapSvg, f); drawCorridor(corridorSvg, f);
    box.classList.toggle('is-hidden-floor', !!f.hidden);
    if (f.hidden) {
      keyBox.hidden = false;
      if (!keyFound()) {
        store.set('key', 'found');
        emit('key-found');
        discover('key');
      }
    } else keyBox.hidden = true;
  }

  function go(key) {
    if (key === cur) return;
    $$('.elevator__btn', panel).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.floor === key)));
    clearInterval(timer);
    const from = ORDER.indexOf(cur), to = ORDER.indexOf(key), dir = to > from ? 1 : -1;
    arrow.classList.toggle('is-down', dir > 0);
    cur = key;
    box.classList.add('is-switching');
    setNeedle(key);
    play('ui');
    if (reduced()) { disp.textContent = FLOORS[key].code; show(key); box.classList.remove('is-switching'); play('ding'); return; }
    let i = from;
    timer = setInterval(() => {
      i += dir;
      disp.textContent = FLOORS[ORDER[i]].code;
      if (i === to) {
        clearInterval(timer);
        show(key);
        box.classList.remove('is-switching');
        play('ding');
      }
    }, 150);
  }

  panel.addEventListener('click', (e) => {
    const b = e.target.closest('.elevator__btn');
    if (b) go(b.dataset.floor);
  });
  show('G');
  setNeedle('G');
}
