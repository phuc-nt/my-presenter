#!/usr/bin/env node
// beat-snap.mjs — make every frame cut land on the music's beat grid by padding the end
// of each voice WAV with silence, and update duration_s in audio_engine_meta.json.
//
//   node beat-snap.mjs --grid .hyperframes/beat-grid.json [--every 1] [--min-add 0.1] [--apply]
//   node beat-snap.mjs --reserve --bpm 110 [--every 1] --apply      (before the music exists)
//
// Frame k ends on the first grid point at or after (its start + its current voice length +
// --min-add). Grid points are BEAT0 + m × every × 60/BPM, so --every 4 cuts only every
// fourth beat (a bar, if BEAT0 is a downbeat). The last frame ends where the music ends
// (the voice is padded or its trailing silence trimmed), so the track is never looped;
// --last beat snaps it like the others instead.
//
// --reserve pads the LAST voice by (frames × every × 60/BPM) seconds. Run it before the
// music is generated: the music length is the sum of the voice lengths, and snapping adds
// up to one grid step per frame, so without the reserve the video outgrows the track.
//
// Without --apply it only prints the plan. With --apply the original WAVs and metadata
// are kept in .hyperframes/beat-snap-backup/ and every run starts again from them, so it
// is safe to re-run with another grid. A voice regenerated since the last run is taken as
// its new original.

import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { flag, probeDuration } from "./lib/pcm.mjs";

const argv = process.argv.slice(2);
const has = (n) => argv.includes(`--${n}`);
const die = (m) => {
  console.error(`✗ beat-snap: ${m}`);
  process.exit(1);
};
const r3 = (x) => Math.round(x * 1000) / 1000;

const project = resolve(flag(argv, "project", "."));
const metaPath = join(project, "audio_engine_meta.json");
if (!existsSync(metaPath)) die(`no audio_engine_meta.json in ${project}`);
const meta = JSON.parse(readFileSync(metaPath, "utf8"));
const voices = meta.voices ?? [];
if (!voices.length) die("audio_engine_meta.json has no voices");

let bpm = Number(flag(argv, "bpm", NaN));
let beat0 = Number(flag(argv, "beat0", 0));
const gridPath = flag(argv, "grid", null);
if (gridPath) {
  const g = JSON.parse(readFileSync(resolve(gridPath), "utf8"));
  bpm = g.bpm;
  beat0 = g.beat0;
}
if (!(bpm > 0)) die("give --grid <beat-grid.json> or --bpm N [--beat0 S]");
const every = Number(flag(argv, "every", 1));
const minAdd = Number(flag(argv, "min-add", 0.1));
const outroMin = Number(flag(argv, "outro-min", 1.0));
const lastMode = flag(argv, "last", "music");
const apply = has("apply");
const step = every * (60 / bpm);

// ── backup: every run computes from the originals ────────────────────────────
const bakDir = join(project, ".hyperframes/beat-snap-backup");
const bakMetaPath = join(bakDir, "audio_engine_meta.json");
const bak = existsSync(bakMetaPath) ? JSON.parse(readFileSync(bakMetaPath, "utf8")) : { voices: {} };
const snapped = bak.snapped ?? {};
const orig = voices.map((v) => {
  const b = bak.voices[v.id];
  const file = join(project, v.path);
  // Still the file this script wrote last time → start from the backed-up original.
  if (b && snapped[v.id] != null && Math.abs(snapped[v.id] - v.duration_s) < 0.002) {
    return { ...v, src: join(bakDir, `${v.id}.wav`), duration_s: b.duration_s };
  }
  return { ...v, src: file, fresh: true };
});

const lastWordEnd = (v) => (v.words?.length ? v.words[v.words.length - 1].end : v.duration_s);
const gridCeil = (t) => beat0 + Math.ceil((t - beat0 - 1e-6) / step) * step;

// ── plan ─────────────────────────────────────────────────────────────────────
const plan = [];
if (has("reserve")) {
  const extra = r3(voices.length * step);
  orig.forEach((v, i) =>
    plan.push({ v, start: null, end: null, dur: i === orig.length - 1 ? r3(v.duration_s + extra) : v.duration_s }),
  );
  console.log(`reserve: last frame +${extra}s (${voices.length} frames × ${step.toFixed(3)}s)`);
} else {
  let musicLen = null;
  if (lastMode === "music") {
    const mp = meta.bgm?.path ? join(project, meta.bgm.path) : null;
    if (!mp || !existsSync(mp)) die("no music file (bgm.path) yet — wait for the music, or use --last beat");
    musicLen = probeDuration(mp);
  }
  let t = 0;
  orig.forEach((v, i) => {
    const isLast = i === orig.length - 1;
    let end;
    if (isLast && musicLen != null) {
      end = musicLen;
      const need = t + lastWordEnd(v) + outroMin;
      if (end < need) {
        die(
          `the music (${musicLen.toFixed(2)}s) ends ${(need - end).toFixed(2)}s before the last frame can; ` +
            `restore the voices, run --reserve before generating the music, or use --last beat`,
        );
      }
    } else {
      end = gridCeil(t + v.duration_s + minAdd);
    }
    const dur = r3(end - t);
    plan.push({ v, start: r3(t), end: r3(t + dur), dur, beat: Math.round((end - beat0) / (60 / bpm)) });
    t += dur;
  });
  console.log(`grid: BPM ${bpm} BEAT0 ${beat0} every ${every} beat(s) = ${step.toFixed(3)}s` +
    (musicLen != null ? `; music ${musicLen.toFixed(2)}s` : ""));
  const was = r3(orig.reduce((a, v) => a + v.duration_s, 0));
  console.log(`total ${was}s → ${r3(t)}s`);
}

console.log(" frame   start    voice →   new    change  cut on");
for (const p of plan) {
  const d = r3(p.dur - p.v.duration_s);
  console.log(
    ` ${p.v.id.padStart(5)} ${p.start == null ? "      -" : p.start.toFixed(2).padStart(7)}` +
      ` ${p.v.duration_s.toFixed(2).padStart(7)} → ${p.dur.toFixed(2).padStart(6)}  ${(d >= 0 ? "+" : "") + d.toFixed(2)}`.padEnd(8) +
      (p.beat != null ? `  beat ${p.beat}` : ""),
  );
}
if (!apply) {
  console.log("dry run — add --apply to pad the WAVs and update audio_engine_meta.json");
  process.exit(0);
}

// ── apply ────────────────────────────────────────────────────────────────────
mkdirSync(bakDir, { recursive: true });
for (const v of orig) {
  if (v.fresh) {
    copyFileSync(join(project, v.path), join(bakDir, `${v.id}.wav`));
    bak.voices[v.id] = { duration_s: v.duration_s };
  }
}
bak.snapped = {};
for (const p of plan) {
  const out = join(project, p.v.path);
  const tmp = `${out}.snap.wav`;
  execFileSync("ffmpeg", [
    "-v", "error", "-y", "-i", p.v.src, "-af", `atrim=end=${p.dur},apad=whole_dur=${p.dur}`, tmp,
  ]);
  renameSync(tmp, out);
  const got = probeDuration(out);
  if (Math.abs(got - p.dur) > 0.005) die(`${p.v.path}: wanted ${p.dur}s, got ${got}s`);
  const mv = voices.find((x) => x.id === p.v.id);
  mv.duration_s = p.dur;
  bak.snapped[p.v.id] = p.dur;
}
meta.total_duration_s = r3(voices.reduce((a, v) => a + v.duration_s, 0));
writeFileSync(bakMetaPath, JSON.stringify(bak, null, 2) + "\n");
writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
console.log(`✓ padded ${plan.length} voice file(s); audio_engine_meta.json total ${meta.total_duration_s}s`);
