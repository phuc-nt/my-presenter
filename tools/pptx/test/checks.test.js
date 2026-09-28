import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDeck } from '../src/schema.js';
import { resolveTheme } from '../src/themes.js';
import { checkDeck, contrastRatio } from '../src/checks.js';

const theme = resolveTheme('carbon');
const deck = nodes => parseDeck({ name: 't', pages: [{ name: 'p', nodes }] });
const codes = f => f.map(x => x.code);

test('collision: a wrapping row overlaps the row 30px below it (real p6 defect)', () => {
  const f = checkDeck(deck([
    { type: 'shape', x: 72, y: 200, width: 1136, height: 118, style: { fill: '$accent' } },
    { type: 'text', name: 'form', x: 468, y: 234, width: 380, height: 40, text: 'Skill gọi bằng lệnh, có bước, có rule, có khuôn', style: { fontSize: 16, fill: '$background' } },
    { type: 'text', name: 'prob', x: 468, y: 264, width: 380, height: 22, text: 'Phải dựng và bảo trì', style: { fontSize: 16, fill: '$background' } },
  ]), theme);
  assert.ok(codes(f).includes('text-collision'), codes(f).join());
  assert.ok(!codes(f).includes('text-overflow'));
});

test('containment: text hugging the card bottom is flagged', () => {
  const f = checkDeck(deck([
    { type: 'shape', name: 'card', x: 72, y: 100, width: 600, height: 118 },
    { type: 'text', x: 100, y: 174, width: 400, height: 44, text: 'Vẫn phải nhớ dùng khi nào, sửa prompt không ai biết', style: { fontSize: 16 } },
  ]), theme);
  assert.ok(codes(f).includes('text-tight-card'), codes(f).join());
});

test('contrast uses the shape actually behind the text, not parentId', () => {
  const f = checkDeck(deck([
    { type: 'shape', x: 0, y: 0, width: 600, height: 200, style: { fill: '$accent' } },
    { type: 'text', x: 20, y: 20, width: 400, height: 30, text: 'white on blue', style: { fontSize: 20, fill: '$background' } },
  ]), theme);
  assert.ok(!codes(f).includes('text-contrast'), codes(f).join());
  assert.ok(contrastRatio('#ffffff', '#0f62fe') > 4.5);
});

test('overflow and outside-page are errors', () => {
  const f = checkDeck(deck([
    { type: 'text', x: 1200, y: 10, width: 200, height: 10, text: 'a long line that cannot fit in a ten pixel tall box at all', style: { fontSize: 16 } },
  ]), theme);
  assert.deepEqual(new Set(codes(f).filter(c => c !== 'text-contrast')), new Set(['outside-page', 'text-overflow']));
  assert.ok(f.every(x => x.code !== 'text-overflow' || x.severity === 'error'));
});
