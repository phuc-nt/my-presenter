#!/usr/bin/env node
// mix-balance.mjs — measure how loud the music and SFX sit under the voice-over, from the
// <audio> elements of an assembled index.html (src, data-start, data-duration, data-volume,
// data-track-index), and suggest a bgm volume for a target gap.
//
//   node mix-balance.mjs [--project .] [--target 12] [--json out.json]
//
// Tracks: 10 = voice, 11 = music, 20+ = SFX (faceless assemble-index layout). Each stem is
// rebuilt at 8 kHz mono with its data-volume as linear gain, cut into 50 ms windows, and
// windows where the voice is within 20 dB of its loud level count as speech.
// It measures the planned mix, not the render: run it after assemble-index, and measure the
// render itself with ebur128 (SKILL.md step 10).
//
// --target is the gap (dB) between the voice and the music under it. 12 suits a calm
// explainer, where the music plays at a fixed level under the whole voice-over (faceless
// has no ducking); 6–8 suits a promo or beat-synced cut. The old fixed bgm.volume 0.1
// measured ~22 dB under the voice: effectively no music.
//
// Idea from measure-mix-balance.py in bestagentkits/motion-video-skill (MIT License,
// Copyright (c) 2026 BestAgentKits). Their 4–6 dB target assumes the music is ducked
// under speech, which this pipeline does not do.

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { decode, flag, framesRms, meanDb, percentile, toDb } from "./lib/pcm.mjs";

const SR = 8000;
const WIN = 400; // 50 ms

const argv = process.argv.slice(2);
const project = resolve(flag(argv, "project", "."));
const target = Number(flag(argv, "target", 12));
const jsonOut = flag(argv, "json", null);

const html = readFileSync(join(project, "index.html"), "utf8");
const els = [];
for (const m of html.matchAll(/<audio\b([^>]*)>/gs)) {
  const attrs = {};
  for (const a of m[1].matchAll(/([\w-]+)\s*=\s*"([^"]*)"/g)) attrs[a[1]] = a[2];
  if (!attrs.src) continue;
  const track = Number(attrs["data-track-index"] ?? -1);
  els.push({
    id: attrs.id ?? attrs.src,
    src: attrs.src,
    start: Number(attrs["data-start"] ?? 0),
    duration: attrs["data-duration"] != null ? Number(attrs["data-duration"]) : null,
    volume: attrs["data-volume"] != null ? Number(attrs["data-volume"]) : 1,
    kind: track === 10 ? "voice" : track === 11 ? "music" : track >= 20 ? "sfx" : "other",
  });
}
const byKind = (k) => els.filter((e) => e.kind === k);
if (!byKind("voice").length) {
  console.error("✗ mix-balance: no voice <audio> (track 10) in index.html — run assemble-index first");
  process.exit(1);
}

const total = Math.max(...els.map((e) => e.start + (e.duration ?? 0)));
const N = Math.ceil(total * SR) + 1;
const cache = new Map();
function place(stem, e, gain = e.volume) {
  if (!cache.has(e.src)) cache.set(e.src, decode(join(project, e.src), { sr: SR }));
  const x = cache.get(e.src);
  const i0 = Math.round(e.start * SR);
  const len = Math.min(x.length, e.duration != null ? Math.round(e.duration * SR) : x.length, N - i0);
  for (let i = 0; i < len; i++) stem[i0 + i] += x[i] * gain;
}
const stems = {};
for (const k of ["voice", "music", "sfx"]) {
  stems[k] = new Float32Array(N);
  for (const e of byKind(k)) place(stems[k], e);
}
const W = { voice: framesRms(stems.voice, WIN), music: framesRms(stems.music, WIN), sfx: framesRms(stems.sfx, WIN) };
const nW = W.voice.length;

const vDb = Array.from(W.voice, toDb);
const loud = percentile(vDb.filter((d) => d > -70), 95);
const speech = new Uint8Array(nW);
const gaps = new Uint8Array(nW);
for (let i = 0; i < nW; i++) {
  speech[i] = vDb[i] > loud - 20 ? 1 : 0;
  gaps[i] = speech[i] ? 0 : 1;
}

const voice = meanDb(W.voice, speech);
const hasMusic = byKind("music").length > 0;
const under = hasMusic ? meanDb(W.music, speech) : -Infinity;
const inGaps = hasMusic ? meanDb(W.music, gaps) : -Infinity;
const gap = voice - under;
const speechShare = speech.reduce((a, b) => a + b, 0) / nW;

const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : "—");
console.log(`${project}`);
console.log(` voice while speaking ${f1(voice)} dB | speech is ${(speechShare * 100).toFixed(0)}% of ${total.toFixed(1)}s`);
const result = { voice_db: voice, speech_share: speechShare, target_gap_db: target, sfx: [] };
if (hasMusic) {
  const m = byKind("music")[0];
  const suggest = m.volume * Math.pow(10, (gap - target) / 20);
  console.log(` music under speech   ${f1(under)} dB | in gaps ${f1(inGaps)} dB | data-volume ${m.volume}`);
  console.log(` music sits ${f1(gap)} dB under the voice (target ${target}) → bgm.volume ≈ ${suggest.toFixed(3)}`);
  Object.assign(result, { music_under_db: under, music_gaps_db: inGaps, gap_db: gap, bgm_volume: m.volume, bgm_volume_suggested: suggest });
} else {
  console.log(" no music element (track 11)");
}

// Each SFX: its own level over its first 400 ms against the voice level.
for (const e of byKind("sfx")) {
  const a = Math.floor((e.start * SR) / WIN);
  const b = Math.min(nW, a + 8);
  const one = new Float32Array(N);
  place(one, e);
  const w = framesRms(one, WIN).slice(a, b);
  let peak = -Infinity;
  for (const r of w) peak = Math.max(peak, toDb(r));
  result.sfx.push({ id: e.id, start: e.start, volume: e.volume, peak_db: peak, vs_voice_db: peak - voice });
}
if (result.sfx.length) {
  const rel = result.sfx.map((s) => s.vs_voice_db);
  console.log(` sfx (${rel.length}) peak vs voice: ${f1(Math.min(...rel))} … ${f1(Math.max(...rel))} dB`);
  for (const s of result.sfx.filter((x) => x.vs_voice_db > 0)) {
    console.log(`   louder than the voice: ${s.id} at ${s.start}s (+${f1(s.vs_voice_db)} dB, volume ${s.volume})`);
  }
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(result, null, 2) + "\n");
