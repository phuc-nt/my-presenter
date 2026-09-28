// The speaker script: one "## Slide N — Title" block per slide, with a
// "**Bấm:** n" (or "**Clicks:** n") line and the words to say after
// "**Nói:**" (or "**Say:**"). "**[bấm]**" in the words marks each click.
import { readFileSync } from 'node:fs';

export const MARK = '[bấm]';

export function parseScript(file) {
  const src = readFileSync(file, 'utf8');
  const slides = [];
  const re = /^## Slide (\d+)\s*[—–-]\s*(.+?)\n([\s\S]*?)(?=^## Slide |(?![\s\S]))/gm;
  for (const m of src.matchAll(re)) {
    const body = m[3];
    const clicks = Number(/\*\*(?:Bấm|Clicks):\*\*\s*(\d+)/.exec(body)?.[1] ?? 0);
    const say = (body.split(/\*\*(?:Nói|Say):\*\*/)[1] ?? '').trim()
      .replace(/\*\*\[(?:bấm|click)\]\*\*/g, MARK).replace(/\[click\]/g, MARK);
    slides.push({ n: Number(m[1]), title: m[2].trim(), clicks, say });
  }
  slides.sort((a, b) => a.n - b.n);
  slides.forEach((s, i) => { if (s.n !== i + 1) throw new Error(`script: expected "## Slide ${i + 1}", found "## Slide ${s.n}"`); });
  for (const s of slides) {
    const marks = s.say.split(MARK).length - 1;
    if (marks !== s.clicks) throw new Error(`script: slide ${s.n} says ${s.clicks} clicks but has ${marks} ${MARK} marks`);
  }
  return slides;
}

// The click count heads the PPTX notes, in the deck's language (deck.config.json "lang").
const CLICKS = { vi: n => `${n} lần bấm`, en: n => `${n} click${n === 1 ? '' : 's'}` };
export const pptxNotes = (s, lang = 'vi') => (s.clicks ? `[${(CLICKS[lang] ?? CLICKS.en)(s.clicks)}]\n\n${s.say}` : s.say);
