// Static checks on the built site (run `npm run build` first):
//  - every JS module parses (node --check) and every relative import resolves
//  - ids are unique; every in-page href="#id" and aria-controls/labelledby target exists
//  - every local asset referenced from HTML/CSS/JS exists in dist/
//  - external links open safely (target=_blank + rel="noopener noreferrer")
//  - every <img> has alt, width and height
import { readFile, readdir, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const problems = [];
const fail = (msg) => problems.push(msg);
const exists = (p) => stat(p).then(() => true, () => false);

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p)); else out.push(p);
  }
  return out;
}

if (!(await exists(join(DIST, 'index.html')))) {
  console.error('dist/index.html not found — run `npm run build` first.');
  process.exit(1);
}

const html = await readFile(join(DIST, 'index.html'), 'utf8');
const css = await readFile(join(DIST, 'css', 'main.css'), 'utf8');
const jsFiles = (await walk(join(DIST, 'js'))).filter((f) => f.endsWith('.js'));

// JS syntax + imports
for (const f of jsFiles) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { fail(`Syntax error in ${relative(DIST, f)}: ${e.stderr.toString().split('\n').slice(0, 4).join(' ')}`); }
  const src = await readFile(f, 'utf8');
  for (const m of src.matchAll(/^\s*import\s[^'"]*['"](\.[^'"]+)['"]/gm)) {
    if (!(await exists(join(dirname(f), m[1])))) fail(`Unresolved import '${m[1]}' in ${relative(DIST, f)}`);
  }
}

// Unique ids and internal references
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const seen = new Set();
for (const id of ids) { if (seen.has(id)) fail(`Duplicate id "${id}"`); seen.add(id); }
for (const m of html.matchAll(/href="#([^"]*)"/g)) if (m[1] && !seen.has(m[1])) fail(`Link to missing #${m[1]}`);
for (const m of html.matchAll(/aria-(?:controls|labelledby|describedby)="([^"]+)"/g)) {
  for (const id of m[1].split(/\s+/)) if (!seen.has(id)) fail(`ARIA reference to missing id "${id}"`);
}

// Local assets
const refs = new Set();
for (const m of html.matchAll(/(?:src|href)="((?:assets|css|js)\/[^"?#]+)/g)) refs.add(m[1]);
for (const m of html.matchAll(/srcset="([^"]+)"/g)) m[1].split(',').forEach((s) => refs.add(s.trim().split(/\s+/)[0]));
for (const m of html.matchAll(/imagesrcset="([^"]+)"/g)) m[1].split(',').forEach((s) => refs.add(s.trim().split(/\s+/)[0]));
for (const f of jsFiles) {
  const src = await readFile(f, 'utf8');
  const dir = (src.match(/const DIR = '([^']+)'/) || [])[1];
  if (dir) for (const m of src.matchAll(/DIR \+ '([^']+)'/g)) refs.add(dir + m[1]);
}
for (const m of css.matchAll(/url\(["']?((?!data:|https?:|%23|#)[^"')]+)/g)) refs.add('css/' + m[1]);
for (const r of refs) if (!(await exists(join(DIST, r)))) fail(`Missing asset: ${r}`);

// External links
for (const m of html.matchAll(/<a\s[^>]*href="(https?:[^"]+)"[^>]*>/g)) {
  const tag = m[0];
  if (!/target="_blank"/.test(tag) || !/rel="noopener noreferrer"/.test(tag)) fail(`Unsafe external link: ${m[1]}`);
}

// Images
for (const m of html.matchAll(/<img\s[^>]*>/g)) {
  const tag = m[0];
  if (/data-lightbox-img/.test(tag)) continue;
  for (const a of ['alt="', 'width="', 'height="']) if (!tag.includes(a)) fail(`<img> missing ${a.slice(0, -2)}: ${tag.slice(0, 90)}`);
}

if (problems.length) {
  console.error(`Lint found ${problems.length} problem(s):\n - ` + problems.join('\n - '));
  process.exit(1);
}
console.log(`Lint passed — ${jsFiles.length} JS modules, ${ids.length} ids, ${refs.size} local assets checked.`);
