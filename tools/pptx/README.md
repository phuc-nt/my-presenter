# my-pptx-generator

> **In my-presenter:** this folder is the kit's PPTX builder. `bin/setup` installs its packages offline from `vendor/npm-cache`, and the kit runs it as `bin/mpg` (or `mpg` inside a `bin/claude` session) under the offline profile. Do not use `npm install` or `npx` here; the commands below keep their upstream form for reference. The kit's copy also adds click builds, transitions and image metadata stripping (`src/clean-image.js`).

Agent-first toolkit for the workflow **read anything → curate → canonical JSON → editable PPTX**.

The agent is the editor. `mpg` is the compiler: it validates the JSON with
design checks that catch what schema validation cannot (text collisions, text
crowding card edges, contrast against the shape actually behind the text),
renders PNG previews the agent can look at, and writes a PowerPoint file in
which every text box and shape stays editable. Pure Node; no browser.

```
npm install
npx mpg build examples/minimal.json --out out/demo   # validate + previews + pptx
```

## Commands

Run the CLI with `npx mpg` (or `node bin/mpg.js`); it is not installed globally.

| Command | Does |
|---|---|
| `npx mpg init deck.json` | starter JSON |
| `npx mpg themes` | built-in themes (`carbon`, `ink`, `paper`, `slate`) |
| `npx mpg validate deck.json [--fit] [--json] [--strict]` | schema + design checks; exit 1 on errors |
| `npx mpg render deck.json --out dir [--page n] [--svg]` | `page-NN.png` + `sheet.png` contact sheet |
| `npx mpg export deck.json --out deck.pptx` | editable PPTX (refuses on errors unless `--force`) |
| `npx mpg build deck.json --out dir` | all of the above |

## Deck JSON

```jsonc
{
  "name": "Deck title",
  "theme": "carbon",                    // id, or { "extends": "carbon", "colors": {...}, "fonts": {...} }
  "width": 1280, "height": 720,         // px @ 96 dpi → 13.33 × 7.5 in
  "pages": [{
    "name": "Cover", "notes": "speaker notes",
    "background": "$background",
    "nodes": [
      { "type": "shape", "x": 0, "y": 0, "width": 14, "height": 720, "style": { "fill": "$accent" } },
      { "type": "text",  "x": 72, "y": 200, "width": 1136, "height": 190, "text": "Title",
        "style": { "fontSize": 72, "fontFamily": "$heading", "fontWeight": 700, "lineHeight": 1.15, "fill": "$text", "textAlign": "left", "letterSpacing": 0 } },
      { "type": "image", "x": 800, "y": 100, "width": 400, "height": 300, "src": "figure.png", "fit": "contain" }
    ]
  }]
}
```

Node types: `text`, `shape` (`style.shape`: `rect` | `ellipse` | `line`; `fill`, `stroke`, `strokeWidth`, `borderRadius`), `image` (local path or data URI). Colour values `$token` resolve from the theme. Nodes draw in array order; put cards before the text that sits on them.

## Checks

| Code | Severity | Meaning |
|---|---|---|
| `text-overflow` | error | needed height > box height (wrap model: sum of glyph advances, 1.0em for CJK and 0.52em otherwise) |
| `outside-page`, `zero-size`, `empty-page`, `missing-image`, `remote-image` | error | |
| `text-collision` | warning | measured boxes of two text nodes intersect |
| `text-spills-card` / `text-tight-card` | warning | text crosses / comes within 10px of the bottom of the card it sits on |
| `text-contrast` | warning | < 4.5:1 (3:1 for large) against the topmost shape behind the text |
| `empty-text`, `small-text`, `dense-page` | warning / info | |

## Why not convert markdown directly?

A markdown→slides converter reflows text; it does not decide what the audience
needs, which table becomes the key slide, or which 40 words to cut so a heading
fits on two lines. Those are editorial decisions, and the agent makes them
better than a parser. The agent skill in `.claude/skills/pptx-deck/` documents
the workflow and the layout maths.

## Fonts

Built-in themes use Arial (and Georgia for `paper` headings) because those
ship with macOS, Windows and Office, so the PPTX opens identically without
font embedding. Helvetica was dropped on purpose: it exists only on macOS, and
its bold face is lost in `@resvg/resvg-js` previews whenever a line contains a
glyph Helvetica lacks (`→`, `▶`, `✓`), which made previews lie about headings.
If a custom theme names a font that is not installed locally, previews fall
back to Arial while the PPTX keeps the requested name.

## Development

```
npm test
```

`npm audit` reports `image-size` (a transitive dependency of `pptxgenjs`) for a
denial-of-service in its ICNS/JXL/HEIF parsers. pptxgenjs only calls it when an
image is added without explicit width and height; this tool always passes both,
so the vulnerable code path is never reached. Accepted; revisit when pptxgenjs
bumps the dependency.
