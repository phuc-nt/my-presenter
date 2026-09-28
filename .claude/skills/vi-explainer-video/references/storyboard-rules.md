# STORYBOARD.md: rules and template

Write **one** file that holds both the plan (faceless-explainer Step 3) and the visual design (Step 4). faceless's
`frame-packets`, `fetch-sfx`, `sync-durations`, `captions` and `assemble-index` commands read exactly these fields,
so check the file yourself against the checklist in SKILL.md step 6 before moving on.

## Frontmatter

```yaml
---
format: 1920x1080
duration: 101s              # set by hand = sum of the frames after sync-durations
message: "<the BRIEF's topic sentence>"
arc: concept-explainer with process
audience: <as in BRIEF>
mode: autonomous
music: calm minimal tech underscore, warm, unobtrusive
---
```

## Video direction (required, placed before `## Frame 1`)

Seven items. Each item is a bold bullet, written specifically for this video:

- **Palette system**
  - Take it from frame.md; do not invent colors.
  - State the background color, card color and ink color.
  - The dark color (navy) appears only when showing code, files or a terminal.
  - The accent color (coral) appears only once per frame, recorded per frame in the `coral:` field.
- **Type**
  - Serif for headings (EB Garamond 400, lowercase, negative letter-spacing).
  - Inter for labels.
  - JetBrains Mono UPPERCASE, 0.16em tracking, preceded by ✱, for kickers and file names.
  - State explicitly: "Vietnamese fonts in `assets/fonts/` (frame.md § Font faces), heading line-height ≥ 1.1, never clip text boxes vertically".
- **Motion grammar**
  - Enter with `power3` / `expo.out`; no bounce, no elastic.
  - Each detail appears exactly when the narration mentions it; after the last reveal, hold still.
- **Rhythm / held frames**: which frames are held frames for reading (key point, closing line), and which frame is the fastest.
- **Framing variety**: the layout of each frame. Never repeat the same layout in two consecutive frames.
- **Caption keep-out**
  - Captions sit in the bottom ~17% (y > 896).
  - Main content must stay above that line.
  - Full-bleed backgrounds go on the `.clip` layer.
- **Language + Negative list**
  - All on-screen text is Vietnamese, except literal identifiers (file names, commands, URLs).
  - No personal data, tokens or private paths.
  - No purple/blue "AI" gradients, no robots/brains, no `repeat`/`yoyo`/`Math.random`/`@keyframes`.
  - Forbid both failure modes: "slideshow" (everything appears in the first 25%, then stands still) and "screensaver" (many things drifting around aimlessly).

## Frame template

The Vietnamese strings below are example video content (frame title "Model chỉ biết một việc" = "The model only knows one thing").

```markdown
## Frame 1 — Model chỉ biết một việc

- scene: Một khối "model" đơn độc trên nền kem; tin nhắn trượt vào, một tin nhắn trượt ra; ba năng lực hiện ra rồi bị gạch bỏ từng cái
- voiceover: "Một model AI chỉ làm được đúng một việc — nhận tin nhắn, trả tin nhắn. Nó không nhớ. Không chạm được vào đĩa. Không chạy được lệnh nào."
- duration: 10.09s
- transition_in: cut
- status: outline
- src: compositions/frames/01-model-chi-biet-mot-viec.html
- type: hook
- persuasion: Counterintuitive claim + Subtractive framing
- beat: Surprise + recognition
- blueprint: kinetic-type-beats (Adapt)
- focal: the "model" block — a rounded tile-strong card with the serif word "model" inside, centered
- roles: model block = foreground subject · two message pills = supporting · three capability words with drawn strike lines = supporting · cream field + faint hairline grid = background
- coral: the strike line through the third capability ("chạy lệnh")
- sfx: click-soft
- sfx_at: lệnh nào

narrativeRole: Mở khoảng trống nhận thức: thứ người xem tưởng là "agent thông minh" thực ra chỉ là một hàm message-vào/message-ra.
keyMessage: Tự thân model không nhớ, không làm, không chạm vào gì cả.

Adapt: keep the multi-beat statement build on a fixed center anchor; beat 1's payload is the model block with its in/out pills, the escalation is three subtractive strike-throughs.
Scene 1 (0.0–2.8s): the model block rises into upper-center (~34% width) on a smooth settle; a mono kicker "✱ MÔ HÌNH NGÔN NGỮ" fades up above it.
Scene 2 (2.8–4.9s): on "nhận tin nhắn" (2.9s) a pill "tin nhắn" slides in from the left and docks; on "trả tin nhắn" (4.0s) a second pill slides out right. Hairline arrows draw on between them.
Scene 3 (4.9–10.09s): three serif words land one per cue — "nhớ" (5.4s), "chạm đĩa" (6.6s), "chạy lệnh" (8.3s) — each immediately struck through by a hand-drawn line (ink, ink, coral), the struck word dimming to ~45%. Holds still from ~9.3s.
```

## Field rules

| Field | Rule |
|---|---|
| `## Frame N — Title` | N counts from 1 and matches `(Frame N)` in SCRIPT.md |
| `voiceover` | An exact copy of the frame's narration in SCRIPT.md, in straight double quotes |
| `duration` | Let `sync-durations` write it; never edit it by hand |
| `transition_in` | Frame 1 uses `cut`; later frames use a name from `cut-catalog.md` (e.g. `blur-crossfade`) |
| `status` | Write `outline`; change it to `animated` once the frame file passes the check (SKILL.md step 8) |
| `src` | `compositions/frames/NN-slug.html`, with a lowercase ASCII slug (diacritics removed) |
| `sfx` | `none`, or an available name: chime, click-soft, click, error, glitch-1..3, impact-bass-1/2, key-press, notification, ping, pop, riser, sparkle, typing, whoosh-cinematic, whoosh-short, whoosh |
| `sfx_at` | Required when there is an sfx. Either seconds within the frame (e.g. `6.8`) or a word/phrase from the narration (e.g. `quyết định`, "decides"); used to set `offset_s` (audio.md §5) |
| `hero_text` | Optional. A narration line allowed to appear verbatim on screen (key-point frame or closing frame) |
| `Scene k (a–bs):` lines | Real times taken from the frame's `words` in `audio_engine_meta.json` (text corrected, audio.md §2); put the keyword's timestamp in parentheses; the last Scene ends at `duration` |
| Rule names in backticks | At most ~1 name per frame. Each name pulls the whole rule into the packet, and packets are capped at 48 KB |

Keep SFX sparse: about 1 per frame, at moments with an "impact" (a strike-through, a card dropping, a connection closing). Held frames for reading use `none`.
