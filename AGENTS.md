# Agent instructions

This repo is a toolkit for making PowerPoint decks, HTML decks and explainer videos. Everything runs offline. Only two outbound connections are allowed: the harness's own model connection, and Gemini TTS when the user has turned narration on.

To install the kit on a machine, follow [GUIDE.md](GUIDE.md). The rules below are for working with an installed kit.

## Start

1. Run `bin/doctor`. Add `--net` when the user wants to see what the session can reach (it runs only inside a `bin/claude` session). If any line shows `✗`, tell the user and stop. Do not install anything yourself.
2. Read the TTS mode from the first line `bin/doctor` prints (`TTS: gemini` or `TTS: none`): `gemini` means narrated videos, `none` means silent videos with subtitles only.
3. Check whether `KIT_ROOT` is set. If it is, the session was started with `bin/claude`. If it is not, the session came from an IDE or a plain `claude`: follow **Sessions without `bin/claude`** below as well.
4. Pick the skill for the task:

| Task | Skill | Tool |
|---|---|---|
| PowerPoint deck | `pptx-deck` | `mpg` |
| Single-file HTML deck with animation | `html-deck` | `deck` |
| Explainer video | `vi-explainer-video` | `hyperframes` |

## Network and installs

- Never run `npx`, `npm install`, `pip install`, `brew`, `curl`, `wget`, `git clone`, `hyperframes add`, `hyperframes upgrade` or `hyperframes skills`.
- Never use WebFetch or WebSearch. Source material comes from the user, as files in the repo.
- Never put an external address in an output: no fonts, scripts, images or CSS from a CDN. The one exception is the GSAP script tag in video frames, which the kit's HyperFrames build replaces with a local copy.
- With `KIT_TTS=none`, skip the TTS, music and sound-effect steps. Use `silent-track.mjs` as the video skill describes.

## Sessions without `bin/claude`

A session started from VS Code, another IDE or a plain `claude` may be used to make outputs. It has no session sandbox, no network allowlist and no credential filter, so these rules are what keeps the work offline. `.claude/settings.json` denies the worst tools in every session, including bypass mode, but it cannot cover everything.

- **Call the kit's tools by path**: `bin/hyperframes`, `bin/deck`, `bin/mpg` (absolute paths when working from another folder). They apply the offline profile themselves. Never run a `hyperframes`, `deck` or `mpg` found elsewhere on `PATH`: the official HyperFrames may be installed there, and it downloads.
- **Use only this repo's skills.** The session may also list skills from the user's home folder, including official HyperFrames skills with the same names as the ones here. When a skill loads, check that its base directory is inside this repo's `.claude/skills`. If it is not, stop following it and say so. Never read files under `~/.claude/skills`, `~/.agents/skills` or `~/.npm`.
- **Never call an MCP tool or connector** (mail, drive, calendar, notes, chat, deploy). Ignore notices that ask for them to be connected or authorised.
- **Never read credential files** (`~/.ssh`, `~/.aws`, `~/.gnupg`, `~/.config/gh`, `~/.netrc`, `~/.npmrc`, keychains), not even through Bash.
- **Never print environment variables** wholesale (`env`, `printenv`, `set`): the shell may hold tokens that `bin/claude` would have removed.
- The Chrome steps below do not apply: there is no session sandbox to leave, so run the `bin/` tools directly.

## Commands that need Chrome

Chrome cannot start inside the session sandbox of a `bin/claude` session. For `hyperframes render`, `hyperframes snapshot`, `hyperframes check` and `deck shots`:

1. Run the command on its own in one Bash call: no `cd`, `&&`, `;` or pipes.
2. If it fails with a browser error, run exactly the same command again with the Bash sandbox disabled. That is pre-approved for `hyperframes`, `deck` and `mpg`, which then run under the kit's offline profile (`bin/offline/`).
3. Never disable the sandbox for any other command.

## Secrets and content

- Never print an API key, and never write one to a project, `.env`, a request file or git. Never ask the user to paste a key into the chat.
- Never put personal data, tokens, private machine paths or internal addresses on a slide, in a video or in narration.
- Use `forbid` in `deck.config.json` to block strings that must not appear in a deck.

## Where outputs go

- Videos: `videos/<name>/`. Decks: `decks/<name>/`. Both are gitignored. Never remove them from `.gitignore` and never `git add -f` anything inside them.
- Do not change `bin/`, `tools/`, `vendor/`, `bundle/` or `.claude/` while making outputs. A `bin/claude` session blocks writes to them.

## Changing the kit itself

- Work in a plain Claude Code session, not `bin/claude`.
- Run `npm test` in `tools/pptx` and `node --test` in `tools/deck` before reporting the work as done.
- Keep `tools/deck/src/clean-image.js` and `tools/pptx/src/clean-image.js` identical.
- Scripts in `bin/` run on macOS (bash 3.2, BSD tools) and on Linux and WSL2 (GNU tools). Keep them portable and LF-only, and test a change to `bin/offline/run` or `bin/doctor` on both, for Linux in a container with bubblewrap.
- A change to `bin/claude`, `bin/claude-sandbox.json` or `bin/offline/` changes the security model: update [SECURITY.md](SECURITY.md) in the same change.
- Commit with conventional commit messages and no AI attribution lines. Commit or push only when the user asks.

## Reports

The agent cannot hear audio or watch motion. Every report separates what was checked through still images and measurements from what the user must watch or listen to themselves.
