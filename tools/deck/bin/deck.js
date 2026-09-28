#!/usr/bin/env node
// deck: single-file HTML decks. See `deck help`.
import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { buildDeck, themes, TOOL } from '../src/build.js';
import { checkHtml } from '../src/check.js';
import { parseScript, pptxNotes } from '../src/script.js';

const HELP = `deck — single-file HTML decks with click builds and speaker notes

  deck init <dir> [--theme win95|plain]     starter deck folder
  deck build <dir> [--out file.html]        build; default <dir>/out/<name>.html
  deck check <file.html> [--forbid a,b]     offline and privacy check of any HTML file
  deck shots <file.html> --out <dir> [--at 3,5.2] [--all] [--no-sheet]
                                            PNG per slide (last step), or per step with --all
  deck notes <dir> --into <pptx.json>       copy script.md into the notes of a PPTX deck JSON
  deck themes                               list themes
`;
const argv = process.argv.slice(2);
const cmd = argv.shift();
const flags = {}, args = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) { const k = a.slice(2); flags[k] = ['all', 'no-sheet'].includes(k) ? true : argv[++i]; } else args.push(a);
}
const need = (v, what) => { if (!v) { console.error(`deck ${cmd}: ${what} is required\n\n${HELP}`); process.exit(2); } return v; };

try {
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') console.log(HELP);
  else if (cmd === '--version' || cmd === 'version') console.log(JSON.parse(readFileSync(join(TOOL, 'package.json'), 'utf8')).version);
  else if (cmd === 'themes') for (const t of themes()) console.log(`${t.name.padEnd(8)} ${t.description}`);
  else if (cmd === 'init') {
    const dir = resolve(need(args[0], 'a folder'));
    if (existsSync(join(dir, 'slides.html'))) throw new Error(`${dir} already holds a deck`);
    const theme = flags.theme ?? 'plain';
    const src = join(TOOL, 'starters', theme);
    if (!existsSync(src)) throw new Error(`no starter for theme "${theme}"`);
    mkdirSync(dir, { recursive: true });
    cpSync(src, dir, { recursive: true });
    console.log(`wrote ${dir}: deck.config.json, slides.html, script.md\nnext: deck build ${args[0]}`);
  } else if (cmd === 'build') {
    const dir = need(args[0], 'a deck folder');
    const r = buildDeck(dir);
    const out = resolve(flags.out ?? join(dir, 'out', `${r.name}.html`));
    mkdirSync(dirname(out), { recursive: true });
    if (r.findings.length) { console.error(r.findings.map(f => `✗ ${f}`).join('\n')); throw new Error('the deck is not self-contained or names something private; nothing written'); }
    writeFileSync(out, r.html);
    console.log(JSON.stringify({ path: out, bytes: Buffer.byteLength(r.html), slides: r.slides, clicks: r.clicks }));
  } else if (cmd === 'check') {
    const f = checkHtml(readFileSync(need(args[0], 'an HTML file'), 'utf8'), { forbid: (flags.forbid ?? '').split(',').filter(Boolean) });
    if (f.length) { console.error(f.map(x => `✗ ${x}`).join('\n')); process.exitCode = 1; } else console.log('✓ self-contained: no network address, no local path, no key');
  } else if (cmd === 'shots') {
    const { shoot } = await import('../src/shots.js');
    const r = await shoot(need(args[0], 'an HTML file'), resolve(need(flags.out, '--out')), { at: (flags.at ?? '').split(',').filter(Boolean), all: !!flags.all, sheet: !flags['no-sheet'] });
    console.log(r.written.join('\n'));
    if (r.problems.length) { console.error(r.problems.map(x => `! ${x}`).join('\n')); process.exitCode = 1; }
  } else if (cmd === 'notes') {
    const dir = need(args[0], 'a deck folder'), into = resolve(need(flags.into, '--into'));
    const script = parseScript(join(dir, 'script.md'));
    const cfgFile = join(dir, 'deck.config.json');
    const lang = existsSync(cfgFile) ? JSON.parse(readFileSync(cfgFile, 'utf8')).lang ?? 'vi' : 'vi';
    const deck = JSON.parse(readFileSync(into, 'utf8'));
    if (deck.pages.length !== script.length) throw new Error(`${into} has ${deck.pages.length} pages, script.md has ${script.length} slides`);
    deck.pages.forEach((p, i) => {
      const clicks = Math.max(0, ...p.nodes.map(n => n.step ?? 0));
      if (clicks !== script[i].clicks) throw new Error(`page ${i + 1}: ${clicks} click steps in the JSON, script.md says ${script[i].clicks}`);
      p.notes = pptxNotes(script[i], lang);
    });
    writeFileSync(into, JSON.stringify(deck, null, 1));
    console.log(`notes written to ${deck.pages.length} pages of ${into}`);
  } else { console.error(`deck: unknown command "${cmd}"\n\n${HELP}`); process.exitCode = 2; }
} catch (e) { console.error(`deck: ${e.message}`); process.exitCode = 1; }
