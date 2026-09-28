import { Resvg } from '@resvg/resvg-js';
import { renderPageSvg } from './render-svg.js';

export function svgToPng(svg, { width, defaultFont = 'Arial' } = {}) {
  const r = new Resvg(svg, {
    fitTo: width ? { mode: 'width', value: width } : { mode: 'original' },
    font: { loadSystemFonts: true, defaultFontFamily: defaultFont },
  });
  return r.render().asPng();
}

export function renderPagePng(deck, page, theme, opts = {}) {
  return svgToPng(renderPageSvg(deck, page, theme, opts), { width: opts.width, defaultFont: theme.fonts.body });
}

/** Contact sheet: all pages tiled with captions, so an agent can review a deck in one Read. */
export function renderSheetPng(deck, theme, { columns = 3, tile = 480, opts = {} } = {}) {
  const pages = deck.pages;
  const cap = 28, gap = 24;
  const rows = Math.ceil(pages.length / columns);
  const th = Math.round(tile * (pages[0].height / pages[0].width));
  const W = gap + columns * (tile + gap), H = gap + rows * (th + cap + gap);
  const cells = pages.map((page, i) => {
    const png = renderPagePng(deck, page, theme, { ...opts, width: tile }).toString('base64');
    const x = gap + (i % columns) * (tile + gap), y = gap + Math.floor(i / columns) * (th + cap + gap);
    return `<image x="${x}" y="${y}" width="${tile}" height="${th}" href="data:image/png;base64,${png}"/>` +
      `<rect x="${x}" y="${y}" width="${tile}" height="${th}" fill="none" stroke="#c8c8c8"/>` +
      `<text x="${x}" y="${y + th + 20}" font-family="Arial, sans-serif" font-size="14" fill="#333">${i + 1}. ${String(page.name).replace(/[<&]/g, '')}</text>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#eceff3"/>${cells}</svg>`;
  return svgToPng(svg, { defaultFont: theme.fonts.body });
}
