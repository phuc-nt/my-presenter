---
name: vi-explainer-video
description: "Build a 1920×1080 Vietnamese faceless explainer video from prepared text with HyperFrames faceless-explainer: narrated by Gemini TTS (default voice Orus) with subtitles that match the script word for word, Lyria background music, SFX and motion graphics, or silent with subtitles only. Use when the user asks for a Vietnamese explainer video, for example: 'tạo video giải thích từ text', 'làm video từ nội dung này', 'video tiếng Việt', 'explainer video tiếng Việt', 'dựng video như lần trước'."
---

# Vietnamese explainer video

This skill is a **Vietnamese layer** on top of the HyperFrames `faceless-explainer` workflow. Faceless handles storytelling, visual design, frame building and assembly. This skill adds what faceless does not get right for Vietnamese:

- fonts with Vietnamese diacritics;
- Gemini narration;
- subtitles that match the script word for word;
- ways to avoid known failures (`references/pitfalls.md`).

Most steps are HyperFrames commands, or actions the agent performs by following the instructions below. The skill also ships:

- `scripts/`: four Node scripts. They need only Node and ffmpeg: no npm packages, no Python.
  - `mix-balance.mjs` measures how many dB the music sits below the narration, then suggests a `bgm.volume`.
  - `beat-grid.mjs` finds the BPM and the first beat (BEAT0) of the music track.
  - `beat-snap.mjs` moves frame cut points onto the beat.
  - `regroup-vi.mjs` regroups subtitles by Vietnamese clause (step 9).
- `presets/`: three visual presets for `build-frame`, with Vietnamese fonts included:
  - `glass-keynote`: dark indigo background, glass cards;
  - `comic-multiverse`: comic book, ink-bordered panels;
  - `win95-pixel`: Windows 95 desktop, pixel art, with a pixel icon set and a taskbar in the subtitle skin.

`mix-balance`, `beat-grid`, `beat-snap`, `glass-keynote` and `comic-multiverse` are adapted from bestagentkits/motion-video-skill (MIT); attribution is in each file.

## How this kit runs

The skill lives in the `my-presenter` kit. The session is best started with `bin/claude` at the repo root; a session from an IDE or a plain `claude` also works, under the rules in `AGENTS.md` ("Sessions without `bin/claude`").

- In a `bin/claude` session, `hyperframes` is on the PATH. It is the secure build in `bundle/`, and it runs with the network blocked. In any other session, call it as `"$ROOT"/bin/hyperframes`, which is the same program under the same offline profile. Every `hyperframes …` command in this document means that.
- **Never** run `npx`, `npm install`, `pip install`, `hyperframes add`, `hyperframes upgrade`, `hyperframes skills` or `hyperframes browser`. Nothing is downloaded during work.
- The `KIT_TTS` variable sets the audio mode:

| `KIT_TTS` | Narration | Background music, SFX | Network | Output video |
|---|---|---|---|---|
| `gemini` | Gemini TTS | Lyria, built-in SFX | Gemini only | sound and subtitles |
| `none` | none | none | none | no sound, subtitles only |

The mode comes from `KIT_TTS`, or from `kit.config.json` when `KIT_TTS` is not set; `bin/doctor` prints it on its first line. The user switches modes with `bin/setup --tts` or `bin/setup --no-tts`, then restarts the session. The agent never switches modes itself.

## Paths used in this document

```bash
ROOT=$(git rev-parse --show-toplevel)        # root of the my-presenter repo
SK=$ROOT/.claude/skills/vi-explainer-video
HF=$ROOT/.claude/skills
FX=$HF/faceless-explainer/scripts
ENGINE=$HF/media-use/audio/scripts/audio.mjs
```

Each Bash command runs in a new shell, so declare the variables you need again inside the same command.

## Step 0: check the machine

```bash
ROOT=$(git rev-parse --show-toplevel); "$ROOT"/bin/doctor; echo "bin/claude session: ${KIT_ROOT:+yes}${KIT_ROOT:-no}"
```

- `doctor` reports something missing: stop, and tell the user exactly what is missing. Do not install anything. See `references/install.md`.
- The mode is on the first line: `TTS: gemini` or `TTS: none`. With `TTS: none`, follow the workflow below, but replace steps 4, 5 and 7 with the **Silent mode** section.
- `bin/claude session: no`: carry on, calling `"$ROOT"/bin/hyperframes` wherever this document says `hyperframes`, and follow "Sessions without `bin/claude`" in `AGENTS.md`. In narrated mode, the Gemini key is read from the shell profile as `references/audio.md` shows.

## Fixed rules

1. **Rewrite the script for listening**, as in faceless Step 3: reorder and shorten it, but keep the meaning and terminology of the source text. Use short sentences, about 6–13 seconds of narration per frame.
2. **Durations always come from the real audio.** Do not edit `- duration:` by hand. To hold a frame longer, add silence to the narration file (`references/audio.md` §3).
3. **Use only built-in SFX names.** Every SFX must have a `- sfx_at:`.
4. **Never put on screen or in the narration**: personal data, tokens, secret keys, local machine paths.
5. **Never print API keys.** Do not write them into the project, into `.env` or into request files, and do not commit them.
6. **Run autonomously** (`mode: autonomous`): announce the plan and continue. Do not stop at the faceless checkpoints. Stop only when the user asks to review.
7. **The agent cannot hear audio or see motion.** It can check only still images, the whisper transcript of the audio and ffmpeg measurements. The final report must say this clearly.

## Workflow

### 1. Create the video project

Put the video project in the `videos/` directory at the repo root: `videos/<ten-du-an>`. The tools can write only inside the repo. `videos/` is already listed in `.gitignore`, so projects, audio and renders never enter git. Do not remove that line from `.gitignore`, and do not `git add -f` anything in `videos/`.

```bash
ROOT=$(git rev-parse --show-toplevel)
mkdir -p "$ROOT/videos" && cd "$ROOT/videos" && hyperframes init <ten-du-an> --non-interactive --example=blank --skill=faceless-explainer
mkdir -p <ten-du-an>/assets/fonts && cp "$SK"/assets/fonts/*.woff2 <ten-du-an>/assets/fonts/
```

`init` downloads nothing. The HyperFrames skills are the copies that `bin/setup` placed from the bundle into `.claude/skills`.

From here on, every command in this document runs in `$ROOT/videos/<ten-du-an>`. The final video is at `videos/<ten-du-an>/renders/video.mp4`.

Write `BRIEF.md` from `references/brief-template.md`. Choose the voice on the `voice:` line (default `Orus`; see `references/voices.md`).

### 2. Design system and Vietnamese fonts (faceless Step 2)

Choose one of two options, according to `style:` in BRIEF.md.

**A faceless preset** (default `code-editorial`: cream background, serif, proven in use):

```bash
node "$FX"/build-frame.mjs --preset code-editorial --hyperframes .
```

Then **append the Vietnamese font block** from `references/fonts.md` to the end of `frame.md`. The faceless preset fonts contain only Latin characters and lack Vietnamese diacritics. You can choose another faceless preset as described in faceless Step 2, then set up its fonts with `references/fonts.md`.

**A preset from this skill** (`glass-keynote`, `comic-multiverse` or `win95-pixel`):

```bash
node "$FX"/build-frame.mjs --preset glass-keynote --preset-dir "$SK/presets" --hyperframes .
# comic-multiverse only: also copy the two textures
mkdir -p assets/images && cp "$SK"/presets/comic-multiverse/textures/*.png assets/images/
# win95-pixel only: copy the pixel icon set (the subtitle skin needs shelf, book, user)
mkdir -p assets/images/icons && cp "$SK"/presets/win95-pixel/icons/*.svg assets/images/icons/
```

- The Vietnamese font block is already in the `frame.md` of these three presets. **Do not** append the block from `fonts.md`.
- `build-frame` also copies the preset's own subtitle skin to `.hyperframes/caption-skin.html`.
- Choose `glass-keynote` for a calm, product-launch tone. Choose `comic-multiverse` for short, high-energy videos; it suits the beat-sync mode below. Choose `win95-pixel` for retro-style product or website introductions that recreate the real interface inside Win95 windows.
- With `win95-pixel`: change the text in `#w95-task-label` in `.hyperframes/caption-skin.html` to the product name (about 16 characters at most). The default is "Giới thiệu" ("Introduction"). The skin draws the taskbar in the bottom 56px, and the subtitles sit directly above it, so frame content must stay above y = 880.

Read the "Renderer limits" section in the preset's `frame.md`. `glass-keynote` and `comic-multiverse` use many effects, and exceeding those limits produces black frames. `win95-pixel` documents the rules for showing and hiding windows with `visibility` (see `references/pitfalls.md` item 35).

### 3. Script: SCRIPT.md (faceless Step 3)

Follow faceless Step 3 (read `story-design.md`) to plan the frames and write the narration. SCRIPT.md must use exactly the format faceless reads:

```markdown
## Line 1 — Model chỉ biết một việc (Frame 1)

**Delivery:** chậm, nhấn "một việc"

    Một model AI chỉ làm được đúng một việc: nhận tin nhắn, trả tin nhắn.
```

(The example heading means "The model knows only one thing"; the delivery note means "slow, stress 'one thing'"; the narration line means "An AI model can do exactly one thing: receive a message, return a message.")

- The heading contains `(Frame N)`.
- Narration lines are indented 4 spaces.
- Lines that start with `**` are notes and are not read aloud.

Write for the ear:
- Short sentences.
- Keep English technical terms as they are.
- Avoid symbols that are hard to read aloud (`/`, `→`, `#`). Write them out as words.

### 4. Gemini narration

Follow `references/audio.md` §1–§3:
1. Generate the narration into the side file `audio_engine_meta.json`.
2. Correct the subtitle text to match the script.
3. Add trailing silence.
4. Check the "whisper heard something different from the script" list to find mispronunciations.

The per-word timestamps used to write Scene lines in step 6 are in `voices[].words` in `audio_engine_meta.json`.

**Silent mode (`KIT_TTS=none`)** replaces steps 4, 5 and 7 with:

```bash
node "$SK"/scripts/silent-track.mjs            # reads SCRIPT.md, writes assets/voice/NN.wav (silence) and audio_engine_meta.json
```

- The command estimates each frame's length and the per-word timestamps from the subtitle reading speed (default 2.8 words per second). Viewers read instead of listening, so write shorter sentences than usual.
- Options: `--wps` reading speed, `--min` shortest frame length, `--tail` pause at the end of each frame, `--last-tail` for the last frame, `--dry` print only.
- The timestamps for writing Scene lines in step 6 still come from `voices[].words` in `audio_engine_meta.json`.
- In STORYBOARD.md, write `- sfx: none` for every frame and `music: none`.
- Once STORYBOARD.md exists, run the two finalising commands:

```bash
node "$FX"/audio.mjs fetch-sfx --storyboard ./STORYBOARD.md --hyperframes .
node "$FX"/audio.mjs sync-durations --audio-meta ./audio_meta.json --storyboard ./STORYBOARD.md
```

- Do not call the TTS engine, do not generate music, and do not run `mix-balance`, `beat-grid` or `beat-snap`. Do not try to reach Gemini: the network is closed and the key has been removed from the session.

### 5. Start the background music

Follow `references/audio.md` §4, **after** the narration lengths are final. Lyria generates music exactly as long as the total narration; it runs in the background for about one to a few minutes.

**Beat-sync mode** (optional; enable with `beat_sync: <BPM>` in BRIEF.md): every frame cut lands on a musical beat. It suits promotional or short high-energy videos. Calm explainer videos do not need it. The order of steps is in `references/audio.md` §6:

1. In this step 5: run `beat-snap --reserve` first, then generate the music with a prompt that includes the BPM.
2. In step 7: run `beat-grid`, then `beat-snap --grid`, **before** `fetch-sfx`.

### 6. STORYBOARD.md (faceless Step 3 + Step 4)

Read the documents that faceless Steps 3–4 specify:
- `story-design.md`
- `visual-design.md`
- `motion-language.md`
- `blueprints-index.md`
- `rules-index.md`
- `storyboard-format.md`

Then write **one** STORYBOARD.md following `references/storyboard-rules.md`. Before you continue, check all of the following yourself:

- The number of `## Frame N` headings equals the number of `(Frame N)` in SCRIPT.md.
- `- voiceover:` is an exact copy of that frame's narration.
- `- src:` has the form `compositions/frames/NN-slug-ascii.html`.
- `- status: outline`, `- transition_in:` and `- sfx:` are present.
- Every frame with an SFX has `- sfx_at:`.
- A `## Video direction` block comes before `## Frame 1`.
- Every Scene line gives real second marks taken from `words`.
- At most about 1 rule name in backticks per frame.

Check the `INDEX.md` of the `hyperframes-blocks` skill before inventing your own counters, charts or animated text. When an entry fits, write `block: <name>` on the Scene line. The worker installs and wires that entry according to `_role.md`. Entries whose VI column is `không` ("no") must use the project's `-VN` fonts for Vietnamese text.

### 7. Finalise the audio

Follow `references/audio.md` §5, in this order:
1. Wait for the background music to finish. If beat-sync is enabled, run `beat-grid` and `beat-snap` right after (`references/audio.md` §6).
2. Run `fetch-sfx`.
3. Correct `offset_s` and the volumes in `audio_meta.json`.
4. Run `sync-durations`.
5. Update `duration:` in the frontmatter to the sum of the frames.

The background music volume is measured and adjusted in step 9, after assembly.

### 8. Build each frame (faceless Step 5, parallel workers)

```bash
node "$FX"/frame-packets.mjs --project . --storyboard ./STORYBOARD.md
```

- **Packet over 48 KB:** remove some rule names in backticks from that frame's Scene lines, replace them with a plain-language description of the motion, then rerun the command.
- **Split out Video direction:** copy the `## Video direction` block (up to `## Frame 1`) into `.hyperframes/frame-packets/_video-direction.md`. Packets do not contain this block.
- **Dispatch:** assign each frame to one background Agent (`general-purpose`). The prompt is the template in `references/worker-prompt.md` with its placeholders filled in. Send them all in **one** message so they run in parallel.

When all workers are done, check each frame file:

```bash
grep -L '^<template' compositions/frames/*.html                                  # must be empty
grep -l '<audio\|Math\.random\|Date\.now\|yoyo\|@keyframes\|repeat: *-\?[0-9]' compositions/frames/*.html   # must be empty
grep -L 'assets/fonts/[A-Za-z]*-VN\.woff2' compositions/frames/*.html            # must be empty
grep -l "\.\./assets\|querySelector[A-Za-z]*(['\"\`]#[0-9]" compositions/frames/*.html   # must be empty
grep -l "visibility: *['\"]visible" compositions/frames/*.html                  # must be empty: use "inherit"
```

- **`../assets` found:** change it to `assets/…`. Paths are relative to the project root.
- **`visibility: "visible"` found:** change it to `"inherit"` (`references/pitfalls.md` item 35).
- **Any other failure:** reassign that frame to a new worker, with the error message.
- **Pass:** change `- status: outline` to `- status: animated`.

### 9. Assembly and QA (faceless Step 6)

Assemble:

```bash
node "$FX"/captions.mjs build --storyboard ./STORYBOARD.md --audio-meta ./audio_meta.json --hyperframes . --out ./caption_groups.json
node "$SK"/scripts/regroup-vi.mjs . 9
node "$FX"/assemble-index.mjs --storyboard ./STORYBOARD.md --hyperframes .
node "$FX"/transitions.mjs inject --storyboard ./STORYBOARD.md --hyperframes .
node "$FX"/transitions.mjs verify --storyboard ./STORYBOARD.md --index ./index.html
```

`captions.mjs` counts each Vietnamese syllable as one word, so it shows only 2–4 syllables at a time, flickering constantly. `regroup-vi.mjs` regroups them by sentence and clause (breaking at `, ; :`), at most 9 syllables per group, never crossing a sentence end or a frame boundary. It rewrites `caption_groups.json` and `GROUPS` in `compositions/captions.html`. Per-word timestamps stay unchanged. Rerun this command **every time** you rerun `captions.mjs build`. The command prints each group for a quick read; in a 16:9 video, 9 syllables fit on one subtitle line.

The `bgm (track 11)` line from `assemble-index` must be `yes`. If it is `no`, the background music has not been assembled.

Measure the balance between music and narration:

```bash
node "$SK"/scripts/mix-balance.mjs              # explainer video: default --target 12
node "$SK"/scripts/mix-balance.mjs --target 7   # beat-sync or promotional: 6–8
```

- The command prints how many dB the music sits below the narration, plus a `bgm.volume ≈ …` value. If the difference from the target is more than 2 dB, write that value into `bgm.volume` in `audio_meta.json`, then rerun `assemble-index` and `transitions.mjs inject`.
- A `louder than the voice` line means an SFX is louder than the narration. Lower that SFX's `volume`.
- With measured Lyria music, the old `bgm.volume` of 0.1 sits about 22 dB below the narration, which makes the music nearly inaudible.

Check:

```bash
hyperframes lint                     # must report 0 errors
hyperframes check                    # must report "Check passed"
hyperframes snapshot --at <middle of each frame, comma-separated> --describe false
hyperframes snapshot --at <end of each frame − 0.35s> --no-end --describe false -o snapshots/late
```

The snapshot command produces `contact-sheet-1..N.jpg` files. **Read each contact sheet** and check:
- whether Vietnamese diacritics are clipped;
- whether text overflows its card;
- whether anything intrudes into the subtitle area (y > 896);
- whether any frame is empty or black;
- whether accent colours follow the rules in `frame.md` (for example the coral of `code-editorial`, or the gradient of `glass-keynote`, only once per frame).

How to handle `check` results:
- **Subtitle offset warnings of 1–4px** (`caption-word`, `caption-line`): ignore them.
- **Contrast warnings within ±0.9 s of a transition:** usually false positives caused by the crossfade. Still look at the image to confirm.
- **Contrast warnings at other times:** real errors. Raise the text alpha to ≥ 0.72 on the cream background.
- **Layout errors (`content_overlap`, `text_occluded`) between elements of two different frames** (id `f01-…` overlapping `f07-…`), lasting tens of seconds: most likely a frame is "leaking" into later frames (`references/pitfalls.md` item 35). Take snapshots in the middle of the later frames to confirm. If the images are clean but the error persists, it is a false positive: add `data-layout-allow-overlap` to **each** named text element. The attribute is not inherited, so adding it to the parent has no effect.

Fix the specific frame file, then assemble and check again. To inspect a region up close: `hyperframes snapshot --at <t> --zoom "x,y,w,h" --zoom-scale 2 -o snapshots/zoom`.

### 10. Render and report

```bash
hyperframes render --skill=faceless-explainer --quality high --output renders/video.mp4
ffprobe -v error -show_entries format=duration,size:stream=codec_type,width,height,r_frame_rate -of json renders/video.mp4
ffmpeg -hide_banner -nostats -i renders/video.mp4 -vn -af ebur128=peak=true -f null - 2>&1 | grep -E '^ +(I|LRA|Peak):'
ffmpeg -hide_banner -nostats -i renders/video.mp4 -an -vf blackdetect=d=0.1:pix_th=0.05 -f null - 2>&1 | grep -c black_start
```

**Silent mode:** render to a temporary file, drop the audio stream, and skip the `ebur128` measurement:

```bash
hyperframes render --skill=faceless-explainer --quality high --output renders/video-raw.mp4
ffmpeg -hide_banner -v error -y -i renders/video-raw.mp4 -an -c:v copy -movflags +faststart renders/video.mp4 && rm renders/video-raw.mp4
ffprobe -v error -show_entries stream=codec_type -of csv=p=0 renders/video.mp4      # must print only "video"
```

Requirements (narrated mode; silent mode needs only resolution, duration and `black_start`):
- The video has an audio stream.
- `I` (integrated loudness) is about −14 to −16 LUFS.
- `Peak` (true peak) ≤ −1 dBFS.
- The `black_start` count is 0. If it is not 0, remove `| grep -c black_start` to see the timestamps, take snapshots there, then see the black frames item in `references/pitfalls.md`.

**Lighter version for social media** (optional, when the user needs it):

```bash
ffmpeg -hide_banner -v error -y -i renders/video.mp4 -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -profile:v high -movflags +faststart -c:a copy renders/video-social.mp4
ffmpeg -hide_banner -nostats -i renders/video-social.mp4 -i renders/video.mp4 -lavfi ssim -f null - 2>&1 | grep -o 'All:[0-9.]*'
```

- SSIM `All` must be ≥ 0.98. A test file reached 0.9994 at half the size.
- Keep `-c:a copy`. Re-encoding the AAC raises the true peak by about 1 dB.

Report to the user:
- **Result:** MP4 path (and the social version, if any), resolution, duration, file size, LUFS, true peak.
- **Narration:** the voice used, and the places where whisper heard something different from the script.
- **Audio:** how many dB the music sits below the narration (`mix-balance`), and the `bgm.volume` used. If beat-sync is enabled: the measured BPM versus the requested BPM.
- **Checked:** still images, lint, check, audio measurements, blackdetect.
- **Not checked:** how the real voice sounds, motion, how well the visuals match the narration. Invite the user to watch and listen themselves.
- **Accepted issues:** remaining issues that were not fixed.

## Reference

| File | When to read |
|---|---|
| `references/install.md` | `bin/doctor` reports something missing, or there is no Gemini key yet |
| `scripts/silent-track.mjs --help` | Silent mode |
| `references/voices.md` | Choosing a voice (Orus default; Kore, Aoede, Charon), style prompts, known pronunciation errors |
| `references/audio.md` | The whole audio workflow: TTS, subtitle text correction, silence, background music, SFX, beat-sync (§6) |
| `presets/<name>/FRAME.md` | Design system of the `glass-keynote`, `comic-multiverse` or `win95-pixel` preset (becomes `frame.md` after step 2) |
| `references/storyboard-rules.md` | Template for one storyboard frame and the Video direction block |
| `references/worker-prompt.md` | Prompt template for dispatching frame-building workers |
| `references/fonts.md` | Vietnamese `@font-face` block for frame.md; setting up fonts for other presets |
| `references/brief-template.md` | BRIEF.md template |
| `references/pitfalls.md` | Known failures and how to avoid them. **Read it when a step reports an error.** |

## Commands that need Chrome in a `bin/claude` session

Chrome cannot start inside the session sandbox. These commands need Chrome: `hyperframes render`, `hyperframes snapshot`, `hyperframes check`.

1. Run the command **on its own** in a single Bash call: no `cd`, no `&&`, no `;`, no pipe. Use paths instead of `cd`.
2. If the command reports a browser error, rerun the exact same command with the session sandbox disabled (`dangerouslyDisableSandbox: true`). This is pre-approved for `hyperframes`, `deck` and `mpg`. The tool then runs under the kit's own offline profile: no network, writes only inside the repo.
3. Do not disable the sandbox for any other command.

In a session without `bin/claude` there is no session sandbox: run these commands directly, by path (`bin/hyperframes`, `bin/deck`, `bin/mpg`), and never set `dangerouslyDisableSandbox`.
