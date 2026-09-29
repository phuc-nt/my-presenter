---
name: html-deck
description: Build a presentation as one self-contained HTML file with click builds, animations, speaker notes and keyboard control, from slides.html + script.md. Works offline; the file loads nothing from the network. Use when asked for an HTML deck, animated slides, a browser presentation, or a deck with more motion than PowerPoint allows.
---

# html-deck

You write the slides and the speaker script. `deck` compiles them into one HTML file with fonts, icons and images inlined, checks that the file is self-contained, and takes screenshots for you to review.

In a session started with `bin/claude`, `deck` is on PATH and runs with the network closed. Anywhere else call `<kit>/bin/deck`. Never use `npx` or `npm install`.

## Workflow

1. **Read the source** and decide the 6–14 claims the audience needs. A deck is a rewrite, not a reflow.
2. **`deck init decks/<name> --theme plain|win95`**. `decks/` is gitignored; user decks stay out of git. `deck themes` lists themes.
3. **Write `script.md` first** (what is said, and where each click falls), then `slides.html` (what is seen). One idea per click.
4. **`deck build decks/<name>`** writes `decks/<name>/out/<name>.html`. The build stops when slide counts or click counts differ from the script, when a placeholder has no file, or when the privacy check finds something.
5. **`deck shots decks/<name>/out/<name>.html --out decks/<name>/out/shots`**, then **Read `sheet.png`** and any dense slide. Add `--all` to see every click step, or `--at 3,5.2` for slide 3 and slide 5 step 2. The command reports elements outside the stage and any outside request.
6. Fix, build, shoot again until the sheet is clean. Shorten copy before shrinking type.
7. Report the absolute path of the HTML file, slide count, clicks per slide, and what you could not check.

**You cannot watch motion.** Screenshots are taken with motion reduced, at the end state of each step. Say in the report that animation timing was not viewed, and ask the user to click through once.

## Deck folder

```
decks/<name>/
  deck.config.json   title, name, lang, theme, forbid, chrome (theme options)
  slides.html        the slides
  script.md          the speaker script
  assets/img/        screenshots and pictures   → {{IMG:name}}
  assets/icons/      icons, PNG or SVG          → {{ICON:name}}
  assets/fonts/      extra fonts (.woff2)
```

- `forbid` in `deck.config.json` is a list of words that must never appear in the output (a hidden address, a customer name). The build fails if one does.
- Fonts come from the theme. They must contain Vietnamese glyphs; the kit's `-VN` fonts do.
- The stage is 1920×1080 and scales to the window.

## slides.html

Each slide is a `<section class="slide" data-task="Short name">`. The first slide usually has `class="slide cover"`.

| Attribute | Meaning |
|---|---|
| `data-step="N"` | appears on click N; `0` plays when the slide opens; no attribute = always there |
| `data-fx` | `fade` `pop` `wipe` `drop` `type` (typed text) `words` (word by word, wrap each word in `<span>`) `count` (number, with `data-to`, `data-suffix`) `blocks` (progress bar of `<i>`) `flash` |
| `data-delay="ms"` | wait before the effect |
| `data-until="N"` | disappears at click N |
| `data-hook` | an action at that click, see below |

Hooks that come with the engine:

- `click` — the cursor moves to `data-target` and presses it.
- `chips` — presses the children one after another.
- `select` — moves the selection in `data-list` to item `data-to`.
- `class` — adds `data-class` to `data-target` after `data-wait` ms.

A deck can add its own hook in a `<script>` at the top of `slides.html`:

```html
<script>
DeckHooks.flip = (el, instant, api) => {
  const end = () => { /* final state */ };
  if (instant) return end();          // going backwards or reduced motion
  api.later(500, () => { /* animate */ });
  return end;                         // called if the presenter clicks on before it ends
};
</script>
```

Use `api.later`, never `setTimeout`, so pending steps are cancelled when the slide changes. No `fetch`, no external `src`, no `<link>`, no `<iframe>`: the build refuses them.

For real coordinates and class names, read `examples/kho-sach-so/slides.html` (win95) and `tools/deck/starters/plain/slides.html`. Copy structure, never content. You do not need to read the engine or theme source.

### What the `plain` theme gives you

Slide padding is `96px 120px 110px` on the 1920×1080 stage, so content spans x 120–1800 and y 96–970. The bottom 64px hold the deck's own bar.

| Variable | Use |
|---|---|
| `--bg`, `--panel`, `--line` | page, card fill, card border |
| `--ink`, `--muted` | main text, secondary text |
| `--accent`, `--warn` | one highlight per slide; callouts and the cursor |
| `--body` | the font stack (Vietnamese-safe) |

| Class | What it is |
|---|---|
| `h1`, `h2` | cover title (132px), slide headline (76px) |
| `.lead`, `.by` | subtitle under a headline; byline at the bottom of the cover |
| `.cover` | on the first `section`: centres the content vertically |
| `.accent` | text in the accent colour |
| `.bl` > `.b` > `.n` + `p` | numbered list: a list, its rows, the round number, the text (`<b>` in it is accented) |
| `.cols`, `.cards3` | two-column grid; three equal cards |
| `.card` (+ `p`) | panel with border and padding |
| `.big` | a large accent number (150px) |
| `.shot` > `img` | framed screenshot; put `.hl` (highlight box) and `.tip` (label) inside it, positioned absolutely |
| `.btn`, `.key` | button and keyboard-key pictures, for `click` hooks |
| `.prog` | progress bar container for `data-fx="blocks"` |
| `.sel` | the selected item for the `select` hook |

A deck may add its own `<style>` at the top of `slides.html` for anything the theme lacks. Use the variables above rather than new colours, and no `@import` or `url()` to the network.

## script.md

```markdown
## Slide 2 — Headline as a claim

**On the slide:** what is on the slide
**Clicks:** 3

**Say:**
Opening sentence. **[click]** First idea. **[click]** Second idea. **[click]** Third idea.
```

The Vietnamese labels `**Bấm:**`, `**Nói:**` and `**[bấm]**` mean the same and are accepted too; the starters use them.

- Slides are numbered 1..N without gaps.
- The number after `Clicks:` equals the number of `**[click]**` marks and the highest `data-step` of that slide.
- Written for the ear: short sentences, about 40–60 seconds per slide.
- The script shows in the notes panel (key `N`) with the next click highlighted.

## Keys in the built deck

→ / Space / click: next · ←: back · N: notes · G: slide grid · F: full screen · ?: help · Home / End. The address `#5.2` opens slide 5 at step 2. Add `?noboot` to skip a theme's opening screen.

## Privacy and offline rules

- Nothing private on a slide or in the script: no personal data, tokens, private paths.
- The built file carries a Content-Security-Policy that blocks every network request, so it is safe to open on any machine.
- `deck check <file.html> --forbid word1,word2` checks any HTML file the same way.

## The same talk as PowerPoint

Skill `pptx-deck` builds the PPTX. Keep one `script.md` for both; `deck notes <dir> --into <dir>/pptx.json` copies it into the PPTX notes and checks the click counts.

## Commands that need Chrome in a `bin/claude` session

Chrome cannot start inside the session sandbox. The command here that needs it: `deck shots`.

1. Run the command **on its own** in one Bash call: no `cd`, `&&`, `;` or pipes. Use paths instead of `cd`.
2. If it fails with a browser error, run exactly the same command again with the Bash sandbox disabled (`dangerouslyDisableSandbox: true`). That is pre-approved for `hyperframes`, `deck` and `mpg`, which then run under the kit's own offline profile: no network, writes only inside the repo.
3. Never disable the sandbox for any other command.

In a session without `bin/claude` there is no session sandbox: run these commands directly, by path (`bin/hyperframes`, `bin/deck`, `bin/mpg`), and never set `dangerouslyDisableSandbox`.
