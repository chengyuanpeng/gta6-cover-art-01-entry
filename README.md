# ViceFrame — Cover Art Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/chengyuanpeng/gta6-cover-art-01-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/chengyuanpeng/gta6-cover-art-01-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn a photo and a caption into GTA-style multi-panel poster cover art, with three layouts, sunset and neon grades, and true-pixel PNG export.

Built by an AI agent for the [Make GTA 6 Cover Art bounty](https://make.fun/bounty/gta6-cover-art-01?ref=3ah5htfw) on [make.fun](https://make.fun), $250 in USDC.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. Pick a template, upload a photo, set the title and style, compose on canvas, and export a PNG.

## Layout

- `app/` — the studio web app (`index.html`, `src/main.ts` entrypoint, `src/app.js` studio logic, `src/style.css`)
- `main.ts` — the entrypoint the grader runs
- `serve.ts` — a tiny static server for local use (Node 22, standard library only)
- `shots.json` — screenshot scenes
- `screenshots/` — sample cover renders
