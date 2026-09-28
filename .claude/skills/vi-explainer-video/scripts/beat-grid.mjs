#!/usr/bin/env node
// beat-grid.mjs — fit a constant-tempo beat grid (BPM, BEAT0) to a music file and print
// one row per bar: kick hits per beat ("K" or ".") and the bar's RMS level.
//
//   node beat-grid.mjs assets/bgm/track.wav [--bpm 110] [--min-bpm 70 --max-bpm 140] [--json out.json]
//
// --bpm N searches N±6 (use the BPM you asked Lyria for). Without it the search range is
// --min-bpm..--max-bpm; a wide range can lock onto half or double tempo, so narrow it.
// Read the dB column to find the track's intros, builds and loud bars.
//
// Ported from fit-beat-grid.py in bestagentkits/motion-video-skill (MIT License,
// Copyright (c) 2026 BestAgentKits), rewritten in Node without numpy/scipy.

import { writeFileSync } from "node:fs";
import { decode, flag, framesRms, maxFilter, percentile, toDb } from "./lib/pcm.mjs";

const SR = 11025;
const HOP = 128;
const FPS = SR / HOP;

const argv = process.argv.slice(2);
const file = argv.find((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--")));
if (!file) {
  console.error("usage: beat-grid.mjs <music file> [--bpm N] [--min-bpm A --max-bpm B] [--json out.json]");
  process.exit(1);
}
const target = flag(argv, "bpm", null);
const minBpm = Number(flag(argv, "min-bpm", target ? Number(target) - 6 : 70));
const maxBpm = Number(flag(argv, "max-bpm", target ? Number(target) + 6 : 140));
const jsonOut = flag(argv, "json", null);

function onset(x) {
  const r = framesRms(x, HOP);
  const out = new Float64Array(r.length);
  let prev = Math.log(r[0] + 1e-5);
  for (let i = 0; i < r.length; i++) {
    const e = Math.log(r[i] + 1e-5);
    out[i] = Math.max(0, e - prev);
    prev = e;
  }
  return out;
}

const max = (a) => a.reduce((m, v) => (v > m ? v : m), -Infinity);

const full = decode(file, { sr: SR });
const low = decode(file, { sr: SR, af: "lowpass=f=150,lowpass=f=150" });
const dur = full.length / SR;
const lowOn = onset(low);
const fullOn = onset(full);
const rms = framesRms(full, HOP);
const n = Math.min(lowOn.length, fullOn.length);
const lm = max(lowOn) + 1e-9;
const fm = max(fullOn) + 1e-9;
const mixed = new Float64Array(n);
for (let i = 0; i < n; i++) mixed[i] = lowOn[i] / lm + (0.5 * fullOn[i]) / fm;
const env = maxFilter(mixed, 3);

// Grid search: the constant grid whose beats land on the most onset energy.
let best = { score: -Infinity, bpm: 0, beat0: 0 };
for (let bpm = minBpm; bpm <= maxBpm + 1e-9; bpm += 0.02) {
  const beat = 60 / bpm;
  const nk = Math.floor((dur - beat) / beat);
  if (nk < 4) continue;
  for (let b0 = 0; b0 < beat; b0 += 0.004) {
    let s = 0;
    for (let k = 0; k < nk; k++) {
      const idx = Math.min(n - 1, Math.max(0, Math.round((b0 + beat * k) * FPS)));
      s += env[idx];
    }
    s /= nk;
    if (s > best.score) best = { score: s, bpm, beat0: b0 };
  }
}
const bpm = Math.round(best.bpm * 100) / 100;
const beat0 = Math.round(best.beat0 * 1000) / 1000;
const beat = 60 / bpm;

const nb = Math.floor((dur - beat0) / beat);
const lo = maxFilter(lowOn, 5);
const kick = Array.from({ length: nb }, (_, i) => lo[Math.min(lo.length - 1, Math.round((beat0 + i * beat) * FPS))]);
const thr = percentile(kick, 70) * 0.4;
const bars = [];
for (let bar = 0; bar < Math.floor(nb / 4); bar++) {
  const t = beat0 + bar * 4 * beat;
  const i0 = Math.floor(t * FPS);
  const i1 = Math.min(rms.length, Math.floor((t + 4 * beat) * FPS));
  let s = 0;
  for (let i = i0; i < i1; i++) s += rms[i];
  const db = toDb(s / Math.max(1, i1 - i0));
  const marks = kick.slice(bar * 4, bar * 4 + 4).map((k) => (k > thr ? "K" : ".")).join("");
  bars.push({ beat: bar * 4, t: Math.round(t * 1000) / 1000, kicks: marks, db: Math.round(db * 10) / 10 });
}

console.log(`${file}\n duration ${dur.toFixed(2)}s  search ${minBpm}–${maxBpm}  grid fit: BPM ${bpm.toFixed(2)} BEAT0 ${beat0.toFixed(3)}`);
for (const b of bars) {
  const hashes = "#".repeat(Math.max(0, Math.floor(b.db + 40)));
  console.log(` beat ${String(b.beat).padStart(3)} ${b.t.toFixed(2).padStart(7)}s  ${b.kicks}  ${b.db.toFixed(1).padStart(6)} dB  ${hashes}`);
}
const kickBars = bars.filter((b) => b.kicks.includes("K")).length;
if (kickBars < bars.length / 3) {
  console.log(" note: few kicks detected — the track may have no steady pulse; beat snapping will feel arbitrary.");
}
if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify({ file, duration_s: Math.round(dur * 1000) / 1000, bpm, beat0, bars }, null, 2) + "\n");
  console.log(` wrote ${jsonOut}`);
}
