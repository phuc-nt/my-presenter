---
format: 1920x1080
duration: 15.8s
message: "Một kho mã tạo slide PowerPoint, slide HTML và video, chạy không cần mạng."
arc: two-beat statement
audience: "Người dùng bộ công cụ lần đầu"
mode: autonomous
music: none
---

## Video direction

- **Palette system**: from frame.md only. Ground `bg` #070817, glass cards `card`, text `ink`. The gradient is used once per frame.
- **Type**: Plus Jakarta Sans for headline and cards, JetBrains Mono for kickers. Vietnamese fonts in `assets/fonts/` (frame.md § Font faces), headline line-height ≥ 1.1, never clip a text box vertically.
- **Motion grammar**: entrances `power3.out`; each card appears on the word that names it; holds still after the last cue.
- **Rhythm / held frames**: Frame 2 holds from 7.5s for reading.
- **Framing variety**: F1 three cards in a row under a headline; F2 one centred statement with two chips.
- **Caption keep-out**: captions live in the bottom ~17% (y > 896); content stays above.
- **Language + Negative list**: all on-screen text is Vietnamese except product names. No personal data, tokens or private paths. No `repeat`, `yoyo`, `Math.random`, `@keyframes`.

## Frame 1 — Ba loại đầu ra

- scene: Headline on top; three glass cards appear one by one: PowerPoint, HTML, Video
- voiceover: "Một kho mã, ba loại đầu ra: slide PowerPoint, slide HTML và video."
- duration: 6.403s
- transition_in: cut
- status: outline
- src: compositions/frames/01-ba-loai-dau-ra.html
- type: hook
- focal: the three cards
- sfx: none

Scene 1 (0.0–2.7s): kicker and headline "Một kho mã, ba loại đầu ra" rise in; "ba loại đầu ra" carries the gradient.
Scene 2 (2.7–6.4s): cards land on their words: "PowerPoint" (3.18s), "HTML" (4.56s), "video" (5.18s). Holds still from 5.8s.

## Frame 2 — Chạy không cần mạng

- scene: One centred statement; two chips appear under it
- voiceover: "Mọi thứ chạy ngay trên máy, không cần mạng. Tắt giọng đọc thì video chỉ còn phụ đề."
- duration: 9.399s
- transition_in: crossfade
- status: outline
- src: compositions/frames/02-chay-khong-can-mang.html
- type: payoff
- focal: the statement "Không cần mạng"
- sfx: none

Scene 1 (0.0–4.2s): statement "Chạy ngay trên máy" rises; on "không cần mạng" (2.66s) the gradient line "Không cần mạng" zooms in.
Scene 2 (4.2–9.4s): chip "Giọng đọc: tắt" on "Tắt" (4.28s); chip "Phụ đề: bật" on "phụ đề" (6.81s). Holds still from 7.5s.
