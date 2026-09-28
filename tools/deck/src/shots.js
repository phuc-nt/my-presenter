// Screenshots of a built deck, for checking layout. Uses the Chrome and the
// puppeteer-core that the HyperFrames bundle already needs; nothing is downloaded.
import { existsSync, readdirSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { KIT } from './build.js';

function findChrome() {
  const env = process.env.HYPERFRAMES_BROWSER_PATH || process.env.DECK_BROWSER_PATH;
  if (env) { if (existsSync(env)) return env; throw new Error(`browser not found at ${env}`); }
  const cache = join(homedir(), '.cache', 'puppeteer', 'chrome-headless-shell');
  if (existsSync(cache)) for (const v of readdirSync(cache).sort().reverse()) for (const d of readdirSync(join(cache, v))) {
    const p = join(cache, v, d, 'chrome-headless-shell'); if (existsSync(p)) return p;
  }
  for (const p of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/usr/bin/chromium', '/usr/bin/google-chrome'])
    if (existsSync(p)) return p;
  throw new Error('no Chrome found; set HYPERFRAMES_BROWSER_PATH to chrome-headless-shell or Chrome');
}

async function loadPuppeteer() {
  const bases = [join(KIT, 'bundle', 'prefix', 'lib', 'node_modules', '@hyperframes', 'cli'), join(KIT, 'tools', 'deck')];
  for (const b of bases) {
    try { const file = createRequire(join(b, 'package.json')).resolve('puppeteer-core'); const m = await import(pathToFileURL(file)); return m.default ?? m; } catch { /* next */ }
  }
  throw new Error('puppeteer-core not found; it comes with the HyperFrames bundle (bin/setup)');
}

/** @param at list of "slide" or "slide.step"; empty = every slide at its last step; all = every step */
export async function shoot(htmlFile, outDir, { at = [], all = false, width = 1920, sheet = true } = {}) {
  htmlFile = resolve(htmlFile);
  if (!existsSync(htmlFile)) throw new Error(`${htmlFile} not found`);
  mkdirSync(outDir, { recursive: true });
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch({
    executablePath: findChrome(), headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--disable-default-apps', '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE localhost'],
  });
  const written = [], problems = [];
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height: Math.round(width * 9 / 16), deviceScaleFactor: 1 });
    const requests = [];
    page.on('request', r => { if (!/^(data:|file:)/.test(r.url())) requests.push(r.url()); });
    page.on('pageerror', e => problems.push(`script error: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.goto(pathToFileURL(htmlFile).href + '?noboot', { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const nSteps = await page.evaluate(() => window.__deck.nSteps);
    let targets = at.map(t => String(t).split('.').map(Number)).map(([s, k]) => [s, k ?? nSteps[s - 1]]);
    if (!targets.length) targets = all ? nSteps.flatMap((n, i) => Array.from({ length: n + 1 }, (_, k) => [i + 1, k])) : nSteps.map((n, i) => [i + 1, n]);
    for (const [s, k] of targets) {
      if (!(s >= 1 && s <= nSteps.length) || !(k >= 0 && k <= nSteps[s - 1])) throw new Error(`no slide ${s} step ${k}`);
      await page.evaluate((s, k) => { document.getElementById('hint')?.classList.add('gone'); window.__deck.go(s - 1, k, false); }, s, k);
      await new Promise(r => setTimeout(r, 120));
      // layout check: text or boxes that leave the stage
      const out = await page.evaluate(() => {
        const st = document.getElementById('stage').getBoundingClientRect(), bad = [];
        for (const el of document.querySelectorAll('#stage .slide.cur *')) {
          const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
          const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
          if (r.right > st.right + 2 || r.bottom > st.bottom + 2 || r.left < st.left - 2 || r.top < st.top - 2) bad.push((el.id ? '#' + el.id : el.className || el.tagName).toString().slice(0, 40));
        }
        return [...new Set(bad)].slice(0, 5);
      });
      if (out.length) problems.push(`slide ${s} step ${k}: outside the stage: ${out.join(', ')}`);
      const file = join(outDir, `slide-${String(s).padStart(2, '0')}-${k}.png`);
      await page.screenshot({ path: file, type: 'png' });
      written.push(file);
    }
    if (requests.length) problems.push(`the deck asked for ${requests.length} outside address(es): ${requests.slice(0, 3).join(', ')}`);
    if (sheet && written.length > 1) {
      const cols = Math.min(4, Math.ceil(Math.sqrt(written.length))), w = 480, h = 270, gap = 8;
      const rows = Math.ceil(written.length / cols);
      const cells = written.map(f => `<img src="data:image/png;base64,${readFileSync(f).toString('base64')}">`).join('');
      const p2 = await browser.newPage();
      await p2.setViewport({ width: cols * (w + gap) + gap, height: rows * (h + gap) + gap, deviceScaleFactor: 1 });
      await p2.setContent(`<body style="margin:0;background:#222;padding:${gap}px;display:grid;grid-template-columns:repeat(${cols},${w}px);gap:${gap}px">${cells}<style>img{width:${w}px;height:${h}px;display:block}</style>`);
      const file = join(outDir, 'sheet.png');
      await p2.screenshot({ path: file, type: 'png' });
      written.push(file);
    }
  } finally { await browser.close(); }
  return { written, problems };
}
