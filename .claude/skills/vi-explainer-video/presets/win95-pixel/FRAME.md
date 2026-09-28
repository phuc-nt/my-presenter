---
version: alpha
name: Win95 pixel desktop — Frame (video / frame layer)
description: >
  A retro 1995 desktop for Vietnamese product tours and software explainers: a flat teal desktop, grey
  bevelled windows with navy gradient title bars, pixel-art icons, VT323 pixel type for chrome and headlines,
  Be Vietnam Pro for anything the viewer reads. Frames recreate the product's UI in this skin and may frame
  cropped screenshots of the real product. First built for a digital-library tour (kho-sach-win95). Period
  look only: no Microsoft or Windows logos, no product names of the OS.
unit: the frame — 1920×1080 primary
principle: bevels not shadows · pixels stay pixels · stepped motion · numbers come from the script

colors:
  canvas: "#008080"
  ink: "#000000"
  chrome: "#C0C0C0"
  chrome-hi: "#DFDFDF"
  chrome-lo: "#808080"
  white: "#FFFFFF"
  title: "#000080"
  title-2: "#1084D0"
  select: "#000080"
  tooltip: "#FFFFE1"
  wood: "#6B4226"
  wood-dark: "#46291A"
  wood-light: "#8C5A34"
  label: "#F3E6C4"
  link: "#0000A8"
  yellow: "#FFE040"
  red: "#E02020"
  green: "#10A040"

borders:
  raised: "inset -2px -2px #000, inset 2px 2px #fff, inset -4px -4px #808080, inset 4px 4px #dfdfdf"
  sunken: "inset 2px 2px #808080, inset -2px -2px #fff, inset 4px 4px #000, inset -4px -4px #dfdfdf"
  pressed: "inset 2px 2px #000, inset -2px -2px #fff, inset 4px 4px #808080"
shadows:
  window: "6px 6px 0 rgba(0,0,0,0.45)"

typography:
  body:     { fontFamily: "Be Vietnam Pro", cqw: 1.5, weight: 500, lineHeight: 1.5 }
  lead:     { fontFamily: "Be Vietnam Pro", cqw: 1.9, weight: 500, lineHeight: 1.45 }
  ui:       { fontFamily: "Be Vietnam Pro", cqw: 1.15, weight: 500, lineHeight: 1.3 }
  title-bar: { fontFamily: "VT323", cqw: 1.6, weight: 400, lineHeight: 1.15 }
  label:    { fontFamily: "VT323", cqw: 1.9, weight: 400, lineHeight: 1.15 }
  headline: { fontFamily: "VT323", cqw: 4.6, weight: 400, lineHeight: 1.1 }
  display:  { fontFamily: "VT323", cqw: 8.0, weight: 400, lineHeight: 1.05 }

spacing:
  slide-pad: "3.4cqw"
  gap-md: "1.2cqw"
  radius: "0px"

components:
  window:
    backgroundColor: "{colors.chrome}"
    border: "{borders.raised}"
    shadow: "{shadows.window}"
    description: "The Win95 window. Grey body, 4px two-tone raised bevel, square corners, a hard offset shadow. Title bar on top (see title-bar). Content areas inside are white or grey panels with the sunken bevel. Optional menu row (File View Tools Help, Be Vietnam Pro) and toolbar."
  title-bar:
    backgroundColor: "linear-gradient(90deg, {colors.title}, {colors.title-2})"
    typography: "{typography.title-bar}"
    description: "44–52px tall. A 16px-grid pixel icon at left (image-rendering: pixelated, integer scale), the title in VT323 white, and three 36px grey caption buttons at right (_ □ ×) drawn with the raised bevel; × is 'Inter' 700. An inactive window uses #808080 → #B0B0B0."
  button:
    backgroundColor: "{colors.chrome}"
    border: "{borders.raised}"
    typography: "{typography.ui}"
    description: "Raised grey push button; pressed = {borders.pressed} and the label shifts 2px right/down. The default button has an extra 2px black outline. Focus = a 1px dotted rectangle inside."
  field:
    backgroundColor: "{colors.white}"
    border: "{borders.sunken}"
    description: "Text box / list. Sunken bevel, white fill, Be Vietnam Pro text, a 2px black caret that blinks in 0.5s steps (tl.set on/off, never CSS animation)."
  tooltip:
    backgroundColor: "{colors.tooltip}"
    description: "Pale yellow box, 2px black border, no radius, Be Vietnam Pro 500; for callouts that point at UI."
  shelf:
    backgroundColor: "{colors.wood}"
    description: "Example of product-specific furniture (from the library tour; drop it for other products): a wood bookshelf with dark-brown planks and a lighter top edge, rows of flat-coloured book spines (the palette's red/green/navy/olive/purple/teal at 70% saturation), beige label tabs (VT323, count in Be Vietnam Pro). Prefer a real screenshot crop when showing a whole wall."
  progress:
    description: "Sunken track filled by discrete navy blocks (12–20 blocks), each block appearing with tl.set; never a smooth width tween."
  pixel-icon:
    description: "Icons from assets/images/icons/*.svg (book, openbook, shelf, search, folder, chat, floppy, user, key, heart, computer, ereader, help, bulb, feed, star, hourglass, cursor). Always integer scale (×3, ×4, ×6 of the SVG's pixel size) with image-rendering: pixelated. Never draw new icons with gradients or blur."
  cursor:
    description: "assets/images/icons/cursor.svg at ×3 (36×57px). Moves in straight lines with steps(10) easing, clicks = the target button switches to pressed for 0.12s. The hourglass.svg replaces it while something loads."
  desktop-icon:
    description: "A pixel icon ×4 above a VT323 label (white text on the teal ground); selected = the label on a navy box with a dotted outline."
---

# Win95 pixel desktop — Frame (video / frame layer)

## Overview

Every frame is **a moment on an old desktop**: the flat teal ground (`canvas`), one or two grey **windows** with
bevelled edges and a navy gradient title bar, pixel icons, and a pixel mouse cursor doing the clicking. Frames
either **recreate the product's UI** in HTML/CSS with this skin or **frame a cropped screenshot** of the real
product (`assets/images/shots/*.png`) inside a window's content area and animate around it (pan, zoom into a
region, a tooltip callout, a highlight rectangle, the cursor clicking a real button).

A persistent **taskbar** and the **caption tooltip** live in the caption layer at the bottom (y ≥ 900); frames never
draw their own taskbar.

**Key characteristics at frame scale:**

- Flat colour and hard edges: bevels (`borders.raised/sunken`) instead of soft shadows; one hard offset window shadow.
- Pixels stay pixels: icons at integer scale, `image-rendering: pixelated`; no blur, no gloss, no rounded corners.
- VT323 for chrome, labels and big pixel headlines; Be Vietnam Pro for every sentence the viewer reads.
- Stepped motion: windows open with a zoom-rectangle, things appear on `steps()`, the cursor travels in straight lines.

## The Frame

### Frame Craft Bar

- **Squint** — one window (or one headline) dominates; at most two windows plus a callout.
- **Ground** — teal `canvas` full-bleed on a `.clip` layer; optionally 2–4 desktop icons in a column at the left edge.
- **Type** — VT323 headlines ≥ 4cqw (pixel fonts get mushy when small); Be Vietnam Pro 500–700 for body and UI.
- **Contrast** — black on grey/white/tooltip, white on navy/teal. Never grey text below #808080 on #C0C0C0 except disabled labels.

- **Primary:** 1920×1080 (16:9). Author in `cqw`; every frame ground sets `container-type: size`.
- **Safe area:** `slide-pad` ~3.4cqw. **Keep all content above y = 880** (the taskbar and captions own 900–1080).

## Colors

`canvas` teal is the desktop everywhere. `chrome` / `chrome-hi` / `chrome-lo` / `white` / `ink` build every bevel.
`title` → `title-2` is the active title bar gradient (the only gradient allowed besides wood grain). `select` navy
marks selection (selected menu item, selected text, active tab). `tooltip` pale yellow for callouts. `wood*` and
`label` only for product furniture such as the shelf example. `yellow`, `red`, `green` only inside pixel icons, the progress blocks or one
highlight per frame (a 4px dashed `red` rectangle around the thing being explained).

## Typography

- **VT323** (`display`, `headline`, `label`, `title-bar`): headlines are short (≤ 6 words), sentence case, never
  letter-spaced. Vietnamese marks stack high in VT323: line-height ≥ 1.05 and 0.12em top padding on any box.
- **Be Vietnam Pro** 500 (`body`, `lead`, `ui`) and 700 for bold/buttons: anything longer than six words.
- **Inter** only for symbols VT323 and Be Vietnam Pro lack: → ← ✓ ✗ ▶ ■ ● and the × on close buttons.

## Depth & Surface

- Depth = bevels only. A window has `{borders.raised}` + `{shadows.window}`; inset areas have `{borders.sunken}`.
- Screenshot crops sit inside a sunken content area at scale 1.0–1.35 (they are 1440-wide captures; 1.333 fills a
  1920 frame). Use `image-rendering: auto` for screenshots and `pixelated` for icons.
- Optional texture: a 2×2 dither checkerboard as ONE full-frame layer (`background: repeating-conic-gradient(#0a8a8a 0 25%, #008080 0 50%) 0 0/4px 4px`) at opacity ≤ 0.35 — never per element.

## Components

- **window**, **title-bar**, **button**, **field**, **tooltip**, **shelf**, **progress**, **pixel-icon**, **cursor**, **desktop-icon** (see frontmatter).
- **Menu** (Start menu, dropdown): grey panel, raised bevel, items 56px tall with a ×2 icon + Be Vietnam Pro label; hovered item = navy fill, white text. The Start menu has a vertical navy→blue side band with the product name in VT323 rotated −90°.
- **Dialog**: a small window with a message, a ×4 icon at left and 1–2 buttons at the bottom right.
- **Book cover** (library example): flat-colour rectangle (palette colour at 70% saturation), 3px darker border, a thin inner frame line, one big serif-ish initial letter in VT323 — a stand-in when there is no real cover image.

## Frame Treatments

### 1 · Boot — black screen, a pixel logo made of the shelf icon ×8, VT323 title, progress blocks filling, then the teal desktop appears.
### 2 · Window tour — one large window with a real screenshot crop inside; the cursor clicks, a region zooms, a tooltip names it.
### 3 · Typing — a field gets text typed character by character (tl.set per character) with the caret, results appear row by row.
### 4 · Dialog — a dialog window opens with the zoom-rectangle over a dimmed window behind; fields/labels appear in step with the voice.
### 5 · Menu — the Start menu slides up (steps) from the taskbar area (bottom-left, above y = 880), items highlight one by one.
### 6 · Closing — teal desktop, one centred window titled with the product name, the URL typed into a field and the tagline in VT323; the only frame that fades out.

## Motion & transitions

- **Stepped time:** UI motion uses `steps(n)` eases (GSAP `"steps(8)"`) or instant `tl.set` changes. Smooth eases only for the cursor path (`"power1.inOut"` is fine) and for one slow zoom/pan into a screenshot per frame.
- **Zoom-rectangle window open** (Win95's own animation): a 2px dotted black/white outline rectangle grows from the icon or button that launched it to the window's rect in 6 steps over 0.3s, disappears, and the window appears at once (`tl.set(win, { visibility: "inherit" }, t)`). Close = the reverse. Build the steps as 7 `tl.set` calls (k = 0..6, at t + 0.05·k) with linearly interpolated `left/top/width/height` — lint rejects tweening `left/top` (`gsap_non_transform_motion`), and a `steps(6)` `fromTo` on those properties is exactly that.
- **Cursor:** straight-line moves 0.4–0.8s; a click = the button's pressed bevel for 0.12s + the action. Cursor enters from off-content, never teleports mid-frame.
- **Typing:** one `tl.set` per character at 0.06–0.09s intervals, caret toggling every 0.5s via `tl.set`.
- **Reveal with the voice:** each window, row, label or callout appears at the `start` of the word that names it.
- **Between frames** (`transition_in`): `cut` — the in-frame window-open carries the change; the closing frame uses `crossfade`.
- **Forbidden:** `repeat: -1`, `yoyo`, CSS `@keyframes`, `Math.random`, blur filters, glow, rounded corners, drop shadows with blur.

## Font faces (Vietnamese — project override)

This video is narrated and captioned in **Vietnamese**. Every composition MUST declare exactly this block and
reference families by these names. Paths are **root-relative** (`assets/fonts/…`) in every file, including frames
under `compositions/frames/`.

```css
@font-face { font-family: "VT323"; src: url("assets/fonts/VT323-VN.woff2") format("woff2"); font-weight: 400; font-style: normal; font-display: block; }
@font-face { font-family: "Be Vietnam Pro"; src: url("assets/fonts/BeVietnamPro-Medium-VN.woff2") format("woff2"); font-weight: 500; font-style: normal; font-display: block; }
@font-face { font-family: "Be Vietnam Pro"; src: url("assets/fonts/BeVietnamPro-Bold-VN.woff2") format("woff2"); font-weight: 700; font-style: normal; font-display: block; }
@font-face { font-family: "Inter"; src: url("assets/fonts/Inter-VN.woff2") format("woff2"); font-weight: 100 900; font-style: normal; font-display: block; }
```

VT323 and Be Vietnam Pro have no → ← ✓ ✗ ▶ ■ ●; set those in Inter. Be Vietnam Pro ships only 500 and 700.

## Renderer limits

- More than ~40 elements using `radial-gradient`, `filter: blur()` or `clip-path` on screen at once produced **black frames** in an earlier project. This style needs none of them; keep it that way.
- Book spines and progress blocks are plain divs with flat backgrounds (cheap); still, keep a frame under ~300 elements — use the shelf screenshot for a full wall.
- `fromTo` tweens on a layer reused later in the frame need `immediateRender: false`, or their start state shows at 0s.
- Toggle `visibility` for windows that open/close rather than leaving them at `opacity: 0`, with these rules:
  - Initial hidden state goes in the CSS (`visibility: hidden`), not a `tl.set(…, 0)` (lint `gsap_timeline_set_initial_hide`).
  - Show with `visibility: "inherit"`, **never `"visible"`**. The runtime hides a finished frame by setting `visibility: hidden` on its host; a child set to `"visible"` overrides that and stays on screen over every later frame.
  - Never set `visibility` (or `autoAlpha`) on a `.clip` element — lint error. Hide a child layer instead; anchor the timeline end with `tl.set({}, {}, DURATION)`.

## Numerals & Claims (hard rule)

Never invent figures, names or titles. Every number, count, title and author traces to the script or the storyboard
Scene lines (which list the real values from the product); otherwise render a placeholder.

## Pre-Render Self-Audit

- Bevels on every window and button; square corners; no blur, no glow, no soft shadow.
- Icons at integer scale and pixelated; screenshots unwarped (uniform scale).
- VT323 headlines, Be Vietnam Pro body; diacritics intact (check ỗ ệ ữ Ặ ỹ in the snapshot).
- Nothing below y = 880; no taskbar drawn by the frame.
