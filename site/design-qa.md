# CLYF redesign — design QA

final result: passed

## Visual target and scope

- User-selected visual truth: `reference/user-sabi-reference.png` and current browser capture `reference/sabi-product-reference.jpg` from https://sabi.com/.
- Additional explicit user reference: the earlier white 3D sleeve site, `reference/white-sleeve-reference.jpg`.
- Implementation: http://127.0.0.1:8094/; entry `clyf-forearm-battery.html`.
- This is an adaptation for a single white forearm sleeve, not a pixel clone of three hats. Sabi's oversized background type, restrained warm-white field, centered floating product, and minimal chrome are the selected composition. Omission of peripheral hat variants is intentional.
- Desktop capture: 1280 × 800 requested viewport, screenshot 1265 × 791 (browser capture surface excluding its scrollbar/edge). Mobile: 390 × 844 requested viewport, 375 px content width. No document horizontal overflow in either checked layout.
- Full-view comparison: `reference/qa/reference-comparison.jpg`; source and final hero normalized side by side to the same 960 × 600 dimensions. No density mismatch used as a finding.
- Primary final screenshot: `reference/qa/desktop.jpg`. Supporting screenshots: `exploded.jpg`, `story.jpg`, `recording.jpg`, `mobile.jpg`, `mobile-data.jpg` in the same directory.

## Required fidelity surfaces

- **Fonts and typography:** system sans-serif, restrained weights, large pale hero words behind the rendered product. Main headings and supporting text have separate hierarchy. Copy is reflowed for mobile. Deliberate branding/content differences from Sabi: CLYF / Smart Sleeve and the user's hackathon story.
- **Spacing and layout rhythm:** full-viewport hero, centralized product and controls, short caption at bottom; spacious story sections below. The original clipped recording chart is now drawn to its available width and displays all 19 samples at 375 px content width.
- **Colors and tokens:** warm near-white hero, white narrative areas, quiet grey type and low-saturation green for data. Dark model demo is intentionally confined to a secondary section. Product remains ordinary white textile.
- **Image quality:** both generated 1536 × 1024 assets render correctly, with real knit/chalk texture and no placeholder graphics. The three-dimensional sleeve reuses and adapts the actual earlier code-authored 3D model as requested. Concepts are labelled. Evidence checked: story/material DOM image natural widths both 1536 and complete; accepted story screenshot. The model stays opaque externally and reveals hardware only on request.
- **Copy/content:** story moves from a climber's question to two actual inputs, the recorded signal, and the experimental battery. Precise fixed “Ready in 14 s.” hero promise removed. Arduino explicitly external; no NIRS/IMU additions or fabricated readings. Original REC unchanged.

## Comparison history and fixes

1. Earlier scaffold used a split headline/product layout. The user's later explicit Sabi reference replaced that direction before handoff with full-screen centered geometry and large background type.
2. [P2, fixed] Hero's absolutely positioned scene initially used the initial containing block; this reduced breathing room and placed the top near the navigation. Added `position: relative` to `.hero`; final desktop/mobile screenshot shows a complete product with visible labels and controls.
3. [P2, fixed] Small conceptual labels and view controls were too faint. Increased their contrast and selected label sizes; final desktop/mobile captures retain the subtle aesthetic while making controls easier to identify.
4. [P2, fixed] Responsive removal of selected line breaks could join adjacent words. Added explicit whitespace around these boundaries. Desktop and mobile content were rechecked after rebuilding.
5. Original chart overflow was addressed in the redesign by responsive Canvas dimensions, not by clipping or changing measured values. Mobile DOM: document clientWidth = scrollWidth = 375 px, chart width = 305 px; screenshot shows the final sample at 18 s.

Full and focused inspection used hero, exploded component panel, story image/text, data graph/control area, and mobile graph. No unaddressed P0/P1/P2 visual findings remain within this local-page scope.

## Functional checks

- Build passed; standalone and Artifact fragment contain embedded imagery/scripts/styles, with no runtime network fonts or JavaScript dependencies.
- Browser 3D initialization completed; console error/warning query returned an empty list.
- Surface / Inside / Exploded toggles changed the model and aria-pressed state.
- Arduino selection displayed the external-controller explanation. Sensor content appeared only in internal modes.
- Arrow-key interaction and pointer drag rotated the actual rendered object; Reset restored the initial view.
- Real-data scrubber at second 3 showed the supplied 2.80 V. Replay reached second 18, displayed 1.45 V, and returned to the stopped state.
- Browser download created `~/Downloads/clyf-recorded-envelope-2026-10-03.csv`; all 57 values and all 19 capture timestamps compared successfully with REC. Browser automation's download-event wait timed out, but the actual saved CSV was independently inspected and verified.
- Simulated example drained reserve then entered recharge; observed 79% with ~1 s remaining to its demo threshold. Reset returned 100%. Simulation/model disclosures visible in the page.
- Desktop navigation and mobile main CTA work; images load and mobile page does not overflow horizontally.
- Original array byte equality verified with the backup. No live dashboard or board files modified.

## Evidence limits / follow-up polish

- Local desktop browser rendering and responsive viewport were checked. Real-device multitouch and a full assistive-technology/contrast audit were not performed.
- External Claude Artifact publishing/CSP/file-size acceptance has not been tested; the user's existing external link was not modified.
- The second concept image and 3D geometry are visual studies rather than validated industrial design.
- A newly recorded hardware demo can replace the need to describe the bench prototype in text; the old phone video remains outside the site intentionally.

## Video addition — 3 October 2026

Passed desktop 1280 × 900 and mobile 390 × 844 layout checks (mobile content width 375 px including the browser scrollbar; no horizontal overflow). The hero CTA reaches #demo; the custom cover starts the native player, video time advances, clicking the video pauses it, and English captions render. No autoplay and no browser warnings/errors observed. H.264/AAC output is 1080 × 1920 at 30 fps with SDR BT.709 color tags. HTTP HEAD/full size, initial byte range, suffix range, invalid range (416), VTT content type, and MP4 fast-start ordering passed. Native scrubber automation did not expose a settable value; range serving is verified, but a physical-device drag/fullscreen check was not performed. REC remains byte-identical to the supplied original. Screenshots: reference/qa/video-desktop.jpg, video-mobile.jpg, video-mobile-hero.jpg.
