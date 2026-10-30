# PARADISE V2 — Feature & Content Inventory

Source of truth: the original PARADISE project (`../PARADISE`, commit `13b59f3`).
A read-only snapshot of its `index.html` and `js/main.js` lives in `tests/fixtures/v1/`.
`npm test` checks that every Thai sentence and every artist URL in that snapshot
appears unchanged in the V2 build.

## Content inventory (original → V2 location)

| # | Original block | Thai strings | V2 location |
|---|---|---|---|
| C1 | Invitation text + verdict | 2 | `partials/invitation.html` |
| C2 | Lobby intro (2 paragraphs) | 2 | `partials/lobby.html` |
| C3 | Lobby inscription (secret 1) | 1 | `partials/lobby.html` |
| C4 | Corridor note | 1 | `partials/lobby.html` |
| C5 | Character file — 8 facts + analyst note | 9 | `rooms/01-character.html` |
| C6 | Biography — lede + 11 fragments (title + text) | 23 | `rooms/02-biography.html` |
| C7 | Relationships — lede + 4 files (8 paragraphs, 4 headings) | 13 | `rooms/03-relationships.html` |
| C8 | Abilities — grave text, 8 rules, contract addendum (4) | 14 | `rooms/04-abilities.html` |
| C9 | Cycle model log messages (4, dynamic) | 4 | `js/features/abilities.js` |
| C10 | Paradise Club — lede, key file, staff memo (2) | 4 | `rooms/05-club.html` |
| C11 | Club floors — 7 × (title, text) | 14 | `js/data/floors.js` |
| C12 | Rubicon — fiction note, circulation, 5 effects | 7 | `rooms/06-rubicon.html` |
| C13 | Rubicon 72-hour states (3, dynamic) | 3 | `js/features/rubicon.js` |
| C14 | Seven Sins — lede, Lust seat, sealed seat | 5 | `rooms/07-sins.html` |
| C15 | Office (secret room 000) — 2 paragraphs | 2 | `rooms/00-office.html` |
| C16 | Credits notice + footer disclaimer | 2 | `rooms/09-credits.html`, `partials/footer.html` |
| C17 | 4 artist Facebook URLs (Artist 01–04, no names) | — | `rooms/09-credits.html` |
| C18 | 8 artworks, captions and alt text | — | `js/data/art.js`, gallery, rooms |

Only Lust's seat in the Seven Sins is identified; the other six stay "UNDISCLOSED"
exactly as in the original. No members, relationships or abilities were added.

## Feature inventory

| # | Feature (original) | V2 |
|---|---|---|
| F1 | Invitation screen, remembered for the session | Yes — `features/invitation.js` |
| F2 | Blood-red apple on the corner of the invitation frame; leans toward pointer | Yes |
| F3 | Apple click: tears free, falls with gravity + rotation, leaves below viewport; skip button | Yes (Web Animations, accelerating curve) |
| F4 | Irreversible verdict text → ENTER PARADISE reveal | Yes |
| F5 | Lobby hero, artwork lightbox | Yes |
| F6 | Corridor of 10 doors: tilt toward pointer, swing on click, veil spreading from the door | Yes — `features/doors.js`, `systems/router.js` |
| F7 | Locked door 000, rattles; unlocked by the club key | Yes |
| F8 | Rooms as dialogs: history/Back, Escape, focus trap, focus return, deep links | Yes — `systems/router.js` |
| F9 | Header nav + small-screen menu + "The Invitation" link | Yes — redesigned as a full-screen Directory |
| F10 | Character file: dossier facts, mask toggle | Yes |
| F11 | Biography: 6 chapter links, 11 fragments, reveal on scroll, serpent spine | Yes |
| F12 | Relationships: map + ARIA tabs (arrow keys, Home/End) | Yes |
| F13 | Abilities: gravestone rules, cycle model (live / death / reset), wax seal addendum | Yes |
| F14 | Club: elevator floor stepper, generated corridor art, atmospheric maze map, hidden floor + key | Yes |
| F15 | Rubicon: break the seal, redactions (denied), 72-hour slider | Yes |
| F16 | Seven Sins: seven seats around an ouroboros | Yes |
| F17 | Gallery (8 works, natural ratios) + lightbox (keys, swipe, prev/next, missing-image fallback) | Yes |
| F18 | Credits: 4 artists, TST Project, Thai notice | Yes |
| F19 | Secret office (room 000) with mask toggle | Yes |
| F20 | Secrets counter (4) in the footer | Yes |
| F21 | Serpents ×3 (lobby, corridor divider, biography spine), head turns to pointer | Yes — `systems/serpents.js` |
| F22 | Custom cursor with states, fine pointers only | Yes — redesigned (`systems/cursor.js`) |
| F23 | Sound OFF by default, SOUND ON/OFF control, distinct cues, debounced | Yes — `systems/sound.js` |
| F24 | Reduced motion, keyboard access, screen-reader announcements | Yes |
| F25 | Fan-work disclaimer, TST Project attribution | Yes |

New in V2 (presentation only, no new canon): previous/next room navigation in every room,
a Directory overlay that shows room numbers, door "light under the door" states,
cursor labels (ENTER / LOCKED / TAKE / VIEW), and a reverb bus for sound.

## Ambiguities reported, not resolved

The canon brief supplied with the V2 request contains details that are not in the
original site's text. Per the rule "preserve the original content and report the
ambiguity", V2 keeps the original wording and does **not** add these:

1. Height: brief says "…170 เซนติเมตรเมื่อสวมรองเท้าส้นสูง 10 เซนติเมตร"; original says
   "ประมาณ 170 ซม. เมื่อสวมรองเท้าส้นสูง" (no heel height).
2. Background: brief says "เชื้อสายเอเชีย"; original says "ยังไม่ระบุแน่ชัด; มีพื้นเพเป็นชาวเอเชีย".
3. Tony Stark: brief says the relationship was secret ("ความสัมพันธ์ลับ") and mentions an
   age gap; the original text mentions neither.
4. Rubicon — Seed: brief says it is sold only in Paradise; original says
   "แพร่หลายในหมู่ลูกค้าของ Paradise".
5. Mephisto: brief says another OC was made the scapegoat; original says
   "จัดให้มีผู้รับผิดแทนเธอ" without naming who.
6. Mutants: brief uses "มนุษย์กลายพันธุ์"; original uses "มิวแทนต์".

If the brief's versions are the intended canon, they can be changed in the partials
listed above; the content test would then need its fixture updated deliberately.
