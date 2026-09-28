# Narration voices

Narration is generated with Gemini TTS through the HyperFrames audio engine (`media-use`). How to call the engine is described in `audio.md`.

## Choosing a voice

| Voice | Gender | Role | Notes |
|---|---|---|---|
| **Orus** | male | **default** | Fastest and tightest pacing: sample sentence 9.8 s. Pronounces Python and SQLite correctly. Gets some English names wrong (see below). |
| Kore | female | optional | Pronounces every English term in the sample sentence correctly. Choose it when the script is dense with terminology. Sample sentence 10.4 s. |
| Aoede | female | optional | Almost everything correct; "model" is heard as "mô đồ". Sample sentence 11.0 s. |
| Charon | male | optional | Deeper and slower than Orus: sample sentence 11.5 s. Same terminology errors as Orus. |

The user picks the voice on the `voice:` line in BRIEF.md. If it is not set, use `Orus`. This value goes into the `"voice"` field of the TTS request.

The figures above come from **one** sample sentence: "my-agent-crew là một harness như thế: chạy ngay trên máy bạn. Một tiến trình Python. Một tệp SQLite. Một thư mục home. Model chỉ xin. Harness quyết định." ("my-agent-crew is such a harness: it runs right on your machine. One Python process. One SQLite file. One home directory. The model only asks. The harness decides.")

- **How it was evaluated:** checked with Vietnamese whisper `small`. This is only an **indirect estimate**: whisper mishears too, especially English words mixed into Vietnamese sentences.
- **Real evaluation:** the user listens.
- **Listening samples (if still present):** `videos/voice-samples/4-gemini-Kore.mp3` … `7-gemini-Orus.mp3`.

## Known mispronunciations of Orus (and Charon)

| Word in the script | Whisper heard |
|---|---|
| my-agent-crew | "My Asian crew" |
| harness | "Hannis", "Hân eens" |
| home | "hôm" |

How to handle them, in order of preference:

1. **Rewrite the sentence** so the name sits where it is easy to pronounce, or use a Vietnamese word where possible.
2. **Add to the style prompt:** `Pronounce "harness" as the English word /ˈhɑːrnɪs/.`
3. **Change the spelling only in the text sent to TTS** (the `text` field of the request), for example `my-agent-crew` to `mai ây-giần cru` (a Vietnamese phonetic respelling). The captions keep the original text, because the caption correction step (`audio.md` §2) aligns to SCRIPT.md, not to the text sent to TTS.
4. **Switch to the Kore voice.**

## Style prompt (default)

```
Speak Vietnamese with a natural Northern (Hanoi) accent. Calm and clear, like an engineer explaining at a whiteboard to a colleague. Pronounce English technical terms (<list the video's terms>) the English way.
```

Write the prompt in English. List the specific English terms that appear in the video's script.

## Models

- **TTS:** `gemini-3.8-flash-tts` (the skill's default). Other models this key can use: `gemini-3.8-flash-lite-tts`, `gemini-3.1-flash-tts-preview`, `gemini-2.5-pro-preview-tts`, `gemini-2.5-flash-preview-tts`.
- **Background music:** the engine uses `lyria-realtime-exp` through `lyria-recipe.py`. The music is generated in real time: it takes about as long as the track itself and produces one continuous track, with no looping. Without the key or without the `google-genai` package, the engine falls back to MusicGen running locally, which produces a clip of about 30 s that `assemble-index` then loops.

## Things to know

- **Results are non-deterministic.** Each regeneration can give the same sentence a different length and emphasis. After regenerating a frame, rerun the steps that follow it: caption text correction, `sync-durations`, and that frame's Scene timestamps.
- **Every call uses the key's quota.** Regenerate only the frames that need it. The engine runs at most 4 lines in parallel (`HYPERFRAMES_TTS_CONCURRENCY`).
- **The engine keeps going when a line fails.** A failed line is only listed under "anomalies (non-fatal)" and is **absent** from `voices`. Always check that the voice count equals the frame count.
- **Options tried and dropped:**
  - macOS `say -v Linh`: pronounces English terms with Vietnamese phonetics and needs a long respelling table.
  - edge-tts HoaiMy and NamMinh: mispronounce English.
  - Kokoro: no Vietnamese.
