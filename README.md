# ViceFrame

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/chengyuanpeng/gta6-cover-art-01-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/chengyuanpeng/gta6-cover-art-01-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

ViceFrame is a browser-based poster studio for turning personal photos into bold, angled-panel city-night covers. Arrange one or more images across Collage, Grid, or Hero layouts, drag within a panel to adjust its framing, then tune the sunset or neon wash and add a headline and subhead. Your images stay in the browser; the finished canvas downloads as a PNG in portrait, square, or landscape format.

This project was made for the [GTA 6 Cover Art competition on make.fun](https://make.fun/bounty/gta6-cover-art-01).

## Start the studio

Use Node.js to serve the app's static files from the repository root:

```sh
node serve.ts --port 8080
```

Visit [http://localhost:8080](http://localhost:8080) in a desktop browser. Add photos from your device, choose a layout and output size, edit the two lines of text, and press **Export PNG**. Click a panel to select it; drag its image to reframe, or use the zoom control for a closer crop.
