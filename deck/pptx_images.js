// Crops and frames the deck images for the editable .pptx, matching the CSS in deck.html.
// Every crop reproduces object-fit: cover + object-position (+ the scale transform where the
// HTML uses one), so the pptx shows exactly what the PDF shows. Rounded corners are baked
// onto the matching patch of the slide background, so images stay small JPEGs.
//
//   NODE_PATH=<dir with sharp> node pptx_images.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SRC = path.join(__dirname, 'assets');
const OUT = path.join(__dirname, 'pptx-assets');
fs.mkdirSync(OUT, { recursive: true });

const BG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
  <defs>
    <radialGradient id="mint"><stop offset="0" stop-color="#5cffc7" stop-opacity=".07"/><stop offset=".7" stop-color="#5cffc7" stop-opacity="0"/></radialGradient>
    <radialGradient id="pink"><stop offset="0" stop-color="#ff4f8b" stop-opacity=".06"/><stop offset=".7" stop-color="#ff4f8b" stop-opacity="0"/></radialGradient>
    <pattern id="dots" x="40" y="40" width="80" height="80" patternUnits="userSpaceOnUse"><circle cx="40" cy="40" r="2.25" fill="#fff" fill-opacity=".05"/></pattern>
  </defs>
  <rect width="1920" height="1080" fill="#070a0d"/>
  <ellipse cx="1632" cy="162" rx="900" ry="600" fill="url(#mint)"/>
  <ellipse cx="192" cy="1026" rx="800" ry="600" fill="url(#pink)"/>
  <rect width="1920" height="1080" fill="url(#dots)"/>
</svg>`;

// Source rectangle shown in a bw x bh box by object-fit: cover, object-position (px, py),
// then transform: scale(s) about transform-origin (ox, oy). Fractions, as in CSS.
function coverCrop(W, H, bw, bh, { px = 0.5, py = 0.5, s = 1, ox = 0.5, oy = 0.5 } = {}) {
  const k = Math.max(bw / W, bh / H);
  const offx = (bw - W * k) * px, offy = (bh - H * k) * py;
  const o = [ox * bw, oy * bh];
  const pre = (b, i) => o[i] + (b - o[i]) / s;
  const x0 = (pre(0, 0) - offx) / k, x1 = (pre(bw, 0) - offx) / k;
  const y0 = (pre(0, 1) - offy) / k, y1 = (pre(bh, 1) - offy) / k;
  return { left: Math.round(x0), top: Math.round(y0), width: Math.round(x1 - x0), height: Math.round(y1 - y0) };
}

const roundMask = (w, h, r) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#fff"/></svg>`);

// A framed image placed at (x, y, w, h) slide px, rendered at `scale` times that size.
async function framed(name, file, box, crop, radius, scale = 2) {
  const w = Math.round(box.w * scale), h = Math.round(box.h * scale);
  const meta = await sharp(path.join(SRC, file)).metadata();
  const rect = crop.rect || coverCrop(meta.width, meta.height, box.w, box.h, crop);
  const photo = await sharp(path.join(SRC, file)).extract(rect).resize(w, h, { fit: 'fill' }).ensureAlpha()
    .composite([{ input: roundMask(w, h, radius * scale), blend: 'dest-in' }]).png().toBuffer();
  const patch = await sharp(path.join(OUT, 'bg.png'))
    .extract({ left: Math.round(box.x), top: Math.round(box.y), width: Math.round(box.w), height: Math.round(box.h) })
    .resize(w, h, { fit: 'fill' }).toBuffer();
  await sharp(patch).composite([{ input: photo }]).jpeg({ quality: 88, mozjpeg: true }).toFile(path.join(OUT, name));
  console.log(name, rect, `${w}x${h}`);
}

(async () => {
  await sharp(Buffer.from(BG_SVG)).png().toFile(path.join(OUT, 'bg.png'));

  // Title art: 1150x1080 box at x 770, cover at 60% 50%, scale 1.2 about 70% 25%, then
  // clipped by the slide. Visible on the slide as x 609..1920, fading in over its first 483 px.
  {
    const x0 = 609, w = 1920 - x0, h = 1080;
    const src = { left: 462, top: 45, width: 1093, height: 900 };
    const fade = Buffer.alloc(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) fade[y * w + x] = Math.round(255 * Math.min(1, x / 483));
    // sharp runs joinChannel before resize within one pipeline, so resize in a pipeline of its own.
    const sized = await sharp(path.join(SRC, 'open3d.jpg')).extract(src).resize(w, h, { fit: 'fill' }).removeAlpha().toBuffer();
    const photo = await sharp(sized).joinChannel(fade, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer();
    const patch = await sharp(path.join(OUT, 'bg.png')).extract({ left: x0, top: 0, width: w, height: h }).toBuffer();
    await sharp(patch).composite([{ input: photo }]).jpeg({ quality: 88, mozjpeg: true }).toFile(path.join(OUT, 'title-art.jpg'));
    console.log('title-art.jpg', src, `${w}x${h}`);
  }

  // Solution slide batteries: 785 x 181 boxes (the PDF used 196, which ran into the footer;
  // these end level with the state rows). Cropped at 1:1 around the battery so the whole percentage shows, which the
  // PDF's 1.35x zoom cut off.
  const batt = { rect: { left: 8, top: 168, width: 785, height: 181 } };
  await framed('batt-85.jpg', 'batt86.jpg', { x: 1015, y: 398, w: 785, h: 181 }, batt, 20);
  await framed('batt-53.jpg', 'batt52.jpg', { x: 1015, y: 601, w: 785, h: 181 }, batt, 20);
  await framed('batt-81.jpg', 'batt80.jpg', { x: 1015, y: 804, w: 785, h: 181 }, batt, 20);

  await framed('portrait.jpg', 'real_grip.jpg', { x: 120, y: 292, w: 380, h: 676 }, {}, 26);
  await framed('impact.jpg', 'ready.jpg', { x: 1040, y: 404, w: 760, h: 560 }, { px: 0.72, py: 0.4 }, 26);
  await framed('future.jpg', 'explain.jpg', { x: 1040, y: 414, w: 760, h: 560 }, { px: 0.75, py: 0.3 }, 26);
})();
