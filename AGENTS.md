# Agent instructions

This repo is a toolkit for making PowerPoint decks, HTML decks and explainer videos. Everything runs offline. Only two outbound connections are allowed: the harness's own model connection, and Gemini TTS when the user has turned narration on.

To install the kit on a machine, follow [GUIDE.md](GUIDE.md). The rules below are for working with an installed kit.

## Start

1. Run `bin/doctor`. Add `--net` when the user wants to see what the session can reach (it runs only inside a `bin/claude` session). If any line shows `✗`, tell the user and stop. Do not install anything yourself.
2. Read `KIT_TTS` from the environment: `gemini` means narrated videos, `none` means silent videos with subtitles only.
3. Pick the skill for the task:

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

## Commands that need Chrome

Chrome cannot start inside the session sandbox. For `hyperframes render`, `hyperframes snapshot`, `hyperframes check` and `deck shots`:

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
