// CLYF sleeve: a "forearm battery" that drains while you grip and recharges while you rest.
// Board samples arrive in batches of [seq, mcuMs, fsr, emg] (12-bit ADC counts).
//
// Measured: the EMG envelope (as %MVC once calibrated), FSR contact, durations.
// Modelled: the reserve (battery level). It is labelled as an estimate everywhere it is shown.
// Simulated input exists for rehearsal and as a stage fallback; it is always labelled as such.
const $ = id => document.getElementById(id);
const VREF = 3.3, FULL = 4095, WINDOW_S = 10;
const volts = raw => raw / FULL * VREF;

const buffer = [];          // {t, fsr, emg, fsrRaw, emgRaw}, t = MCU seconds
let lastSampleAt = 0;       // browser time of the newest batch
let recording = null;       // raw rows while recording

// Settings survive a page reload. Storage can be unavailable (private mode); fall back silently.
const store = {
  get(key, fallback) { try { const v = localStorage.getItem(`clyf.${key}`); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(`clyf.${key}`, JSON.stringify(value)); } catch {} },
};
const fmtS = s => s < 60 ? `${Math.max(0, Math.round(s))} s` : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

// ---------- views ----------
function showView(view) {
  $('stage-view').hidden = view !== 'stage';
  $('signals-view').hidden = view !== 'signals';
  $('tab-stage').classList.toggle('on', view === 'stage');
  $('tab-signals').classList.toggle('on', view === 'signals');
  store.set('view', view);
}
$('tab-stage').onclick = () => showView('stage');
$('tab-signals').onclick = () => showView('signals');
showView(store.get('view', 'stage'));

// ---------- contact (FSR) ----------
// Enter at the threshold, leave at 60% of it, so a grip near the threshold is not chopped
// into fragments. Default 2.0 V: without a pull-down resistor a released FSR floats near 1 V,
// while any press reads above 3 V.
let threshold = store.get('threshold', 2.0), inContact = false, contactStart = 0, holds = 0;
function showThreshold() { $('threshold').value = threshold; $('threshold-v').textContent = `${threshold.toFixed(2)} V`; }
$('threshold').oninput = e => { threshold = +e.target.value; store.set('threshold', threshold); showThreshold(); };
showThreshold();
// An unplugged FSR leaves A1 floating, drifting toward its neighbours (A0, A2), so it can read
// as a press. Switching it off keeps it out of contact detection entirely.
let fsrOn = store.get('fsrOn', true);
$('fsr-on').checked = fsrOn;
$('fsr-on').onchange = e => { fsrOn = e.target.checked; store.set('fsrOn', fsrOn); if (!fsrOn) inContact = false; };
function updateContact(v, t) {
  if (!fsrOn) return;
  if (!inContact && v >= threshold) { inContact = true; contactStart = t; holds++; }
  else if (inContact && v < threshold * 0.6) inContact = false;
}

// ---------- EMG: envelope, health, calibration ----------
// %MVC places the envelope between a relaxed level and a maximal grip. Manual calibration
// (median of 3 s relaxed, 95th percentile of 3 s max grip) wins when it is valid; otherwise the
// page calibrates itself from what it has seen: a low (10th percentile) per-second median in the last 30 s
// (relaxed moments) and the highest per-second mean in the last 3 min (hardest sustained grip). A
// per-second mean rather than a peak: at useful gains the envelope spikes to the sensor's 3 V ceiling
// within a squeeze, and a peak-based max made ordinary hard grips read as only 30–40%.
// The envelope is smoothed over 250 ms (25 samples); 100 ms left those spikes in the load.
const MIN_SPAN = 0.15; // volts between relaxed and max (~190 ADC steps); less cannot resolve effort
let base = store.get('base', null), mvc = store.get('mvc', null), capture = null;
const manualValid = () => base !== null && mvc !== null && mvc - base >= MIN_SPAN;
const SMOOTH_N = 25;
const smooth = [];
let envNow = null;
const perSecond = []; // {t, median, mean} of the envelope, last 3 min
let secondBuf = [], secondStart = null;
function noteEnvelope(env, t) {
  // A restarted sketch resets the MCU clock; earlier seconds would no longer line up.
  if (secondStart === null || t < secondStart) { secondStart = t; secondBuf = []; perSecond.length = 0; }
  secondBuf.push(env);
  if (t - secondStart >= 1) {
    perSecond.push({ t, median: quantile(secondBuf, 0.5), mean: secondBuf.reduce((a, b) => a + b, 0) / secondBuf.length });
    while (perSecond.length && t - perSecond[0].t > 180) perSecond.shift();
    secondBuf = []; secondStart = t;
  }
}
function autoCalibration() {
  if (!perSecond.length) return null;
  const tNow = perSecond[perSecond.length - 1].t;
  const lately = perSecond.filter(s => tNow - s.t <= 30);
  if (lately.length < 5) return null;
  const rest = quantile(lately.map(s => s.median), 0.1); // low, but not one outlier second
  const top = Math.max(...perSecond.map(s => s.mean));
  return top - rest >= MIN_SPAN ? { rest, top, how: 'auto' } : { rest, top: null, how: 'auto' };
}
function calibration() { return manualValid() ? { rest: base, top: mvc, how: 'manual' } : autoCalibration(); }
const calibrated = () => !!calibration()?.top;
const emgPct = () => { const c = calibration(); return c?.top && envNow !== null ? Math.max(0, (envNow - c.rest) / (c.top - c.rest) * 100) : null; };
function showCalibration() {
  const c = calibration();
  $('mvc').textContent = c?.top ? `${c.how === 'manual' ? 'Manual' : 'Auto'} · rest ${c.rest.toFixed(2)} V · max ${c.top.toFixed(2)} V`
    : c ? 'Auto-calibrating · squeeze hard once' : 'Waiting for EMG';
  $('mvc').className = c?.top ? 'mvc ready' : 'mvc';
}
function quantile(values, q) { const s = [...values].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; }
function startCapture(kind) { capture = { kind, until: performance.now() + 3000, values: [] }; $('cal-rest').disabled = $('cal-max').disabled = true; }
$('cal-rest').onclick = () => startCapture('rest');
$('cal-max').onclick = () => startCapture('max');
function finishCapture() {
  const { kind, values } = capture; capture = null;
  $('cal-rest').disabled = $('cal-max').disabled = false;
  if (values.length < 50) { $('cal-msg').textContent = 'Too few samples captured — check that data is streaming'; return; }
  if (kind === 'rest') { base = quantile(values, 0.5); store.set('base', base); }
  else { mvc = quantile(values, 0.95); store.set('mvc', mvc); }
  $('cal-msg').textContent = base !== null && mvc !== null && mvc - base < MIN_SPAN
    ? `Max is only ${(mvc - base).toFixed(2)} V above relaxed — too close to use; staying on auto calibration`
    : kind === 'rest' ? `Relaxed ${base.toFixed(2)} V` : `Max ${mvc.toFixed(2)} V`;
  showCalibration();
}
$('cal-auto').onclick = () => { base = mvc = null; store.set('base', null); store.set('mvc', null); $('cal-msg').textContent = 'Back to auto calibration'; showCalibration(); };
showCalibration();

// A pinned or flat envelope carries no muscle information; the model must not consume it.
// A hard grip clips at the top for a few seconds, so pinning counts as a fault only after 8 s;
// a flat line after 1 s. Good for 2 s restores it.
const health = { ok: false, reason: 'no EMG data yet', badSince: null, goodSince: null };
function assessEmg() {
  const recent = buffer.slice(-100).map(s => s.emg);
  if (recent.length < 50) return;
  const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
  const sd = Math.sqrt(recent.reduce((a, b) => a + (b - mean) ** 2, 0) / recent.length);
  const pinned = recent.filter(v => v >= 2.95).length / recent.length;
  const reason = pinned > 0.9 ? 'EMG is pinned at its maximum (~3 V): an electrode is off, the cable jack is loose, or the gain is too high'
    // Stuck at a mid-level value is suspicious; quiet near 0 V is a relaxed forearm at low gain.
    : sd < 0.003 && mean > 0.15 ? 'EMG is stuck at one level: check the ENV wire to A0 and the MyoWare power'
    : null;
  const now = performance.now();
  if (reason) {
    health.goodSince = null; health.badSince ??= now;
    if (now - health.badSince > (pinned > 0.9 ? 8000 : 1000)) { health.ok = false; health.reason = reason; }
  } else {
    health.badSince = null; health.goodSince ??= now;
    if (now - health.goodSince > 2000) { health.ok = true; health.reason = null; }
  }
}

// ---------- model ----------
// Above the sustainable load the reserve drains in proportion to the excess
// (load − critical) / capacity; below it, it refills toward 100% with time constant tau.
const model = {
  critical: store.get('critical', 30), capacity: store.get('capacity', 800),
  tau: store.get('tau', 20), assumed: store.get('assumed', 65),
};
for (const key of Object.keys(model)) {
  $(key).value = model[key];
  $(key).onchange = e => { const v = +e.target.value; if (v > 0) { model[key] = v; store.set(key, v); } };
}
const READY = 0.8, LOAD_TAU = 0.4, RELAXED = 10;
let activePct = store.get('activePct', 35);
function showActivePct() { $('active-pct').value = activePct; $('active-pct-v').textContent = `${activePct}% MVC`; }
$('active-pct').oninput = e => { activePct = +e.target.value; store.set('activePct', activePct); showActivePct(); };
showActivePct();

let mode = store.get('mode', 'auto'), simGrip = false;
$('mode').value = mode;
$('mode').onchange = e => { mode = e.target.value; store.set('mode', mode); simGrip = false; };

// Where the load comes from right now, and why another source is unavailable.
function resolveSource() {
  const emgOk = calibrated() && health.ok;
  const emgWhy = !calibrated() ? 'EMG still calibrating — squeeze hard once' : health.reason;
  if (mode === 'sim') return { src: 'sim' };
  if (mode === 'emg') return emgOk ? { src: 'emg' } : { src: null, why: emgWhy };
  if (mode === 'fsr') return fsrOn ? { src: 'fsr' } : { src: null, why: 'FSR is switched off (Signals tab)' };
  if (emgOk) return { src: 'emg' };
  if (fsrOn) return { src: 'fsr', fallback: emgWhy };
  return { src: null, why: `${emgWhy}; FSR is switched off` };
}
// [enter, leave] dwell in seconds: EMG is noisy, FSR contact is already debounced, simulation is exact.
// EMG leaves after 1.5 s: a brief release between moves is not a rest.
const DWELL = { emg: [0.3, 1.5], fsr: [0.15, 0.5], sim: [0, 0] };

const rec = {
  reserve: 1, load: 0, speed: 1, active: false, pending: 0, since: performance.now() / 1000, source: { src: null },
  armed: false, grips: 0, wall: 0, longest: null, lastRecovery: null, history: [], lastHistory: 0,
};
let lastTick = performance.now();
function tick() {
  const nowMs = performance.now(), now = nowMs / 1000;
  const dt = Math.min(0.2, (nowMs - lastTick) / 1000); lastTick = nowMs;
  const source = rec.source = resolveSource();
  if (source.src) {
    const target = source.src === 'emg' ? emgPct()
      : source.src === 'fsr' ? (inContact ? model.assumed : 0)
      : (simGrip ? model.assumed : 0);
    rec.load += (target - rec.load) * (1 - Math.exp(-dt / LOAD_TAU));
    // Recharge speed follows how relaxed the forearm actually is: full speed up to RELAXED %MVC
    // (the resting level drifts by that much), none at the sustainable load. Only EMG can see
    // this; FSR and simulation assume a clean rest.
    rec.speed = source.src === 'emg' ? Math.min(1, Math.max(0, (model.critical - rec.load) / (model.critical - RELAXED))) : 1;
    if (rec.load > model.critical) rec.reserve -= (rec.load - model.critical) * dt / model.capacity;
    else rec.reserve += (1 - rec.reserve) * (1 - Math.exp(-dt * rec.speed / model.tau));
    rec.reserve = Math.min(1, Math.max(0, rec.reserve));

    const wants = source.src === 'emg' ? inContact || rec.load >= (rec.active ? activePct * 0.6 : activePct)
      : source.src === 'fsr' ? inContact : simGrip;
    const [enter, leave] = DWELL[source.src];
    rec.pending = wants !== rec.active ? rec.pending + dt : 0;
    if (wants !== rec.active && rec.pending >= (wants ? enter : leave)) {
      if (wants) rec.grips++;
      else rec.longest = Math.max(rec.longest ?? 0, now - rec.since);
      rec.active = wants; rec.since = now; rec.pending = 0;
    }
    if (rec.active) rec.wall += dt;
    // Chime once when a rest brings the reserve back over READY, and only after it had really dropped.
    if (rec.reserve < READY - 0.05) rec.armed = true;
    if (!rec.active && rec.armed && rec.reserve >= READY) { rec.armed = false; rec.lastRecovery = now - rec.since; chime(); }
  }
  if (now - rec.lastHistory >= 0.25) {
    rec.lastHistory = now;
    rec.history.push({ t: now, r: rec.reserve, a: rec.active && !!source.src, live: !!source.src });
    while (rec.history.length && now - rec.history[0].t > 120) rec.history.shift();
  }
  renderStage(now);
}
setInterval(tick, 50);

// ---------- simulated input ----------
function setSimGrip(on) { if (rec.source.src !== 'sim') on = false; simGrip = on; $('sim-grip').classList.toggle('held', on); }
const grip = $('sim-grip');
grip.addEventListener('pointerdown', e => { grip.setPointerCapture(e.pointerId); setSimGrip(true); });
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) grip.addEventListener(type, () => setSimGrip(false));
const typing = () => ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName);
addEventListener('keydown', e => { if (e.code === 'Space' && rec.source.src === 'sim' && !typing()) { e.preventDefault(); if (!e.repeat) setSimGrip(true); } });
addEventListener('keyup', e => { if (e.code === 'Space') setSimGrip(false); });
addEventListener('blur', () => setSimGrip(false));

// ---------- sound ----------
let audio;
function chime() {
  try {
    audio = audio || new AudioContext();
    for (const [i, f] of [660, 880, 1320].entries()) {
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = f; o.connect(g); g.connect(audio.destination);
      const at = audio.currentTime + i * 0.14;
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.22, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
      o.start(at); o.stop(at + 0.35);
    }
  } catch {}
}
// Browsers only allow sound after a user gesture; any click or key unlocks it.
for (const type of ['click', 'keydown']) addEventListener(type, () => { try { audio = audio || new AudioContext(); audio.resume(); } catch {} });

// ---------- stage rendering ----------
const SOURCE_LABEL = {
  emg: () => 'EMG · measured %MVC',
  fsr: () => `FSR contact · load assumed ${model.assumed}% MVC`,
  sim: () => 'Simulated · not sensor data',
};
function renderStage(now) {
  const { src, why, fallback } = rec.source;
  const r = rec.reserve, elapsed = now - rec.since;
  $('reserve').textContent = src ? Math.round(r * 100) : '—';
  $('battery-fill').style.width = `calc((100% - 20px) * ${src ? r : 0})`;
  const battery = $('battery');
  battery.classList.toggle('mid', r < READY && r >= 0.4);
  battery.classList.toggle('low', r < 0.4);
  // Below the sustainable load the reserve refills even while still on the wall.
  const easy = rec.load <= model.critical;
  battery.classList.toggle('charging', !!src && r < READY && (!rec.active || easy));
  battery.classList.toggle('draining', !!src && rec.active && rec.load > model.critical);
  battery.classList.toggle('ready', !!src && !rec.active && r >= READY);

  let chip, headline, sub;
  if (!src) {
    chip = ['idle', 'No input']; headline = 'No usable input';
    sub = `${why}. Set “Load from” to Simulated to rehearse.`;
  } else if (rec.active) {
    chip = ['climbing', 'On the wall'];
    headline = r >= READY ? 'Holding well' : easy ? 'Easy grip · recharging' : r >= 0.4 ? 'Battery draining' : r > 0.05 ? 'Find a rest soon' : 'Empty — get off the wall';
    sub = `Load ${Math.round(rec.load)}% MVC · sustainable ≈ ${model.critical}% · on for ${fmtS(elapsed)}`;
  } else if (r < READY) {
    chip = ['resting', 'Recharging'];
    // Time for the modelled reserve to climb from r to READY: (τ / speed)·ln((1−r)/(1−READY)).
    const speed = Math.max(rec.speed, 0.05);
    headline = `Ready in ${fmtS(model.tau / speed * Math.log((1 - r) / (1 - READY)))}`;
    sub = src === 'emg'
      ? `Resting ${fmtS(elapsed)} · forearm ${Math.round(rec.load)}% active · recharging at ${Math.round(rec.speed * 100)}% speed${rec.speed < 0.7 ? ' — relax it fully' : ''}`
      : `Resting ${fmtS(elapsed)} · shake out, breathe`;
  } else {
    chip = ['ready', 'Ready']; headline = 'Climb on';
    sub = rec.lastRecovery !== null && elapsed < 30 ? `Recovered in ${fmtS(rec.lastRecovery)}` : 'Fully charged';
  }
  $('chip').textContent = chip[1]; $('chip').className = `chip ${chip[0]}`;
  $('headline').textContent = headline; $('subline').textContent = sub;
  $('source').textContent = src ? `${mode === 'auto' ? 'Auto → ' : ''}${SOURCE_LABEL[src]()}` : 'nothing usable';
  $('sim-banner').hidden = src !== 'sim';
  $('sim-grip').hidden = src !== 'sim';
  const emgProblem = mode !== 'sim' && mode !== 'fsr' && calibrated() && !health.ok && health.reason;
  $('health').hidden = !emgProblem;
  if (emgProblem) $('health').textContent = `${health.reason}.${fallback && src === 'fsr' ? ' Using FSR contact instead.' : ''}`;

  $('st-grips').textContent = rec.grips;
  $('st-wall').textContent = fmtS(rec.wall);
  $('st-longest').textContent = rec.longest === null ? '—' : fmtS(rec.longest);
  $('st-recovery').textContent = rec.lastRecovery === null ? '—' : fmtS(rec.lastRecovery);
}

// ---------- data in ----------
function onSamples(msg) {
  lastSampleAt = performance.now();
  for (const [seq, ms, fsrRaw, emgRaw] of msg.s) {
    const t = ms / 1000, fsr = volts(fsrRaw), emg = volts(emgRaw);
    buffer.push({ t, fsr, emg, fsrRaw, emgRaw });
    updateContact(fsr, t);
    smooth.push(emg); if (smooth.length > SMOOTH_N) smooth.shift();
    envNow = smooth.reduce((a, b) => a + b, 0) / smooth.length;
    noteEnvelope(envNow, t);
    if (capture) capture.values.push(envNow);
    if (recording) recording.push([seq, ms, fsrRaw, emgRaw]);
  }
  const newest = buffer[buffer.length - 1].t;
  while (buffer.length && newest - buffer[0].t > WINDOW_S) buffer.shift();
  // A restarted sketch resets the MCU clock; drop the old window rather than draw backwards.
  if (buffer.length > 1 && buffer[buffer.length - 1].t < buffer[buffer.length - 2].t) buffer.splice(0, buffer.length - 1);
  assessEmg();
  showCalibration();
  $('rate').textContent = `${msg.rate_hz.toFixed(0)} Hz`;
  $('rate').className = `pill ${msg.rate_hz >= 90 ? 'ok' : 'wait'}`;
  $('missing').textContent = `Missing ${msg.missing}`;
  $('missing').className = `pill ${msg.missing === 0 ? 'ok' : 'wait'}`;
  updateSignals();
}

function updateSignals() {
  const last = buffer[buffer.length - 1]; if (!last) return;
  $('fsr-v').textContent = last.fsr.toFixed(2);
  $('fsr-pct').textContent = `${Math.round(last.fsrRaw / FULL * 100)}% of range`;
  $('contact').textContent = inContact ? 'Gripping' : fsrOn ? 'Released' : 'FSR off';
  $('contact').className = `contact ${inContact ? 'on' : 'off'}`;
  $('hold').textContent = inContact ? `${(last.t - contactStart).toFixed(1)} s` : '—';
  $('holds').textContent = holds;
  $('emg-v').textContent = envNow.toFixed(3);
  $('emg-pct').textContent = calibrated() ? `${Math.round(emgPct())}% MVC` : '';
  $('emg-warn').hidden = health.ok || !health.reason;
  $('emg-warn').textContent = health.reason ?? '';
  const recent = buffer.slice(-100);
  $('fsr-warn').hidden = !fsrOn || recent.filter(s => s.fsrRaw >= FULL - 20).length / recent.length < 0.3;
  $('fsr-warn').textContent = 'Pressure is at full scale: this FSR saturates under hard presses, which is fine for contact detection';
}

// ---------- charts ----------
function sizeCanvas(canvas) {
  const w = canvas.clientWidth, h = canvas.clientHeight, dpr = Math.min(devicePixelRatio, 2);
  if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
  return [c, w, h];
}
function drawSignal(canvas, key, color, lines) {
  if (!canvas.offsetParent) return;
  const [c, w, h] = sizeCanvas(canvas);
  const y = v => h - 6 - (v / VREF) * (h - 12);
  c.font = '10px ui-monospace, monospace'; c.fillStyle = '#4c5a62';
  for (const v of [0, 1, 2, 3]) { c.strokeStyle = 'rgba(255,255,255,.05)'; c.beginPath(); c.moveTo(0, y(v)); c.lineTo(w, y(v)); c.stroke(); c.fillText(`${v}V`, 4, y(v) - 3); }
  for (const [v, stroke] of lines) { if (v === null) continue; c.strokeStyle = stroke; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(0, y(v)); c.lineTo(w, y(v)); c.stroke(); c.setLineDash([]); }
  if (!buffer.length) return;
  const newest = buffer[buffer.length - 1].t;
  c.strokeStyle = color; c.lineWidth = 1.5; c.beginPath();
  let prev = null;
  for (const s of buffer) {
    const x = w - (newest - s.t) / WINDOW_S * w;
    // Do not draw across a gap in the stream.
    if (prev === null || s.t - prev > 0.1) c.moveTo(x, y(s[key])); else c.lineTo(x, y(s[key]));
    prev = s.t;
  }
  c.stroke();
}
function drawHistory(canvas) {
  if (!canvas.offsetParent) return;
  const [c, w, h] = sizeCanvas(canvas);
  const now = performance.now() / 1000, span = 120;
  const x = t => w - (now - t) / span * w, y = r => h - 8 - r * (h - 16);
  const pts = rec.history;
  // On-the-wall periods as shaded bands.
  c.fillStyle = 'rgba(255,154,60,.18)';
  for (let i = 0; i < pts.length; i++) if (pts[i].a) c.fillRect(x(pts[i].t), 0, Math.max(1, w / span * 0.25 + 0.5), h);
  c.strokeStyle = 'rgba(92,255,199,.6)'; c.setLineDash([6, 5]); c.beginPath(); c.moveTo(0, y(READY)); c.lineTo(w, y(READY)); c.stroke(); c.setLineDash([]);
  if (pts.length < 2) return;
  const grad = c.createLinearGradient(0, y(1), 0, y(0));
  grad.addColorStop(0, 'rgba(92,255,199,.35)'); grad.addColorStop(0.5, 'rgba(255,214,102,.25)'); grad.addColorStop(1, 'rgba(255,95,109,.25)');
  c.fillStyle = grad; c.beginPath(); c.moveTo(x(pts[0].t), y(0));
  for (const p of pts) c.lineTo(x(p.t), y(p.live ? p.r : 0));
  c.lineTo(x(pts[pts.length - 1].t), y(0)); c.closePath(); c.fill();
  c.strokeStyle = '#e8f0f2'; c.lineWidth = 2; c.beginPath();
  let drawing = false;
  for (const p of pts) { if (!p.live) { drawing = false; continue; } if (!drawing) { c.moveTo(x(p.t), y(p.r)); drawing = true; } else c.lineTo(x(p.t), y(p.r)); }
  c.stroke();
  c.fillStyle = '#4c5a62'; c.font = '10px ui-monospace, monospace';
  c.fillText('100%', 4, y(1) + 10); c.fillText('0%', 4, y(0) - 3); c.fillText('−2 min', 4, h / 2); c.fillText('now', w - 26, h / 2);
}

function frame() {
  drawSignal($('fsr-chart'), 'fsr', '#5cffc7', [[threshold, 'rgba(255,214,102,.6)'], [threshold * 0.6, 'rgba(255,214,102,.25)']]);
  const cal = calibration();
  drawSignal($('emg-chart'), 'emg', '#4fd8ff', [[cal?.rest ?? null, 'rgba(125,141,149,.7)'], [cal?.top ?? null, 'rgba(255,95,109,.6)']]);
  drawHistory($('history'));
  if (capture) {
    const left = Math.max(0, (capture.until - performance.now()) / 1000);
    $('cal-msg').textContent = `${capture.kind === 'rest' ? 'Stay relaxed' : 'Squeeze as hard as you can'}… ${left.toFixed(1)} s`;
    if (left === 0) finishCapture();
  }
  if (socket.connected) {
    const stale = performance.now() - lastSampleAt > 2000;
    $('link').textContent = stale ? 'Connected · no data' : 'Connected';
    $('link').className = `pill ${stale ? 'wait' : 'ok'}`;
  }
  requestAnimationFrame(frame);
}

// ---------- recording ----------
$('record').onclick = () => {
  if (!recording) {
    recording = []; $('record').textContent = '■ Stop & download CSV'; $('record').classList.add('recording');
    $('record-msg').textContent = 'Recording…'; return;
  }
  const rows = recording; recording = null;
  $('record').textContent = '● Start recording'; $('record').classList.remove('recording');
  const csv = 'seq,mcu_ms,fsr_raw,emg_raw\n' + rows.map(r => r.join(',')).join('\n') + '\n';
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: `clyf-sleeve-${stamp}.csv` });
  link.click(); URL.revokeObjectURL(link.href);
  $('record-msg').textContent = `Downloaded ${rows.length} samples (${(rows.length / 100).toFixed(1)} s)`;
};

// ---------- socket ----------
const socket = io(window.location.origin, { path: '/socket.io', transports: ['polling', 'websocket'] });
socket.on('samples', onSamples);
socket.on('disconnect', () => { $('link').textContent = 'Board disconnected'; $('link').className = 'pill bad'; });
requestAnimationFrame(frame);
