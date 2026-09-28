import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { parseDeck } from './schema.js';
import { resolveTheme, THEMES } from './themes.js';
import { checkDeck, fitReport } from './checks.js';
import { renderPageSvg } from './render-svg.js';
import { renderPagePng, renderSheetPng } from './render-png.js';
import { exportPptx } from './export-pptx.js';
import { pageClicks } from './animate.js';

const here = dirname(fileURLToPath(import.meta.url));

function load(file) {
  const path = resolve(file);
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const deck = parseDeck(raw);
  const theme = resolveTheme(deck.theme);
  return { deck, theme, baseDir: dirname(path) };
}

function printFindings(findings, json) {
  if (json) { console.log(JSON.stringify(findings, null, 2)); return; }
  if (!findings.length) { console.log('✓ no findings'); return; }
  const icon = { error: '✗', warning: '!', info: 'i' };
  for (const f of findings) {
    const where = f.node ? `p${f.pageIndex + 1} "${f.page}" › ${f.node}` : `p${f.pageIndex + 1} "${f.page}"`;
    console.log(`${icon[f.severity]} ${f.code.padEnd(18)} ${where}\n    ${f.message}`);
  }
  const n = s => findings.filter(f => f.severity === s).length;
  console.log(`\n${n('error')} error, ${n('warning')} warning, ${n('info')} info`);
}

export function makeProgram() {
  const program = new Command().name('mpg').description('Canonical deck JSON → validate → preview → editable PPTX').version('0.1.0');

  program.command('init <file>').description('Write a starter deck JSON to edit')
    .option('--theme <id>', 'theme id', 'carbon')
    .action((file, o) => {
      const tpl = JSON.parse(readFileSync(join(here, '..', 'examples', 'minimal.json'), 'utf8'));
      tpl.theme = o.theme; resolveTheme(o.theme);
      writeFileSync(file, JSON.stringify(tpl, null, 2));
      console.log(`wrote ${file}`);
    });

  program.command('themes').description('List built-in themes').option('--json', 'JSON output')
    .action(o => o.json ? console.log(JSON.stringify(THEMES, null, 2))
      : Object.values(THEMES).forEach(t => console.log(`${t.id.padEnd(8)} ${t.name}  fonts=${t.fonts.heading}/${t.fonts.body}`)));

  program.command('validate <deck>').description('Schema + design checks; exit 1 on errors')
    .option('--json', 'JSON output').option('--fit', 'also print per-text fit table (lines, need, slack)')
    .option('--strict', 'exit 1 on warnings too')
    .action((file, o) => {
      const { deck, theme, baseDir } = load(file);
      const findings = checkDeck(deck, theme, { baseDir });
      if (o.fit && !o.json) {
        console.log('page                     node       lines need  box  slack  first line');
        for (const r of fitReport(deck))
          console.log(`${r.page.slice(0, 24).padEnd(24)} ${r.node.slice(0, 10).padEnd(10)} ${String(r.lines).padStart(5)} ${String(r.need).padStart(4)} ${String(r.box).padStart(4)} ${String(r.slack).padStart(6)}  ${r.preview}`);
        console.log('');
      }
      if (o.json) console.log(JSON.stringify({ pages: deck.pages.length, findings, fit: o.fit ? fitReport(deck) : undefined }, null, 2));
      else printFindings(findings, false);
      const bad = findings.some(f => f.severity === 'error' || (o.strict && f.severity === 'warning'));
      process.exitCode = bad ? 1 : 0;
    });

  program.command('render <deck>').description('Render PNG previews (per page + contact sheet)')
    .requiredOption('--out <dir>', 'output directory')
    .option('--page <n>', 'only this 1-based page')
    .option('--width <px>', 'page PNG width', '1280')
    .option('--svg', 'also write SVG')
    .option('--no-sheet', 'skip contact sheet')
    .action((file, o) => {
      const { deck, theme, baseDir } = load(file);
      mkdirSync(o.out, { recursive: true });
      const pages = o.page ? [deck.pages[Number(o.page) - 1]] : deck.pages;
      const written = [];
      for (const page of pages) {
        const i = deck.pages.indexOf(page) + 1;
        const png = join(o.out, `page-${String(i).padStart(2, '0')}.png`);
        writeFileSync(png, renderPagePng(deck, page, theme, { baseDir, width: Number(o.width) }));
        written.push(png);
        if (o.svg) writeFileSync(png.replace(/png$/, 'svg'), renderPageSvg(deck, page, theme, { baseDir }));
      }
      if (o.sheet && !o.page) {
        const sheet = join(o.out, 'sheet.png');
        writeFileSync(sheet, renderSheetPng(deck, theme, { opts: { baseDir } }));
        written.push(sheet);
      }
      console.log(written.join('\n'));
    });

  program.command('export <deck>').description('Write editable PPTX')
    .requiredOption('--out <file>', 'output .pptx path')
    .option('--force', 'export even when validation has errors')
    .action(async (file, o) => {
      const { deck, theme, baseDir } = load(file);
      const errors = checkDeck(deck, theme, { baseDir }).filter(f => f.severity === 'error');
      if (errors.length && !o.force) { printFindings(errors, false); console.error('\nrefusing to export with errors (use --force)'); process.exitCode = 1; return; }
      mkdirSync(dirname(resolve(o.out)), { recursive: true });
      const buf = await exportPptx(deck, theme, { baseDir });
      writeFileSync(o.out, buf);
      console.log(JSON.stringify({ path: resolve(o.out), bytes: buf.length, slides: deck.pages.length, clicks: deck.pages.map(pageClicks) }));
    });

  program.command('build <deck>').description('validate → render → export in one go')
    .requiredOption('--out <dir>', 'output directory')
    .option('--force', 'export even when validation has errors')
    .action(async (file, o) => {
      const { deck, theme, baseDir } = load(file);
      const findings = checkDeck(deck, theme, { baseDir });
      printFindings(findings, false);
      mkdirSync(o.out, { recursive: true });
      deck.pages.forEach((page, i) => writeFileSync(join(o.out, `page-${String(i + 1).padStart(2, '0')}.png`), renderPagePng(deck, page, theme, { baseDir, width: 1280 })));
      writeFileSync(join(o.out, 'sheet.png'), renderSheetPng(deck, theme, { opts: { baseDir } }));
      const errors = findings.filter(f => f.severity === 'error');
      if (errors.length && !o.force) { console.error(`\n${errors.length} error(s): previews written to ${o.out}, PPTX skipped (fix or --force)`); process.exitCode = 1; return; }
      const out = join(o.out, 'deck.pptx');
      const buf = await exportPptx(deck, theme, { baseDir });
      writeFileSync(out, buf);
      console.log(`\nsheet:  ${join(o.out, 'sheet.png')}\npptx:   ${out} (${buf.length} bytes, ${deck.pages.length} slides, ${deck.pages.reduce((a, p) => a + pageClicks(p), 0)} click builds)`);
    });

  return program;
}
