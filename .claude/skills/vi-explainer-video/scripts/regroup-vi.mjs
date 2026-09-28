// Regroup faceless captions for Vietnamese: one syllable per "word" makes the stock
// density cap (2–4 words) flash two-syllable fragments. Pack clauses up to MAX words,
// never across frames or sentence ends; rewrite GROUPS in compositions/captions.html
// and caption_groups.json. Usage: node regroup-vi.mjs <project> [max=9]
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] || ".";
const MAX = Number(process.argv[3] || 9); // packing limit
const CLAUSE_MAX = MAX + 2; // one clause this long stays whole
const TAIL = 0.12;
const r3 = (x) => Number(x.toFixed(3));
const jsonPath = join(dir, "caption_groups.json");
const htmlPath = join(dir, "compositions/captions.html");
const data = JSON.parse(readFileSync(jsonPath, "utf8"));
const words = data.groups.flatMap((g) => g.words.map((w) => ({ ...w, frame: g.frame })));

// sentences per frame
const sentences = [];
let cur = [];
for (let i = 0; i < words.length; i++) {
  const w = words[i];
  if (cur.length && cur[0].frame !== w.frame) (sentences.push(cur), (cur = []));
  cur.push(w);
  if (/[.?!]["”]?$/.test(w.text)) (sentences.push(cur), (cur = []));
}
if (cur.length) sentences.push(cur);

const evenSplit = (arr) => {
  const n = Math.ceil(arr.length / CLAUSE_MAX);
  const size = Math.ceil(arr.length / n);
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const groups = [];
for (const s of sentences) {
  // clauses split after , ; :
  const clauses = [];
  let c = [];
  for (const w of s) {
    c.push(w);
    if (/[,;:]["”]?$/.test(w.text)) (clauses.push(c), (c = []));
  }
  if (c.length) clauses.push(c);
  let g = [];
  for (const cl of clauses) {
    if (cl.length > CLAUSE_MAX) {
      if (g.length) (groups.push(g), (g = []));
      for (const part of evenSplit(cl)) groups.push(part);
      continue;
    }
    if (g.length && g.length + cl.length > MAX) (groups.push(g), (g = []));
    g = g.concat(cl);
  }
  if (g.length) groups.push(g);
}

const finalized = groups.map((g, gi) => {
  const next = groups[gi + 1];
  let end = r3(g[g.length - 1].end + TAIL);
  if (next && next[0].start < end) end = r3(next[0].start);
  return {
    id: `caption-group-${gi}`,
    frame: g[0].frame,
    start: r3(g[0].start),
    end,
    text: g.map((w) => w.text).join(" "),
    words: g.map((w, wi) => ({ id: `caption-word-${gi}-${wi}`, text: w.text, start: w.start, end: w.end })),
  };
});

writeFileSync(jsonPath, JSON.stringify({ ...data, groups: finalized }, null, 2));
const html = readFileSync(htmlPath, "utf8");
const re = /var GROUPS = \[.*?\];\n/s;
if (!re.test(html)) throw new Error("GROUPS line not found");
writeFileSync(htmlPath, html.replace(re, () => `var GROUPS = ${JSON.stringify(finalized).replace(/</g, "\\u003c")};\n`));
console.log(`regrouped ${data.groups.length} → ${finalized.length} groups (max ${MAX})`);
for (const g of finalized) console.log(`  f${g.frame} ${g.start.toFixed(2)}–${g.end.toFixed(2)}  ${g.text}`);
