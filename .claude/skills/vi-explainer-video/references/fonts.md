# Vietnamese fonts

The skill ships nine font files in `assets/fonts/`: latin + vietnamese subsets, in woff2, under the OFL license (the `OFL-*.txt` files in the same folder). Step 1 of SKILL.md copies all of them into the project.

| File | Font family | Weight axis | Used for |
|---|---|---|---|
| `EBGaramond-VN.woff2` | EB Garamond (serif) | 400–800 | `code-editorial` headings; `glass-keynote` italic accents |
| `Inter-VN.woff2` | Inter | 100–900 | body text of `code-editorial`, `comic-multiverse` |
| `JetBrainsMono-VN.woff2` | JetBrains Mono | 100–800 | labels, file names, commands (all three) |
| `PlusJakartaSans-VN.woff2` | Plus Jakarta Sans | 200–800 | all text of `glass-keynote` |
| `Anton-VN.woff2` | Anton (condensed, uppercase) | 400 | `comic-multiverse` headings |
| `Bangers-VN.woff2` | Bangers (comic lettering) | 400 | `comic-multiverse` labels and onomatopoeia |
| `VT323-VN.woff2` | VT323 (pixel, old-terminal style) | 400 | `win95-pixel` title bars, labels, large headings |
| `BeVietnamPro-Medium-VN.woff2` | Be Vietnam Pro | 500 | `win95-pixel` body text and UI |
| `BeVietnamPro-Bold-VN.woff2` | Be Vietnam Pro | 700 | `win95-pixel` buttons, bold text, captions |

The three presets in `presets/` (`glass-keynote`, `comic-multiverse`, `win95-pixel`) already include the `@font-face` block in `FRAME.md`, so step 2 below is **not** needed for them. The block below is for faceless's `code-editorial` preset.

Glyph coverage:

- Basic Latin, Latin-1, Latin Extended-A/B.
- Latin Extended Additional: every Vietnamese accented letter.
- Combining diacritics and General Punctuation.
- Symbols ₫ €.
- Arrows (U+2190–21FF), math operators (U+2200–22FF), geometric shapes (U+25A0–25FF).
- ✓ ✗ ✱ (EB Garamond, Inter, JetBrains Mono).

Anton, Bangers and Plus Jakarta Sans have no ✓ ✗ ✱; Bangers also lacks arrows. VT323 and Be Vietnam Pro have no arrows, ✓ ✗ ▶ ■ ● or ×; Be Vietnam Pro has only two weights, 500 and 700 (static files, not variable). Set these symbols in Inter or JetBrains Mono.

## Install into the video project

**Step 1. Copy the fonts into the project.**

```bash
mkdir -p assets/fonts && cp "$SK"/assets/fonts/*.woff2 assets/fonts/
```

**Step 2. Append the following block to the end of `frame.md`.** Do this **after** running `build-frame.mjs`, because that command rewrites all of frame.md. If frame.md already has this block, do not add it again.

````markdown
## Font faces (Vietnamese — project override)

This video is narrated and captioned in **Vietnamese**. The preset's bundled faces are Latin-only
subsets, so the project ships latin + vietnamese variable WOFF2 files in `assets/fonts/`.
Every composition MUST declare exactly this block and reference families by these names.
Paths are **root-relative** (`assets/fonts/…`) in every file, including frames under
`compositions/frames/` — compositions are served with the project root as base URL, so
`../../assets/…` fails lint (`invalid_parent_traversal_in_asset_path`) and 404s in Studio.

```css
@font-face { font-family: "EB Garamond"; src: url("assets/fonts/EBGaramond-VN.woff2") format("woff2"); font-weight: 400 800; font-style: normal; font-display: block; }
@font-face { font-family: "Inter"; src: url("assets/fonts/Inter-VN.woff2") format("woff2"); font-weight: 100 900; font-style: normal; font-display: block; }
@font-face { font-family: "JetBrains Mono"; src: url("assets/fonts/JetBrainsMono-VN.woff2") format("woff2"); font-weight: 100 800; font-style: normal; font-display: block; }
```

Vietnamese stacks diacritics above and below the line: keep display `line-height` ≥ 1.1 and never
clip text containers vertically (`overflow: hidden` on a one-line box shaves tone marks).
EB Garamond has no italic file; italic is the browser's synthesized slant.
````

`captions.mjs` picks up the `@font-face` rules in frame.md for the captions automatically, so the captions need no extra work.

## Presets that use other font families

Create a subset of that preset's font with the same recipe:

1. **Download the font.** Get the variable TTF from `https://github.com/google/fonts/raw/main/ofl/<ho-font>/<Ten>[wght].ttf` (`<ho-font>`: the lowercase family folder; `<Ten>`: the family file name). Only use OFL-licensed fonts.
2. **Create the subset.** The system Python has no fontTools, so use `uv`:

```bash
uv run --with fonttools --with brotli pyftsubset "<Ten>[wght].ttf" \
  --unicodes="U+0000-00FF,U+0100-024F,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1E00-1EFF,U+2000-206F,U+20AB,U+20AC,U+2122,U+2190-21FF,U+2200-22FF,U+25A0-25FF,U+2713,U+2717,U+2731,U+FEFF,U+FFFD" \
  --layout-features='*' --flavor=woff2 --output-file=assets/fonts/<Ten>-VN.woff2
```

3. **Declare the font.** Add the matching `@font-face` line to the block above, and to the `worker-prompt.md` template.
   - Paths are always relative to the project root: `url("assets/fonts/<Ten>-VN.woff2")`.
   - The file name ends in `-VN.woff2`, because the frame check in SKILL.md looks for exactly this name pattern.
   - For long-term use, copy the woff2 file into the skill's `assets/fonts/`.
4. **Verify.** Run `fc-scan --format "%{charset}\n" <file>`, or capture a frame containing the letters "ỗ ệ ữ Ặ ỹ" and look at the image.
