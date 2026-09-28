#!/usr/bin/env node
// silent-track: the audio step for a video without narration (KIT_TTS=none).
//
// Reads SCRIPT.md, gives every frame a duration and every word a time from the
// text alone, and writes what the TTS step would have written:
//   assets/voice/NN.wav      silence of the right length
//   audio_engine_meta.json   voices[] with word timings, no music, no SFX
// The rest of the pipeline (captions, assemble, render) then runs unchanged.
// No network, no ffmpeg, no packages.
//
//   node silent-track.mjs [--project .] [--wps 2.8] [--min 3.5] [--tail 0.8] [--last-tail 2] [--dry]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i < 0 ? d : args[i + 1]; };
const num = (k, d) => { const v = Number(opt(k, d)); if (!Number.isFinite(v) || v <= 0) { console.error(`silent-track: --${k} must be a positive number`); process.exit(2); } return v; };
if (args.includes('--help') || args.includes('-h')) { console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 12).map(l => l.replace(/^\/\/ ?/, '')).join('\n')); process.exit(0); }

const project = resolve(opt('project', '.'));
const WPS = num('wps', 2.8);        // words per second a viewer reads comfortably
const MIN = num('min', 3.5);        // shortest frame
const TAIL = num('tail', 0.8);      // hold after the last word
const LAST_TAIL = num('last-tail', 2);
const LEAD = 0.3;                   // before the first word
const RATE = 24000;

// ---- SCRIPT.md → frames
const frames = new Map();
let cur = null;
for (const line of readFileSync(join(project, 'SCRIPT.md'), 'utf8').split('\n')) {
  const h = line.match(/^#{1,6}\s.*\(Frame\s+(\d+)\)/i);
  if (h) { cur = Number(h[1]); if (frames.has(cur)) fail(`Frame ${cur} appears twice in SCRIPT.md`); frames.set(cur, []); continue; }
  if (/^#{1,6}\s/.test(line)) { cur = null; continue; }
  if (cur !== null && /^( {4}|\t)\S/.test(line) && !line.trim().startsWith('**')) frames.get(cur).push(line.trim());
}
function fail(m) { console.error(`silent-track: ${m}`); process.exit(1); }
if (!frames.size) fail('no "(Frame N)" heading found in SCRIPT.md');
const ids = [...frames.keys()].sort((a, b) => a - b);
ids.forEach((n, i) => { if (n !== i + 1) fail(`frames must be numbered 1..N without gaps; found ${ids.join(', ')}`); });

// ---- timings from text
const r3 = x => Math.round(x * 1000) / 1000;
const voices = ids.map((n, idx) => {
  const text = frames.get(n).join(' ');
  const tokens = text.split(/\s+/).filter(t => /[\p{L}\p{N}]/u.test(t));
  if (!tokens.length) fail(`Frame ${n} has no text (lines must be indented 4 spaces)`);
  // a word costs its length; punctuation after it adds a pause
  const cost = t => [...t.replace(/[^\p{L}\p{N}]/gu, '')].length + 2;
  const pause = t => /[.!?…]["”’)]*$/.test(t) ? 0.45 : /[,;:]["”’)]*$/.test(t) ? 0.22 : 0;
  const speak = tokens.length / WPS;
  const total = tokens.reduce((s, t) => s + cost(t), 0);
  let t = LEAD;
  const words = tokens.map((tok, i) => {
    const d = speak * cost(tok) / total, start = t, end = t + d;
    t = end + (i < tokens.length - 1 ? pause(tok) : 0);
    return { id: `w${i}`, text: tok, start: r3(start), end: r3(end) };
  });
  const id = String(n).padStart(2, '0');
  const duration_s = r3(Math.max(MIN, t + (idx === ids.length - 1 ? LAST_TAIL : TAIL)));
  return { id, path: `assets/voice/${id}.wav`, duration_s, words };
});

// ---- write
function silentWav(seconds) {
  const n = Math.round(seconds * RATE), data = n * 2, b = Buffer.alloc(44 + data);
  b.write('RIFF', 0); b.writeUInt32LE(36 + data, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(RATE, 24); b.writeUInt32LE(RATE * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(data, 40);
  return b;
}
const total = r3(voices.reduce((s, v) => s + v.duration_s, 0));
const meta = {
  tts_provider: 'none', voice_id: null,
  bgm: null, bgm_pending: false, bgm_provider: null, bgm_mode: 'none',
  voices, sfx: [], total_duration_s: total,
};
if (!args.includes('--dry')) {
  mkdirSync(join(project, 'assets', 'voice'), { recursive: true });
  for (const v of voices) writeFileSync(join(project, v.path), silentWav(v.duration_s));
  writeFileSync(join(project, 'audio_engine_meta.json'), JSON.stringify(meta, null, 2));
}
for (const v of voices) console.log(`frame ${v.id}  ${v.duration_s.toFixed(2).padStart(6)} s  ${String(v.words.length).padStart(3)} words`);
console.log(`total ${total.toFixed(2)} s, ${voices.length} frames, ${WPS} words/s, no audio${args.includes('--dry') ? ' (dry run, nothing written)' : ''}`);
