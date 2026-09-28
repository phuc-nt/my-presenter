// Design checks. Everything here was learned from real decks: the runtime
// overflow rule alone passed a deck that had three visible layout defects,
// because each text box fit itself while colliding with its neighbour or
// hugging the bottom of its card. Hence `collision` and `containment`.
import { existsSync } from 'node:fs';
import { textMetrics } from './text.js';
import { resolveColor } from './themes.js';

const SEVERITY = { error: 0, warning: 1, info: 2 };

function luminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  const c = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrastRatio(a, b) {
  const la = luminance(a), lb = luminance(b);
  if (la == null || lb == null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const contains = (outer, inner, pad = 1) =>
  inner.x >= outer.x - pad && inner.x + inner.width <= outer.x + outer.width + pad &&
  inner.y >= outer.y - pad && inner.y <= outer.y + outer.height;

const intersects = (a, b) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** Topmost opaque shape drawn *before* `node` whose box contains it, else page background. */
function backgroundBehind(page, index, node, theme) {
  for (let i = index - 1; i >= 0; i--) {
    const s = page.nodes[i];
    if (s.type !== 'shape' || s.visible === false || (s.style?.shape === 'line')) continue;
    if ((s.opacity ?? 1) < 0.5) continue;
    if (contains(s, node)) return resolveColor(s.style?.fill ?? '$surface', theme);
  }
  return resolveColor(page.background, theme);
}

export function checkDeck(deck, theme, { baseDir = process.cwd() } = {}) {
  const findings = [];
  const add = (severity, code, page, node, message, extra = {}) =>
    findings.push({ severity, code, page: page.name, pageIndex: deck.pages.indexOf(page), node: node?.name, nodeId: node?.id, message, ...extra });

  for (const page of deck.pages) {
    const visible = page.nodes.filter(n => n.visible !== false);
    if (visible.length === 0) add('error', 'empty-page', page, null, 'Page has no visible nodes.');
    if (visible.length > 120) add('info', 'dense-page', page, null, `${visible.length} nodes on one page; PowerPoint editing gets slow past ~100.`);

    const texts = [];
    page.nodes.forEach((node, index) => {
      if (node.visible === false) return;
      if (node.width <= 0 || node.height <= 0) add('error', 'zero-size', page, node, 'Node has zero width or height.');
      if (node.x < 0 || node.y < 0 || node.x + node.width > page.width + 0.5 || node.y + node.height > page.height + 0.5)
        add('error', 'outside-page', page, node, `Node extends outside the ${page.width}×${page.height} page.`);

      if (node.type === 'image') {
        const isData = node.src.startsWith('data:');
        const isRemote = /^https?:/i.test(node.src);
        if (isRemote) add('error', 'remote-image', page, node, 'Remote images are not fetched; download and reference a local file.');
        else if (!isData && !existsSync(new URL(node.src, `file://${baseDir}/`).pathname))
          add('error', 'missing-image', page, node, `Image file not found: ${node.src}`);
      }

      if (node.type !== 'text') return;
      const m = textMetrics(node);
      texts.push({ node, m, index });
      if (!node.text.trim()) add('warning', 'empty-text', page, node, 'Text node is empty.');
      if (m.height > node.height + 1)
        add('error', 'text-overflow', page, node, `Needs ${m.height.toFixed(0)}px for ${m.lines.length} lines but box is ${node.height}px.`, { lines: m.lines });
      if (m.size < 12) add('info', 'small-text', page, node, `${m.size}px text is hard to read when projected (min 12, body 16+).`);

      const bg = backgroundBehind(page, index, node, theme);
      const fg = resolveColor(node.style?.fill ?? '$text', theme);
      const ratio = contrastRatio(fg, bg);
      const weight = Number(node.style?.fontWeight === 'bold' ? 700 : node.style?.fontWeight ?? 400);
      const large = m.size >= 24 || (m.size >= 18.67 && weight >= 700);
      const decorative = !/[\p{L}\p{N}]/u.test(node.text);   // arrows, bullets, dividers
      if (ratio != null && ratio < (large ? 3 : 4.5) && !decorative)
        add('warning', 'text-contrast', page, node, `Contrast ${ratio.toFixed(2)}:1 (${fg} on ${bg}); need ${large ? 3 : 4.5}:1.`);

      // containment: text drawn over a card must not hug or cross its bottom edge
      for (let i = index - 1; i >= 0; i--) {
        const s = page.nodes[i];
        if (s.type !== 'shape' || s.style?.shape === 'line' || s.height < 40) continue;
        if (!contains(s, node)) continue;
        const slack = s.y + s.height - m.bottom;
        if (slack < 0) add('warning', 'text-spills-card', page, node, `Text bottom ${m.bottom.toFixed(0)} crosses card "${s.name}" bottom ${s.y + s.height} by ${(-slack).toFixed(0)}px.`);
        else if (slack < 10) add('warning', 'text-tight-card', page, node, `Only ${slack.toFixed(0)}px between text and bottom of card "${s.name}" (want ≥10).`);
        break;
      }
    });

    // collision: measured text boxes (not declared heights) must not intersect
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i], b = texts[j];
      const boxA = { x: a.node.x, y: a.node.y, width: a.node.width, height: a.m.height };
      const boxB = { x: b.node.x, y: b.node.y, width: b.node.width, height: b.m.height };
      if (intersects(boxA, boxB)) {
        const overlap = Math.min(boxA.y + boxA.height, boxB.y + boxB.height) - Math.max(boxA.y, boxB.y);
        add('warning', 'text-collision', page, a.node, `Overlaps "${b.node.name}" by ${overlap.toFixed(0)}px vertically (${a.m.lines.length} vs ${b.m.lines.length} lines).`, { other: b.node.name });
      }
    }
  }

  findings.sort((x, y) => SEVERITY[x.severity] - SEVERITY[y.severity] || x.pageIndex - y.pageIndex);
  return findings;
}

/** Per-text-node fit report: lines, needed height, slack. Use it before looking at pixels. */
export function fitReport(deck) {
  const rows = [];
  for (const page of deck.pages) for (const node of page.nodes) {
    if (node.type !== 'text' || node.visible === false) continue;
    const m = textMetrics(node);
    rows.push({ page: page.name, node: node.name, lines: m.lines.length, need: Math.round(m.height), box: node.height, slack: Math.round(node.height - m.height), preview: m.lines[0]?.slice(0, 50) });
  }
  return rows;
}
