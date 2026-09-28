# What to do when the machine is missing something

Read this file when `bin/doctor` reports something missing. **The agent installs nothing**: no `npx`, `npm install`, `pip install`, `brew`. Stop and tell the user exactly what is missing.

## 1. Check

```bash
ROOT=$(git rev-parse --show-toplevel); "$ROOT"/bin/doctor
```

## 2. Who handles it

| Missing | Who handles it | How |
|---|---|---|
| Node ≥ 22 | the user | install Node |
| HyperFrames bundle, HyperFrames skills, npm packages of `tools/pptx` | the user | `bin/setup [--tts \| --no-tts] <bundle file .tar.gz>` |
| FFmpeg / FFprobe | the user | install ffmpeg |
| Chrome | the user | point the `HYPERFRAMES_BROWSER_PATH` variable at chrome-headless-shell or Chrome |
| whisper-cli and its model (narrated mode only) | the user | see `GUIDE.md` at the repo root |
| `google-genai` for python3 (narrated mode only, for Lyria music) | the user | optional; without it there is no background music |
| `GEMINI_API_KEY` (narrated mode only) | the user | section 4 |
| `hyperframes` not on PATH, `KIT_TTS` not set | the user | start the session with `bin/claude` |

Silent mode (`KIT_TTS=none`) needs no whisper, no Python and no Gemini key.

## 3. Background music

Background music is **off** by default; the `"mode": "generate"` request in `audio.md` §4 is how to turn it on, and it works only in narrated mode.

## 4. Gemini key (narration and Lyria background music)

Needed only when `KIT_TTS=gemini`. The user supplies their own key, obtained from Google AI Studio.

Store the key in the user's shell profile. **The user does this themselves**; the agent never receives, prints or writes the key:

```bash
# the user adds this line to ~/.zshrc themselves, then opens a new terminal
export GEMINI_API_KEY="<key>"
```

The agent only checks **whether** the key is present (the check prints `khoá Gemini: có`, "Gemini key: present", or `khoá Gemini: chưa có`, "Gemini key: not yet"). Never `echo` the key's value:

```bash
[ -n "$GEMINI_API_KEY" ] || eval "$(grep -E '^[[:space:]]*export (GEMINI|GOOGLE)_API_KEY=' ~/.zshrc | tail -1)"
[ -n "$GEMINI_API_KEY$GOOGLE_API_KEY" ] && echo "khoá Gemini: có" || echo "khoá Gemini: chưa có"
```

The `eval` line is needed when VS Code, Kiro or the terminal was opened **before** the key was added: that process does not have the environment variable yet. Every Bash command is a new shell, so put the `eval` line at the start of **every** audio engine call.

Things you must never do with the key:

- Never write the key to the video project's `.env`. The audio engine does not read `.env`.
- Never write the key to `audio_request.json` or to any file in the repo.
- Never ask the user to paste the key into the chat.

Without the key there is no narration. In that case, stop and give the user two options: add the key as described in this section, or switch to silent mode with `bin/setup --no-tts`.
