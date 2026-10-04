# CLYF product page

Redesigned on 3 October 2026 around the user's selected Sabi product-stage reference: a quiet warm-white background, oversized pale typography, a floating white textile sleeve, and controls that reveal the internal concept only on request. The remainder of the page explains the climbing scenario, the actual sensor inputs, the real recording, and the simulated battery model.

## Preview and publishing

- `clyf-forearm-battery.html` — complete standalone website. UTF-8 and viewport metadata included. Images, CSS, JavaScript, and the Three.js license are embedded. The filmed demo and English captions are separate files in `assets/video/`; keep that directory beside the HTML when serving it. No runtime CDN required.
- `clyf-artifact-body.html` — equivalent body fragment for the existing Claude Artifact publishing workflow. The publisher supplies the outer document and charset. This version has been generated, but the external Claude publication has not been changed or verified.
- `reference/clyf-before-redesign.html` — unmodified original Artifact backup.

Run `npm start` in this directory to serve at `http://127.0.0.1:8094/`. The server binds only to localhost. To edit, change `src/` and run `npm run build`. Dependencies are installed with `npm ci` if needed.

## Sources

- `src/page.html` — page sections and English copy.
- `src/style.css` — desktop/mobile styling; final rules implement the selected Sabi direction.
- `src/viewer.js` — Three.js scene, rotation/keyboard control, interior/exploded modes, component details.
- `src/model.js` — adapted geometry from the earlier local `intelligent-sleeve` project; that original project was not modified.
- `src/recorded.js` — **preserved original REC array**, per-second mean/min/max ENV voltages. Never replace with fabricated data.
- `src/app.js` — actual-recording replay, scrubber, CSV download, separately labelled simulated battery.
- `vendor/` — existing vendored Three.js 0.180.0, OrbitControls, RoomEnvironment, MIT license.
- `build.mjs` — bundles a portable standalone HTML and an Artifact body.
- `design-qa.md` / `reference/qa/` — checks and screenshots.

## Generated imagery

Generated with the **built-in image_gen tool**, inspected visually, then converted to WebP for embedding. Both are explicitly labelled as AI-generated concept imagery on the page, not photographs of the tested hardware.

1. `assets/climber-rest-concept.png` (1536 × 1024), and `assets/climber-rest-concept.webp`. Exact prompt: `assets/climber-rest-prompt.txt`. The image depicts a chalked hand and white sleeve resting between climbing attempts; the sleeve extends slightly above the elbow in the composition, so it represents a wearable vision, not exact prototype dimensions.
2. `assets/textile-detail-concept.png` (1536 × 1024), and `assets/textile-detail-concept.webp`. Exact prompt: `assets/textile-detail-prompt.txt`. A macro study of ordinary white knit, stitching, and grey inner lining.

## Evidence and boundaries

- REC source was checked byte-for-byte against the original, SHA-256 `967d6bd32ab9995e3a98d512ae1250d2310601b0a51022b49083178fee6f2ecc` for the array literal. All 57 downloaded CSV voltage values and capture seconds were verified.
- The recorded chart shows 19 one-second summaries from original capture seconds 30–48. The original sampling rate was 100 Hz, but this page does not invent 100 Hz samples from those summaries. Its replay is not claimed to be synchronized with the old video.
- The 3D sleeve and component geometry are illustrative. They are not manufacturing CAD. Only current sEMG and FSR inputs are presented. The Arduino is shown externally, matching the prototype architecture.
- The battery has simulated input and demo model constants. It is not live hardware data or a validated measure of fatigue, force, remaining strength, or recovery time.
- No changes or deployments were made to `../app/`, `../deploy.sh`, or the connected board. The previously reported restart/calibration fix remains a separate hardware deployment task.
- The user’s replacement introduction video is now embedded as a click-to-play filmed demonstration. Its battery remains an experimental estimate; it is not evidence of a validated recovery threshold.

References: [Sabi](https://sabi.com/), [Devpost demo guidance](https://help.devpost.com/article/84-video-making-best-practices).

## Vercel deployment

Published at [clyf-sleeve.vercel.app](https://clyf-sleeve.vercel.app) on 3 October 2026, under `kuzezes-projects/clyf-sleeve`. Vercel reports READY. Vercel Authentication is disabled for public access. Vercel automatically assigned the first deployment to production. The original Claude Artifact URL was not modified.

`deployment.json` records the project, deployment, and exact HTML hash. `publish/` is an ignored, clean static deployment directory containing `index.html`, video/caption assets, public-media CORS headers, and the Vercel project link; source files and reference backups are not uploaded. After future edits, `npm run build` refreshes that directory before deployment. Use the existing project link to keep the same website address.

## Filmed introduction (3 October 2026)

- Source: the original iPhone recording (IMG_1929.MOV, kept locally), untouched. Complete 58.64-second introduction and original audio retained.
- Web delivery: `assets/video/clyf-demo.mp4`, 1080 × 1920, 30 fps, H.264/AAC, 23.7 MB. HLG/BT.2020 converted to SDR/BT.709 using Hable tone mapping; MP4 metadata moved to the front for progressive playback. Original location and device metadata stripped.
- English captions: `assets/video/clyf-demo.en.vtt`, based on local Whisper transcription with sleeve/product terminology corrected. No caption burn-in; visitors can switch captions using the native player controls.
- Poster: `assets/video/clyf-demo-poster.webp`, a frame from this same video at 17 seconds, embedded in HTML.
- Placement: directly below the 3D hero; the hero links to `#demo`. Playback is user initiated with sound, `playsinline`, and `preload="none"`. No autoplay or third-party video embed.
- Artifact body uses absolute media URLs at the published Vercel site; it depends on that hosting and is no longer fully self-contained. External Claude Artifact embedding remains untested.
- The local server supports video byte ranges and HEAD requests for native playback/seeking.
