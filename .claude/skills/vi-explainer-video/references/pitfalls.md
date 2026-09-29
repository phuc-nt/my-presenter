# Known pitfalls and how to avoid them

The pitfalls below were hit while building the first video (my-agent-crew, 11 frames, 101 s) and while switching to Gemini narration. Items 28–34 come from the experience of bestagentkits/motion-video-skill and from measurements on that video. Items 35–38 were hit while building the kho-sach-win95 video (`win95-pixel` preset, 10 frames, 94 s). The "How to avoid" column points to the matching step in SKILL.md or `audio.md`.

## Visuals and fonts

| # | Symptom | Cause | How to avoid |
|---|---|---|---|
| 1 | Vietnamese diacritics render as boxes, or text falls back to a system font | The preset's fonts cover only the Latin alphabet | Step 2: copy the `-VN.woff2` fonts and append the font block to frame.md (`fonts.md`) |
| 2 | Lint reports `invalid_parent_traversal_in_asset_path` on every frame | The worker wrote `../../assets/fonts/…`. Frames are served from the project root, so it must be `assets/…` | The worker template states this explicitly; step 8 greps for `../assets` and fixes it |
| 3 | 141 `id_requires_css_escape` warnings; `querySelector('#06-…')` can break | ids/classes start with a digit (taken from the frame name) | The worker template requires the `fNN-` prefix; step 8 greps for `querySelector('#<digit>')` |
| 4 | A mono file name overflows its card and slips under the folded corner | Wide mono text in a fixed-width card | Worker template: leave ≥ 24px to spare; read the contact sheet in step 9 |
| 5 | Contrast 2.57:1 (caption at alpha 0.58 on a cream background) | Text dimmed too far | Worker template: alpha ≥ 0.72; step 9 separates real warnings from warnings during transitions |
| 6 | Contrast or text-overflow warnings that are not real | The frame is mid-crossfade; caption text is off by 1–4px | Step 9: ignore caption warnings, compare against transition times and look at the image |
| 7 | The worker worries that ✱ is missing from the font and draws it in SVG | It does not know the subset's glyph coverage | The worker template lists the glyph coverage (✓ ✗ ✱, arrows, geometric shapes) |
| 8 | The worker does not know the palette, type or negative list for the whole video | The packet does not contain the `## Video direction` block | Step 8: extract the block into `_video-direction.md`; the worker template requires reading it |
| 9 | `frame-packets` stops: `frame packet is 50244 bytes (limit 48000)` | The frame cites too many rule names in backticks. Each name pulls in the full rule text | About 1 rule name per frame; describe the rest of the motion in words |
| 10 | `snapshots/contact-sheet.jpg` does not exist | The snapshot command writes `contact-sheet-1..N.jpg` | `ls snapshots/**/contact-sheet*.jpg`, then read each file |
| 28 | Black frames or black flashes mid-video; `blackdetect` reports `black_start` | More than ~40 elements using `radial-gradient`, `filter: blur()` or `clip-path` on screen at once (recorded in motion-video-skill) | Bake textures (halftone dots, noise) into one PNG; glow ≤ 3; no `backdrop-filter`. Step 10 runs `blackdetect` |
| 29 | A flash, dot or speed-line layer is already visible at second 0, before its effect | `fromTo` applies its start state as soon as the timeline is built, even when the tween sits later | Add `immediateRender: false` to `fromTo` on layers reused within a frame |
| 30 | The frame is slow or renders black when it has an RGB-split effect | The SVG filter (`filter: url(#…)`) stays attached for the whole frame | Attach it only while the effect runs: `tl.set(el, {filter: "url(#rgb)"}, t)` then `tl.set(el, {filter: "none"}, t + 0.2)` |
| 35 | One frame's dialog box stays on top of every later frame until the end of the video; `check` reports hundreds of `content_overlap`/`text_occluded` errors between ids of two different frames | The runtime hides a finished frame with `visibility: hidden` on the frame's host. A child set with `tl.set(el, {visibility: "visible"})` overrides that inherited value and stays visible | Show elements with `visibility: "inherit"`, never `"visible"` (GSAP's `autoAlpha` already uses `inherit`). Put the initial hidden state in CSS. The worker template says this; after step 8, a grep for `visibility: *["']visible` must come back empty |
| 36 | Lint errors on a zoom-rectangle window-open effect and on the frame's end anchor | Tweening `left/top/width/height` with `steps(6)` (`gsap_non_transform_motion`); setting `visibility` on a `.clip` element | Build the 7 steps with `tl.set` and interpolated values; hide/show a child layer instead of `.clip`; anchor the frame end with `tl.set({}, {}, DURATION)` |
| 37 | Captions show only 2–4 syllables at a time and flicker constantly (149 groups for 94 s) | `captions.mjs` caps groups at 2–4 "words", and in Vietnamese every syllable is a word | Step 9: `regroup-vi.mjs . 9` right after `captions.mjs build` (down to 47 groups) |

## Narration and audio

| # | Symptom | Cause | How to avoid |
|---|---|---|---|
| 11 | faceless's `audio.mjs generate` does not use Gemini and reports HeyGen missing for background music | The command hard-codes `provider: "auto"` and `retrieve`-style background music | Call the `media-use` engine directly (`audio.md` §1, §4) |
| 12 | Captions show wrong words ("My Asian crew", "chết mấy bạc") | The engine's `words` are what whisper heard back, not the script text | `audio.md` §2: replace the text with the script, keep the timestamps |
| 13 | Regenerating one frame makes the other frames disappear from `voices` | `--only tts` replaces all of `voices` with the lines of that run | Regenerate into a separate `--out` file, then copy into the sidecar (`audio.md` §1) |
| 14 | Caption text or duration edits are lost after `fetch-sfx` | `fetch-sfx` rebuilds `audio_meta.json` from `audio_engine_meta.json` | Make every narration edit in the sidecar; edit `audio_meta.json` only after the last `fetch-sfx` |
| 15 | The engine reports the key missing even though the user added it to `~/.zshrc` or `~/.bashrc` | VS Code or the terminal was opened before the key was added, so the process lacks the variable | Put the `eval …` line at the start of every engine call (`install.md` §4); never print the key |
| 16 | `audio_request.json` has changed content | `fetch-sfx` overwrites this file | Keep the TTS and background music requests in `.hyperframes/tts_request.json` and `.hyperframes/bgm_request.json` |
| 17 | A frame has no narration and nothing stopped with an error | A failed TTS line is only listed under "anomalies (non-fatal)" and then dropped | After every run, check that the `voices` count equals the frame count |
| 18 | After regenerating narration, the Scenes drift from the voice | Gemini is non-deterministic: the same sentence can come out with a different length and pacing | After regenerating: correct the caption text, run `sync-durations`, update that frame's Scene timestamps |
| 19 | Background music is only 30 s long and loops, or is shorter than the video | Music was generated before the narration, or the engine fell back to MusicGen | Run §4 after §3; check for the `bgm: launched lyria` line |
| 20 | The video has no background music and nothing stopped with an error | `assemble-index` silently drops the music when `track.wav` does not exist yet | `wait-bgm` must report `ready`; the `bgm (track 11)` line of assemble must say `yes` |
| 21 | `fetch-sfx` skips an SFX without any message | Descriptive SFX names (e.g. "soft paper click") do not exist in the library | Check names against `media-use/audio/assets/sfx/*.mp3`; count the `sfx` entries |
| 22 | Every SFX plays at second 0 of its frame and is louder than the voice | `fetch-sfx` writes `offset_s: 0`, `volume: 0.35` | `audio.md` §5 step 3: set the offset from `sfx_at`, volume 0.22 |
| 23 | The last frame ends the moment the voice stops, with no hold | Frame duration equals voice duration; a hand-edited `duration` gets overwritten by `sync-durations` | `audio.md` §3: add silence to the WAV file |
| 24 | `duration:` in the storyboard frontmatter is wrong | `sync-durations` only edits each frame's `- duration:` | Set the frontmatter yourself to the sum of the frames |
| 31 | Viewers say the video "has no music" | `bgm.volume` hard-coded at 0.1: the music measured about 22 dB below the voice | Step 9: `mix-balance.mjs`, take `bgm.volume` from its suggestion (target 12 dB, beat sync 6–8 dB) |
| 32 | The social cut has a true peak about 1 dB higher than the master | Re-encoding to AAC raises the peaks | Keep `-c:a copy` for the social cut (step 10) |
| 33 | After beat sync, the music loops at the end, or `beat-snap` reports the music is too short | The music was generated for the total narration before beat sync; beat sync makes each frame up to one beat longer | `beat-snap --reserve` before generating the music (`audio.md` §6) |
| 34 | Cuts sound off-beat even after syncing | The prompt BPM was used instead of the measured BPM; Lyria does not hold the requested BPM exactly | Always `beat-snap --grid .hyperframes/beat-grid.json`, a grid measured from the actual track |

## Process

| # | Symptom | Cause | How to avoid |
|---|---|---|---|
| 25 | Storyboard narration differs from SCRIPT, so captions and visuals drift apart | Copied by hand | Checklist in step 6: `voiceover` is an exact copy |
| 26 | The Write tool reports "file changed since read" | Another command modified the file after it was read | Read it again (Read) before writing; prefer Edit |
| 27 | The report says the video is "fine" but the user hears a problem | The agent cannot hear audio or see motion | State clearly what was checked and what was not; invite the user to watch and listen |
| 38 | `zsh: command not found: npx -y hyperframes` | The command was stored in a variable `CLI="npx -y hyperframes"` and called as `$CLI`; zsh does not word-split variables | Step 0: write the command directly, not through a variable |
| 39 | `zsh: == not found`, and the rest of a chained command never runs | zsh reads a word starting with `=` as `=cmd` expansion, so `echo ===STEP` fails | Use `echo "--- STEP"`, or quote the marker |
| 40 | Workers spend dozens of commands reading other frames and CLI source before writing anything | The prompt did not show the file shape, so each worker rediscovered `<template>`, `#root`, clips and the timeline registration | The skeleton in `worker-prompt.md`; dispatch with the current template |

## Accepted, not fixed

- **Two elements briefly overlapping** (~0.3 s) during motion. Still mention it in the final report.
- **Contrast warnings during a crossfade.** Accept them if the contact sheet shows the text is still readable.
- **Whisper mishearing Vietnamese.** The "heard different from the script" list only hints at where to listen closely; it is not proof of a mispronunciation.
