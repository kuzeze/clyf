// Builds CLYF-deck.pptx: the nine slides of deck.html as native, editable objects, for import
// into Google Slides (or PowerPoint / Keynote). Every position was measured from deck.html in
// Chrome at 1920 x 1080 px and is written here in those px; px() converts at 192 px per inch
// onto a 10 x 5.625 in slide, and pt() turns CSS font px into points.
//
// Run pptx_images.js first; it writes the cropped images and the background into pptx-assets/.
//   NODE_PATH=<dir with pptxgenjs and sharp> node pptx_images.js && node build_pptx.js
//
// The demo chart is drawn from shapes rather than as a chart object: Google Slides turns an
// imported chart into a flat picture, while shapes stay editable there.
const pptxgen = require('pptxgenjs');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'CLYF-deck.pptx');
const asset = (f) => path.join(__dirname, 'pptx-assets', f);

const px = (v) => +(v / 192).toFixed(4);
const pt = (v) => +(v * 0.375).toFixed(2);

const HEAD = 'Big Shoulders Display', BODY = 'Commissioner', MONO = 'JetBrains Mono';
// Natural line height of each font (hhea ascent + descent over units per em). CSS line-heights
// divide by these to become PowerPoint line-spacing multiples.
const NATURAL = { [HEAD]: 1.197, [BODY]: 1.223, [MONO]: 1.32 };
const lh = (font, css) => +(css / NATURAL[font]).toFixed(3);

// Dark theme: dk1 holds the light ink and lt1 the near-black background, so that a new text box
// or slide in Google Slides comes out light-on-dark without restyling.
const THEME = {
  name: 'CLYF',
  colors: {
    dk1: 'EEF3F5', lt1: '070A0D', dk2: 'C4CED3', lt2: '0F151A',
    accent1: '5CFFC7', accent2: 'FFB547', accent3: '4FD8FF', accent4: 'FF4F8B', accent5: '8D9AA2', accent6: '1E2A31',
    hlink: '4FD8FF', folHlink: 'FF4F8B',
  },
};
const FOOT_GREY = '56636B';

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.title = 'CLYF';
pres.author = 'Jeremy Li';
pres.subject = 'BigRed//Hacks 2026';
pres.theme = { headFontFace: HEAD, bodyFontFace: BODY };

const C = pres.SchemeColor;
const INK = C.text1, SOFT = C.text2, BG = C.background1, PANEL = C.background2;
const MINT = C.accent1, AMBER = C.accent2, CYAN = C.accent3, PINK = C.accent4, MUTED = C.accent5, LINE = C.accent6;
const S = pres.shapes;

// ---------- layouts ----------
// Text boxes are sized for each font's natural first line even where the CSS line-height is
// tighter: Keynote otherwise shrinks the text until that line fits. Keynote also places the
// first baseline at the full ascent whatever the line spacing, so the slide title sits 8 px
// above its measured 163 (exact for Keynote would be 14 px; 8 hedges renderers that do tighten
// the first line), and the one-line CLYF names use plain spacing, moved up by the half-leading.
function ph(name, type, b, st) {
  return {
    placeholder: {
      options: {
        name, type, x: px(b.x), y: px(b.y), w: px(b.w), h: px(b.h),
        fontFace: st.font, fontSize: pt(st.size), color: st.color, bold: !!st.bold,
        align: st.align || 'left', valign: st.valign || 'top', margin: 0,
        lineSpacingMultiple: st.lh, ...(st.cs ? { charSpacing: pt(st.cs) } : {}),
      },
      text: '',
    },
  };
}
const EYEBROW = { font: MONO, size: 24, bold: true, color: MINT, cs: 5, lh: 1 };
const H2 = { font: HEAD, size: 104, bold: true, color: INK, lh: lh(HEAD, 0.92) };
const FOOT = { font: MONO, size: 20, color: FOOT_GREY, cs: 3, lh: 1 };

pres.defineSlideMaster({
  title: 'CLYF Title',
  background: { path: asset('bg.png') },
  objects: [
    ph('eyebrow', 'body', { x: 120, y: 110, w: 1100, h: 34 }, EYEBROW),
    ph('title', 'title', { x: 120, y: 205, w: 1100, h: 470 }, { font: HEAD, size: 380, bold: true, color: INK, lh: 1 }),
    ph('tagline', 'body', { x: 120, y: 625, w: 900, h: 135 }, { font: BODY, size: 52, bold: true, color: INK, lh: lh(BODY, 1.2) }),
  ],
});

pres.defineSlideMaster({
  title: 'CLYF Content',
  background: { path: asset('bg.png') },
  objects: [
    ph('eyebrow', 'body', { x: 120, y: 110, w: 1680, h: 34 }, EYEBROW),
    ph('title', 'title', { x: 120, y: 155, w: 1680, h: 230 }, H2),
    ph('foot', 'body', { x: 120, y: 1000, w: 1300, h: 28 }, FOOT),
  ],
  slideNumber: { x: px(1600), y: px(1000), w: px(200), h: px(28), fontFace: MONO, fontSize: pt(20), color: FOOT_GREY, align: 'right', margin: 0 },
});

pres.defineSlideMaster({
  title: 'CLYF Closing',
  background: { path: asset('bg.png') },
  objects: [
    ph('eyebrow', 'body', { x: 120, y: 314, w: 1680, h: 34 }, { ...EYEBROW, align: 'center' }),
    ph('title', 'title', { x: 120, y: 301, w: 1680, h: 370 }, { font: HEAD, size: 300, bold: true, color: INK, align: 'center', lh: 1 }),
    ph('tagline', 'body', { x: 120, y: 615, w: 1680, h: 70 }, { font: BODY, size: 52, bold: true, color: INK, align: 'center', lh: lh(BODY, 1.2) }),
    ph('lede', 'body', { x: 120, y: 718, w: 1680, h: 52 }, { font: BODY, size: 34, color: MUTED, align: 'center', lh: lh(BODY, 1.4) }),
  ],
});

// ---------- helpers ----------
// Free text box at a px box. `st` carries font, size (px), color, bold, align, valign, lh, cs.
function text(slide, content, b, st, extra = {}) {
  slide.addText(content, {
    x: px(b.x), y: px(b.y), w: px(b.w), h: px(b.h), margin: 0, isTextBox: true,
    fontFace: st.font, fontSize: pt(st.size), color: st.color, bold: !!st.bold,
    align: st.align || 'left', valign: st.valign || 'top', lineSpacingMultiple: st.lh ?? 1,
    ...(st.cs ? { charSpacing: pt(st.cs) } : {}), ...extra,
  });
}

// Rounded panel that carries its own text, so the card and its words move together.
function card(slide, content, b, o = {}) {
  const pad = o.pad || [36, 38, 4, 38]; // top right bottom left, px, border included; text is top-anchored
  slide.addText(content, {
    shape: S.ROUNDED_RECTANGLE, x: px(b.x), y: px(b.y), w: px(b.w), h: px(b.h), rectRadius: px(o.radius ?? 24),
    fill: { color: o.fill || PANEL }, line: { color: o.line || LINE, width: pt(o.lineW ?? 2), ...(o.lineAlpha ? { transparency: o.lineAlpha } : {}) },
    margin: pad.map(pt), valign: o.valign || 'top', align: 'left', objectName: o.name,
  });
}

// Outline drawn over an image, so the frame colour stays editable.
function frame(slide, b, color, width, radius, name) {
  const inset = width / 2;
  slide.addShape(S.ROUNDED_RECTANGLE, {
    x: px(b.x + inset), y: px(b.y + inset), w: px(b.w - width), h: px(b.h - width), rectRadius: px(radius - inset),
    line: { color, width: pt(width) }, objectName: name,
  });
}

// Status chip: outlined pill with a dot.
function chip(slide, label, b, color) {
  slide.addText(`● ${label}`, {
    shape: S.ROUNDED_RECTANGLE, x: px(b.x), y: px(b.y), w: px(b.w), h: px(b.h), rectRadius: px(b.h / 2),
    line: { color, width: pt(2) }, margin: 0, align: 'center', valign: 'middle',
    fontFace: MONO, fontSize: pt(22), bold: true, color, charSpacing: pt(3), objectName: `Chip ${label}`,
  });
}

const run = (t, o = {}) => ({ text: t, options: o });
const para = (t, o = {}) => ({ text: t, options: { breakLine: true, ...o } });

// ---------- 1 · Title ----------
pres.addSection({ title: 'Opening' });
{
  const s = pres.addSlide({ masterName: 'CLYF Title', sectionTitle: 'Opening' });
  s.addImage({ path: asset('title-art.jpg'), x: px(609), y: 0, w: px(1311), h: px(1080), altText: 'Rendered forearm sleeve with its battery at 80%', objectName: 'Title art' });
  s.addText('BIGRED//HACKS 2026 · THEME: NAVIGATION', { placeholder: 'eyebrow' });
  s.addText('CLYF', { placeholder: 'title' });
  s.addText([run('A forearm sleeve that tells climbers '), run('when to climb again.', { color: MINT })], { placeholder: 'tagline' });
  const label = { font: MONO, size: 20, bold: true, color: MUTED, cs: 4 };
  const value = { font: BODY, size: 30, color: INK };
  text(s, 'TEAM', { x: 120, y: 820, w: 160, h: 28 }, label);
  text(s, 'Jeremy Li', { x: 120, y: 856, w: 160, h: 40 }, value);
  text(s, 'BUILT WITH', { x: 304, y: 820, w: 600, h: 28 }, label);
  text(s, 'Arduino UNO Q · MyoWare 2.0 sEMG', { x: 304, y: 856, w: 600, h: 40 }, value);
}

// ---------- 2 · Problem ----------
pres.addSection({ title: 'Problem and product' });
{
  const s = pres.addSlide({ masterName: 'CLYF Content', sectionTitle: 'Problem and product' });
  s.addText('THE PROBLEM', { placeholder: 'eyebrow' });
  s.addText('CLIMBERS GUESS\nHOW LONG TO REST.', { placeholder: 'title' });
  const cards = [
    ['THE PUMP', AMBER, 'On a hard route the forearms give out first. Grip fades, and the climb ends.'],
    ['THE SHAKE-OUT', CYAN, 'Hanging off a jug mid-route, you rest with no idea when you have actually recovered.'],
    ['THE COST', PINK, 'Rest too little and you fall off the next move. Rest too long and you burn the session.'],
  ];
  cards.forEach(([h, color, body], i) => card(s, [
    para(h, { fontFace: HEAD, fontSize: pt(52), bold: true, color, lineSpacingMultiple: lh(HEAD, 1), paraSpaceAfter: pt(20) }),
    run(body, { fontFace: BODY, fontSize: pt(29), color: SOFT, lineSpacingMultiple: lh(BODY, 1.45) }),
  ], { x: 120 + i * 572, y: 434, w: 536, h: 270 }, { name: `Card ${h}` }));
  text(s, [run('Maps give drivers an ETA. Climbers get '), run('guesswork.', { color: PINK })],
    { x: 120, y: 774, w: 1680, h: 60 }, { font: BODY, size: 44, bold: true, color: INK, lh: lh(BODY, 1.23) });
  s.addText('CLYF', { placeholder: 'foot' });
}

// ---------- 3 · Solution ----------
{
  const s = pres.addSlide({ masterName: 'CLYF Content', sectionTitle: 'Problem and product' });
  s.addText('OUR SOLUTION', { placeholder: 'eyebrow' });
  s.addText([run('A FOREARM BATTERY', { breakLine: true }), run('WITH AN ETA.', { color: MINT })], { placeholder: 'title' });
  const body = { fontFace: BODY, fontSize: pt(28), color: SOFT, lineSpacingMultiple: lh(BODY, 1.4) };
  const strong = { ...body, bold: true, color: INK };
  const states = [
    ['GRIPPING', AMBER, 198, [run('Effort above a sustainable level drains the battery.', body)]],
    ['RESTING', CYAN, 182, [run('It recharges, with a countdown: ', body), run('“Ready in 12 s”.', strong)]],
    ['RELAX FULLY', SOFT, 247, [run('EMG sees a tense forearm and slows the recharge.', body)]],
    ['READY', MINT, 150, [run('At 80% it glows and chimes: ', body), run('climb on.', strong)]],
  ];
  states.forEach(([label, color, chipW, words], i) => {
    const y = 398 + i * 152.4;
    card(s, '', { x: 120, y, w: 825, h: 130 }, { radius: 20, name: `State ${label}` });
    text(s, words, { x: 478, y: y + 20, w: 440, h: 90 }, { font: BODY, size: 28, color: SOFT, valign: 'middle' });
    chip(s, label, { x: 152, y: y + 38.5, w: chipW + 10, h: 53 }, color);
  });
  const batts = [
    ['batt-85.jpg', 'FULL · 85', MINT, 184, 'Dashboard battery at 85%'],
    ['batt-53.jpg', 'AFTER GRIPPING · 53', AMBER, 346, 'Dashboard battery at 53% after gripping'],
    ['batt-81.jpg', 'AFTER RESTING · 81 · READY', MINT, 460, 'Dashboard battery back at 81% after resting'],
  ];
  batts.forEach(([file, label, color, labelW, alt], i) => {
    const b = { x: 1015, y: 398 + i * 203, w: 785, h: 181 };
    s.addImage({ path: asset(file), x: px(b.x), y: px(b.y), w: px(b.w), h: px(b.h), altText: alt, objectName: `Battery ${label}` });
    frame(s, b, color, 3, 20, `Battery frame ${label}`);
    s.addText(label, {
      shape: S.ROUNDED_RECTANGLE, x: px(b.x + 23), y: px(b.y + b.h - 64), w: px(labelW), h: px(45), rectRadius: px(10),
      fill: { color: BG, transparency: 20 }, margin: 0, align: 'center', valign: 'middle',
      fontFace: MONO, fontSize: pt(22), bold: true, color, charSpacing: pt(3), objectName: `Battery label ${label}`,
    });
  });
  s.addText('CLYF · screenshots from the live dashboard during the demo', { placeholder: 'foot' });
}

// ---------- 4 · Demo ----------
{
  const s = pres.addSlide({ masterName: 'CLYF Content', sectionTitle: 'Problem and product' });
  s.addText('DEMO · ONE REAL SESSION', { placeholder: 'eyebrow' });
  s.addText([run('GRIP DRAINS IT. '), run('REST BRINGS IT BACK.', { color: CYAN })], { placeholder: 'title', fontSize: pt(92) });
  s.addImage({ path: asset('portrait.jpg'), x: px(120), y: px(292), w: px(380), h: px(676), altText: 'Wearing the sleeve and squeezing a grip trainer', objectName: 'Demo photo' });
  frame(s, { x: 120, y: 292, w: 380, h: 676 }, LINE, 2, 26, 'Demo photo frame');

  // Battery read off the dashboard in the demo video, once per second, source seconds 17-52.
  const READ = [83, 84, 85, 86, 80, 73, 69, 64, 61, 60, 59, 57, 53, 52, 54, 56, 58, 60, 62, 64, 66, 67, 69, 70, 72, 73, 75, 76, 77, 78, 79, 80, 81, 80, 74, 71];
  const T0 = 17, X0 = 675, X1 = 1765, Y0 = 331.6, Y1 = 821.6;
  const xs = (sec) => X0 + (sec - T0) / (READ.length - 1) * (X1 - X0);
  const yv = (v) => Y0 + (1 - (v - 40) / 60) * (Y1 - Y0);

  const band = (a, b, color, alpha, name) => s.addShape(S.RECTANGLE, {
    x: px(xs(a)), y: px(Y0), w: px(xs(b) - xs(a)), h: px(Y1 - Y0), fill: { color, transparency: alpha }, objectName: name });
  band(20.3, 28.6, AMBER, 84, 'Band gripping 1');
  band(29, 47.8, CYAN, 88, 'Band resting');
  band(50.4, 52, AMBER, 84, 'Band gripping 2');

  const axis = { font: MONO, size: 22, color: MUTED, valign: 'middle' };
  for (const v of [40, 60, 80, 100]) {
    const ready = v === 80;
    s.addShape(S.LINE, { x: px(X0), y: px(yv(v)), w: px(X1 - X0), h: 0, objectName: ready ? 'Ready line 80%' : `Grid ${v}%`,
      line: ready ? { color: MINT, width: pt(3), dashType: 'dash' } : { color: LINE, width: pt(2) } });
    text(s, `${v}%`, { x: X0 - 116, y: yv(v) - 15, w: 100, h: 30 }, { ...axis, align: 'right' });
  }
  for (let sec = 20; sec <= 50; sec += 10) text(s, `${sec} s`, { x: xs(sec) - 50, y: 839, w: 100, h: 30 }, { ...axis, align: 'center' });

  const pts = READ.map((v, i) => [xs(T0 + i), yv(v)]);
  const top = Math.min(...pts.map((p) => p[1]));
  const rel = ([x, y]) => ({ x: px(x - X0), y: px(y - top) });
  s.addShape(S.CUSTOM_GEOMETRY, {
    x: px(X0), y: px(top), w: px(X1 - X0), h: px(Y1 - top), fill: { color: MINT, transparency: 92 }, objectName: 'Battery area',
    points: [rel([X0, Y1]), ...pts.map(rel), rel([X1, Y1]), { close: true }],
  });
  s.addShape(S.CUSTOM_GEOMETRY, {
    x: px(X0), y: px(top), w: px(X1 - X0), h: px(Math.max(...pts.map((p) => p[1])) - top), objectName: 'Battery line',
    line: { color: INK, width: pt(5) }, points: pts.map(rel),
  });
  pts.forEach(([x, y], i) => s.addShape(S.OVAL, {
    x: px(x - 6), y: px(y - 6), w: px(12), h: px(12), fill: { color: READ[i] >= 80 ? MINT : AMBER }, objectName: `Reading ${T0 + i}s` }));

  const note = (sec, v, words, color, dy, w) => text(s, words, { x: xs(sec) - w / 2, y: yv(v) + dy - 30.5, w, h: 40 },
    { font: BODY, size: 30, bold: true, color, align: 'center' });
  note(24.5, 86, 'Grip: 86 → 52 in 10 s', AMBER, -40, 420);
  note(38.5, 81, 'Rest: back to 80 in 18 s', CYAN, -40, 440);
  note(49, 81, 'READY', MINT, -34, 160);

  const legend = { font: BODY, size: 22, color: MUTED, valign: 'middle' };
  const swatch = (x, color, alpha, name) => s.addShape(S.ROUNDED_RECTANGLE, {
    x: px(x), y: px(917.6), w: px(26), h: px(16), rectRadius: px(4), fill: { color, transparency: alpha }, objectName: name });
  swatch(570, AMBER, 65, 'Legend gripping');
  text(s, 'gripping', { x: 606, y: 909, w: 110, h: 28 }, legend);
  swatch(723, CYAN, 75, 'Legend resting');
  text(s, 'resting', { x: 759, y: 909, w: 100, h: 28 }, legend);
  s.addShape(S.LINE, { x: px(863), y: px(923), w: px(30), h: 0, line: { color: MINT, width: pt(3), dashType: 'dash' }, objectName: 'Legend ready' });
  text(s, 'ready line, 80%', { x: 903, y: 909, w: 180, h: 28 }, legend);
  text(s, 'battery read off the dashboard, once per second', { x: 1090, y: 909, w: 560, h: 28 }, legend);

  s.addText('CLYF · full 60 s video on Devpost', { placeholder: 'foot' });
}

// ---------- 5 · How it works ----------
pres.addSection({ title: 'How it works' });
{
  const s = pres.addSlide({ masterName: 'CLYF Content', sectionTitle: 'How it works' });
  s.addText('HOW WE BUILT IT', { placeholder: 'eyebrow' });
  s.addText('FROM MUSCLE TO MINUTES.', { placeholder: 'title' });
  const stages = [
    ['01 · SENSE', 'THE SLEEVE', 'Surface EMG on the finger flexors, plus a force sensor on the hold.', ['MyoWare 2.0 + cable shield', 'FSR, 4 mm']],
    ['02 · SAMPLE', 'ARDUINO UNO Q', 'The STM32 reads both channels on a fixed clock and streams every sample.', ['100 Hz · 12-bit ADC', '0 dropped samples']],
    ['03 · CLEAN', 'LINUX SIDE', 'Python on the board relays to the laptop over USB. No Wi-Fi needed.', ['Bridge RPC · Socket.IO', 'ADB port forward']],
    ['04 · NAVIGATE', 'DASHBOARD', 'Auto-calibrated %MVC, bad-signal detection, and the battery model.', ['JavaScript · Canvas', 'ready at 80% · τ = 20 s']],
  ];
  const spec = { fontFace: MONO, fontSize: pt(20), color: MUTED, lineSpacingMultiple: lh(MONO, 1.6) };
  stages.forEach(([num, h, body, [s1, s2]], i) => {
    const x = 120 + i * 420;
    card(s, [
      para(num, { fontFace: MONO, fontSize: pt(22), bold: true, color: MINT, charSpacing: pt(4), lineSpacingMultiple: 1, paraSpaceAfter: pt(14) }),
      para(h, { fontFace: HEAD, fontSize: pt(50), bold: true, color: INK, lineSpacingMultiple: lh(HEAD, 1), paraSpaceAfter: pt(18) }),
      para(body, { fontFace: BODY, fontSize: pt(25), color: SOFT, lineSpacingMultiple: lh(BODY, 1.45), paraSpaceAfter: pt(18) }),
      para(s1, spec),
      run(s2, spec),
    ], { x, y: 319, w: 392, h: 380 }, { name: `Stage ${h}` });
    if (i < 3) s.addShape(S.ISOSCELES_TRIANGLE, { x: px(x + 406 - 13), y: px(509 - 10), w: px(26), h: px(20), rotate: 90, fill: { color: MINT }, objectName: `Arrow ${i + 1}` });
  });
  const stack = [
    ['Arduino UNO Q', 120, 745, 229], ['STM32 sketch', 363, 745, 214], ['MyoWare 2.0', 591, 745, 200], ['FSR 400', 805, 745, 143],
    ['Python', 963, 745, 129], ['Socket.IO', 1106, 745, 172], ['JavaScript', 1292, 745, 186], ['HTML5 Canvas', 1492, 745, 214],
    ['ADB', 120, 816, 87], ['three.js (video)', 221, 816, 271],
  ];
  for (const [label, x, y, w] of stack) s.addText(label, {
    shape: S.ROUNDED_RECTANGLE, x: px(x), y: px(y), w: px(w), h: px(57), rectRadius: px(12),
    fill: { color: PANEL }, line: { color: LINE, width: pt(2) }, margin: 0, align: 'center', valign: 'middle',
    fontFace: MONO, fontSize: pt(22), bold: true, color: INK, charSpacing: pt(1), objectName: `Stack ${label}`,
  });
  s.addText('CLYF', { placeholder: 'foot' });
}

// ---------- 6 · Measured vs estimated ----------
{
  const s = pres.addSlide({ masterName: 'CLYF Content', sectionTitle: 'How it works' });
  s.addText('WHAT TO TRUST', { placeholder: 'eyebrow' });
  s.addText('MEASURED, THEN MODELLED.', { placeholder: 'title' });
  const li = { fontFace: BODY, fontSize: pt(29), color: SOFT, lineSpacingMultiple: lh(BODY, 1.35), paraSpaceAfter: pt(14), bullet: { indent: pt(30) } };
  const list = (items) => items.map((t, i) => (i < items.length - 1 ? para(t, li) : run(t, { ...li, paraSpaceAfter: 0 })));
  const head = (t, color) => para(t, { fontFace: HEAD, fontSize: pt(56), bold: true, color, lineSpacingMultiple: lh(HEAD, 1), paraSpaceAfter: pt(18) });
  card(s, [head('MEASURED', INK), ...list(['Muscle effort, as % of your own max grip', 'Hand on the hold', 'How long each grip and rest lasted', 'How relaxed the forearm is while resting'])],
    { x: 120, y: 315, w: 820, h: 345 }, { name: 'Card measured' });
  card(s, [head('ESTIMATED', PINK), ...list(['Battery level and “ready in” countdown, from a W′-balance style model', 'Labelled as an estimate on screen', 'Demo constants, not yet fitted per climber'])],
    { x: 980, y: 315, w: 820, h: 345 }, { name: 'Card estimated', line: PINK, lineAlpha: 60 });
  const hard = [
    ['Spiky EMG', 'Calibrating from peaks made hard grips read 30–40%. Per-second averages fixed it.'],
    ['Loose electrodes', 'A pinned or flat signal is flagged, not turned into a number.'],
    ['Campus Wi-Fi', 'Device isolation blocked the link, so data runs over USB.'],
    ['No resistor', 'The FSR floats without one, so it works as a contact switch for now.'],
  ];
  hard.forEach(([h, body], i) => {
    const x = 120 + i * 426;
    s.addShape(S.LINE, { x: px(x), y: px(701), w: px(402), h: 0, line: { color: PINK, width: pt(4) }, objectName: `Rule ${h}` });
    text(s, [
      para(h, { fontFace: BODY, fontSize: pt(26), bold: true, color: INK, lineSpacingMultiple: lh(BODY, 1.4), paraSpaceAfter: pt(6) }),
      run(body, { fontFace: BODY, fontSize: pt(24), color: SOFT, lineSpacingMultiple: lh(BODY, 1.4) }),
    ], { x, y: 719, w: 402, h: 165 }, { font: BODY, size: 24, color: SOFT });
  });
  s.addText('CLYF', { placeholder: 'foot' });
}

// ---------- 7, 8 · Impact and future ----------
pres.addSection({ title: 'Outlook' });
function listSlide(eyebrow, title, marker, items, image, imageY, alt, listY) {
  const s = pres.addSlide({ masterName: 'CLYF Content', sectionTitle: 'Outlook' });
  s.addText(eyebrow, { placeholder: 'eyebrow' });
  s.addText(title, { placeholder: 'title' });
  items.forEach(([h, body], i) => {
    const y = listY + i * 162.3;
    text(s, marker(i), { x: 120, y, w: 80, h: 75 }, { font: HEAD, size: 60, bold: true, color: MINT, lh: lh(HEAD, 1) });
    text(s, [
      para(h, { fontFace: HEAD, fontSize: pt(46), bold: true, color: INK, lineSpacingMultiple: lh(HEAD, 1), paraSpaceAfter: pt(8) }),
      run(body, { fontFace: BODY, fontSize: pt(27), color: SOFT, lineSpacingMultiple: lh(BODY, 1.45) }),
    ], { x: 212, y, w: 748, h: 150 }, { font: BODY, size: 27, color: SOFT });
  });
  s.addImage({ path: asset(image), x: px(1040), y: px(imageY), w: px(760), h: px(560), altText: alt, objectName: 'Illustration' });
  frame(s, { x: 1040, y: imageY, w: 760, h: 560 }, LINE, 2, 26, 'Illustration frame');
  s.addText('CLYF', { placeholder: 'foot' });
}
listSlide('IMPACT', 'TURN A FEELING\nINTO A NUMBER.', () => '→', [
  ['CLIMBERS', 'Rest exactly as long as you need on a project, and see effort across a session.'],
  ['GYMS AND COACHES', 'Objective grip load per attempt instead of “how pumped were you?”'],
  ['BEYOND CLIMBING', 'Any grip-heavy activity where recovery decides performance.'],
], 'impact.jpg', 404, 'Dashboard showing READY, climb on', 475.5);
{
  // Slide 8's title has a mint second line, so it is built with runs.
  listSlide('WHAT’S NEXT', [run('EYES ON THE WALL,', { breakLine: true }), run('NOT ON A SCREEN.', { color: MINT })], (i) => String(i + 1), [
    ['READY ON THE WRIST', 'A haptic tap from the watch when you’re recovered. The Bluetooth link is already built.'],
    ['FATIGUE YOU CAN SEE', 'Track the raw EMG’s frequency shift, a known marker of muscle fatigue.'],
    ['FITTED TO YOU', 'Learn each climber’s own drain and recovery rates from their sessions.'],
    ['WIRELESS SLEEVE', 'Smaller board, battery power, and a cleaner fit.'],
  ], 'future.jpg', 414, 'Diagram of the sleeve, electrodes, MyoWare and Arduino', 404.3);
}

// ---------- 9 · Thanks ----------
{
  const s = pres.addSlide({ masterName: 'CLYF Closing', sectionTitle: 'Outlook' });
  s.addText('THANK YOU', { placeholder: 'eyebrow' });
  s.addText('CLYF', { placeholder: 'title' });
  s.addText([run('Know when to '), run('climb again.', { color: MINT })], { placeholder: 'tagline' });
  s.addText('Jeremy Li · BigRed//Hacks 2026', { placeholder: 'lede' });
}

// ---------- write, then give the theme its colours ----------
const SLOTS = ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'];
async function writeThemeColors(file, theme) {
  const JSZip = require(require.resolve('jszip', { paths: [require.resolve('pptxgenjs')] }));
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const part = 'ppt/theme/theme1.xml';
  const scheme = `<a:clrScheme name="${theme.name}">` + SLOTS.map((k) => `<a:${k}><a:srgbClr val="${theme.colors[k]}"/></a:${k}>`).join('') + '</a:clrScheme>';
  const xml = (await zip.file(part).async('string'))
    .replace(/<a:clrScheme\b[\s\S]*?<\/a:clrScheme>/, () => scheme)
    .replace(/(<a:(?:theme|fontScheme)\b[^>]*?\bname=")[^"]*"/g, (_, head) => `${head}${theme.name}"`);
  if (!xml.includes(scheme)) throw new Error('theme1.xml has no colour scheme to replace');
  zip.file(part, xml);
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  await writeThemeColors(OUT, THEME);
  console.log('wrote', OUT);
})();
