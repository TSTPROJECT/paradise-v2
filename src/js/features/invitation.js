// THE INVITATION — the apple on the corner of the card is the only way in.
// Once taken it cannot be put back: the choice is remembered for the session.
import { $, clamp, reduced } from '../core/dom.js';
import { store } from '../core/store.js';
import { on, announce } from '../core/bus.js';
import { ui, syncLayers } from '../core/layers.js';
import { play } from '../systems/sound.js';
import { openRoom, isRoom } from '../systems/router.js';

const section = $('#invitation');
const frame = $('[data-invite-frame]');
const apple = $('[data-apple]');
const hint = $('[data-apple-hint]');
const verdict = $('[data-apple-verdict]');
const enterBtn = $('[data-enter]');
const skipBtn = $('[data-skip-fall]');
const main = $('#lobby-main');
let fallen = store.get('apple') === 'fallen';
let anims = [];

function showBereft() {
  apple.classList.add('is-gone');
  apple.tabIndex = -1;
  frame.classList.add('is-bereft');
  hint.hidden = true;
  verdict.hidden = false;
  enterBtn.hidden = false;
  skipBtn.hidden = true;
}

export function showInvitation() {
  ui.invitationOpen = true;
  section.classList.remove('is-gone', 'is-leaving');
  syncLayers();
  scrollTo(0, 0);
  if (fallen) { showBereft(); enterBtn.focus({ preventScroll: true }); }
  else apple.focus({ preventScroll: true });
}

function enter() {
  store.set('entered', '1');
  play('latch');
  setTimeout(() => play('creak'), 60);
  ui.invitationOpen = false;
  const finish = () => section.classList.add('is-gone');
  if (reduced()) finish();
  else { section.classList.add('is-leaving'); setTimeout(finish, 1300); }
  syncLayers();
  main.focus({ preventScroll: true });
  const id = location.hash.slice(1);
  if (isRoom(id)) { history.replaceState({ room: id, depth: 0 }, '', '#' + id); openRoom(id); }
}

function afterFall(played) {
  if (played) play('thud');
  showBereft();
  enterBtn.focus({ preventScroll: true });
  announce('The apple has fallen. Enter Paradise.');
}

/** Gravity: keyframes sampled from y = ½gt², with spin that speeds up as it drops. */
function fallFrames(fallY, drift, spin) {
  const frames = [];
  const N = 16;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const y = 3 + fallY * t * t;
    const x = 2 + drift * (t * .6 + t * t * .4);
    const r = 7 + spin * t * t * .85 + spin * .15 * t;
    frames.push({ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${r.toFixed(1)}deg)`, offset: t });
  }
  frames[N].opacity = 1;
  return frames;
}

function drop() {
  if (fallen) return;
  fallen = true;
  store.set('apple', 'fallen');
  play('pluck');
  hint.hidden = true;
  frame.style.setProperty('--tx', '0deg'); frame.style.setProperty('--ty', '0deg');
  if (reduced() || !apple.animate) { afterFall(false); return; }

  const ar = apple.getBoundingClientRect();
  const fallY = innerHeight - ar.top + 60; // fully below the visible scene
  const drift = (Math.random() < .5 ? -1 : 1) * (18 + Math.random() * 36);
  const spin = (drift < 0 ? -1 : 1) * (220 + Math.random() * 120);
  apple.classList.add('is-falling');
  apple.style.transform = 'none';
  skipBtn.hidden = false;

  // 1 — the stem resists, then tears from the corner
  const detach = apple.animate([
    { transform: 'translate(0, 0) rotate(0deg)' },
    { transform: 'translate(-2px, -7px) rotate(-9deg)', offset: .4 },
    { transform: 'translate(-1px, -11px) rotate(-12deg)', offset: .62 },
    { transform: 'translate(2px, 3px) rotate(7deg)' },
  ], { duration: 460, easing: 'cubic-bezier(.4, 0, .6, 1)', fill: 'forwards' });
  anims = [detach];

  detach.finished.then(() => {
    // 2 — the card loses its weight; the corner stains; gravity takes the apple
    frame.classList.add('is-shaken', 'is-bereft');
    play('drip');
    verdict.hidden = false;
    const DUR = Math.round(clamp(Math.sqrt(fallY / 900), .7, 1.3) * 1150);
    play('whoosh', { dur: DUR / 1000 });
    const fall = apple.animate(fallFrames(fallY, drift, spin), { duration: DUR, easing: 'linear', fill: 'forwards' });
    anims = [fall];
    return fall.finished.then(() => afterFall(true));
  }).catch(() => afterFall(false));
}

export function initInvitation() {
  if (!section) return;

  // The apple leans toward the pointer; the card tilts a little.
  frame.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || reduced() || fallen) return;
    const fr = frame.getBoundingClientRect();
    const px = (e.clientX - fr.left) / fr.width - .5, py = (e.clientY - fr.top) / fr.height - .5;
    frame.style.setProperty('--ty', (px * 3).toFixed(2) + 'deg');
    frame.style.setProperty('--tx', (-py * 3).toFixed(2) + 'deg');
    const ar = apple.getBoundingClientRect();
    const dx = e.clientX - (ar.left + ar.width / 2), dy = e.clientY - (ar.top + ar.height / 2);
    const dist = Math.hypot(dx, dy), pull = clamp(1 - dist / 260);
    apple.style.setProperty('--ax', (dx / (dist || 1) * 5 * pull).toFixed(2) + 'px');
    apple.style.setProperty('--ay', (dy / (dist || 1) * 4 * pull).toFixed(2) + 'px');
    apple.style.setProperty('--ar', (dx / (dist || 1) * 7 * pull).toFixed(2) + 'deg');
  });
  frame.addEventListener('pointerleave', () => {
    ['--tx', '--ty'].forEach((p) => frame.style.setProperty(p, '0deg'));
    ['--ax', '--ay'].forEach((p) => apple.style.setProperty(p, '0px'));
    apple.style.setProperty('--ar', '0deg');
  });
  apple.addEventListener('pointerenter', () => { if (!fallen) play('handle'); });
  apple.addEventListener('click', drop);
  enterBtn.addEventListener('click', enter);
  skipBtn.addEventListener('click', () => anims.forEach((a) => a.finish()));
  on('show-invitation', showInvitation);

  // Initial state for this session.
  ui.invitationOpen = store.get('entered') !== '1';
  if (fallen) showBereft();
  if (!ui.invitationOpen) section.classList.add('is-gone');
  syncLayers();
}
