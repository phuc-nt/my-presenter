# Installation guide

This guide is written for the coding agent that sets up my-presenter on a user's machine, and it reads the same for a person doing it by hand. Follow the steps in order. Each step says what to run, what a good result looks like, and what to do when it fails.

my-presenter makes PowerPoint decks, single-file HTML decks and narrated or silent explainer videos. It works offline. Once installed, the only outbound connections are:

1. the model connection of Claude Code itself;
2. Gemini TTS at `generativelanguage.googleapis.com`, and only when the user turns narration on.

Read [SECURITY.md](SECURITY.md) for how that is enforced.

## Rules for the agent doing the install

- **Ask before anything that uses the network.** Only phase 1 below needs it. Tell the user what will be downloaded and from where, and wait for a yes.
- **Never handle the Gemini key yourself.** Do not ask the user to paste it into the chat, do not print it, and do not write it to the repo, a `.env` file or any project file. The user puts it in their own shell profile or secret manager (phase 3).
- **Do not edit `bin/`, `tools/`, `vendor/` or `.claude/`** to get past an error. Report the error to the user instead.
- **Do not commit** `kit.config.json`, `bundle/`, `videos/` or `decks/`. They are gitignored on purpose.
- Run the install from a normal terminal or a normal Claude Code session in the repo, not from inside `bin/claude`. That session blocks writes to the kit's own folders, which is what `bin/setup` needs to write.

## Phase 1: prerequisites (network, once)

Check what is already there:

```bash
uname -sm                         # must print: Darwin arm64
node --version                    # v22 or newer
claude --version                  # Claude Code
ffmpeg -version | head -1
ls ~/.cache/puppeteer/chrome-headless-shell 2>/dev/null || ls "/Applications/Google Chrome.app" 2>/dev/null
```

| Requirement | Needed for | Notes |
|---|---|---|
| macOS on Apple Silicon | everything | The offline profile uses `sandbox-exec`, which exists on macOS only. The bundled npm cache is for darwin-arm64. |
| Node.js 22 or newer | everything | |
| Claude Code, signed in | the agent | `bin/claude` starts it. A claude.ai login, an Anthropic API key, Bedrock and Vertex all work. |
| Chrome headless shell, or Google Chrome | HTML screenshots, video | Found in the puppeteer cache or `/Applications`. Anywhere else: set `HYPERFRAMES_BROWSER_PATH` to the executable. |
| ffmpeg and ffprobe | video | |
| The secure HyperFrames bundle | video, HTML screenshots | A file named `hyperframes-secure-darwin-arm64.tar.gz`, built by the `hyperframes-secure` project or handed out by whoever maintains the kit. Not needed for slides only. |

Narrated videos also need:

| Requirement | Notes |
|---|---|
| A Gemini API key | From Google AI Studio. See phase 3. |
| whisper.cpp (`whisper-cli`) | Aligns the subtitles to the voice. |
| A whisper model | `ggml-small.bin` in `~/.cache/hyperframes/whisper/models/`. Multilingual; needed for Vietnamese. |
| Python 3 with `google-genai` and `numpy` | Optional: background music (Lyria). Videos work without it. |

Install what is missing with the user's usual package manager, after they agree. On a Mac with Homebrew, for example:

```bash
brew install node ffmpeg whisper-cpp
npx @puppeteer/browsers install chrome-headless-shell@stable --path ~/.cache/puppeteer
```

This is the only phase that downloads anything. Everything after it is offline.

## Phase 2: install the kit (offline)

From the repo root, pick one:

```bash
bin/setup --no-tts <path/to/hyperframes-secure-darwin-arm64.tar.gz>   # silent videos with subtitles; no outbound connection at all
bin/setup --tts    <path/to/hyperframes-secure-darwin-arm64.tar.gz>   # narration and music through Gemini
bin/setup --no-video                                                   # slides only; no bundle needed
```

If the tarball sits at `../hyperframes-secure/out/`, its path can be left out.

`bin/setup`:

1. checks the tarball against its `SHA256SUMS`, unpacks it into `bundle/`, and copies its skills into `.claude/skills/` (the kit's own skills are never overwritten);
2. installs the packages of `tools/pptx` from `vendor/npm-cache`, with `--offline` and `--ignore-scripts`;
3. writes the narration choice to `kit.config.json`.

A good run ends with `next: bin/doctor, then bin/claude`. Running it again is safe; it replaces what it installed before.

To change the narration choice later, run `bin/setup --tts` or `bin/setup --no-tts` again (with `--no-video` if there is no bundle), or override it for one session with `KIT_TTS=none bin/claude` or `KIT_TTS=gemini bin/claude`.

## Phase 3: the Gemini key (narrated mode only)

Skip this phase in silent mode.

The user adds the key to their shell profile themselves, in a terminal of their own:

```bash
# in ~/.zshrc; the user types or pastes the value, never the agent
export GEMINI_API_KEY=...
```

Then opens a new terminal. A secret manager or the keychain works as well, as long as `GEMINI_API_KEY` is in the environment of the shell that runs `bin/claude`.

To check that it is set without showing it:

```bash
test -n "$GEMINI_API_KEY" && echo "GEMINI_API_KEY: set" || echo "GEMINI_API_KEY: missing"
```

`bin/claude` passes the key into the session only when narration is on. In silent mode it removes the key from the session's environment.

## Phase 4: check the machine

```bash
bin/doctor
```

Every line should be `✓` or `–` (not needed in this mode), and the last line should be `Ready.`. For each `✗`:

| Line | Fix |
|---|---|
| Node.js | Install Node.js 22 or newer. |
| Claude Code | Install Claude Code and sign in. |
| kit.config.json, npm packages | Run `bin/setup` (phase 2). |
| sandbox-exec, operating system | The machine is not macOS. The kit's offline profile cannot run there; see "Other systems" below. |
| Chrome | Install Chrome headless shell, or set `HYPERFRAMES_BROWSER_PATH`. |
| slide screenshots, HyperFrames, HyperFrames skills | Run `bin/setup` with the bundle tarball. |
| ffmpeg, ffprobe | Install ffmpeg. |
| GEMINI_API_KEY | Phase 3. |
| whisper, whisper model | Install whisper.cpp and put `ggml-small.bin` in `~/.cache/hyperframes/whisper/models/`. |

`bin/doctor` reads only. It installs nothing and uses no network.

## Phase 5: start a session and check its network

```bash
bin/claude
```

Then ask the agent in that session:

> Run `bin/doctor --net` and show me the Network section.

Expected results:

| Mode | `other hosts` | `Gemini` |
|---|---|---|
| silent (`none`) | `✓ blocked` | `✓ blocked (TTS off)` |
| narrated (`gemini`) | `✓ blocked` | `✓ reachable, key accepted` |

`bin/doctor --net` refuses to run outside a sandbox, so it cannot be used to reach the internet from a normal shell. The probes carry no data; the key goes to Gemini only in narrated mode.

## Phase 6: first use

In the `bin/claude` session, describe the work, for example:

- "Make an HTML deck introducing product X from notes.md, win95 theme."
- "Turn this deck into a PowerPoint with speaker notes."
- "Make a 60-second explainer video in Vietnamese from article.md."

The agent picks the skill (`html-deck`, `pptx-deck`, `vi-explainer-video`) and writes the output to `decks/<name>/` or `videos/<name>/`. Both folders stay out of git.

The tools also run by hand:

```bash
bin/deck init decks/my-talk --theme win95
bin/deck build decks/my-talk
bin/mpg build decks/my-talk/pptx.json --out decks/my-talk/out/pptx
```

The agent cannot hear audio or watch motion. Watch each video and click through each deck before presenting it.

## How `bin/claude` differs from plain `claude`

| | `bin/claude` | plain `claude` |
|---|---|---|
| Bash commands | In a sandbox: network only to Gemini (narrated mode) or nowhere; no writes to the kit's code; no reads of `~/.ssh`, `~/.aws` and other credential folders | Unrestricted |
| `hyperframes`, `deck`, `mpg` | Under the offline profile | Under the offline profile |
| Settings, skills, MCP servers | This repo's only; no user-level skills, MCP servers or claude.ai connectors | All of the user's |
| Web tools, messaging other sessions, remote triggers | Denied | Allowed |
| Bypass-permissions mode | Refused | Allowed |
| Environment | Credential-like variables removed | As in the shell |
| Telemetry, error reports, auto-update | Off | As configured |

Use `bin/claude` for making decks and videos. Use a plain session only to work on the kit itself.

## Troubleshooting

**"Chrome failed to launch" or another browser error.** Chrome cannot start inside the session sandbox. The agent runs the same `hyperframes`, `deck` or `mpg` command again, on its own, with the Bash sandbox disabled. That is pre-approved for those three tools, which then run under the kit's offline profile. Any other command that asks to leave the sandbox needs the user's approval; decline it unless you know why it is needed.

**"sandbox-exec not found; the offline profile cannot be applied".** The machine is not macOS. See "Other systems".

**`bin/setup` fails with "offline install of tools/pptx failed".** `vendor/npm-cache` holds packages for darwin-arm64 only. On other hardware the PPTX tool cannot be installed offline.

**"checksums of … do not match".** The tarball is damaged or was modified. Get a fresh copy from its source. The checksums prove the file is intact, not who made it, so take the tarball only from a source you trust.

**"kit: … turns the sandbox off".** `bin/claude` does not start in bypass-permissions mode. Start it without that flag.

**A video has no voice.** Check the mode: `bin/doctor` prints `TTS: none` in silent mode. Silent videos have no audio track by design.

**The key is set but `bin/doctor --net` says HTTP 400 or 403.** The key is wrong, expired, or not enabled for the Gemini API. The user fixes it in their profile and opens a new terminal.

## Other systems

The offline profile exists for macOS only. On Linux or Windows the tools refuse to run unless `KIT_ALLOW_NO_PROFILE=1` is set, and with it nothing but the Claude Code sandbox holds the network shut. The npm cache is darwin-arm64 only. Treat other systems as unsupported.

## Updating and removing

- **New bundle:** `bin/setup <new tarball>`. It replaces `bundle/` and the skills it installed last time.
- **Remove:** delete the repo folder. The kit's tools write nothing outside it except temporary files: a folder per run under `/tmp/kit.*`, removed when the run ends, and Chrome's files in the system temp folder. Claude Code keeps its own session history under `~/.claude`, as it does for any session. Prerequisites from phase 1 stay installed.
