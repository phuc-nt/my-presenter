// deck folder -> one self-contained HTML file.
//   deck.config.json  {title, lang, theme, chrome, forbid, fonts, text}
//   slides.html       <section class="slide" …> blocks; may hold <style> and <script>
//   script.md         speaker script (see script.js)
//   assets/icons/*.png|svg, assets/img/*, assets/fonts/*.woff2
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, extname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseScript, MARK } from './script.js';
import { checkHtml, CSP } from './check.js';
import { cleanImage } from './clean-image.js';

const here = dirname(fileURLToPath(import.meta.url));
export const TOOL = resolve(here, '..');
export const KIT = resolve(TOOL, '..', '..');
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const TEXT = {
  vi: { notes: 'Ghi chú người nói', grid: 'Tất cả slide', help: 'Phím tắt', hint: 'Nhấn <b>?</b> để xem phím tắt',
    keys: [['→ Space', 'bấm tiếp / slide sau'], ['←', 'lùi lại'], ['Home End', 'đầu / cuối'], ['N', 'ghi chú người nói'], ['G', 'xem tất cả slide'], ['F', 'toàn màn hình'], ['Esc', 'đóng bảng']] },
  en: { notes: 'Speaker notes', grid: 'All slides', help: 'Keys', hint: 'Press <b>?</b> for keys',
    keys: [['→ Space', 'next click / slide'], ['←', 'back'], ['Home End', 'first / last'], ['N', 'speaker notes'], ['G', 'all slides'], ['F', 'full screen'], ['Esc', 'close panel']] },
};

// images lose their metadata on the way in (clean-image.js); fonts go in as they are
const dataUri = file => {
  const mime = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
  return `data:${mime};base64,${cleanImage(readFileSync(file), mime).toString('base64')}`;
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const safeJson = v => JSON.stringify(v).replace(/</g, '\\u003c');

export function themes() {
  return readdirSync(join(TOOL, 'themes')).filter(n => existsSync(join(TOOL, 'themes', n, 'theme.json')))
    .map(n => JSON.parse(readFileSync(join(TOOL, 'themes', n, 'theme.json'), 'utf8')));
}

function iconsIn(dir) {
  const out = {};
  if (existsSync(dir)) for (const f of readdirSync(dir).sort()) if (MIME[extname(f).toLowerCase()]) out[basename(f, extname(f))] = join(dir, f);
  return out;
}

export function fontDirs(deckDir) {
  return [join(deckDir, 'assets', 'fonts'), join(KIT, 'assets', 'fonts'), join(KIT, '.claude', 'skills', 'vi-explainer-video', 'assets', 'fonts')];
}

export function buildDeck(deckDir) {
  deckDir = resolve(deckDir);
  const need = f => { const p = join(deckDir, f); if (!existsSync(p)) throw new Error(`${f} is missing from ${deckDir}`); return p; };
  const config = JSON.parse(readFileSync(need('deck.config.json'), 'utf8'));
  const themeDir = join(TOOL, 'themes', config.theme ?? 'plain');
  if (!existsSync(join(themeDir, 'theme.json'))) throw new Error(`no theme "${config.theme}"; have: ${themes().map(t => t.name).join(', ')}`);
  const theme = JSON.parse(readFileSync(join(themeDir, 'theme.json'), 'utf8'));
  const lang = config.lang ?? 'vi';
  const text = { ...(TEXT[lang] ?? TEXT.en), ...(config.text ?? {}) };

  const iconFiles = { ...iconsIn(join(themeDir, 'icons')), ...iconsIn(join(deckDir, 'assets', 'icons')) };
  const used = new Set();
  const place = src => src.replace(/\{\{(ICON|IMG|SHOT|T):([^}]+)\}\}/g, (_, kind, name) => {
    name = name.trim();
    if (kind === 'T') return text[name] ?? '';
    if (kind === 'ICON') { if (!iconFiles[name]) throw new Error(`no icon "${name}" in assets/icons or the theme`); used.add(name); return dataUri(iconFiles[name]); }
    const file = [name, `${name}.png`, `${name}.jpg`, `${name}.svg`].map(n => resolve(deckDir, 'assets', 'img', n)).find(existsSync);
    if (!file || !file.startsWith(deckDir)) throw new Error(`no image "${name}" in assets/img`);
    return dataUri(file);
  });

  const slidesSrc = readFileSync(need('slides.html'), 'utf8');
  const sections = slidesSrc.match(/<section\b[^>]*class="[^"]*\bslide\b[\s\S]*?<\/section>/g) ?? [];
  if (!sections.length) throw new Error('slides.html has no <section class="slide">');
  const script = existsSync(join(deckDir, 'script.md')) ? parseScript(join(deckDir, 'script.md')) : null;
  if (script && script.length !== sections.length) throw new Error(`slides.html has ${sections.length} slides, script.md has ${script.length}`);
  const clicks = sections.map(s => Math.max(0, ...[...s.matchAll(/data-step="(\d+)"/g)].map(m => Number(m[1]))));
  if (script) script.forEach((s, i) => { if (s.clicks !== clicks[i]) throw new Error(`slide ${i + 1}: slides.html has ${clicks[i]} clicks, script.md says ${s.clicks}`); });
  sections.forEach((s, i) => { for (let k = 1; k <= clicks[i]; k++) if (!s.includes(`data-step="${k}"`)) throw new Error(`slide ${i + 1}: nothing appears on click ${k}`); });
  const titleOf = s => /data-task="([^"]*)"/.exec(s)?.[1] ?? '';
  const notes = sections.map((s, i) => ({ title: script?.[i].title ?? titleOf(s), say: script?.[i].say ?? '' }));

  const fonts = [...(theme.fonts ?? []), ...(config.fonts ?? [])].map(f => {
    const file = fontDirs(deckDir).map(d => join(d, `${f.file}.woff2`)).find(existsSync);
    if (!file) throw new Error(`font ${f.file}.woff2 not found in assets/fonts or the kit's fonts`);
    return `@font-face{font-family:"${f.family}";${f.weight ? `font-weight:${f.weight};` : ''}src:url(${dataUri(file)}) format("woff2")}`;
  }).join('\n');

  const chrome = place(readFileSync(join(themeDir, 'chrome.html'), 'utf8')
    .replace('{{HELP}}', text.keys.map(([k, what]) => k.split(' ').map(x => `<kbd>${esc(x)}</kbd>`).join('') + esc(what)).join('<br>')));
  const [, before = '', after = '', overlays = ''] = /<!-- stage:before -->([\s\S]*?)<!-- stage:after -->([\s\S]*?)<!-- overlays -->([\s\S]*)/.exec(chrome) ?? [];
  const body = place(slidesSrc);
  // every icon a slide names in data-icon, and those the chrome config names, go into the map
  for (const m of slidesSrc.matchAll(/data-icon="([^"]+)"/g)) used.add(m[1]);
  const chromeCfg = { ...(theme.chrome ?? {}), ...(config.chrome ?? {}) };
  JSON.stringify(chromeCfg, (k, v) => { if (k === 'icon' && typeof v === 'string') used.add(v); return v; });
  const icons = {};
  for (const n of used) { if (!iconFiles[n]) throw new Error(`no icon "${n}" in assets/icons or the theme`); icons[n] = dataUri(iconFiles[n]); }

  const DECK = { title: config.title ?? basename(deckDir), notes, icons, chrome: chromeCfg, mark: MARK, thousands: config.thousands ?? (lang === 'vi' ? '.' : ',') };
  const read = (...p) => readFileSync(join(...p), 'utf8');
  const html = `<!doctype html>
<html lang="${esc(lang)}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="no-referrer">
<meta http-equiv="x-dns-prefetch-control" content="off">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(DECK.title)}</title>
<style>
${fonts}
${read(TOOL, 'engine', 'engine.css')}
${read(themeDir, 'theme.css')}
</style>
<script>const DECK = ${safeJson(DECK)}; window.DeckHooks = {};</script>
</head>
<body>
<div id="stage">
${before.trim()}
${body.trim()}
${after.trim()}
</div>
${overlays.trim()}
<script>
${read(themeDir, 'theme.js')}
</script>
<script>
${read(TOOL, 'engine', 'engine.js')}
</script>
</body>
</html>
`;
  const findings = checkHtml(html, { forbid: config.forbid ?? [] });
  return { html, slides: sections.length, clicks, findings, title: DECK.title, name: config.name ?? basename(deckDir) };
}
