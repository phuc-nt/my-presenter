---
version: alpha
name: Comic multiverse — Frame (video / frame layer)
description: >
  Loud, hand-made comic energy for Vietnamese explainers and launch cuts: warm paper panels with thick ink
  outlines, halftone Ben-Day dots, cyan/magenta print misregistration, yellow narration boxes, Anton headlines,
  Bangers labels, and motion "on twos". Adapted from the "comic multiverse" style of
  bestagentkits/motion-video-skill (MIT) for faceless-explainer frames and Vietnamese fonts. Inspired by a look
  only: no studio names, logos or characters.
unit: the frame — 1920×1080 primary
principle: ink outlines · print colours · poses hold on twos · numbers come from the script

colors:
  ink: "#0D0A1A"
  paper: "#FFF6E5"
  cyan: "#19D3FF"
  magenta: "#FF2E9A"
  yellow: "#FFD21F"
  purple: "#5B1FD1"
  violet: "#1A0B3D"
  orange: "#FF7A1A"
  positive: "#2EE59D"
  negative: "#FF2B3A"

borders: { ink: "6px solid {colors.ink}", ink-thin: "3px solid {colors.ink}" }
shadows:
  panel: "-6px -4px 0 {colors.cyan}, 6px 4px 0 {colors.magenta}, 16px 16px 0 {colors.ink}"
  box: "8px 8px 0 {colors.ink}"

typography:
  body:    { fontFamily: "Inter", cqw: 1.6, weight: 600, lineHeight: 1.45 }
  lead:    { fontFamily: "Inter", cqw: 2.1, weight: 700, lineHeight: 1.4 }
  label:   { fontFamily: "Bangers", cqw: 2.2, weight: 400, lineHeight: 1.1, tracking: "0.04em" }
  sfx-word: { fontFamily: "Bangers", cqw: 7.5, weight: 400, lineHeight: 1.0, tracking: "0.02em" }
  code:    { fontFamily: "JetBrains Mono", cqw: 1.5, weight: 600, lineHeight: 1.55 }
  headline: { fontFamily: "Anton", cqw: 5.2, weight: 400, lineHeight: 1.12, upper: true }
  display: { fontFamily: "Anton", cqw: 8.4, weight: 400, lineHeight: 1.08, upper: true }

spacing:
  slide-pad: "4.2cqw"
  gap-md: "1.7cqw"
  radius-panel: "4px"

components:
  panel:
    backgroundColor: "{colors.paper}"
    border: "{borders.ink}"
    shadow: "{shadows.panel}"
    rounded: "{spacing.radius-panel}"
    description: "The comic panel. Paper fill, 6px ink border, triple offset shadow (cyan, magenta, ink). A halftone corner (halftone-mask tile, ink at 18%) fading out diagonally. `.dark` variant: violet fill, paper text, magenta dots."
  headline-hl:
    typography: "{typography.display} or {typography.headline}"
    description: "Anton uppercase, yellow fill, ink outline (-webkit-text-stroke 3px) and a text-shadow pair cyan/magenta offset by var(--rx), plus one hard ink extrusion."
  narration-box:
    backgroundColor: "{colors.yellow}"
    border: "{borders.ink-thin}"
    shadow: "{shadows.box}"
    typography: "{typography.label} or {typography.lead}"
    description: "Yellow caption box rotated −2..−3°, the kicker/label of a frame."
  sfx-word:
    typography: "{typography.sfx-word}"
    description: "A Bangers onomatopoeia burst (BÙM, XOẸT, TING) on a key beat. One per frame at most, rotated, yellow or paper with ink stroke."
  halftone:
    description: "Ben-Day dots via mask-image: url(assets/images/halftone-mask.png) with background-color as the dot colour. One layer per panel corner or background, never per element."
  speed-lines:
    description: "One SVG of radial ink strokes around a focal point, scaled/faded in 0.2s on a hit."
---

# Comic multiverse — Frame (video / frame layer)

## Overview

Every frame is a **comic page moment**: a coloured "universe" ground (a flat or two-stop gradient in purple,
violet, cyan, yellow or magenta), one or more **paper panels** with thick ink borders and a cyan/magenta/ink
triple shadow, **halftone dots** in the corners, and **Anton** uppercase headlines with a yellow fill and ink outline.
Labels and onomatopoeia are **Bangers**. Motion holds poses **on twos** (12 steps per second), which is what makes it
feel hand-drawn.

**Key characteristics at frame scale:**

- Ink outlines everywhere (6px panels, 3px boxes); flat print colours; no soft shadows, no blur.
- Cyan/magenta misregistration: offset copies (text-shadow, ghost duplicates) shifted by `--rx`.
- Halftone texture from ONE baked mask tile; grain overlay from ONE baked PNG.
- Headline: Anton uppercase. Body: Inter 600–700 (readable Vietnamese). Labels: Bangers.

## The Frame

### Frame Craft Bar

- **Squint** — one headline or panel dominates; the frame reads as a single comic beat.
- **Print palette** — ground from the brand hues, panels on paper, ink for all outlines and body text on paper.
- **Type** — Anton uppercase for headlines (Vietnamese diacritics need `line-height` ≥ 1.08 and top padding in the box), Inter for anything longer than six words, Bangers only for labels and SFX words.

- **Primary:** 1920×1080 (16:9). Author in `cqw`; every frame ground sets `container-type: size`.
- **Safe area:** `slide-pad` ~4.2cqw. Keep all content above y = 896 (caption band).

## Colors

`ink` for outlines and text on paper; `paper` for panels and text on dark grounds. `cyan` and `magenta` are the
misregistration pair and appear in every frame's shadows. `yellow` is the headline fill and narration box.
`purple`, `violet`, `orange` are grounds. `positive` / `negative` only for ✓ / ✗ stamps.

## Typography

- **Anton** (`display`, `headline`): uppercase, one to five words. Size to length; cap at ≤ 80cqw. Give the box extra top padding (~0.15em): stacked Vietnamese marks (Ấ, Ộ, Ữ) rise above the cap height.
- **Bangers** (`label`, `sfx-word`): short labels and onomatopoeia only. Never for sentences.
- **Inter 600–700** (`body`, `lead`): anything the viewer must read.
- **JetBrains Mono** (`code`): terminal logs and file names inside panels.

## Depth & Surface

- Depth is **hard offset shadows only** (`{shadows.panel}`, `{shadows.box}`). No blur, no glow.
- Textures come from the preset's `textures/` (copied to `assets/images/`):
  - `halftone-mask.png`: a 48px staggered-dot tile. Use as `mask-image` with `mask-size: 24px` to `48px`; the element's `background-color` is the dot colour.
  - `grain.png`: grey noise, `mix-blend-mode: overlay`, opacity 0.5, one full-frame layer.
- **Never** build dots from many elements or from per-element `radial-gradient`s (see Renderer limits).

## Components

- **panel**, **headline-hl**, **narration-box**, **sfx-word**, **halftone**, **speed-lines** (see frontmatter).
- **Stamp rows:** `✓ cho phép` / `✗ chặn` rows stamped in with a 0.9 → 1 scale on twos; `positive` / `negative` ink.
- **Terminal panel:** `.dark` panel, JetBrains Mono log lines typed on, a Bangers label on top.
- **Mascot (optional):** a simple blob with eyes, drawn in SVG, with cyan and magenta ghost copies offset by a few px behind it.

## Frame Treatments

### 1 · Cover — universe ground, speed lines, headline-hl title slams in, narration box with the subtitle.
### 2 · Panel grid — 2–4 panels in a tilted grid (±1–2°), each revealed on the word that names it.
### 3 · Terminal / log — one `.dark` panel with typed lines and stamp rows.
### 4 · Big hit — one sfx-word + headline on the key point; flash + speed lines at the hit.
### 5 · Comparison — two panels side by side, ✗ on the left, ✓ on the right.
### 6 · Closing — calmer: ground darkens to violet, panels float in slowly, final line types on; the only frame with an exit fade.

## Motion & transitions

- **On twos:** character and UI motion is quantised to 12 poses per second. Use this ease factory; it is deterministic and seek-safe:

  ```js
  const on2 = (dur, base = "power2.out") => {
    const f = gsap.parseEase(base), n = Math.max(1, Math.round(dur * 12));
    return (p) => f(Math.floor(p * n) / n);
  };
  tl.from(el, { y: 60, duration: 0.5, ease: on2(0.5) }, t);
  ```

  Keep large ground moves (universe colour cross-fades, slow ray rotation) smooth.
- **Entrances:** `slam` (scale 1.3 → 1, power4.in, then a 0.15s shake of ±8px on twos), headline words flip up (rotationX −70 → 0, stagger 0.06), panels drop in with a 2° over-rotation.
- **Hits:** at the key word, a paper flash (full-frame layer 0 → 0.5 → 0 in 0.2s) plus speed lines; `--rx` kicks from 0 to 6px and back.
- **Glitch or dot-wipe opening** (optional, first 0.3s of a frame): an RGB split (SVG `feOffset` filter attached only during the effect) or halftone dots swelling across the frame and shrinking away. These are built inside the frame; they are not `transition_in` values.
- **Between frames** (`transition_in`): mostly `cut` (the in-frame slam carries the energy), `push-slide LEFT` as a page turn for sequences, `squeeze` for a comparison; `crossfade` for the closing frame.
- **Beat-sync videos:** cuts land on beats (SKILL.md, beat-sync mode); put the frame's slam at 0s and the `--rx` kicks on the beat times listed in Video direction.

## Font faces (Vietnamese — project override)

This video is narrated and captioned in **Vietnamese**. Every composition MUST declare exactly this block and
reference families by these names. Paths are **root-relative** (`assets/fonts/…`) in every file, including frames
under `compositions/frames/`.

```css
@font-face { font-family: "Anton"; src: url("assets/fonts/Anton-VN.woff2") format("woff2"); font-weight: 400; font-style: normal; font-display: block; }
@font-face { font-family: "Bangers"; src: url("assets/fonts/Bangers-VN.woff2") format("woff2"); font-weight: 400; font-style: normal; font-display: block; }
@font-face { font-family: "Inter"; src: url("assets/fonts/Inter-VN.woff2") format("woff2"); font-weight: 100 900; font-style: normal; font-display: block; }
@font-face { font-family: "JetBrains Mono"; src: url("assets/fonts/JetBrainsMono-VN.woff2") format("woff2"); font-weight: 100 800; font-style: normal; font-display: block; }
```

Bangers has no → or ✓ glyph; set arrows and ticks in Inter.

## Renderer limits

- More than ~40 elements using `radial-gradient`, `filter: blur()` or `clip-path` on screen at once produced **black frames** in the reference project. Halftone and grain come from the baked PNGs, one layer each.
- Attach SVG filters (RGB split) only while the effect runs: `tl.set(el, { filter: "url(#rgb)" }, t)` then `tl.set(el, { filter: "none" }, t + 0.2)`.
- `fromTo` tweens on a layer reused later in the frame (flash, dots, speed lines, `--rx`) need `immediateRender: false`, or their start state shows at 0s.
- For heavy full-frame layers, toggle `visibility` rather than leaving them at `opacity: 0`.

## Numerals & Claims (hard rule)

Never invent figures. Every number, count and name traces to the script; otherwise render a placeholder.

## Pre-Render Self-Audit

- Ink outlines on every panel and box; cyan/magenta offset present; no blur, no soft shadow.
- Halftone and grain from the two PNGs only; no per-element radial gradients.
- Anton headlines uppercase with diacritics intact (check Ấ Ộ Ữ in the snapshot); body in Inter.
- Motion on twos for UI and characters; nothing below y = 896.

## Attribution

Style adapted from `references/style-comic-spiderverse.md` of bestagentkits/motion-video-skill
(MIT License, Copyright (c) 2026 BestAgentKits). Textures generated for this preset.
