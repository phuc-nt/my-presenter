// Text measurement model. Deliberately simple and deterministic: the same
// function drives the overflow/collision checks, the SVG preview and the box
// sizes handed to PowerPoint, so what the check says matches what you see.
//
// A line is measured by summing per-character advances, not by counting
// characters. Latin glyphs average CHAR_W of an em; CJK glyphs are full-width
// and take a whole em. Counting characters instead cost us a whole Japanese
// deck: the checker reported "no findings" on slides that visibly overflowed,
// because it believed ~2x more Japanese characters fit on a line than really do.
// Real fonts wrap slightly earlier or later; keep >=10 % slack in every box.
export const CHAR_W = 0.52;        // average Latin advance, in em
export const WIDE_CHAR_W = 1.0;    // East Asian Wide / Fullwidth advance, in em

// East Asian Wide (W) and Fullwidth (F) ranges: CJK ideographs, kana, Hangul,
// fullwidth forms, and the CJK punctuation that travels with them.
const WIDE = /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︐-︙︰-﹯＀-｠￠-￦]|[\u{20000}-\u{3FFFD}]/u;

/** Advance of one character, in em. */
export function charWidth(ch) {
  return WIDE.test(ch) ? WIDE_CHAR_W : CHAR_W;
}

/** Width of a string at `size` px. */
export function measure(value, size) {
  let w = 0;
  for (const ch of String(value ?? '')) w += charWidth(ch) * size;
  return w;
}

/**
 * Characters per line for Latin text. Kept for callers that size boxes by
 * character count; `measure` is the accurate route for mixed scripts.
 */
export function capacityFor(width, size) {
  return Math.max(1, Math.floor(width / (size * CHAR_W)));
}

// Kinsoku shori: characters that may not open a line (closing brackets, the
// Japanese comma and full stop, small kana, the long-vowel mark) and those that
// may not end one (opening brackets). Breaking here is what produced the
// orphaned "らか" and a line holding nothing but the full stop.
const NO_LINE_START = /[、。，．・：；？！ー〜々ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ）］｝〉》」』】〕”’)\]}»々〜！），．：；？］｝]/;
const NO_LINE_END = /[（［｛〈《「『【〔“‘(\[{«（［｛]/;

const isWide = ch => WIDE.test(ch);

/**
 * Split a paragraph into break-candidate tokens. Latin runs stay whole so they
 * wrap on spaces; each CJK character is its own token so a run of Japanese --
 * which contains no spaces at all -- can break between characters the way it
 * does in PowerPoint, instead of being treated as one unbreakable word.
 */
function tokenize(para) {
  const tokens = [];
  let latin = '';
  for (const ch of para) {
    if (isWide(ch)) {
      if (latin) { tokens.push(latin); latin = ''; }
      tokens.push(ch);
    } else if (/\s/.test(ch)) {
      if (latin) { tokens.push(latin); latin = ''; }
      tokens.push(' ');
    } else {
      latin += ch;
    }
  }
  if (latin) tokens.push(latin);
  return tokens;
}

export function wrappedLines(value, width, size) {
  const limit = Math.max(width, size * CHAR_W);
  const out = [];

  for (const para of String(value ?? '').split('\n')) {
    if (!para) { out.push(''); continue; }

    const tokens = tokenize(para);
    let line = '';
    let lineW = 0;

    const push = () => { out.push(line); line = ''; lineW = 0; };

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token === ' ') {
        if (line) { line += ' '; lineW += charWidth(' ') * size; }
        continue;
      }

      let tokenW = measure(token, size);

      // A single token wider than the box: hard-split it across lines.
      if (tokenW > limit) {
        if (line) push();
        let chunk = '';
        let chunkW = 0;
        for (const ch of token) {
          const w = charWidth(ch) * size;
          if (chunkW + w > limit && chunk) { out.push(chunk); chunk = ''; chunkW = 0; }
          chunk += ch;
          chunkW += w;
        }
        line = chunk;
        lineW = chunkW;
        continue;
      }

      if (line && lineW + tokenW > limit) {
        // Kinsoku: never strand punctuation at the start of the next line, and
        // never leave an opening bracket at the end of this one. Pull the
        // offending character across the break instead.
        if ([...token].length === 1 && NO_LINE_START.test(token)) {
          line += token;          // let this line run slightly over
          lineW += tokenW;
          continue;
        }
        let carry = '';
        while (line && NO_LINE_END.test(line[line.length - 1])) {
          carry = line[line.length - 1] + carry;
          line = line.slice(0, -1);
        }
        const trimmed = line.replace(/\s+$/, '');
        if (trimmed) out.push(trimmed); else if (line) out.push(line);
        line = carry;
        lineW = measure(carry, size);
      }

      line += token;
      lineW += tokenW;
    }

    out.push(line.replace(/\s+$/, ''));
  }

  return out;
}

export function textMetrics(node) {
  const size = Number(node.style?.fontSize ?? 24);
  const lineHeight = Number(node.style?.lineHeight ?? 1.3);
  const lines = wrappedLines(node.text ?? '', node.width, size);
  const height = size + (lines.length - 1) * size * lineHeight;
  return { size, lineHeight, lines, height, bottom: node.y + height };
}

/** Height a text box needs; use when constructing nodes. */
export function textHeight(text, width, size, lineHeight = 1.3) {
  const n = wrappedLines(text, width, size).length;
  return size + (n - 1) * size * lineHeight;
}
