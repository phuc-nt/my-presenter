// SVG preview of one page. Uses the same wrap model as the checks, so a
// collision the check reports is visible here and vice versa.
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { textMetrics } from './text.js';
import { resolveColor, resolveFont } from './themes.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

function imageHref(src, baseDir) {
  if (src.startsWith('data:')) return src;
  const path = new URL(src, `file://${baseDir}/`).pathname;
  const mime = MIME[extname(path).toLowerCase()] ?? 'application/octet-stream';
  return `data:${mime};base64,${readFileSync(path).toString('base64')}`;
}

export function renderPageSvg(deck, page, theme, { baseDir = process.cwd() } = {}) {
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${page.width}" height="${page.height}" viewBox="0 0 ${page.width} ${page.height}">`);
  parts.push(`<rect width="100%" height="100%" fill="${resolveColor(page.background, theme)}"/>`);

  for (const node of page.nodes) {
    if (node.visible === false) continue;
    const opacity = node.opacity ?? 1;
    const transform = node.rotation ? ` transform="rotate(${node.rotation} ${node.x + node.width / 2} ${node.y + node.height / 2})"` : '';
    const common = `${transform}${opacity !== 1 ? ` opacity="${opacity}"` : ''}`;

    if (node.type === 'shape') {
      const st = node.style ?? {};
      const kind = st.shape ?? 'rect';
      const fill = st.fill === 'none' ? 'none' : resolveColor(st.fill ?? '$surface', theme);
      const stroke = st.stroke ? ` stroke="${resolveColor(st.stroke, theme)}" stroke-width="${st.strokeWidth ?? 1}"` : '';
      if (kind === 'ellipse')
        parts.push(`<ellipse cx="${node.x + node.width / 2}" cy="${node.y + node.height / 2}" rx="${node.width / 2}" ry="${node.height / 2}" fill="${fill}"${stroke}${common}/>`);
      else if (kind === 'line')
        parts.push(`<line x1="${node.x}" y1="${node.y}" x2="${node.x + node.width}" y2="${node.y + node.height}" stroke="${resolveColor(st.stroke ?? st.fill ?? '$border', theme)}" stroke-width="${st.strokeWidth ?? 1}"${common}/>`);
      else
        parts.push(`<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${st.borderRadius ?? theme.radius ?? 0}" fill="${fill}"${stroke}${common}/>`);
      continue;
    }

    if (node.type === 'image') {
      const pa = node.fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice';
      parts.push(`<image x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" preserveAspectRatio="${pa}" href="${imageHref(node.src, baseDir)}"${common}/>`);
      continue;
    }

    // text
    const st = node.style ?? {};
    const m = textMetrics(node);
    const align = st.textAlign ?? 'left';
    const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
    const tx = align === 'center' ? node.x + node.width / 2 : align === 'right' ? node.x + node.width : node.x;
    const weight = st.fontWeight ?? 400;
    const attrs = [
      `font-family="${esc(resolveFont(st.fontFamily, theme))}, Arial, sans-serif"`,
      `font-size="${m.size}"`, `font-weight="${weight}"`,
      st.fontStyle === 'italic' ? 'font-style="italic"' : '',
      st.letterSpacing ? `letter-spacing="${st.letterSpacing}"` : '',
      `fill="${resolveColor(st.fill ?? '$text', theme)}"`, `text-anchor="${anchor}"`,
    ].filter(Boolean).join(' ');
    // first baseline ≈ y + ascent (0.8em); subsequent lines step by lineHeight
    const lines = m.lines.map((line, i) =>
      `<tspan x="${tx}" y="${node.y + m.size * 0.8 + i * m.size * m.lineHeight}">${esc(line) || ' '}</tspan>`).join('');
    parts.push(`<text ${attrs}${common}>${lines}</text>`);
  }
  parts.push('</svg>');
  return parts.join('\n');
}
