---
version: alpha
name: Glass keynote — Frame (video / frame layer)
description: >
  A calm, premium tech-launch look for Vietnamese explainers: deep indigo space, a few drifting colour
  glows, frosted glass cards, Plus Jakarta Sans display with a gradient-filled accent word, JetBrains Mono
  kickers. Reads like a product keynote. Adapted from the "glass keynote" style of
  bestagentkits/motion-video-skill (MIT) for faceless-explainer frames and Vietnamese fonts.
unit: the frame — 1920×1080 primary
principle: dark ground · one gradient moment · smooth motion · numbers come from the script

colors:
  bg: "#070817"
  ink: "#F5F3FF"
  mute: "#AEACD6"
  dim: "#8F8DBB"
  card: "#15163A"
  lilac: "#C4B5FD"
  violet: "#8B5CF6"
  pink: "#F0ABFC"
  sky: "#60A5FA"
  positive: "#34D399"
  warning: "#FBBF24"
  negative: "#F87171"

gradients: { grad: "linear-gradient(100deg, #F0ABFC 0%, #A78BFA 45%, #60A5FA 100%)" }
borders: { stroke: "1.5px solid rgba(196,181,253,0.26)" }
shadows: { card: "0 24px 60px rgba(3,2,20,0.55), inset 0 1px 0 rgba(255,255,255,0.08)" }

typography:
  body:    { fontFamily: "Plus Jakarta Sans", cqw: 1.6, weight: 500, lineHeight: 1.5 }
  lead:    { fontFamily: "Plus Jakarta Sans", cqw: 2.1, weight: 500, lineHeight: 1.45 }
  card-title: { fontFamily: "Plus Jakarta Sans", cqw: 2.3, weight: 700, lineHeight: 1.25, tracking: "-0.01em" }
  kicker:  { fontFamily: "JetBrains Mono", px: 26, cqw: 1.35, weight: 600, tracking: "0.16em", upper: true }
  mono-label: { fontFamily: "JetBrains Mono", px: 24, cqw: 1.25, weight: 500, tracking: "0.02em" }
  code:    { fontFamily: "JetBrains Mono", cqw: 1.6, weight: 400, lineHeight: 1.6 }
  headline: { fontFamily: "Plus Jakarta Sans", cqw: 4.4, weight: 800, lineHeight: 1.12, tracking: "-0.03em" }
  display: { fontFamily: "Plus Jakarta Sans", cqw: 6.4, weight: 800, lineHeight: 1.1, tracking: "-0.035em" }
  accent-italic: { fontFamily: "EB Garamond", cqw: 6.4, weight: 500, lineHeight: 1.1, italic: true }
  slam:    { fontFamily: "Plus Jakarta Sans", cqw: 10.4, weight: 800, lineHeight: 1.0, tracking: "-0.04em" }

spacing:
  slide-pad: "5.2cqw"
  gap-md: "1.7cqw"
  radius-card: "24px"
  radius-chip: "9999px"

components:
  glass-card:
    backgroundColor: "linear-gradient(180deg, {colors.card}F0, #0C0D2AF0)"
    border: "{borders.stroke}"
    rounded: "{spacing.radius-card}"
    shadow: "{shadows.card}"
    description: "The content panel. A near-opaque vertical indigo gradient, never backdrop-filter (costly in the renderer and unnecessary on a dark ground)."
  kicker-badge:
    typography: "{typography.kicker}"
    description: "Mono uppercase label with a small gradient number badge in front (01, 02…). Top-left inside slide-pad."
  gradient-word:
    typography: "{typography.display} or {typography.accent-italic}"
    description: "THE one gradient moment per frame: one or two words of the headline filled with {gradients.grad} (background-clip:text). Everything else is ink."
  chip:
    rounded: "{spacing.radius-chip}"
    description: "State pills: positive = ok, warning = warn, negative = fail, sky = info. Tinted fill at 14% + 1px border at 40% of the state colour."
  slam-figure:
    typography: "{typography.slam}"
    description: "A single huge gradient figure or word for the number / statement moment."
  glow-orbs:
    description: "Two or three large soft colour glows (violet, pink, sky) behind content, drifting slowly. Background only; never more than three."
---

# Glass keynote — Frame (video / frame layer)

## Overview

A **dark indigo stage** (`{colors.bg}`) with two or three soft colour glows drifting behind it. Content sits on
**glass cards**: near-opaque indigo panels with a thin lilac stroke and one deep soft shadow. Type is
**Plus Jakarta Sans 800** for display, tight-tracked, in ink; exactly **one gradient moment** per frame
(a gradient-filled word, figure, or badge). **JetBrains Mono** carries kickers, labels and code. The mood is a calm
product keynote: polished, confident, never loud.

**Key characteristics at frame scale:**

- Dark ground, light ink; muted lilac-grey (`mute`, `dim`) for secondary text.
- One gradient moment per frame (`{gradients.grad}`: pink → violet → sky).
- Glass cards with a 1.5px lilac stroke, radius 24; state chips in the status colours.
- Smooth, confident motion (power3 / expo / back); nothing stepped, nothing jittery.

## The Frame

### Frame Craft Bar

- **Squint** — one display moment dominates; the gradient appears once.
- **Ground** — `{colors.bg}` plus at most three glows; no flat grey, no pure black (`#000`).
- **Type** — Plus Jakarta Sans 800 display (sentence case, tracking −0.03..−0.04em); Plus Jakarta 500 body; mono kickers uppercase 0.16em.
- **Contrast** — body text in `ink` or `mute`; `dim` only for chrome ≥ 1.25cqw. Never text below alpha 0.72.

- **Primary:** 1920×1080 (16:9). Author in `cqw`; every frame ground sets `container-type: size`.
- **Safe area:** `slide-pad` ~5.2cqw. Keep all content above y = 896 (caption band).

## Colors

`{colors.bg}` is the ground everywhere. `ink` for headlines and body, `mute` for secondary text, `dim` for chrome only.
`lilac`, `violet`, `pink`, `sky` are the brand hues: glows, strokes, icons, and the gradient. `positive` / `warning` / `negative`
carry meaning only (chips, ✓ / ✗ rows), never decoration. The gradient `{gradients.grad}` is used **once per frame**.

## Typography

- **Display** Plus Jakarta Sans 800, sentence case: ≤ 3 words → `slam` / `display`; 4–7 → `display`; longer → `headline`. Cap the block at ≤ 78cqw.
- **Accent word:** one or two words of a headline may switch to `accent-italic` (EB Garamond italic, synthesized slant) with the gradient fill. This replaces the reference's Instrument Serif, which has no Vietnamese glyphs.
- **Body / lead** Plus Jakarta Sans 500; **kicker / labels / code** JetBrains Mono.
- Vietnamese diacritics stack above and below: display `line-height` ≥ 1.1, and never clip a text box vertically.

## Depth & Surface

- **Glass card:** gradient fill at ~94% alpha, `{borders.stroke}`, `{shadows.card}` (deep drop + inner top highlight).
- **Glows:** 2–3 absolutely positioned circles (600–900px) with a radial-gradient fading to transparent, `opacity` 0.35–0.55. They are the only radial gradients in the frame.
- **Dot grid (optional):** one full-frame layer with a repeating dot pattern, masked to fade at the edges, opacity ≤ 0.25.
- **No** `backdrop-filter`, no stacked `filter: blur()` elements, no more than a handful of `clip-path` elements (see Renderer limits).

## Components

- **glass-card**, **kicker-badge**, **gradient-word**, **chip**, **slam-figure**, **glow-orbs** (see frontmatter).
- **Terminal line:** mono text on a glass card, prompt `›` in `sky`, output in `mute`, success tick in `positive`.
- **Chat bubble:** glass card with radius 24 and one square corner; the speaker label in a mono kicker.
- **Flip card:** two faces with `backface-visibility: hidden`, rotated with `rotationY` inside `perspective: 2200px`.
- **Path packet:** a small glowing dot travelling along a drawn SVG path: draw the path with `stroke-dashoffset`, then tween the dot's x/y through points precomputed with `getPointAtLength`.

## Frame Treatments

### 1 · Cover — kicker-badge + `display` title with one gradient word, glows behind, nothing else.
### 2 · Statement — one `headline` line centred; the stance word in `accent-italic` gradient.
### 3 · Cards — 2–4 glass cards in a row or grid, each with an icon, a card-title and one line of body; revealed in step with the voiceover.
### 4 · Terminal / code — one wide glass card with terminal lines typed on; chips mark results.
### 5 · Number — `slam-figure` gradient number + mono unit + one lead line.
### 6 · Closing — title + one CTA chip; glows brighten slightly; the only frame with an exit fade.

## Motion & transitions

- **Entrances** (inside the frame): `up` (y 110 → 0, power3.out 0.5s), `zoom` (scale 1.3 → 1, expo.out 0.6s), `flip` (rotationY −70 → 0, perspective 2200), `iris` (clip-path circle 0% → 80%, power2.inOut 0.6s, only on one element). Rotate them so neighbouring frames differ.
- **Reveal with the voice:** each card, chip or line appears at the `start` of the word that names it.
- **Glows** drift on a long sine (≥ 20s period, a few % of the frame): deterministic, no `repeat: -1` or `yoyo`; build the drift as explicit tweens across the frame's duration.
- **Between frames** (`transition_in`): `zoom-through` into a detail, `push-slide UP` for ordered steps, `blur-crossfade` for a mood shift; `crossfade` for the closing frame. Pick two or three for the whole video.
- **Beat-sync videos:** cuts land on beats (SKILL.md, beat-sync mode). Put a light flash (a full-frame white layer 0 → 0.14 → 0 over 0.25s) at 0s of the frame, created with `immediateRender: false`.

## Font faces (Vietnamese — project override)

This video is narrated and captioned in **Vietnamese**. Every composition MUST declare exactly this block and
reference families by these names. Paths are **root-relative** (`assets/fonts/…`) in every file, including frames
under `compositions/frames/`.

```css
@font-face { font-family: "Plus Jakarta Sans"; src: url("assets/fonts/PlusJakartaSans-VN.woff2") format("woff2"); font-weight: 200 800; font-style: normal; font-display: block; }
@font-face { font-family: "EB Garamond"; src: url("assets/fonts/EBGaramond-VN.woff2") format("woff2"); font-weight: 400 800; font-style: normal; font-display: block; }
@font-face { font-family: "JetBrains Mono"; src: url("assets/fonts/JetBrainsMono-VN.woff2") format("woff2"); font-weight: 100 800; font-style: normal; font-display: block; }
```

## Renderer limits

- More than ~40 elements using `radial-gradient`, `filter: blur()` or `clip-path` on screen at once produced **black frames** in the reference project. Keep glows to three, and bake any texture into a PNG.
- `fromTo` tweens on a layer reused later in the frame (flash, wipe) need `immediateRender: false`, or their start state shows at 0s.

## Numerals & Claims (hard rule)

Never invent figures. Every number, count and name traces to the script; otherwise render a placeholder.

## Pre-Render Self-Audit

- One display moment; the gradient appears exactly once.
- Ground `{colors.bg}` + ≤ 3 glows; glass cards with stroke and shadow; no backdrop-filter.
- Plus Jakarta 800 display, sentence case; mono kickers; Vietnamese diacritics intact (no clipped boxes).
- Nothing below y = 896.

## Attribution

Style adapted from `references/style-glass-keynote.md` of bestagentkits/motion-video-skill
(MIT License, Copyright (c) 2026 BestAgentKits).
