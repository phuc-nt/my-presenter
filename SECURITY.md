# Security

my-presenter is built so that a user's material stays on their machine. This document states what the kit promises, how each layer keeps the promise, what was checked, and what it does not cover.

## The promise

Once installed, the kit makes no outbound connection except:

1. **The harness model connection.** Claude Code sends the conversation, including the files the agent reads, to its model provider. That is how the agent works; the kit does not change it.
2. **Gemini TTS**, at `generativelanguage.googleapis.com`, only in narrated mode. It receives the narration text and returns audio (and, if used, background music from Lyria).

In silent mode there is no second connection: videos carry subtitles and no audio.

Installation itself is offline as well. `bin/setup` unpacks a local tarball and installs npm packages from `vendor/npm-cache`, with lifecycle scripts disabled. Only the prerequisites in [GUIDE.md](GUIDE.md) phase 1 are downloaded, once, with the user's consent.

## Layers

| Layer | Where | What it enforces |
|---|---|---|
| Session sandbox | `bin/claude`, `bin/claude-sandbox.json` | Every Bash command runs in Claude Code's sandbox. Network: `generativelanguage.googleapis.com` in narrated mode, nothing in silent mode (`strictAllowlist`). No writes to `bin/`, `tools/`, `vendor/`, `bundle/`, `.claude/`, `.kiro/`, `kit.config.json`. No reads of `~/.ssh`, `~/.aws`, `~/.gnupg`, `~/.config/gh`, `~/.config/gcloud`, `~/.kube`, `~/.netrc`, `~/.npmrc`, `~/.git-credentials`, `~/.docker/config.json`, `~/Library/Keychains`, `~/.local/share/keyrings`, `~/.password-store`, and on Linux `/mnt`, where WSL puts the Windows drives. No reads of `~/.npm` (the npx cache, which may hold the official HyperFrames CLI) or of the user-level skill folders `~/.claude/skills` and `~/.agents/skills`. |
| Session permissions | `bin/claude-sandbox.json` | Denied tools: WebFetch, WebSearch, SendMessage, ListAgents, RemoteTrigger, Artifact tools, SendUserFile, PushNotification. `npx`, `npm`, `pnpm`, `yarn`, `bun` and `bunx` denied, so no package, including the official HyperFrames, can run from a cache. `Read` denied on the credential paths and folders above. Bypass-permissions mode disabled. |
| Session scope | `bin/claude` | Project and local settings only (no user-level skills or hooks), `--strict-mcp-config` (no MCP servers), claude.ai connectors off, bypass flags refused, telemetry, error reporting and auto-update off. |
| Environment | `bin/claude` | Variables that look like credentials (`*TOKEN*`, `*SECRET*`, `*PASSWORD*`, `*API_KEY*`, `*CREDENTIAL*`, `AWS_*`, `GH_*`, `SSH_AUTH_SOCK` and similar) are removed before the session starts. Kept: `ANTHROPIC_*` and `CLAUDE_*` for the harness, cloud credentials when the harness runs on Bedrock or Vertex, and the Gemini key in narrated mode only. |
| Offline profile, macOS | `bin/offline/offline.sb`, `bin/offline/run` | `hyperframes`, `deck` and `mpg` always run under this sandbox-exec profile, inside or outside a session. Network: localhost only, no DNS. Unix sockets: only inside the repo and a per-run temp folder. No LaunchServices (cannot open a URL in another app), no background download service, no Apple Events, no system proxy settings. Writes: the repo and temp folders only, and never the kit's own code. Proxy variables are removed. |
| Offline profile, Linux and WSL2 | `bin/offline/run` | The same three tools run under bubblewrap. Network: a namespace of their own with loopback only, so no DNS and no reach to services on the host's localhost. Fresh, empty `/tmp`, `/run`, `/var/tmp`, `/mnt` and `/media`: no Docker socket, ssh or gpg agent, D-Bus, X11, WSL interop socket or Windows drives. The home folder is replaced by an empty one, except read-only copies of the Chrome and whisper caches, Node version managers, fonts and tool folders on `PATH`. The rest of the system is read-only. Writes: the repo and a per-run temp folder only, never the kit's own code. Proxy variables are removed. When bubblewrap cannot run and the process is not already in a network-isolated sandbox, the tools refuse to start. |
| WSL settings | `/etc/wsl.conf`, checked by `bin/doctor` | Interop off, so no Linux process can start a Windows program, which would run outside every Linux sandbox. Windows folders off `PATH`. Windows drives not mounted (recommended). The kit in a distro of its own. |
| Platform guard | `bin/setup`, `bin/kit-env` | Refuse to run on Windows outside WSL (Git Bash, MSYS, Cygwin), where Claude Code has no sandbox. |
| Output checks | `tools/deck` | `deck build` refuses to write an HTML deck that references a network address, a local path, a key-like string or a word from `forbid`, or that contains navigation, beacons, WebRTC or `<base>`/meta refresh. The built file carries a Content-Security-Policy that blocks all requests, and turns off DNS prefetch. `deck shots` reports any request a deck tries to make. `mpg` refuses remote images. |
| Output metadata | `tools/deck/src/clean-image.js`, `tools/pptx/src/clean-image.js` | Images embedded in HTML and PPTX files lose EXIF, GPS, XMP, IPTC, comments and text chunks (PNG, JPEG, WebP, SVG). Pixels, colour profile and orientation are kept. PPTX alt text holds the file name, never its path. |

## Why tools may leave the session sandbox

Chrome may not start inside Claude Code's sandbox, and rendering video, taking slide screenshots and running HyperFrames checks all need Chrome. The session therefore has `allowUnsandboxedCommands` on, and `hyperframes`, `deck` and `mpg` are pre-approved to run outside it. They are wrappers that apply the offline profile themselves, so they are never unconfined. Any other command that asks to leave the sandbox needs the user's explicit approval.

## Review of 2026-09-28

A review looked for ways user data could leave the machine other than the two allowed connections. Found and fixed:

| Finding | Fix |
|---|---|
| A tool under the offline profile could ask another app to open a URL (LaunchServices), which then fetched it outside the profile. | LaunchServices, `lsd` and `nsurlsessiond` lookups denied. |
| A tool could send Apple Events to other apps. | `appleevent-send` denied. |
| A tool could connect to any unix socket, including Docker's, the ssh agent's, tmux's and other Claude Code sessions' messaging sockets, any of which can act outside the profile. | Unix sockets allowed only inside the repo and a per-run temp folder. |
| A proxy on localhost, from the environment or the system settings, could relay a tool's traffic. | Proxy variables removed; the system configuration service denied. |
| Session tools could message other local Claude Code sessions (which may not be sandboxed), trigger cloud runs, publish artifacts or send files and notifications. | Those tools denied. |
| MCP servers and claude.ai connectors (mail, drive, notes) configured for the user would load into the session. | `--strict-mcp-config`, connectors off. |
| Bypass-permissions mode would run every command unsandboxed. | Disabled in settings and refused by `bin/claude`. |
| Tokens and passwords in the user's shell environment were inherited by the session. | Credential-like variables removed. |
| Credential folders in the home directory were readable. | Read denied in the sandbox and for the Read tool. |
| Images embedded in decks kept camera, location and author metadata. | Stripped at build time. |
| `bin/doctor --net` run outside a sandbox reached the internet, and sent the Gemini key even in silent mode. | Refuses to run outside a sandbox; sends the key only in narrated mode. |
| The official HyperFrames CLI in the npx cache, and the official HyperFrames skills in `~/.claude/skills` (same names as the secure ones), were reachable from a session. The skills never loaded, but both could be read or run by hand. | npm tools denied; `~/.npm` and the user-level skill folders unreadable. The `hyperframes` on the session's `PATH` is the kit's wrapper, which runs only the secure bundle. |
| Personal Claude Code settings could be committed. | `.claude/settings.local.json` and `CLAUDE.local.md` gitignored. |

Checked and found clean: PPTX document properties (generic), MP4 metadata (renderer name and version only), the kit's own images and screenshots.

### Linux and WSL2 profile, same day

Probes run under the bubblewrap profile, in a Debian 12 container, with a web server on the host's localhost, a unix socket in `/tmp`, a socket at `/run/docker.sock`, a file under `/mnt/c` and a key in `~/.ssh`:

| Probe | Result |
|---|---|
| HTTPS to an internet host | Blocked: no DNS, no route |
| The web server on the host's localhost | Blocked: the tool's loopback is its own |
| The sockets in `/tmp` and `/run` | Not visible |
| `/mnt/c`, `~/.ssh` | Not visible |
| Writes to `bin/`, `tools/` | Refused: read-only |
| Writes to the home folder or `/tmp` | Land in a throwaway folder, gone when the run ends |
| Writes to the repo and the per-run temp folder | Allowed |

Running inside a simulated session sandbox, the tools apply their profile when bubblewrap can nest, run directly when it cannot and the network is already isolated, and refuse to run when it cannot and the network is open. One finding was fixed: the kernel adds down-state tunnel devices (`tunl0`, `sit0` and others) to every new network namespace, which made an isolated sandbox look connected.

## What the kit does not cover

- **The allowed Gemini connection is a channel.** In narrated mode, anything able to run in the session could send data to Gemini, including under someone else's API key. Use silent mode for material that must not leave the machine at all.
- **The model provider sees what the agent reads.** Sandbox reads are open outside the denied credential folders, so the agent can read, and therefore send to the model, any file the user's account can read. Keep sensitive files outside the reach of the task, or point the agent only at the files it needs.
- **Services on localhost.** Tools may connect to localhost (Chrome needs it). A local service that forwards requests to the internet would bypass the profile.
- **Opening a video's `index.html` in a normal browser** loads GSAP from its CDN. The render itself uses the bundled local copy; the rendered MP4 makes no requests.
- **The bundle's `SHA256SUMS`** proves a tarball is intact, not who built it. Take the tarball only from a trusted source.
- **Supported systems only.** macOS on Apple Silicon, Linux with glibc, and WSL2. Elsewhere the offline profile does not exist; see [GUIDE.md](GUIDE.md).
- **WSL interop left on.** `bin/doctor` fails while it is on, but the kit cannot switch it off. With interop on, a command in the session could start a Windows program that has full network access. Follow "Windows: prepare WSL2" in the guide.
- **Linux: sockets under kept home folders.** The Linux profile keeps a few home folders readable (Chrome and whisper caches, Node version managers, tool folders on `PATH`). A unix socket placed inside one of them would be reachable. None of these tools puts one there.
- **Linux: tested in containers.** The Linux profile was tested on Debian 12 (x64 and arm64) with escape probes. WSL2 itself, Claude Code's own Linux sandbox and HyperFrames video rendering on Linux were not tested on a real machine.
- **A plain `claude` session** in this repo has none of the session-level protections. Use `bin/claude` for work on user material.

## Reporting a problem

Open an issue on the repository without including sensitive details, and ask for a private channel. Do not attach decks, videos or logs that contain user material.
