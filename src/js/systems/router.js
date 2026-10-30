// ROUTER — rooms are dialogs layered over the lobby. Each opening pushes a
// history entry, so the browser Back button closes rooms; deep links such
// as #abilities open the room once the visitor is inside.
import { $, $$, reduced } from '../core/dom.js';
import { store } from '../core/store.js';
import { emit } from '../core/bus.js';
import { ui, syncLayers, focusScope } from '../core/layers.js';
import { play } from './sound.js';
import { discover } from './secrets.js';
import * as Lightbox from './lightbox.js';
import * as Directory from '../features/directory.js';

const rooms = new Map($$('[data-room]').map((r) => [r.id, r]));
const veil = $('[data-veil]');
const floorEl = $('[data-floor-indicator]');
const LOBBY_LABEL = 'FLOOR G · THE LOBBY';
const baseTitle = document.title;
const PAPER_ROOMS = ['character', 'biography', 'rubicon', 'credits'];
let returnFocus = null;

export const keyFound = () => store.get('key') === 'found';
export const isRoom = (id) => rooms.has(id);
const allowed = (id) => rooms.has(id) && (id !== 'office' || keyFound());

function setDirectoryCurrent(id) {
  $$('.directory a[data-room-link]').forEach((a) => {
    if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

export function openRoom(id) {
  const room = rooms.get(id);
  if (!room || room === ui.room || !allowed(id)) return;
  if (!ui.room) returnFocus = document.activeElement;
  if (ui.room) ui.room.classList.remove('is-open');
  ui.room = room;
  room.classList.add('is-open');
  room.scrollTop = 0;
  syncLayers();
  const title = $('.section-title', room);
  if (title) title.focus({ preventScroll: true });
  document.title = `${title ? title.textContent.trim() : ''} — PARADISE`;
  if (floorEl) floorEl.textContent = room.dataset.floorLabel || LOBBY_LABEL;
  setDirectoryCurrent(id);
  play(PAPER_ROOMS.includes(id) ? 'paper' : 'open');
  if (id === 'office') discover('office');
  emit('room-open', id);
}

export function closeRoom(silent) {
  if (!ui.room) return;
  if (!silent) play('close');
  ui.room.classList.remove('is-open');
  ui.room = null;
  syncLayers();
  document.title = baseTitle;
  if (floorEl) floorEl.textContent = LOBBY_LABEL;
  setDirectoryCurrent(null);
  if (returnFocus && document.contains(returnFocus) && !returnFocus.closest('[data-room]')) returnFocus.focus({ preventScroll: true });
  returnFocus = null;
  emit('room-close');
}

export function navigate(id) {
  if (!allowed(id)) return;
  const depth = (history.state && history.state.depth) || 0;
  history.pushState({ room: id, depth: ui.room ? depth + 1 : 1 }, '', '#' + id);
  openRoom(id);
}

export function requestClose() {
  const depth = (history.state && history.state.depth) || 0;
  if (depth > 0) history.go(-depth);
  else { history.replaceState({ depth: 0 }, '', location.pathname + location.search); closeRoom(); }
}

/** Darkness spreads from an element, the callback runs under it, then it lifts. */
export function throughVeil(originEl, done, tone) {
  if (reduced() || !veil) { done(); return; }
  const r = originEl.getBoundingClientRect();
  veil.style.setProperty('--vx', ((r.left + r.width / 2) / innerWidth * 100).toFixed(1) + '%');
  veil.style.setProperty('--vy', ((r.top + r.height / 2) / innerHeight * 100).toFixed(1) + '%');
  veil.dataset.tone = tone || '';
  veil.classList.remove('is-lifting');
  void veil.offsetWidth;
  veil.classList.add('is-active');
  let called = false;
  const go = () => {
    if (called) return; called = true;
    done();
    veil.classList.remove('is-active');
    veil.classList.add('is-lifting');
    setTimeout(() => veil.classList.remove('is-lifting'), 620);
  };
  veil.addEventListener('transitionend', go, { once: true });
  setTimeout(go, 760); // fallback if transitionend never fires
}

function goToLobby(scrollTarget) {
  Directory.close(true);
  if (ui.room) requestClose();
  const t = scrollTarget && document.getElementById(scrollTarget);
  setTimeout(() => (t || document.body).scrollIntoView({ behavior: 'auto', block: 'start' }), ui.room ? 80 : 0);
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
function trap(containers, e) {
  const items = containers.flatMap((c) => $$(FOCUSABLE, c))
    .filter((el) => !el.closest('[hidden], [inert]') && el.getClientRects().length);
  items.push(...$('.audio-dock button'));
  if (!items.length) return;
  const first = items[0], last = items[items.length - 1];
  const inside = items.includes(document.activeElement);
  if (e.shiftKey && (document.activeElement === first || !inside)) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && (document.activeElement === last || !inside)) { e.preventDefault(); first.focus(); }
}

export function initRouter() {
  $$('[data-close-room]').forEach((b) => b.addEventListener('click', requestClose));

  addEventListener('popstate', () => {
    if (Lightbox.isOpen()) Lightbox.close();
    const id = location.hash.slice(1);
    if (allowed(id)) openRoom(id); else closeRoom();
  });

  // In-page links: rooms, the lobby, the invitation, anchors inside a room.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-door') || e.defaultPrevented) return;
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    if (id === 'invitation') {
      e.preventDefault(); Directory.close(true);
      if (ui.room) closeRoom(true);
      emit('show-invitation');
      return;
    }
    if (rooms.has(id)) {
      e.preventDefault();
      Directory.close(true);
      if (!allowed(id)) { play('error'); return; }
      play('nav');
      navigate(id);
      return;
    }
    if (id === 'lobby' || a.hasAttribute('data-lobby-link')) { e.preventDefault(); play('nav'); goToLobby(null); return; }
    const target = document.getElementById(id);
    if (ui.room && target && ui.room.contains(target)) {
      e.preventDefault();
      target.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    if (target) { e.preventDefault(); goToLobby(id); }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (Lightbox.isOpen()) { Lightbox.close(); return; }
      if (Directory.isOpen()) { Directory.close(); return; }
      const insc = $('[data-inscription][aria-expanded="true"]');
      if (insc) { insc.setAttribute('aria-expanded', 'false'); return; }
      if (ui.room && !ui.invitationOpen) { requestClose(); return; }
    }
    if (e.key === 'Tab') {
      const scope = focusScope();
      if (scope) trap(scope, e);
    }
  });
}

/** Called once the visitor is inside: honour a deep link such as #biography. */
export function bootDeepLink() {
  const id = location.hash.slice(1);
  if (allowed(id)) {
    history.replaceState({ room: id, depth: 0 }, '', '#' + id);
    openRoom(id);
  }
}
