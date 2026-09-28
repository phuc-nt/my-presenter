import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildDeck, themes, TOOL } from '../src/build.js';
import { checkHtml } from '../src/check.js';
import { parseScript, pptxNotes } from '../src/script.js';
import { cleanImage } from '../src/clean-image.js';

const starter = name => { const d = mkdtempSync(join(tmpdir(), 'deck-')); cpSync(join(TOOL, 'starters', name), d, { recursive: true }); return d; };

for (const t of themes().map(t => t.name)) test(`starter ${t} builds clean and self-contained`, () => {
  const r = buildDeck(starter(t));
  assert.deepEqual(r.findings, []);
  assert.equal(r.clicks[1], 3);
  assert.match(r.html, /Content-Security-Policy/);
  assert.doesNotMatch(r.html, /\{\{[A-Z]+:/);
  assert.deepEqual(checkHtml(r.html), []);
});

test('click count must match the script', () => {
  const d = starter('plain'), f = join(d, 'slides.html');
  writeFileSync(f, readFileSync(f, 'utf8').replace('data-step="3"', 'data-step="2"'));
  assert.throws(() => buildDeck(d), /slide 2/i);
});

test('a forbidden word stops the build', () => {
  const d = starter('plain'), f = join(d, 'deck.config.json');
  const c = JSON.parse(readFileSync(f, 'utf8')); c.forbid = ['Liên hệ']; writeFileSync(f, JSON.stringify(c));
  assert.ok(buildDeck(d).findings.length > 0);
});

test('check finds network, local paths and keys', () => {
  const bad = [
    '<img src="https://example.com/a.png">', '<style>@import "x.css";</style>', '<style>a{background:url(//cdn.x/y.png)}</style>',
    '<script>fetch("/x")</script>', '<script>new WebSocket("ws://x")</script>', '<iframe src="a.html"></iframe>',
    '<link rel="stylesheet" href="a.css">', '<p>/Users/someone/secret</p>', `<p>${'AIza'}SyA1234567890abcdefghijklmnopqrstuvw</p>`,
    '<img srcset="https://x/a.png 2x">', '<a ping="https://x/p" href="#2">', '<meta http-equiv="refresh" content="0;url=https://x">',
    '<base href="/">', '<script>new RTCPeerConnection()</script>', '<script>window.open("x")</script>', '<script>location.href = "x"</script>',
    `<p>${'AKIA'}ABCDEFGHIJKLMNOP</p>`, `<pre>-----BEGIN OPENSSH ${'PRIVATE'} KEY-----</pre>`,
  ];
  for (const b of bad) assert.ok(checkHtml(`<meta http-equiv="Content-Security-Policy" content="default-src 'none'">${b}`).length > 0, b);
  assert.ok(checkHtml('<p>no csp</p>').length > 0);
});

test('script parser counts click marks and makes PPTX notes', () => {
  const s = parseScript(join(TOOL, 'starters', 'plain', 'script.md'));
  assert.deepEqual(s.map(x => x.clicks), [0, 3, 1]);
  assert.match(pptxNotes(s[1]), /Ý thứ nhất/);
});

// minimal files with the metadata a camera or editor leaves behind
const pngChunk = (type, data) => {
  const b = Buffer.alloc(12 + data.length);
  b.writeUInt32BE(data.length, 0); b.write(type, 4, 'latin1'); data.copy(b, 8);
  return b;                                           // CRC left zero: the cleaner does not read it
};
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  pngChunk('IHDR', Buffer.alloc(13)), pngChunk('tEXt', Buffer.from('Author\0Someone')), pngChunk('eXIf', Buffer.from('GPS')),
  pngChunk('IDAT', Buffer.from('pixels')), pngChunk('IEND', Buffer.alloc(0))]);
const seg = (marker, body) => { const h = Buffer.from([0xff, marker, 0, 0]); h.writeUInt16BE(body.length + 2, 2); return Buffer.concat([h, body]); };
const exif = o => Buffer.concat([Buffer.from('Exif\0\0MM\0\x2a\0\0\0\x08\0\x02', 'latin1'),
  Buffer.from([0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, o, 0, 0]), Buffer.from([0x88, 0x25, 0, 4, 0, 0, 0, 1, 0, 0, 0, 0x40]),
  Buffer.from([0, 0, 0, 0]), Buffer.from('GPS 21.0285N 105.8542E', 'latin1')]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8]), seg(0xe0, Buffer.from('JFIF\0\x01\x01')), seg(0xe1, exif(6)),
  seg(0xed, Buffer.from('Photoshop 3.0 IPTC byline')), seg(0xfe, Buffer.from('taken by someone')), seg(0xdb, Buffer.alloc(8)),
  Buffer.from([0xff, 0xda, 0, 2]), Buffer.from('scan'), Buffer.from([0xff, 0xd9])]);

test('images lose their metadata, keep their pixels', () => {
  const png = cleanImage(PNG, 'image/png').toString('latin1');
  assert.doesNotMatch(png, /Someone|GPS|tEXt|eXIf/);
  assert.match(png, /IHDR[\s\S]*IDAT[\s\S]*IEND/);

  const jpg = cleanImage(JPEG, 'image/jpeg');
  assert.doesNotMatch(jpg.toString('latin1'), /GPS|Photoshop|someone/);
  assert.match(jpg.toString('latin1'), /JFIF[\s\S]*scan/);
  const app1 = jpg.indexOf(Buffer.from([0xff, 0xe1]));
  assert.ok(app1 > 0, 'orientation kept');
  assert.equal(jpg[app1 + 4 + 6 + 8 + 2 + 9], 6, 'orientation value');

  const svg = cleanImage(Buffer.from('<svg xmlns:inkscape="i" inkscape:export-filename="/Users/someone/a.png"><!-- by someone --><metadata>author</metadata><rect/></svg>'), 'image/svg+xml').toString();
  assert.doesNotMatch(svg, /someone|author/);
  assert.match(svg, /<rect\/>/);
});

test('a built deck carries no image metadata', () => {
  const r = buildDeck(starter('win95'));
  assert.match(r.html, /data:image\/png;base64,/);
  for (const m of r.html.matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)) assert.doesNotMatch(Buffer.from(m[1], 'base64').toString('latin1'), /tEXt|iTXt|eXIf|tIME/);
});
