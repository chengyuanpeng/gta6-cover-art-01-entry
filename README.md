# ViceFrame

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/chengyuanpeng/gta6-cover-art-01-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/chengyuanpeng/gta6-cover-art-01-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

ViceFrame is a browser studio for turning your own photos into a bold, slanted-panel city-night cover. Lay one or more pictures across Collage, Grid, or Hero frames, drag inside a panel to reframe the shot, wash the whole cover in a sunset or neon glow, and set a big headline with a subhead. Nothing leaves your machine — your photos are read locally and the finished cover downloads as a PNG.

This project was made for the [GTA 6 Cover Art competition on make.fun](https://make.fun/bounty/gta6-cover-art-01).

## Start the studio

From the repository root, serve the app's static files with Node.js:

```sh
node serve.ts --port 8080
```

Open [http://localhost:8080](http://localhost:8080) in a desktop browser. Add photos from your device, pick a layout and a post size, edit the headline and subhead, and press **Export PNG**. Click a panel to select it; drag its photo to reframe it, or use the zoom slider for a tighter crop.

## Post sizes

- Square — 1080 × 1080
- Portrait — 1080 × 1350
- Landscape — 1920 × 1080

Two sample photos ship with the app so you can try it right away; replace them with your own pictures any time.
