// Which layer owns the screen: the invitation, an open room, the directory
// or the lightbox. Everything else is made inert and the page stops scrolling.
import { $, $$ } from './dom.js';

export const ui = {
  invitationOpen: false,
  room: null,        // the open room <section>, or null
  lightbox: false,
  directory: false,
};

const root = document.documentElement;
const header = $('[data-site-header]');
const main = $('#lobby-main');
const footer = $('.site-footer');
const invitation = $('#invitation');
const directory = $('[data-directory]');
const lightbox = $('[data-lightbox]');
const rooms = $$('[data-room]');

function inert(el, on) {
  if (!el) return;
  if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert');
}

export function syncLayers() {
  const { invitationOpen: inv, room, lightbox: lb, directory: dir } = ui;
  inert(invitation, !inv);
  inert(header, inv || lb);
  inert(main, inv || lb || dir || !!room);
  inert(footer, inv || lb || dir || !!room);
  inert(directory, !dir || inv || lb);
  rooms.forEach((r) => inert(r, r !== room || inv || lb || dir));
  inert(lightbox, !lb);
  root.classList.toggle('is-locked', inv || lb || dir || !!room);
  root.classList.toggle('has-room', !!room);
}

/** The containers that keyboard focus may move through right now. */
export function focusScope() {
  if (ui.lightbox) return [lightbox];
  if (ui.invitationOpen) return [invitation];
  if (ui.directory) return [header, directory];
  if (ui.room) return [header, ui.room];
  return null;
}
