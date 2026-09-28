# Third-party components

| Component | Location | Licence | Notes |
|---|---|---|---|
| PPTX builder | `tools/pptx` | MIT; see `tools/pptx/LICENSE` | A copy of my-pptx-generator, extended with click builds, transitions and image metadata stripping |
| npm packages of the PPTX builder | `vendor/npm-cache` | Each package's own licence: pptxgenjs, jszip, commander, zod, @resvg/resvg-js and their dependencies | darwin-arm64 builds only |
| Fonts with Vietnamese coverage | `.claude/skills/vi-explainer-video/assets/fonts` | SIL Open Font License 1.1; the `OFL-*.txt` files sit beside the fonts | Subset to Latin and Vietnamese glyphs |
| Video presets and audio scripts | `.claude/skills/vi-explainer-video/presets`, `scripts` | MIT | Adapted from bestagentkits/motion-video-skill; credit in each file |
| HyperFrames, secure build | `bundle/` | HyperFrames licence | Not in git; `bin/setup` unpacks it from the tarball |
| GSAP | inside `bundle/` | GSAP licence | Ships with the bundle; never loaded from a CDN during rendering |
| Chrome headless shell | outside the repo, in the puppeteer cache | Chromium licence | Installed on the machine separately |

The repo's own code (`bin/`, `tools/deck`, and the `html-deck`, `pptx-deck` and `vi-explainer-video` skills) is under the MIT licence in [LICENSE](LICENSE).
