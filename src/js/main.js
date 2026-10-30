// PARADISE V2 — entry point. Each system and feature owns one part of the
// building; this file only starts them in order.
import { initSound } from './systems/sound.js';
import { initCursor } from './systems/cursor.js';
import { initSecrets } from './systems/secrets.js';
import { initRouter, bootDeepLink } from './systems/router.js';
import { initLightbox } from './systems/lightbox.js';
import { initSerpents } from './systems/serpents.js';
import { initReveal } from './systems/reveal.js';
import { initDirectory } from './features/directory.js';
import { initInvitation } from './features/invitation.js';
import { initDoors } from './features/doors.js';
import { initLobby } from './features/lobby.js';
import { initToggles } from './features/toggles.js';
import { initRelationships } from './features/relationships.js';
import { initAbilities } from './features/abilities.js';
import { initClub } from './features/club.js';
import { initRubicon } from './features/rubicon.js';
import { initSins } from './features/sins.js';
import { ui } from './core/layers.js';

const steps = [
  initSound, initCursor, initSecrets, initRouter, initLightbox, initDirectory,
  initInvitation, initDoors, initLobby, initToggles, initRelationships,
  initAbilities, initClub, initRubicon, initSins, initSerpents, initReveal,
];

// One failing feature must not take the rest of the building down with it.
for (const step of steps) {
  try { step(); } catch (e) { console.error(`[PARADISE] ${step.name} failed`, e); }
}

if (!ui.invitationOpen) bootDeepLink();
document.documentElement.classList.add('is-ready');
