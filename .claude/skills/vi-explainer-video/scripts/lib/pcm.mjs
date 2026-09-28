// Shared helpers: decode audio to mono float32 PCM with ffmpeg, windowed RMS, dB.
// No npm dependencies, so the scripts also run where npm is unavailable (secure bundle).

import { execFileSync } from "node:child_process";

export function decode(path, { sr, af = "anull" }) {
  const buf = execFileSync(
    "ffmpeg",
    ["-v", "error", "-i", path, "-af", af, "-ac", "1", "-ar", String(sr), "-f", "f32le", "-"],
    { maxBuffer: 1 << 30 },
  );
  // Copy into an aligned buffer: execFileSync may return a Buffer at an odd byteOffset.
  const out = new Float32Array(buf.length / 4);
  new Uint8Array(out.buffer).set(buf);
  return out;
}

export function probeDuration(path) {
  const s = execFileSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path,
  ]).toString();
  return Number(s.trim());
}

// RMS of consecutive non-overlapping windows of `hop` samples.
export function framesRms(x, hop) {
  const n = Math.floor(x.length / hop);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = i * hop, e = j + hop; j < e; j++) s += x[j] * x[j];
    out[i] = Math.sqrt(s / hop + 1e-12);
  }
  return out;
}

export const toDb = (rms) => 20 * Math.log10(rms + 1e-12);

// Power-average of the samples selected by `mask` (a Uint8Array over window indices), in dB.
export function meanDb(rmsWindows, mask) {
  let s = 0;
  let c = 0;
  for (let i = 0; i < rmsWindows.length; i++) {
    if (!mask || mask[i]) {
      s += rmsWindows[i] * rmsWindows[i];
      c++;
    }
  }
  return c ? 10 * Math.log10(s / c + 1e-24) : -Infinity;
}

// Centered running maximum (scipy.ndimage.maximum_filter1d with edge clamping).
export function maxFilter(x, size) {
  const r = Math.floor(size / 2);
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) {
    let m = -Infinity;
    for (let j = Math.max(0, i - r); j <= Math.min(x.length - 1, i + r); j++) if (x[j] > m) m = x[j];
    out[i] = m;
  }
  return out;
}

export function percentile(values, p) {
  const a = Float64Array.from(values).sort();
  if (!a.length) return NaN;
  const k = (a.length - 1) * (p / 100);
  const lo = Math.floor(k);
  const hi = Math.ceil(k);
  return a[lo] + (a[hi] - a[lo]) * (k - lo);
}

export function flag(argv, name, def) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : def;
}
