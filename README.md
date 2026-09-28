# my-presenter

An offline toolkit for making presentations with a coding agent. It produces three kinds of output, tuned for Vietnamese content and usable for any language:

| Output | Tool | Agent skill | Result |
|---|---|---|---|
| PowerPoint deck | `bin/mpg` | `pptx-deck` | An editable `.pptx` with click builds, transitions and speaker notes |
| HTML deck | `bin/deck` | `html-deck` | One self-contained `.html` file with animation and a presenter view |
| Explainer video | `bin/hyperframes` | `vi-explainer-video` | A 1920×1080 `.mp4` with subtitles, narrated or silent |

Everything runs on the user's machine. The kit makes no outbound connection except:

1. the model connection of the harness (Claude Code);
2. Gemini TTS, only when narration is turned on at install time.

With narration off, videos are silent with subtitles and the second connection does not exist.

## Quick start

```bash
bin/setup --no-tts path/to/hyperframes-secure-darwin-arm64.tar.gz   # or --tts for narration, --no-video for slides only
bin/doctor
bin/claude
```

Then describe the work, for example: "Make an HTML deck introducing product X from notes.md, win95 theme."

[GUIDE.md](GUIDE.md) covers prerequisites, every setup option, the Gemini key, verification and troubleshooting. It is written so a coding agent can follow it to install the kit.

## Requirements

- macOS on Apple Silicon. The offline profile uses `sandbox-exec`.
- Node.js 22 or newer, ffmpeg, Claude Code.
- Chrome headless shell or Google Chrome.
- The secure HyperFrames bundle, for video and HTML screenshots. Slides alone do not need it.
- Narrated mode only: a Gemini API key, whisper.cpp and a whisper model.

## Using the tools directly

```bash
bin/deck init decks/my-talk --theme win95
bin/deck build decks/my-talk
bin/deck shots decks/my-talk/out/my-talk.html --out decks/my-talk/out/shots --all
bin/deck notes decks/my-talk --into decks/my-talk/pptx.json
bin/mpg build decks/my-talk/pptx.json --out decks/my-talk/out/pptx
bin/hyperframes render --output renders/video.mp4
```

`bin/deck shots` uses Chrome and the `puppeteer-core` in the HyperFrames bundle, so it is not available after `bin/setup --no-video`.

## Narrated and silent video

- **Narrated mode** (`bin/setup --tts`): Gemini reads the script, whisper aligns the subtitles, and the video gets background music and sound effects.
- **Silent mode** (`bin/setup --no-tts`): the video skill replaces voice, music and effects with `silent-track.mjs`, which times each frame by the length of its text and builds the subtitle timings. The rest of the workflow is the same. The MP4 has no audio track.

The choice lives in `kit.config.json` (not in git). Override it for one session with `KIT_TTS=none bin/claude` or `KIT_TTS=gemini bin/claude`.

## How the kit stays offline

| Layer | What it blocks |
|---|---|
| `bin/claude` session sandbox | Bash network beyond Gemini (narrated) or at all (silent); writes to the kit's code; reads of credential folders |
| Session settings | Web tools, messaging other sessions, remote triggers, MCP servers, claude.ai connectors, bypass mode, credential-like environment variables |
| `bin/offline/offline.sb` | For `hyperframes`, `deck`, `mpg`: network beyond localhost, DNS, other programs' sockets, opening URLs through other apps, writes outside the repo |
| Output checks | Network addresses, local paths, keys and forbidden words in decks; image metadata in HTML and PPTX |

Details, the latest review and the known limits: [SECURITY.md](SECURITY.md).

## Limits

- The agent cannot hear audio or watch motion. Watch every video and click through every deck before presenting.
- The offline profile and the bundled npm cache are for macOS on Apple Silicon only.
- Rendering needs Chrome, which cannot start inside the session sandbox. The three kit tools may leave it because they apply their own offline profile; other commands need the user's approval.

## Layout

```
bin/               setup, doctor, claude, and the three tools
bin/offline/       the offline profile and its wrappers
tools/deck/        HTML deck builder: engine, plain and win95 themes, starters, tests
tools/pptx/        PPTX builder
vendor/npm-cache/  npm packages for the offline install
.claude/skills/    html-deck, pptx-deck, vi-explainer-video
examples/          a sample deck and a sample silent-video source
bundle/            the HyperFrames bundle, unpacked by bin/setup (not in git)
decks/ videos/     your work (not in git)
```

## More

- [GUIDE.md](GUIDE.md): installation, for people and agents
- [SECURITY.md](SECURITY.md): threat model, layers, review, limits
- [AGENTS.md](AGENTS.md): rules for coding agents working in this repo
- [THIRD-PARTY.md](THIRD-PARTY.md): bundled components and their licences

MIT licence; see [LICENSE](LICENSE).
