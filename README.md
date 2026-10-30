# PARADISE V2

An interactive character website for **Lust** (เพลินพริ้ม ดาฤดี เทวอนันต์), the owner of
Paradise — a complete visual redesign of the original PARADISE site.
Unofficial fan-made OC × Marvel project by **TST Project**.

The original site is a separate project and is not modified by this one. All character
text is carried over from it word for word, in Thai; the interface is in English.

## Run it

Requires Node 20 or newer. There are no dependencies to install.

```bash
npm run dev
```

Opens a local server at http://localhost:4173 that rebuilds when `src/` changes.

| Command | What it does |
|---|---|
| `npm run build` | Builds the site into `dist/` |
| `npm run dev` | Serves `dist/` and rebuilds on change |
| `npm run preview` | Serves the last build |
| `npm run lint` | Checks the build: JS syntax and imports, ids and links, assets, image attributes, external links |
| `npm test` | Canon tests: every Thai line and artist URL of the original is present and unchanged, and nothing new was added |
| `npm run check` | Build, lint and test (what CI runs) |

## Structure

```
src/
  index.html            page shell; <!-- @include --> pulls in the partials
  partials/             invitation, header, lobby + corridor, rooms/01–09 and 00, lightbox, footer
  css/                  base (tokens, type, motion), components, sections, one file per room
  js/
    core/               DOM helpers, session store, event bus, layer/inert management
    systems/            router, sound (Web Audio), cursor, serpents, lightbox, secrets, reveal
    features/           invitation, doors, directory and one module per interactive room
    data/               artworks, club floors
  assets/               artwork (WebP, full + 960px) and favicon
scripts/                build, dev server, lint
tests/                  canon tests + a read-only snapshot of the original (fixtures/v1)
docs/INVENTORY.md       content and feature inventory, and canon ambiguities
```

The build inlines the partials, flattens the CSS imports into one file, copies the ES
modules and assets, and stamps a cache-busting version on the CSS and JS URLs.

## Editing content

Thai lore lives in `src/partials/rooms/*.html`, plus a few dynamic strings in
`src/js/data/floors.js`, `src/js/features/abilities.js` and `src/js/features/rubicon.js`.
`npm test` compares it with the original. If you change canon on purpose, update
`tests/fixtures/v1/` in the same commit so the change is explicit.

New artwork goes in `src/assets/images/lust/` (a full-size WebP and a `-960` version)
and gets an entry in `src/js/data/art.js` and the gallery partial.

## Sound and music

Both are off until the visitor turns them on, with separate MUSIC and SOUND buttons.
Everything is synthesised in the browser with the Web Audio API, so there are no
audio files and no third-party licences:

- `src/js/systems/sound.js`: interface cues (doors, paper, the apple, a serpent's hiss)
- `src/js/systems/music.js`: *The Paradise Waltz*, an original slow waltz in D harmonic
  minor for organ drone, strings, a distant ballroom, an old music box, cello and bell.
  It is performed live from the score in that file, changes arrangement every 16 bars,
  and fades out while the tab is hidden.

## Deploy

`.github/workflows/pages.yml` runs `npm run check` and publishes `dist/` to GitHub
Pages on every push to `main`. In the repository settings, set **Pages → Source** to
**GitHub Actions**.

## Credits

Artwork belongs to the four artists credited in the site's Credits room (links to their
Facebook profiles). Website by TST Project. Marvel characters and names, such as Tony
Stark and Mephisto, belong to their owners; this project is not affiliated with or
endorsed by Marvel.
