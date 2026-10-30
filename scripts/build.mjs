// Assembles src/ into dist/: HTML partials are inlined, CSS @imports are
// flattened into one stylesheet, JS modules and assets are copied as-is.
// No dependencies — Node's standard library only.
import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');

const INCLUDE = /<!--\s*@include\s+([\w./-]+)\s*-->/g;
const IMPORT = /@import\s+url\(["']?([\w./-]+)["']?\);?/g;

async function inlineHtml(file, seen = new Set()) {
  if (seen.has(file)) throw new Error(`Circular include: ${file}`);
  seen.add(file);
  let html = await readFile(file, 'utf8');
  const parts = [];
  for (const m of html.matchAll(INCLUDE)) parts.push(m);
  for (const m of parts) {
    const child = join(dirname(file), m[1]);
    html = html.replace(m[0], (await inlineHtml(child, new Set(seen))).trimEnd());
  }
  return html;
}

async function flattenCss(file, seen = new Set()) {
  if (seen.has(file)) return '';
  seen.add(file);
  let css = await readFile(file, 'utf8');
  for (const m of [...css.matchAll(IMPORT)]) {
    const child = join(dirname(file), m[1]);
    css = css.replace(m[0], `/* ${m[1]} */\n${(await flattenCss(child, seen)).trim()}\n`);
  }
  return css;
}

async function listFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await listFiles(p)); else out.push(p);
  }
  return out;
}

export async function build() {
  const t0 = performance.now();
  await rm(DIST, { recursive: true, force: true });
  await mkdir(join(DIST, 'css'), { recursive: true });

  const css = await flattenCss(join(SRC, 'css', 'main.css'));
  await writeFile(join(DIST, 'css', 'main.css'), css);

  await cp(join(SRC, 'js'), join(DIST, 'js'), { recursive: true });
  await cp(join(SRC, 'assets'), join(DIST, 'assets'), { recursive: true });

  // Version string from the content of everything that ships, for cache busting.
  const hash = createHash('sha1').update(css);
  for (const f of (await listFiles(join(SRC, 'js'))).sort()) hash.update(await readFile(f));
  const version = hash.digest('hex').slice(0, 8);

  let html = await inlineHtml(join(SRC, 'index.html'));
  html = html.replaceAll('__VERSION__', version);
  if (INCLUDE.test(html)) throw new Error('Unresolved @include left in index.html');
  await writeFile(join(DIST, 'index.html'), html);
  await writeFile(join(DIST, '.nojekyll'), '');

  const ms = Math.round(performance.now() - t0);
  console.log(`Built dist/ (v${version}) in ${ms} ms — index.html ${(html.length / 1024).toFixed(1)} KB, main.css ${(css.length / 1024).toFixed(1)} KB`);
  return { version };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build().catch((e) => { console.error(e.message); process.exit(1); });
}
