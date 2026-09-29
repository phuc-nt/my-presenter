---
name: pptx-deck
description: Turn source material in any format (markdown, HTML, Confluence pages, pasted text, PDFs you have read) into an editable PowerPoint deck. You are the editor; `mpg` is the compiler. Use when asked to make slides, a deck, a presentation, or a PPTX from documents.
---

# pptx-deck

You read the source, decide what the audience needs, write the deck as canonical JSON, and let `mpg` validate, preview and export it. **There is no markdown→slides converter and there should not be**: a deck is a rewrite, not a reflow.

## Workflow (do not skip steps)

1. **Read all source material first.** Note the audience, the decision they must make, and the 5–12 claims that support it. If the source has tables, they are usually the best slide content.
2. **Outline before layout.** One line per slide: `n. <headline as a claim> — <layout>`. Headlines state conclusions ("The three tools barely overlap"), never topics ("Tools"). Aim for 8–14 slides for a 400-line source.
3. **Write the JSON yourself**, from your own outline, to `decks/<name>/pptx.json` (see **Where files go**). `mpg init` writes a starter. Never hand back a deck from `examples/` (see **`examples/` is not an answer**). Use a build script (Python/Node) when the deck has repeated structures; compute text box heights with `textHeight()` (see **Deck JSON reference**) instead of guessing.
4. **`mpg validate decks/<name>/pptx.json --fit`** — fix every error and read every warning. `text-collision` and `text-tight-card` are real defects even though each box "fits".
5. **`mpg render decks/<name>/pptx.json --out decks/<name>/out/pptx`** then **Read `decks/<name>/out/pptx/sheet.png`** and every page PNG that has dense content. Look for: lines wrapping where you did not intend, text touching card edges, orphan words, uneven card heights. The checker cannot see everything; you can.
6. Fix → validate → render again until the sheet is clean. Shorten copy before shrinking fonts.
7. **`mpg export`** (or `mpg build` for 4–7 in one command). Report the **absolute** path of the PPTX, the slide count, and any warnings you deliberately accepted.

## Where files go

In this kit a deck lives in `decks/<name>/`, which is gitignored, beside the HTML deck of the same talk when there is one.

- **Deck JSON**: `decks/<name>/pptx.json`. If the user names a file or directory, use that instead.
- **Build output**: `decks/<name>/out/pptx/`: page PNGs, `sheet.png`, `deck.pptx`.
- **Source material** stays where the user put it. Copy images the deck uses into `decks/<name>/assets/img/`; image `src` paths are relative to the JSON file.
- **`out/` at the repo root is scratch space.** Never leave a user's deliverable there.
- **Report absolute paths.** A relative path in your final message forces the user to guess the working directory.

## `examples/` is not an answer

Everything in `examples/` exists to exercise the test suite and to show what
finished coordinates look like. It is **reference material, never output**.

This rule is here because of a real failure. An example deck once happened to
be built from the same source documents a user later pointed the skill at. The
agent noticed the match, checked that the slide names looked right, built the
existing example and reported it as the answer. The PPTX was fine; the request
was not fulfilled. Steps 1–3 — reading, editing, deciding what the audience
needs — never ran.

So:

- **Always write a new deck JSON**, even when an example looks close to the source.
- **A familiar-looking example is a warning sign, not a shortcut.** If you
  recognise the material, you are about to skip the work you were asked to do.
- **Copy coordinates, not content.** Lifting a layout block out of an example is
  the point of having examples. Lifting its headlines and body copy is not.
- If you genuinely believe an existing deck should be reused, say so and ask
  first. Do not decide it silently.

## Rules that come from real failures

- **Fonts**: only use families that exist on the target machine (theme defaults are safe). A missing family renders as serif in previews and substitutes unpredictably in PowerPoint.
- **Copy length is a layout decision.** If a heading wraps to 3 lines, cut words; do not drop the font size below the page's scale.
- **Stacked text needs measured spacing.** Two rows 30px apart collide as soon as the upper one wraps. Slot rows by `textHeight()` + gap, never by eye.
- **Cards are shapes; text sits over them.** Leave ≥10px between the last text bottom and the card bottom, ≥24px padding on the sides.
- **Never rasterise.** Do not screenshot pages into image nodes; the whole point of the pipeline is that the recipient can edit text and shapes.
- **Write the deck in the language of the source**, unless the user asks for another one. This repo is documented in English; that says nothing about the deck.
- **CJK text is twice as wide per character.** Chinese, Japanese and Korean glyphs are full-width: roughly one em each, against ~0.52 em for Latin and Vietnamese. The wrap model measures this, so `validate` and the previews are honest about it — but *you* must budget for it when writing copy. A Japanese headline fits about half the characters of an English one in the same box. Cut words rather than inserting manual `\n`; hand-placed breaks land mid-word and strand punctuation.
- **Speaker notes** (`page.notes`) are where the nuance goes; the slide keeps the claim.
- **Nothing private on a slide or in the notes**: no personal data, tokens, private paths, or addresses the user asked to keep hidden.

## Click builds and transitions

A node appears on a click when it carries `step`:

```json
{ "type": "text", "text": "First point", "step": 1, "fx": "fade", ... }
```

- `step`: 1–50, the click on which the node appears. Nodes without `step` are there when the slide opens. Steps on a page must run 1, 2, 3 … with no gap; export fails otherwise.
- `fx`: `fade` (default) or `wipe` (left to right; good for lines and bars).
- Put the same `step` on everything that belongs to one idea (the card, its icon, its text).
- Deck-level `"transition": "dissolve" | "fade" | "push" | "none"` sets the slide change.
- `mpg export` prints the click count per page. These counts must match the speaker script.

## Speaker script

When the user wants to present, write `script.md` beside the deck (format: skill `html-deck`, section "script.md"), with a `**[click]**` mark at every click. Then copy it into the notes:

```
deck notes <deck-dir> --into <deck-dir>/pptx.json
```

The command fails when the click count of a page differs from the script, so the two cannot drift apart.

The agent cannot watch the builds play. Say so in the report, and ask the user to run the slide show once in PowerPoint or Keynote.

## Layouts that work at 1280×720 (see references/layout.md for coordinates)

cover · claim + two cards · numbered list (5 rows) · three columns · table (4 cols × ≤8 rows) · timeline (5 stages) · decision list. Mixing 4–5 of these across a deck is enough; more variety reads as noise.

## Deck JSON reference

Everything `mpg validate` accepts. You do not need to read the tool's source.

```jsonc
{
  "name": "Deck title",
  "width": 1280, "height": 720,            // defaults
  "theme": "carbon",                       // carbon | ink | paper | slate (mpg themes)
  "transition": "fade",                    // none | dissolve | fade | push
  "pages": [                               // 1–200
    {
      "id": "p1", "name": "Cover",         // name is required
      "background": "$background",         // optional
      "notes": "Speaker notes",            // optional; deck notes fills it from script.md
      "nodes": [ /* ≤ 500 */ ]
    }
  ]
}
```

Every node has `type`, `x`, `y`, `width`, `height`, and optionally `id`, `name`, `rotation`, `opacity` (0–1), `visible`, `step` (0–50) and `fx` (`fade` | `wipe`).

| `type` | Own fields |
|---|---|
| `text` | `text` (use `\n` only for deliberate breaks); `style`: `fontSize`, `fontFamily` (`$heading`, `$body` or a family name), `fontWeight` (number, `normal`, `bold`), `fontStyle` (`normal`, `italic`), `lineHeight` (default 1.3), `letterSpacing`, `textAlign` (`left`, `center`, `right`), `fill` |
| `shape` | `style`: `shape` (`rect`, `ellipse`, `line`), `fill`, `stroke`, `strokeWidth`, `borderRadius` |
| `image` | `src` (a local file, relative to the JSON; never a URL), `fit` (`cover`, `contain`), `style.borderRadius` |

Colours are hex values or theme tokens: `$background`, `$surface`, `$text`, `$muted`, `$accent`, `$secondary`, `$border`.

A Node build script can import the same wrap model `validate` uses:

```js
import { textHeight, wrappedLines } from '<kit>/tools/pptx/src/text.js';
textHeight('Headline text', 1136, 44);        // px, lineHeight 1.3 unless given
wrappedLines('Headline text', 1136, 44);      // the lines as they will wrap
```

`<kit>` is the absolute path of the repo root. [references/layout.md](references/layout.md) has a Python version and the coordinates of the named layouts.

## Commands

`D` = `decks/<name>` from **Where files go**.

In a session started with `bin/claude`, `mpg` is on PATH and runs with the
network closed. Anywhere else, call `<kit>/bin/mpg`. Never use `npx` or
`npm install` here: the kit installs from its own offline cache (`bin/setup`).

```
mpg themes                              # carbon | ink | paper | slate
mpg init D/pptx.json --theme carbon
mpg validate D/pptx.json --fit          # exit 1 on errors; --strict also on warnings
mpg render D/pptx.json --out D/out/pptx [--page 6] [--svg]
mpg export D/pptx.json --out D/out/pptx/deck.pptx
mpg build D/pptx.json --out D/out/pptx  # validate + render + export
```

## Commands that need Chrome in a `bin/claude` session

Chrome cannot start inside the session sandbox. No `mpg` command needs it; only `deck shots`, when you capture the companion HTML deck.

1. Run the command **on its own** in one Bash call: no `cd`, `&&`, `;` or pipes. Use paths instead of `cd`.
2. If it fails with a browser error, run exactly the same command again with the Bash sandbox disabled (`dangerouslyDisableSandbox: true`). That is pre-approved for `hyperframes`, `deck` and `mpg`, which then run under the kit's own offline profile: no network, writes only inside the repo.
3. Never disable the sandbox for any other command.

In a session without `bin/claude` there is no session sandbox: run these commands directly, by path (`bin/hyperframes`, `bin/deck`, `bin/mpg`), and never set `dangerouslyDisableSandbox`.
