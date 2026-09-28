# BRIEF.md template

Create `BRIEF.md` at the project root (`hyperframes init` does not create this file). `flow: automation` and `mode: autonomous` (in the storyboard)
mean no stops at checkpoints. `storyboard: no` means there is no sketch round.

```markdown
---
workflow: faceless-explainer
flow: automation
storyboard: no
message: "<one sentence: what the viewer must remember>"
destination: youtube
aspect: 1920x1080
language: vi
audience: "<who will watch, what they already know>"
length: <estimate>s          # ~3 words/second of narration
angle: concept            # concept | how-to | listicle | story
narration: yes
voice: Orus               # Orus (default) | Kore | Aoede | Charon — see references/voices.md
---

## Intent

<2–4 sentences: what the video explains and its tone (e.g. "like a short whiteboard session, technical but easy to follow").>
Content taken from <input file>. Rewritten to be easy to listen to, keeping the meaning and the terminology.

## Notes

- Gemini TTS voice (`gemini-3.8-flash-tts`), voice set in `voice:`. Captions are aligned to the script text; Lyria background music matches the narration length.
- Do not show personal figures, tokens or private paths.
- <project-specific constraints: brand colors, terms that must stay unchanged, URLs/commands allowed on screen…>
```
