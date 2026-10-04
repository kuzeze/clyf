// CLYF promo compositor: draws each output frame (1920x1080 @ 30 fps) from the edit decision
// list, real footage frames, the 3D scenes and 2D graphics, then uploads it to server.py.
import { renderOpen, renderExplain, renderPipeline, renderOutro, project, anchors } from './scenes3d.js';

const W = 1920, H = 1080, FPS = 30, DURATION = 60;
const out = document.getElementById('out');
const ctx = out.getContext('2d');
const C = { bg: '#070a0d', ink: '#eef3f5', muted: '#8d9aa2', mint: '#5cffc7', amber: '#ffb547', pink: '#ff4f8b', cyan: '#4fd8ff', red: '#ff5a6a' };
const DISPLAY = '"Big Shoulders Display", Impact, sans-serif', BODY = '"Commissioner", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const easeOut = x => x <= 0 ? 0 : x >= 1 ? 1 : 1 - (1 - x) ** 3;
const clamp01 = x => Math.max(0, Math.min(1, x));
const win = (t, a, b, fade = 0.3) => clamp01(Math.min((t - a) / fade, (b - t) / fade)); // 0..1 in [a,b] with fades

// ---------- edit decision list: output seconds -> source seconds ----------
const SEGS = [
  { t0: 0, t1: 4, scene: 'open' },
  { t0: 4, t1: 18.45, s0: 0.30, right: 'intro' },
  { t0: 18.45, t1: 26.57, s0: 14.80, right: 'demo' },
  { t0: 26.57, t1: 30.47, s0: 24.20, right: 'demo' },
  { t0: 30.47, t1: 34.35, s0: 28.97, right: 'demo' },
  { t0: 34.35, t1: 42.65, s0: 33.80, right: 'demo' },
  { t0: 42.65, t1: 44.31, s0: 42.10, rate: 4, right: 'demo', badge: true },
  { t0: 44.31, t1: 48.0, s0: 48.74, right: 'demo' },
  { t0: 48, t1: 54, scene: 'pipeline' },
  { t0: 54, t1: 55.65, s0: 56.60, right: 'thanks' },
  { t0: 55.65, t1: 60, scene: 'outro' },
];
const segAt = t => SEGS.find(s => t >= s.t0 && t < s.t1) || SEGS[SEGS.length - 1];
const srcTime = (s, t) => s.s0 + (t - s.t0) * (s.rate || 1);

// Captions: the speaker's own words, lightly tidied; times are where he says them in the cut.
const CAPS = [
  [4.0, 5.4, 'Hi, my name is Jeremy Li,'],
  [5.4, 9.95, 'and this is my project: an intelligent sleeve called CLYF, for climbers.'],
  [9.95, 11.85, "We don't really know how long we should be resting."],
  [11.85, 18.4, 'So I made a sleeve that tracks the muscle signals and muscle pressure in your forearm.'],
  [18.45, 21.05, 'As you can see, this is like a battery.'],
  [21.05, 26.55, 'When you start climbing or gripping, the battery decreases.'],
  [26.6, 30.45, 'After a few seconds you get tired, so you come down off the wall,'],
  [30.47, 34.33, 'take your hands off, and the battery charges back.'],
  [34.4, 41.35, 'Once it reaches a baseline designed for your body, say 80 here,'],
  [41.35, 42.6, "let's just wait."],
  [44.33, 47.98, "Okay, now it's back, so you should be climbing again."],
  [54.05, 55.6, 'Thank you!'],
];
// Dashboard state as the footage shows it (source seconds), for the status chip.
function chipFor(s) {
  if (s < 20.3) return ['FULLY CHARGED', C.mint];
  if (s < 28.6) return ['GRIPPING · DRAINING', C.amber];  // battery peaks at 86 near s=20.3, then drains
  if (s < 47.8) return ['RESTING · RECHARGING', C.cyan];
  if (s < 50.4) return ['READY · CLIMB ON', C.mint];
  return ['CLIMBING AGAIN', C.amber];
}
const READY_AT = 44.1; // output time the battery turns ready (source ≈ 47.8 s, inside the 4x timelapse)

// ---------- image cache ----------
const cache = new Map();
function img(src) {
  if (!cache.has(src)) {
    const i = new Image(); i.src = src;
    cache.set(src, i.decode().then(() => i).catch(() => null));
    if (cache.size > 40) cache.delete(cache.keys().next().value);
  }
  return cache.get(src);
}
const pad4 = n => String(n).padStart(4, '0');
const portraitSrc = s => `../src/p/p_${pad4(Math.max(1, Math.min(1759, Math.round(s * FPS) + 1)))}.jpg`;
const cropSrc = s => (s < 16 || s > 53.4) ? null : `../src/c2/c_${pad4(Math.max(1, Math.min(1125, Math.round((s - 16) * FPS) + 1)))}.jpg`;

// ---------- drawing helpers ----------
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function text(str, x, y, { font, color = C.ink, align = 'left', base = 'alphabetic', spacing = 0, alpha = 1, shadow = 0 }) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base;
  ctx.letterSpacing = `${spacing}px`;
  if (shadow) { ctx.shadowColor = color; ctx.shadowBlur = shadow; }
  ctx.fillText(str, x, y); ctx.restore();
}
function wrap(str, font, maxW) {
  ctx.font = font; const words = str.split(' '); const lines = []; let line = '';
  for (const w of words) { const t = line ? `${line} ${w}` : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}
function background(t) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  // two slow glows and a faint climbing-wall grid of T-nut holes
  for (const [cx, cy, col, ph] of [[1500, 260, 'rgba(92,255,199,0.10)', 0], [300, 900, 'rgba(255,79,139,0.08)', 2]]) {
    const x = cx + Math.sin(t * 0.25 + ph) * 120, y = cy + Math.cos(t * 0.2 + ph) * 80;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 700); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  for (let x = 40; x < W; x += 80) for (let y = 40; y < H; y += 80) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill(); }
}
function caption(t) {
  const c = CAPS.find(([a, b]) => t >= a && t < b);
  if (!c) return;
  const a = win(t, c[0], c[1], 0.18);
  const font = `600 40px ${BODY}`;
  const lines = wrap(c[2], font, 1040);
  const y0 = 1000 - (lines.length - 1) * 52;
  lines.forEach((l, i) => text(l, 1296, y0 + i * 52, { font, align: 'center', alpha: a }));
}
function chip(label, color, x, y, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.font = `700 22px ${MONO}`; ctx.letterSpacing = '3px';
  const w = ctx.measureText(label).width + 44;
  rr(x - w, y, w, 46, 23); ctx.fillStyle = color + '26'; ctx.fill(); ctx.strokeStyle = color + '88'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x - w + 22, y + 23, 6, 0, Math.PI * 2); ctx.fill();
  ctx.textBaseline = 'middle'; ctx.fillText(label, x - w + 36, y + 24);
  ctx.restore();
}

// ---------- layout pieces ----------
const PANEL = { x: 96, y: 28, w: 576, h: 1024 };
async function portraitPanel(s, t, badge) {
  const im = await img(portraitSrc(s));
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40;
  rr(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 28); ctx.fillStyle = '#000'; ctx.fill();
  ctx.restore();
  ctx.save(); rr(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 28); ctx.clip();
  if (im) ctx.drawImage(im, PANEL.x, PANEL.y, PANEL.w, PANEL.h);
  const g = ctx.createLinearGradient(0, PANEL.y, 0, PANEL.y + 140); g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(PANEL.x, PANEL.y, PANEL.w, 140);
  ctx.restore();
  ctx.save(); rr(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 28); ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  // "real footage" tag
  ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(PANEL.x + 34, PANEL.y + 40, 7, 0, Math.PI * 2); ctx.fill();
  text('REAL FOOTAGE', PANEL.x + 52, PANEL.y + 48, { font: `700 20px ${MONO}`, spacing: 3, color: '#fff' });
  if (badge) {
    const pulse = 0.75 + 0.25 * Math.sin(t * 12);
    ctx.save(); ctx.globalAlpha = pulse;
    rr(PANEL.x + PANEL.w - 150, PANEL.y + 22, 126, 52, 26); ctx.fillStyle = C.pink; ctx.fill();
    ctx.fillStyle = '#fff';
    for (const dx of [0, 18]) { ctx.beginPath(); ctx.moveTo(PANEL.x + PANEL.w - 132 + dx, PANEL.y + 34); ctx.lineTo(PANEL.x + PANEL.w - 116 + dx, PANEL.y + 48); ctx.lineTo(PANEL.x + PANEL.w - 132 + dx, PANEL.y + 62); ctx.fill(); }
    text('4×', PANEL.x + PANEL.w - 78, PANEL.y + 59, { font: `900 38px ${DISPLAY}`, color: '#fff' });
    ctx.restore();
  }
}

function introRight(s, t) {
  // title block, then the question, then the 3D explainer
  if (s < 6.25) {
    const k = t - 4.0, a = win(t, 4.0, 9.95, 0.25);
    ctx.save(); ctx.globalAlpha = a;
    text('BIGRED//HACKS 2026 · THEME: NAVIGATION', 760, 260, { font: `700 22px ${MONO}`, spacing: 4, color: C.mint, alpha: easeOut(k / 0.5) });
    const sc = 1 + 0.04 * (1 - easeOut(k / 0.8));
    ctx.save(); ctx.translate(752, 520); ctx.scale(sc, sc);
    text('CLYF', 0, 0, { font: `900 300px ${DISPLAY}`, alpha: easeOut(k / 0.6), shadow: 0 });
    ctx.restore();
    text('A smart sleeve that tells climbers', 760, 600, { font: `600 46px ${BODY}`, alpha: easeOut((k - 0.4) / 0.6) });
    text('when to climb again.', 760, 658, { font: `600 46px ${BODY}`, color: C.mint, alpha: easeOut((k - 0.6) / 0.6) });
    ['sEMG', 'PRESSURE', 'ARDUINO UNO Q'].forEach((l, i) => {
      const ai = easeOut((k - 1.0 - i * 0.18) / 0.4);
      ctx.save(); ctx.globalAlpha *= ai; ctx.font = `700 22px ${MONO}`; ctx.letterSpacing = '3px';
      const x = 760 + [0, 150, 335][i], wdt = ctx.measureText(l).width + 36;
      rr(x, 712, wdt, 48, 10); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = C.ink; ctx.textBaseline = 'middle'; ctx.fillText(l, x + 18, 737); ctx.restore();
    });
    ctx.restore();
  } else if (s < 8.15) {
    const k = t - 9.95, a = win(t, 9.95, 11.85, 0.2);
    const words = ['HOW', 'LONG', 'SHOULD', 'I', 'REST', '?'];
    let x = 760; ctx.save(); ctx.globalAlpha = a;
    words.forEach((wd, i) => {
      const ai = easeOut((k - i * 0.12) / 0.3);
      const font = `900 ${wd === '?' ? 200 : 150}px ${DISPLAY}`;
      ctx.font = font; const wdt = ctx.measureText(wd).width;
      const lineBreak = i === 3; if (lineBreak) x = 760;
      const y = i < 3 ? 470 : 640;
      text(wd, x, y + (1 - ai) * 40, { font, color: wd === '?' || wd === 'REST' ? C.pink : C.ink, alpha: ai });
      x += wdt + 28;
    });
    ctx.restore();
  } else {
    explainPanel(t - 11.85);
  }
}

const EXP = { x: 736, y: 60, w: 1120, h: 760 };
function explainPanel(u) {
  const a = easeOut(u / 0.4);
  const c3 = renderExplain(u, EXP.w, EXP.h);
  ctx.save(); ctx.globalAlpha = a;
  rr(EXP.x, EXP.y, EXP.w, EXP.h, 24); ctx.save(); ctx.clip(); ctx.drawImage(c3, EXP.x, EXP.y); ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 2; ctx.stroke();
  // labels with leader lines, anchored to the 3D objects
  // labels sit in the panel's corners; a leader line runs to the part in 3D
  const labels = [
    [anchors.mid(), 'sEMG ELECTRODES', 'on the forearm flexors', 0.4, [40, 70, 'left']],
    [anchors.myoware(), 'MYOWARE 2.0', 'muscle sensor', 1.4, [40, 560, 'left']],
    [anchors.board(), 'ARDUINO UNO Q', 'samples at 100 Hz', 2.4, [EXP.w - 40, 70, 'right']],
  ];
  for (const [v, title, sub, at, [lx0, ly0, align]] of labels) {
    const la = easeOut((u - at) / 0.4); if (la <= 0) continue;
    const p = project(v); const x = EXP.x + p.x, y = EXP.y + p.y;
    const lx = EXP.x + lx0, ly = EXP.y + ly0;
    ctx.save(); ctx.globalAlpha *= la; ctx.strokeStyle = C.mint; ctx.lineWidth = 2;
    ctx.font = `700 26px ${MONO}`; ctx.letterSpacing = '2px';
    const tw = ctx.measureText(title).width;
    // leave from the label edge that faces the part, so the line never crosses the text
    const ex = align === 'left' ? lx + tw / 2 : lx - tw / 2, ey = y < ly ? ly - 32 : ly + 42;
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = C.mint; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
    text(title, lx, ly, { font: `700 26px ${MONO}`, spacing: 2, align });
    text(sub, lx, ly + 30, { font: `500 22px ${BODY}`, color: C.muted, align });
    ctx.restore();
  }
  // sEMG trace strip along the bottom: illustrative bursts
  const sx = EXP.x + 40, sy = EXP.y + EXP.h - 70, sw = EXP.w - 80;
  ctx.strokeStyle = 'rgba(92,255,199,0.9)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i <= 600; i++) {
    const x = i / 600, tt = u * 1.2 + x * 3;
    const env = 0.15 + 0.85 * Math.max(0, Math.sin(tt * 1.6)) ** 3;
    const v = Math.sin(i * 1.7 + u * 40) * Math.sin(i * 0.53 + u * 23) * env;
    i ? ctx.lineTo(sx + x * sw, sy + v * 34) : ctx.moveTo(sx + x * sw, sy + v * 34);
  }
  ctx.stroke();
  text('sEMG · ILLUSTRATION', EXP.x + 40, EXP.y + EXP.h - 18, { font: `700 18px ${MONO}`, spacing: 3, color: C.muted });
  ctx.restore();
}

const ZOOM = { x: 752, y: 150, w: 1088, h: 612 };
async function demoRight(s, t) {
  const [label, color] = chipFor(s);
  text('LIVE DASHBOARD', ZOOM.x, 118, { font: `700 24px ${MONO}`, spacing: 4, color: C.muted });
  chip(label, color, ZOOM.x + ZOOM.w, 84);
  ctx.save(); rr(ZOOM.x, ZOOM.y, ZOOM.w, ZOOM.h, 24); ctx.fillStyle = '#0c1115'; ctx.fill(); ctx.restore();
  const src = cropSrc(s);
  const a = src ? clamp01((s - 16.6) / 0.5) : 0;
  if (src && a > 0) {
    const im = await img(src);
    ctx.save(); rr(ZOOM.x, ZOOM.y, ZOOM.w, ZOOM.h, 24); ctx.clip(); ctx.globalAlpha = a;
    if (im) ctx.drawImage(im, ZOOM.x, ZOOM.y, ZOOM.w, ZOOM.h);
    // Darken the right third: the dashboard's own headline sits there and, in this build, it kept
    // saying "draining" while the battery recovered. The battery itself is what the zoom is for.
    const fx = ZOOM.x + ZOOM.w * 0.6, fw = ZOOM.w * 0.16;
    const g = ctx.createLinearGradient(fx, 0, fx + fw, 0); g.addColorStop(0, 'rgba(12,17,21,0)'); g.addColorStop(1, 'rgba(12,17,21,0.97)');
    ctx.fillStyle = g; ctx.fillRect(fx, ZOOM.y, fw, ZOOM.h);
    ctx.fillStyle = 'rgba(12,17,21,0.97)'; ctx.fillRect(fx + fw, ZOOM.y, ZOOM.x + ZOOM.w - fx - fw, ZOOM.h);
    ctx.restore();
  } else {
    text('Battery: real readings from the sleeve', ZOOM.x + ZOOM.w / 2, ZOOM.y + ZOOM.h / 2, { font: `600 34px ${BODY}`, color: C.muted, align: 'center' });
  }
  ctx.save(); rr(ZOOM.x, ZOOM.y, ZOOM.w, ZOOM.h, 24); ctx.strokeStyle = color + '66'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
  text('Estimated forearm reserve · zoomed from the footage', ZOOM.x + 8, ZOOM.y + ZOOM.h + 34, { font: `500 20px ${BODY}`, color: C.muted });
  // the drain arrow while gripping
  if (s >= 20.3 && s < 28.6) {
    const bob = Math.sin(t * 6) * 8;
    ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = C.amber;
    const ax = ZOOM.x + ZOOM.w - 150, ay = ZOOM.y + 250 + bob;
    ctx.beginPath(); ctx.moveTo(ax - 30, ay); ctx.lineTo(ax + 30, ay); ctx.lineTo(ax, ay + 44); ctx.fill();
    ctx.fillRect(ax - 11, ay - 60, 22, 62); ctx.restore();
  }
  if (s >= 28.97 && s < 47.8) {
    const bob = Math.sin(t * 6) * 8;
    ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = C.cyan;
    const ax = ZOOM.x + ZOOM.w - 150, ay = ZOOM.y + 330 + bob;
    ctx.beginPath(); ctx.moveTo(ax - 30, ay); ctx.lineTo(ax + 30, ay); ctx.lineTo(ax, ay - 44); ctx.fill();
    ctx.fillRect(ax - 11, ay - 2, 22, 62); ctx.restore();
  }
  // READY burst
  const r = t - READY_AT;
  if (r > 0 && r < 2.2) {
    const cx = ZOOM.x + ZOOM.w / 2, cy = ZOOM.y + ZOOM.h / 2;
    for (const [d, w] of [[0, 10], [0.18, 6]]) {
      const k = clamp01((r - d) / 1.0); if (k <= 0) continue;
      ctx.save(); ctx.globalAlpha = (1 - k) * 0.9; ctx.strokeStyle = C.mint; ctx.lineWidth = w; ctx.shadowColor = C.mint; ctx.shadowBlur = 40;
      ctx.beginPath(); ctx.arc(cx, cy, 80 + k * 620, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    const ta = win(t, READY_AT, READY_AT + 2.2, 0.25);
    const sc = 0.9 + 0.1 * easeOut(r / 0.35);
    ctx.save(); ctx.globalAlpha = ta; ctx.translate(cx, cy + 60); ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(7,10,13,0.55)'; rr(-330, -150, 660, 210, 30); ctx.fill();
    text('READY', 0, 0, { font: `900 190px ${DISPLAY}`, align: 'center', color: C.mint, shadow: 40 });
    text('CLIMB ON', 0, 48, { font: `700 30px ${MONO}`, align: 'center', spacing: 10, color: '#fff' });
    ctx.restore();
  }
}

function thanksRight(t) {
  const k = t - 54;
  text('THANK YOU', 760, 520, { font: `900 170px ${DISPLAY}`, alpha: easeOut(k / 0.4) });
  text('CLYF · forearm battery for climbers', 764, 590, { font: `600 38px ${BODY}`, color: C.mint, alpha: easeOut((k - 0.2) / 0.4) });
}

// ---------- full-frame 3D scenes with their 2D titles ----------
function openFrame(t) {
  ctx.drawImage(renderOpen(t), 0, 0);
  // battery % next to the 3D battery
  const p = project(anchors.battery());
  const lvl = t < 0.5 ? 1 : t < 2.0 ? 1 - 0.78 * ease((t - 0.5) / 1.5) : t < 2.9 ? 0.22 + 0.78 * ease((t - 2.0) / 0.9) : 1;
  if (t < 2.95) text(`${Math.round(lvl * 100)}%`, p.x + 300, p.y + 30, { font: `900 90px ${DISPLAY}`, align: 'center', color: lvl >= 0.8 ? C.mint : lvl >= 0.4 ? C.amber : C.red, shadow: 24 });
  if (t < 1.0) text('YOUR FOREARM HAS A BATTERY.', 960, 1000, { font: `700 34px ${MONO}`, align: 'center', spacing: 8, alpha: win(t, 0.15, 1.0, 0.25) });
  if (t >= 1.0 && t < 2.95) text(t < 2.0 ? 'GRIP — IT DRAINS.' : 'REST — IT RECHARGES.', 960, 1000, { font: `700 34px ${MONO}`, align: 'center', spacing: 8, color: t < 2.0 ? C.amber : C.mint, alpha: win(t, t < 2.0 ? 1.0 : 2.0, t < 2.0 ? 2.0 : 2.95, 0.2) });
  if (t >= 2.9) {
    const k = t - 2.9;
    ctx.save(); ctx.fillStyle = `rgba(7,10,13,${0.72 * easeOut(k / 0.3)})`; ctx.fillRect(0, 0, W, H); ctx.restore();
    if (k < 0.12) { ctx.save(); ctx.globalAlpha = 1 - k / 0.12; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    const sc = 1.25 - 0.25 * easeOut(k / 0.35);
    ctx.save(); ctx.translate(960, 600); ctx.scale(sc, sc);
    text('CLYF', 0, 0, { font: `900 360px ${DISPLAY}`, align: 'center', shadow: 30, color: '#fff' });
    ctx.restore();
    text('KNOW WHEN TO CLIMB AGAIN', 960, 700, { font: `700 34px ${MONO}`, align: 'center', spacing: 10, color: C.mint, alpha: easeOut((k - 0.2) / 0.4) });
  }
  if (t > 3.75) { ctx.save(); ctx.fillStyle = `rgba(7,10,13,${(t - 3.75) / 0.25})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}

function pipelineFrame(t) {
  const u = t - 48;
  ctx.drawImage(renderPipeline(u), 0, 0);
  text('HOW IT WORKS', 96, 120, { font: `700 26px ${MONO}`, spacing: 6, color: C.mint, alpha: easeOut(u / 0.4) });
  const steps = [
    [anchors.arm(), '01 · SENSE', 'Surface EMG on the forearm flexors', 0.3],
    [anchors.board(), '02 · SAMPLE', 'Arduino UNO Q · 100 Hz · 0 dropped samples', 1.9],
    [anchors.battery(), '03 · NAVIGATE', 'Forearm battery · ready at 80%', 3.5],
  ];
  for (const [v, title, sub, at] of steps) {
    const a = easeOut((u - at) / 0.4) * (u > 5.6 ? 1 - (u - 5.6) / 0.4 : 1); if (a <= 0) continue;
    const p = project(v); if (p.x < -200 || p.x > W + 200) continue;
    const x = p.x, y = p.y - 230;
    text(title, x, y, { font: `900 72px ${DISPLAY}`, align: 'center', alpha: a });
    text(sub, x, y + 46, { font: `600 30px ${BODY}`, align: 'center', color: C.muted, alpha: a });
  }
  if (u < 0.3) { ctx.save(); ctx.fillStyle = `rgba(7,10,13,${1 - u / 0.3})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}

function outroFrame(t) {
  const u = t - 55.65;
  ctx.drawImage(renderOutro(u), 0, 0);
  const k = u - 1.9;
  if (k > 0) {
    text('CLYF', 960, 860, { font: `900 200px ${DISPLAY}`, align: 'center', alpha: easeOut(k / 0.4), shadow: 20 });
    text('KNOW WHEN TO CLIMB AGAIN', 960, 925, { font: `700 30px ${MONO}`, align: 'center', spacing: 10, color: C.mint, alpha: easeOut((k - 0.2) / 0.4) });
    text('Built at BigRed//Hacks 2026 · Arduino UNO Q · MyoWare 2.0', 960, 985, { font: `500 24px ${BODY}`, align: 'center', color: C.muted, alpha: easeOut((k - 0.4) / 0.4) });
  }
  if (u < 0.3) { ctx.save(); ctx.fillStyle = `rgba(7,10,13,${1 - u / 0.3})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  if (t > 59.4) { ctx.save(); ctx.fillStyle = `rgba(0,0,0,${(t - 59.4) / 0.6})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}

// ---------- one frame ----------
export async function drawFrame(t) {
  const s = segAt(t);
  if (s.scene === 'open') return openFrame(t);
  if (s.scene === 'pipeline') return pipelineFrame(t);
  if (s.scene === 'outro') return outroFrame(t);
  background(t);
  const st = srcTime(s, t);
  await portraitPanel(st, t, s.badge);
  if (s.right === 'intro') introRight(st, t);
  else if (s.right === 'demo') await demoRight(st, t);
  else if (s.right === 'thanks') thanksRight(t);
  caption(t);
  // short dip at each cut between clips
  const edge = Math.min(t - s.t0, s.t1 - t);
  if (edge < 0.08 && s.t0 > 4.01) { ctx.save(); ctx.fillStyle = `rgba(7,10,13,${(0.08 - edge) / 0.08 * 0.5})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}

// ---------- driver ----------
const status = document.getElementById('status');
const log = msg => fetch('/log', { method: 'POST', body: msg });
async function ready() {
  await Promise.all([`900 100px ${DISPLAY}`, `600 40px ${BODY}`, `700 20px ${MONO}`].map(f => document.fonts.load(f)));
}
async function renderRange(a, b) {
  for (let n = a; n < b; n++) {
    await drawFrame(n / FPS);
    const blob = await new Promise(r => out.toBlob(r, 'image/jpeg', 0.93));
    await fetch(`/frame/${n}`, { method: 'POST', body: blob });
    if (n % 30 === 0) { status.textContent = `frame ${n}/${b}`; log(`frame ${n}`); }
  }
  status.textContent = `done ${a}-${b}`; await log(`done ${a}-${b}`);
}
window.drawFrame = drawFrame;
window.renderRange = renderRange;
window.renderAll = () => renderRange(0, FPS * DURATION);
document.getElementById('show').onclick = () => drawFrame(+document.getElementById('t').value);
ready().then(() => { status.textContent = 'ready'; window.compositorReady = true; });
window.addEventListener('error', e => log(`ERROR ${e.message} ${e.filename}:${e.lineno}`));
window.addEventListener('unhandledrejection', e => log(`REJECT ${e.reason?.stack || e.reason}`));
