// Editable PPTX: every text node becomes a real text box, every shape a real
// shape. Nothing is rasterised, so the recipient can restyle in PowerPoint.
import PptxGenJS from 'pptxgenjs';
import { resolveColor, resolveFont } from './themes.js';
import { animatePptx } from './animate.js';
import { readFileSync } from 'node:fs';
import { extname, basename } from 'node:path';
import { cleanImage } from './clean-image.js';

const PX = 96;                      // canvas px per inch
const hex = c => c.replace('#', '').toUpperCase();
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

// Images go in as data, without their metadata (GPS, device, author; see clean-image.js).
function imageData(src, baseDir) {
  const m = /^data:([^;,]+);base64,(.*)$/s.exec(src);
  if (m) return `data:${m[1]};base64,${cleanImage(Buffer.from(m[2], 'base64'), m[1]).toString('base64')}`;
  const file = new URL(src, `file://${baseDir}/`).pathname;
  const mime = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
  return `data:${mime};base64,${cleanImage(readFileSync(file), mime).toString('base64')}`;
}

export async function exportPptx(deck, theme, { baseDir = process.cwd() } = {}) {
  const pptx = new PptxGenJS();
  const first = deck.pages[0];
  pptx.defineLayout({ name: 'DECK', width: first.width / PX, height: first.height / PX });
  pptx.layout = 'DECK';
  pptx.title = deck.name;

  for (const page of deck.pages) {
    const slide = pptx.addSlide();
    slide.background = { color: hex(resolveColor(page.background, theme)) };
    // pages may differ in size; scale each into the deck's slide box
    const sx = first.width / page.width / PX, sy = first.height / page.height / PX;

    for (const node of page.nodes) {
      if (node.visible === false) continue;
      const base = { x: node.x * sx, y: node.y * sy, w: node.width * sx, h: node.height * sy, rotate: node.rotation ?? 0 };
      const transparency = Math.round((1 - (node.opacity ?? 1)) * 100);

      if (node.type === 'text') {
        const st = node.style ?? {};
        const weight = st.fontWeight === 'bold' ? 700 : Number(st.fontWeight ?? 400);
        slide.addText(node.text, {
          ...base,
          fontFace: resolveFont(st.fontFamily, theme),
          fontSize: Number(st.fontSize ?? 24) * 0.75,
          color: hex(resolveColor(st.fill ?? '$text', theme)),
          bold: weight >= 600, italic: st.fontStyle === 'italic',
          align: st.textAlign ?? 'left', valign: 'top',
          lineSpacingMultiple: Number(st.lineHeight ?? 1.3),
          charSpacing: st.letterSpacing ? Number(st.letterSpacing) * 0.75 : undefined,
          margin: 0, transparency, wrap: true, fit: 'none',
        });
      } else if (node.type === 'shape') {
        const st = node.style ?? {};
        const kind = st.shape ?? 'rect';
        if (kind === 'line') {
          slide.addShape(pptx.ShapeType.line, { ...base, line: { color: hex(resolveColor(st.stroke ?? st.fill ?? '$border', theme)), width: (st.strokeWidth ?? 1) * 0.75, transparency } });
          continue;
        }
        const radius = st.borderRadius ?? theme.radius ?? 0;
        const type = kind === 'ellipse' ? pptx.ShapeType.ellipse : radius > 0 ? pptx.ShapeType.roundRect : pptx.ShapeType.rect;
        const opts = { ...base, fill: st.fill === 'none' ? { type: 'none' } : { color: hex(resolveColor(st.fill ?? '$surface', theme)), transparency } };
        if (st.stroke) opts.line = { color: hex(resolveColor(st.stroke, theme)), width: (st.strokeWidth ?? 1) * 0.75 };
        else opts.line = { type: 'none' };
        if (type === pptx.ShapeType.roundRect) opts.rectRadius = Math.min(radius * sx, Math.min(base.w, base.h) / 2);
        slide.addShape(type, opts);
      } else if (node.type === 'image') {
        const src = { data: imageData(node.src, baseDir), ...(node.src.startsWith('data:') ? {} : { altText: basename(node.src) }) };
        const sizing = node.fit ? { sizing: { type: node.fit, w: base.w, h: base.h } } : {};
        slide.addImage({ ...base, ...src, ...sizing, transparency });
      }
    }
    if (page.notes) slide.addNotes(page.notes);
  }
  const plain = Buffer.from(await pptx.write({ outputType: 'nodebuffer' }));
  return (await animatePptx(plain, deck)).buffer;
}
