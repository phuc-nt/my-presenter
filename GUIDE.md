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

## Supported systems

| System | Status | Offline profile of the tools |
|---|---|---|
| macOS on Apple Silicon | Supported | `sandbox-exec` with `bin/offline/offline.sb` |
| Linux with glibc, x64 or arm64 (Ubuntu, Debian, Fedora…) | Supported | bubblewrap (`bwrap`) |
| Windows 10 or 11, through WSL2 | Supported; do "Windows: prepare WSL2" first | bubblewrap, inside the WSL2 distro |
| Windows without WSL (PowerShell, Git Bash, Cygwin) | Not supported; `bin/setup` refuses to run | none |
| macOS on Intel, Linux with musl (Alpine), WSL1 | Not supported | |

Native Windows is not supported because Claude Code has no sandbox there, so nothing would hold the network shut.

## Windows: prepare WSL2

Skip this section on macOS and Linux.

On Windows the kit runs inside a Linux distribution under WSL2. A Linux process in WSL can normally start Windows programs (`cmd.exe`, `powershell.exe`, any `.exe`) and read the Windows drives under `/mnt/c`. A Windows program started that way runs outside every Linux sandbox, with full network access, so the kit needs that bridge turned off. Use a distro of its own for the kit, so other work in WSL keeps the bridge.

1. In PowerShell, install or update WSL and create a distro for the kit:

   ```powershell
   wsl --update
   wsl --install Ubuntu-24.04 --name my-presenter
   wsl -l -v          # my-presenter must show VERSION 2
   ```

   On a WSL too old for `--name`, run `wsl --update` first. If the VERSION column says 1, run `wsl --set-version my-presenter 2`.

2. In the new distro, create the Linux user it asks for, then write `/etc/wsl.conf`:

   ```bash
   sudo tee /etc/wsl.conf >/dev/null <<'EOF'
   [boot]
   systemd=true

   [interop]
   enabled=false
   appendWindowsPath=false

   [automount]
   enabled=false
   EOF
   ```

   - `[interop]` stops Linux processes from starting Windows programs, and keeps Windows folders off `PATH`.
   - `[automount]` keeps the Windows drives out of `/mnt`. Copy source files into the distro instead: in Windows Explorer, open `\\wsl$\my-presenter\home\<user>\`. Leave automount on only if you accept that the agent can read the Windows drives; `bin/claude` still blocks reads under `/mnt`.

3. In PowerShell, restart the distro so the settings apply, then open it again:

   ```powershell
   wsl --shutdown
   wsl -d my-presenter
   ```

4. Clone the repo into the Linux home (for example `~/my-presenter`), never under `/mnt/c`. Run every command in this guide in the WSL terminal, from that folder.

With interop off, programs in the distro cannot open a Windows browser. When Claude Code asks you to sign in, it prints a URL: open it in a Windows browser yourself and paste the code back. Commands such as `code .` or `explorer.exe .` stop working in this distro; that is intended.

## Phase 1: prerequisites (network, once)

Check what is already there:

```bash
uname -sm                         # Darwin arm64, Linux x86_64 or Linux aarch64
node --version                    # v22 or newer
claude --version                  # Claude Code
ffmpeg -version | head -1
ls ~/.cache/puppeteer/chrome-headless-shell 2>/dev/null || ls "/Applications/Google Chrome.app" 2>/dev/null
command -v bwrap socat            # Linux and WSL2 only
```

| Requirement | Needed for | Notes |
|---|---|---|
| A supported system | everything | See "Supported systems". |
| Node.js 22 or newer | everything | |
| Claude Code, signed in | the agent | `bin/claude` starts it. A claude.ai login, an Anthropic API key, Bedrock and Vertex all work. |
| bubblewrap and socat | everything, Linux and WSL2 only | bubblewrap runs the offline profile of the tools; Claude Code's own sandbox needs both. |
| Chrome headless shell, or Google Chrome | HTML screenshots, video | Found in the puppeteer cache, `/Applications`, `/opt/google/chrome` or `/usr/bin`. Anywhere else: set `HYPERFRAMES_BROWSER_PATH` to the executable. On Linux, prefer the headless shell to a Chromium snap, which cannot start inside the profile. |
| ffmpeg and ffprobe | video | |
| The secure HyperFrames bundle | video, HTML screenshots | A file named `hyperframes-secure-<os>-<arch>.tar.gz`, for example `hyperframes-secure-darwin-arm64.tar.gz` or `hyperframes-secure-linux-x86_64.tar.gz`. It is built by the `hyperframes-secure` project on the same kind of system it is for, or handed out by whoever maintains the kit. Not needed for slides only. |

Narrated videos also need:

| Requirement | Notes |
|---|---|
| A Gemini API key | From Google AI Studio. See phase 3. |
| whisper.cpp (`whisper-cli`) | Aligns the subtitles to the voice. |
| A whisper model | `ggml-small.bin` in `~/.cache/hyperframes/whisper/models/`. Multilingual; needed for Vietnamese. |
| Python 3 with `google-genai` and `numpy` | Optional: background music (Lyria). Videos work without it. |

Install what is missing with the user's usual package manager, after they agree.

On a Mac with Homebrew:

```bash
brew install node ffmpeg whisper-cpp
npx @puppeteer/browsers install chrome-headless-shell@stable --path ~/.cache/puppeteer
```

On Ubuntu or Debian, including the WSL2 distro:

```bash
sudo apt update
sudo apt install -y bubblewrap socat ffmpeg git curl fonts-dejavu-core \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxkbcommon0 libxcomposite1 \
  libxdamage1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2t64
# Node.js 22 or newer, from nodejs.org, NodeSource or nvm; the distro's own package is often older
npx @puppeteer/browsers install chrome-headless-shell@stable --path ~/.cache/puppeteer
```

The `lib…` packages are what Chrome headless shell needs to start. On Debian 12 and Ubuntu 22.04, the last one is `libasound2`.

For narration on Linux, build whisper.cpp from source and fetch the model:

```bash
sudo apt install -y build-essential cmake
git clone https://github.com/ggml-org/whisper.cpp ~/src/whisper.cpp
cd ~/src/whisper.cpp && cmake -B build && cmake --build build -j --config Release
mkdir -p ~/.local/bin && ln -sf ~/src/whisper.cpp/build/bin/whisper-cli ~/.local/bin/whisper-cli
sh ./models/download-ggml-model.sh small
mkdir -p ~/.cache/hyperframes/whisper/models && mv models/ggml-small.bin ~/.cache/hyperframes/whisper/models/
```

Make sure `~/.local/bin` is on `PATH`.

This is the only phase that downloads anything. Everything after it is offline.

## Phase 2: install the kit (offline)

From the repo root, pick one:

```bash
bin/setup --no-tts <path/to/hyperframes-secure-<os>-<arch>.tar.gz>   # silent videos with subtitles; no outbound connection at all
bin/setup --tts    <path/to/hyperframes-secure-<os>-<arch>.tar.gz>   # narration and music through Gemini
bin/setup --no-video                                                  # slides only; no bundle needed
```

If the tarball sits at `../hyperframes-secure/out/`, its path can be left out. The bundle must match the system: `bin/setup` looks for `hyperframes-secure-darwin-arm64` on a Mac and `hyperframes-secure-linux-x86_64` or `-linux-aarch64` on Linux and WSL2.

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
# in ~/.zshrc (macOS) or ~/.bashrc (Linux, WSL2); the user types or pastes the value, never the agent
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
| sandbox-exec, operating system | The system is not supported; see "Supported systems". |
| WSL | The distro runs under WSL1. In PowerShell: `wsl --set-version <distro> 2`. |
| WSL interop | Interop is on. Write `/etc/wsl.conf` as in "Windows: prepare WSL2", then `wsl --shutdown`. |
| repo location | The repo is on a Windows drive under `/mnt`. Clone it into the Linux home. |
| bubblewrap, socat | Install them (`sudo apt install bubblewrap socat`). If bubblewrap is installed but "cannot create a sandbox", see Troubleshooting. |
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

## How `bin/claude` differs from an IDE or plain `claude`

A session started from VS Code, another IDE or a plain `claude` in this repo can make decks and videos too. It loads `.claude/settings.json`, which denies the riskiest tools in every session, and `AGENTS.md`, which tells the agent what it must not do there. Nothing enforces the rest.

| | `bin/claude` | IDE or plain `claude` |
|---|---|---|
| Bash network | Only to Gemini (narrated mode) or nowhere | Unrestricted; the agent is told to stay offline |
| `npx`, `npm install`, `pnpm`, `yarn`, `bun`, `brew`, `curl`, `wget`, `git clone`, `hyperframes add/upgrade/skills` | Denied | Denied by `.claude/settings.json` |
| `hyperframes`, `deck`, `mpg` | Under the offline profile | Under the offline profile, called as `bin/hyperframes`, `bin/deck`, `bin/mpg` |
| Credential folders (`~/.ssh`, `~/.aws` and others) | Unreadable | Read tool denied; Bash reads not blocked, the agent is told not to |
| Writes to the kit's code | Blocked | Allowed |
| Settings, skills, MCP servers | This repo's only; no user-level skills, MCP servers or claude.ai connectors | All of the user's load; the agent is told to use only this repo's skills and no MCP tools. Reading `~/.claude/skills` is denied |
| Web tools, messaging other sessions, remote triggers, artifacts | Denied | Denied by `.claude/settings.json` |
| Bypass-permissions mode | Refused | Allowed, but the denials above still hold |
| Environment | Credential-like variables removed | As in the shell; the agent is told never to print it |
| Telemetry, error reports, auto-update | Off | As configured |

Prefer `bin/claude` for sensitive material. An IDE session is fine for everyday decks and videos, and it is the one to use when working on the kit itself.

## Troubleshooting

**"Chrome failed to launch" or another browser error.** Chrome cannot start inside the session sandbox. The agent runs the same `hyperframes`, `deck` or `mpg` command again, on its own, with the Bash sandbox disabled. That is pre-approved for those three tools, which then run under the kit's offline profile. Any other command that asks to leave the sandbox needs the user's approval; decline it unless you know why it is needed.

**"sandbox-exec not found" or "no offline profile for …".** The system is not supported. See "Supported systems".

**"bubblewrap (bwrap) cannot create a sandbox here".** bubblewrap needs unprivileged user namespaces. Check with `bwrap --unshare-all --ro-bind / / /bin/true`. The usual causes:

- Ubuntu 23.10 and later restrict user namespaces through AppArmor (`sysctl kernel.apparmor_restrict_unprivileged_userns` prints 1). Allow them for bubblewrap only, not system-wide:

  ```bash
  sudo tee /etc/apparmor.d/bwrap >/dev/null <<'EOF'
  abi <abi/4.0>,
  include <tunables/global>
  profile bwrap /usr/bin/bwrap flags=(unconfined) {
    userns,
    include if exists <local/bwrap>
  }
  EOF
  sudo systemctl reload apparmor
  ```

- `user.max_user_namespaces` is 0, or the machine is a container that forbids them. Use a normal Linux install or WSL2 distro instead.

Do not work around it with `KIT_ALLOW_NO_PROFILE=1`: the tools would then run with nothing holding the network shut.

**`bin/setup` fails with "offline install of tools/pptx failed".** `vendor/npm-cache` holds packages for macOS on Apple Silicon and for Linux with glibc on x64 and arm64. On other systems the PPTX tool cannot be installed offline.

**`bin/setup` says "native Windows is not supported".** It was started from PowerShell, Git Bash or Cygwin. Open the WSL2 distro and run it there.

**"checksums of … do not match".** The tarball is damaged or was modified. Get a fresh copy from its source. The checksums prove the file is intact, not who made it, so take the tarball only from a source you trust.

**"kit: … turns the sandbox off".** `bin/claude` does not start in bypass-permissions mode. Start it without that flag.

**A video has no voice.** Check the mode: `bin/doctor` prints `TTS: none` in silent mode. Silent videos have no audio track by design.

**The key is set but `bin/doctor --net` says HTTP 400 or 403.** The key is wrong, expired, or not enabled for the Gemini API. The user fixes it in their profile and opens a new terminal.

## Updating and removing

- **New bundle:** `bin/setup <new tarball>`. It replaces `bundle/` and the skills it installed last time.
- **Remove:** delete the repo folder, or on Windows the whole distro (`wsl --unregister my-presenter`, which deletes everything in it). The kit's tools write nothing outside the repo except temporary files: a folder per run under `/tmp/kit.*`, removed when the run ends, and on macOS Chrome's files in the system temp folder. Claude Code keeps its own session history under `~/.claude`, as it does for any session. Prerequisites from phase 1 stay installed.
