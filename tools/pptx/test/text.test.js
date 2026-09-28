import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrappedLines, textHeight, capacityFor, measure, charWidth } from '../src/text.js';

test('capacity follows width / (size * 0.52)', () => {
  assert.equal(capacityFor(400, 16), 48);
  assert.equal(capacityFor(10, 40), 1);
});

test('wraps on words, keeps explicit newlines', () => {
  const lines = wrappedLines('Skill gọi bằng lệnh, có bước, có rule, có khuôn', 380, 16);
  assert.deepEqual(lines, ['Skill gọi bằng lệnh, có bước, có rule, có', 'khuôn']);
  assert.deepEqual(wrappedLines('a\n\nb', 100, 10), ['a', '', 'b']);
});

test('height = size + (n-1) * size * lineHeight', () => {
  assert.equal(textHeight('one line', 400, 16), 16);
  assert.equal(textHeight('x'.repeat(10) + ' ' + 'y'.repeat(10), 100, 10, 1.5), 25);
});

// The Japanese deck that passed every check and still overflowed on screen.
test('CJK glyphs are measured full-width, not as 0.52em', () => {
  assert.equal(charWidth('あ'), 1.0);
  assert.equal(charWidth('国'), 1.0);
  assert.equal(charWidth('a'), 0.52);
  assert.equal(measure('国国国', 20), 60);
  assert.equal(measure('abc', 100), 156);
});

test('a Japanese line wraps at half the character count a Latin line does', () => {
  const ja = 'あ'.repeat(40);
  // 400px at 20px: 20 full-width glyphs fit, not the 38 a character count gives.
  const lines = wrappedLines(ja, 400, 20);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].length, 20);
});

test('Japanese breaks between characters despite having no spaces', () => {
  // One "word" by whitespace rules; must still wrap rather than run off the box.
  const lines = wrappedLines('本番稼働のシステムを構築する', 100, 20);
  assert.ok(lines.length > 1, JSON.stringify(lines));
  assert.ok(lines.every(l => l.length <= 5), JSON.stringify(lines));
});

test('kinsoku: a line never starts with Japanese punctuation', () => {
  // "。" would land at the start of line 2 under a naive break.
  const lines = wrappedLines('あいうえおかきくけこ。さしすせそ', 200, 20);
  assert.ok(lines.every(l => !/^[、。ー）」]/.test(l)), JSON.stringify(lines));
});

test('mixed Latin and Japanese measure independently', () => {
  assert.equal(measure('AI国', 100), 52 + 52 + 100);
  const lines = wrappedLines('RAG検索', 200, 20);
  assert.deepEqual(lines, ['RAG検索']);
});

test('height now reflects the real line count for Japanese', () => {
  const ja = 'あ'.repeat(40);
  // 2 lines at 20px, lineHeight 1.3 -> 20 + 26 = 46, not a single 20px line.
  assert.equal(textHeight(ja, 400, 20), 46);
});

test('a word that ends in a closing bracket or quote still wraps', async () => {
  const { textMetrics } = await import('../src/text.js');
  const node = { type: 'text', x: 0, y: 0, width: 200, height: 400, text: 'một (hai) ba (bốn) năm (sáu) bảy (tám) chín (mười) mười một', style: { fontSize: 24 } };
  assert.ok(textMetrics(node).lines.length >= 3);
});
