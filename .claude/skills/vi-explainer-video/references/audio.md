# Audio: Gemini narration, captions, background music, SFX

Do not use faceless's `node $FX/audio.mjs generate`. That command hard-codes `provider: "auto"` and tries HeyGen, then ElevenLabs, then Kokoro, so it never uses Gemini. Its background music also requires HeyGen. Call the `media-use` engine directly instead.

**The sidecar file `audio_engine_meta.json`** at the project root is the **primary store** for narration and background music:

- faceless's `fetch-sfx` command reads this sidecar, merges in the SFX, and then **rebuilds** `audio_meta.json` from it.
- Therefore make every narration edit (caption text, durations) **in the sidecar**.
- Edits to `audio_meta.json` only stick after the last `fetch-sfx` run.

Start every engine call with these two lines (see `install.md` §4). Never print the key:

```bash
ENGINE=$HF/media-use/audio/scripts/audio.mjs          # HF: see "Paths" in SKILL.md
[ -n "$GEMINI_API_KEY" ] || eval "$(cat ~/.zshrc ~/.bashrc 2>/dev/null | grep -E '^[[:space:]]*export (GEMINI|GOOGLE)_API_KEY=' | tail -1)"
```

## §1. Generate the narration

Write the request to `.hyperframes/tts_request.json`. Do **not** write it to `audio_request.json`, because `fetch-sfx` overwrites that file.

```json
{
  "provider": "gemini",
  "tts_model": "gemini-3.8-flash-tts",
  "voice": "Orus",
  "lang": "vi",
  "style": "Speak Vietnamese with a natural Northern (Hanoi) accent. Calm and clear, like an engineer explaining at a whiteboard to a colleague. Pronounce English technical terms (harness, SQLite, Python, model) the English way.",
  "lines": [
    { "id": "01", "text": "<frame 1 narration, taken from SCRIPT.md>" },
    { "id": "02", "text": "<frame 2 narration>" }
  ],
  "bgm": { "mode": "none" }
}
```

- `id` is the frame number, written with two digits (`"01"`). `fetch-sfx` converts it to `frame: 1`.
- `text` is that frame's indented lines in SCRIPT.md, joined with spaces.
- `voice` comes from `voice:` in BRIEF.md. The default is `Orus`; see `voices.md` for the other options.

```bash
node "$ENGINE" --request ./.hyperframes/tts_request.json --hyperframes . --out ./audio_engine_meta.json --only tts
```

The command writes `assets/voice/NN.wav` and `voices[]` in the sidecar. After it finishes:

- **Count the voices.** The number of `voices` entries must equal the number of frames.
- **Read the "anomalies" section.** Any line the TTS failed on is dropped and does not appear in `voices`. Regenerate that line on its own (see below).

**Regenerating a few frames.** Each `--only tts` run **replaces all** of `voices` with the lines in that run. Therefore do **not** run straight into the sidecar with a request that holds only a few lines. Do this instead:

1. Write `.hyperframes/tts_redo.json` containing only the lines to regenerate.
2. Run the engine with `--out ./.hyperframes/tts_redo_meta.json`.
3. Copy each new `voices` entry into `audio_engine_meta.json`, replacing the entry with the same `id`.
4. Redo §2 and §3 for those frames.

The WAV file `assets/voice/NN.wav` is overwritten in place.

## §2. Correct the caption text to match the script

The engine does not get timestamps from Gemini. It runs whisper over the WAV file, so `words[].text` is **what whisper heard**, not the script text. For example, "Harness là phần còn lại. Nó chạy ngay trên máy bạn." ("Harness is the rest. It runs right on your machine.") was transcribed as "Hân eens là phần con lạ. Nó chạy ngay chết mấy bạc." If left as is, the captions show exactly these wrong words.

For each entry in `voices` of `audio_engine_meta.json`, replace `words` with the word list of the **script**, keeping the timestamps of the real narration.

**Prepare two word sequences:**
- **Script sequence:** split the frame's narration (the SCRIPT.md text, not text altered for TTS) on whitespace, with punctuation attached to its word, e.g. `"việc:"`. Drop "words" that are only punctuation, such as `—`.
- **Heard sequence:** the existing `words`.

For matching, normalize both sequences: lowercase, punctuation removed.

**Match** the two normalized sequences with `difflib.SequenceMatcher(None, a, b, autojunk=False)`, then handle each opcode:

- **`equal`**: the script word takes the exact `start`/`end` of the corresponding heard word.
- **`replace`**: merge the time span of the heard words, from the first `start` to the last `end`. Split that span across the script words, weighted by `len(word) + 2`.
- **`delete`** (a script word with no heard counterpart): interpolate between the `end` of the previous word and the `start` of the next word, split evenly.
- **`insert`** (whisper heard extra words): skip.

**Output:** each word has the form `{ "id": "w<n>", "text": "<script word, punctuation kept>", "start", "end" }`:
- `n` counts from 0 within each frame.
- Round to 3 decimal places.
- `start` never decreases.
- `end` > `start`.
- No word goes past `duration_s`.

Write a throwaway Python script in the scratchpad to do this. Do not save that code in the skill or in the project. After the correction, verify that each frame's word count equals the script's word count.

**The "heard different from the script" list.** While matching, print the `replace`/`delete` opcodes in the form `frame N: script «…» ↔ heard «…»`.

- This list is only a **hint**: whisper mishears Vietnamese fairly often.
- Pay most attention to English terms and proper names. If you suspect a mispronunciation, handle it per `voices.md` and regenerate that frame.
- Put this list in the final report so the user knows where to listen closely.

The timestamps used to write the Scene lines in the storyboard come from the corrected `words`. They are seconds from the start of the frame.

## §3. Silence at the end of a frame

A frame's duration equals the duration of its narration file. To make a frame hold after its last sentence (closing frame, key-point frame), add silence to the WAV file. Do **not** edit `duration` in the storyboard.

```bash
ffmpeg -loglevel error -y -i assets/voice/11.wav -af apad=pad_dur=2.0 assets/voice/11.pad.wav && mv assets/voice/11.pad.wav assets/voice/11.wav
ffprobe -v error -show_entries format=duration -of csv=p=0 assets/voice/11.wav
```

Suggested amounts:
- About 0.3 s for ordinary frames, if a sentence ends too abruptly.
- 1.5–2.5 s for the last frame.

After adding silence, update that frame's `duration_s` in `audio_engine_meta.json` to the value `ffprobe` just measured. Do this **before** §4, because the background music length is the sum of the `duration_s` values.

## §4. Background music (Lyria)

Write the request to `.hyperframes/bgm_request.json`:

```json
{ "lines": [], "bgm": { "mode": "generate", "prompt": "calm minimal tech underscore, warm piano and soft pads, no drums, unobtrusive" } }
```

Take the prompt from `music:` in STORYBOARD/BRIEF, written in English.

When beat sync (§6) is on, the prompt must state the tempo and ask for a steady drum, for example: `"upbeat electronic tech pulse, steady 4/4 with a clear kick on every beat, exactly 110 BPM, no tempo changes, no long intro"`. Without drums, `beat-grid` cannot detect the beat. Run `beat-snap --reserve` **before** the command below.

```bash
node "$ENGINE" --request ./.hyperframes/bgm_request.json --hyperframes . --out ./audio_engine_meta.json --only bgm
```

- **Write straight into the sidecar.** `--only bgm` leaves `voices` untouched. The music length (`bgm_target_duration_s`) equals the sum of the narration `duration_s` values, so run this **after** §3.
- **The music generates in the background.** The result is written to `assets/bgm/track.wav`, with logs in `assets/bgm/bgm-*.log`.
- **Old music is replaced.** Running this command again replaces the old track with a new one.

The line `bgm: launched lyria` in the output means Lyria is in use. If that line says `musicgen`, the engine did not find the Gemini key or the `google-genai` package. The music is then only about 30 s long and gets looped. The secure build has no MusicGen: without the key or without `google-genai` there is no music, and the engine records the reason in `anomalies`. `"mode": "generate"` in the request is how background music is turned on in the secure build (it is off by default).

## §5. Finalize the audio (after STORYBOARD.md exists)

**Step 1. Wait for the background music.** The result must be `ready`:

```bash
node "$HF"/media-use/audio/scripts/wait-bgm.mjs --audio-meta ./audio_engine_meta.json --hyperframes . --timeout-ms 300000 --out ./.hyperframes/bgm_status.json
```

- If the result is `failed` or `timeout`: read the log file, fix the cause, then rerun §4.
- Never assemble the video before `track.wav` exists. If the file is missing, `assemble-index` silently drops the music; it only logs a warning.

**Step 2. SFX.** This command rebuilds `audio_meta.json` from the sidecar, including narration, background music and SFX:

```bash
node "$FX"/audio.mjs fetch-sfx --storyboard ./STORYBOARD.md --hyperframes .
```

- **SFX names:** use only names that exist in `$HF/media-use/audio/assets/sfx/*.mp3`. Wrong names are skipped without any message. Check the names before running, and count the `sfx` entries in the output.
- **No warning when the music is not finished.** `fetch-sfx` does not check whether the background music is done, so always complete step 1 first.

**Step 3. Edit `audio_meta.json`.** Do this after the last `fetch-sfx` run:

- **`sfx[].offset_s`:** `fetch-sfx` always writes 0, so the SFX plays at the very start of the frame. Write the seconds according to the frame's `- sfx_at:`:
  - `sfx_at` is a number: use that number.
  - `sfx_at` is a word or phrase: use the `start` of the first word of that phrase in the frame's `words`.
- **`sfx[].volume`:** `0.22`. The default 0.35 is too loud relative to the narration.
- **`bgm.volume`:** set `0.3` for now (with measured Lyria music, this gives about 12 dB). The real value is measured with `mix-balance.mjs` after assembly (SKILL.md step 9). The old level of 0.1 measured about 22 dB below the narration: the music was almost inaudible. The target is 12 dB for explainer videos and 6–8 dB for beat-synced videos.
- **`bgm_pending`:** `false`, once step 1 reports `ready`.
- **Check:** `voices` still has one entry per frame, and the text in `words` is the script text.

**Step 4. Write the real durations into the storyboard.**

```bash
node "$FX"/audio.mjs sync-durations --audio-meta ./audio_meta.json --storyboard ./STORYBOARD.md
```

The command only edits each frame's `- duration:`. Update `duration:` in the frontmatter yourself to the sum of the frames.

**If the narration must be redone after this step**, work in this order: §1 (regenerate the frame), §2, §3, then §5 from step 2. You do not need to regenerate the background music unless the total length changes a lot. If beat sync is on, rerun `beat-snap --grid … --apply` before step 2.

## §6. Beat sync (optional)

Turn this on when BRIEF.md has `beat_sync: <BPM>`. Every frame cut lands exactly on a beat of the music. `beat-snap` does this by adding silence to the end of the narration files, so the rule "durations come from the real audio" still holds.

**Why reserve first.** Lyria generates music as long as the sum of `duration_s` at request time. Beat sync makes each frame up to one beat longer. Without a reserve, the video is longer than the track, and `assemble-index` loops the track at the end.

Order, run inside the video project directory (`SK` is this skill's directory):

```bash
# 1. After §3, before §4: reserve length on the last frame
node "$SK"/scripts/beat-snap.mjs --reserve --bpm 110 --apply

# 2. §4 with a prompt containing "exactly 110 BPM", then §5 step 1 (wait-bgm) until "ready"

# 3. Measure the beat grid of the actual track
node "$SK"/scripts/beat-grid.mjs assets/bgm/track.wav --bpm 110 --json .hyperframes/beat-grid.json

# 4. Snap: review the plan, then apply
node "$SK"/scripts/beat-snap.mjs --grid .hyperframes/beat-grid.json
node "$SK"/scripts/beat-snap.mjs --grid .hyperframes/beat-grid.json --apply

# 5. Continue §5 from step 2 (fetch-sfx, …, sync-durations)
```

How to read the output:

- **`beat-grid`** prints the measured BPM and BEAT0, then one line per bar (4 beats). The `K.K.` column marks beats with a kick drum. The dB column is loudness.
  - A jump in dB is where the music "comes in". Place key frames (cover, key point) there, and record that timestamp in Video direction.
  - If there is a line `note: few kicks detected`, the track has no clear beat. Regenerate the music with a prompt that stresses drums, or turn beat sync off.
  - The measured BPM can differ from the requested BPM by a few percent. Always use the `--json` file, not the number in BRIEF.
- **`beat-snap`** prints one line per frame: old → new duration, seconds added, and the beat the cut lands on.
  - `--every 2` or `--every 4` cuts only every 2 or 4 beats. Frames get longer, but the cut rhythm is more regular.
  - The last frame ends exactly when the music ends. If it reports `the music … ends … before the last frame can`, step 1 was skipped: restore the narration (rerun §1 or copy from `.hyperframes/beat-snap-backup/`), then start again from step 1.
- **Safe to rerun.** The original narration is kept in `.hyperframes/beat-snap-backup/`, and each run recomputes from the originals. Narration regenerated after a previous run is treated as the new original.
- **Precision.** Cut points are rounded to 30 fps frames, so the maximum beat offset is about ±16 ms. The human ear does not notice this.

When writing the frames, put strong effects (flash, slam) at second 0 of the frame: that is the beat. The `glass-keynote` and `comic-multiverse` presets have a "Beat-sync videos" section with specific guidance.
