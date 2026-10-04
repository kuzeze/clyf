// 3D models and scenes for the CLYF promo, rendered with three.js r170 + bloom.
// Everything is procedural: forearm, sleeve, electrodes, MyoWare, UNO Q, battery.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const COLORS = {
  bg: 0x070a0d, mint: 0x5cffc7, amber: 0xffb547, red: 0xff5a6a, pink: 0xff4f8b, cyan: 0x4fd8ff,
};
const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
const lerp = (a, b, x) => a + (b - a) * x;

// ---------- renderer ----------
export const canvas3d = document.createElement('canvas');
const renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.bg);
scene.fog = new THREE.Fog(COLORS.bg, 14, 30);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;
const camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 100);
let composer = null, bloom = null, size = [0, 0];
function setSize(w, h) {
  if (size[0] === w && size[1] === h) return;
  size = [w, h];
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  composer = new EffectComposer(renderer);
  composer.setSize(w, h);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(w, h), BLOOM.strength, BLOOM.radius, BLOOM.threshold);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
}

// ---------- lights ----------
scene.add(new THREE.HemisphereLight(0xbfd6ff, 0x0a0d10, 0.25));
const key = new THREE.DirectionalLight(0xffffff, 1.3); key.position.set(4, 7, 6); scene.add(key);
const rimPink = new THREE.PointLight(COLORS.pink, 10, 18); rimPink.position.set(-3, 2, -4); scene.add(rimPink);
const rimCyan = new THREE.PointLight(COLORS.cyan, 8, 18); rimCyan.position.set(9, 3, -3); scene.add(rimCyan);

// ---------- materials ----------
const skin = new THREE.MeshPhysicalMaterial({ color: 0xb87a5c, roughness: 0.6, sheen: 0.3, sheenColor: 0xe0a88c });
function knitTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 4) { g.fillStyle = y % 8 ? '#6a6a6a' : '#9a9a9a'; g.fillRect(0, y, 256, 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 1); return t;
}
const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.92, metalness: 0.0, bumpMap: knitTexture(), bumpScale: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 1 });
const padMat = new THREE.MeshStandardMaterial({ color: 0xb9bcb6, roughness: 0.75 });
const snapMat = c => new THREE.MeshStandardMaterial({ color: c, metalness: 0.6, roughness: 0.3 });
const glowMat = () => new THREE.MeshBasicMaterial({ color: COLORS.mint, transparent: true, opacity: 0.9, toneMapped: false });
const BLOOM = { strength: 0.55, radius: 0.45, threshold: 0.9 };

// ---------- forearm + sleeve ----------
// Profile along the arm: radius at distance from the wrist (0) to the elbow (4.4).
const PROFILE = [[0.40, 0], [0.42, 0.6], [0.47, 1.4], [0.56, 2.4], [0.64, 3.3], [0.66, 3.9], [0.62, 4.4]];
const radiusAt = x => { for (let i = 1; i < PROFILE.length; i++) if (x <= PROFILE[i][1]) { const [r0, y0] = PROFILE[i - 1], [r1, y1] = PROFILE[i]; return lerp(r0, r1, (x - y0) / (y1 - y0)); } return PROFILE.at(-1)[0]; };
const DEPTH = 0.85; // forearms are oval, flatter front to back
function lathe(points, open) {
  const g = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), 64);
  g.rotateZ(-Math.PI / 2); // lathe axis y -> arm axis x
  g.scale(1, 1, DEPTH);
  return g;
}
export const arm = new THREE.Group();
arm.add(new THREE.Mesh(lathe([[0.001, -0.04], ...PROFILE, [0.001, 4.46]]), skin));
const fist = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.82, 0.8, 6, 0.32), skin); fist.position.set(-0.45, 0.02, 0); arm.add(fist);
const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.35, 6, 12), skin); thumb.position.set(-0.55, 0.28, 0.32); thumb.rotation.z = 1.2; arm.add(thumb);
const sleevePts = PROFILE.filter(([, y]) => y >= 0.5 && y <= 4.0).map(([r, y]) => [r * 1.07, y]);
const sleeve = new THREE.Mesh(lathe([[radiusAt(0.5) * 1.07, 0.5], ...sleevePts, [radiusAt(4.0) * 1.07, 4.0]]), sleeveMat);
arm.add(sleeve);
// Electrodes on the palm side (+z), along the flexors; REF up on the bony elbow.
export const electrodes = [];
function electrode(x, angle, snapColor) {
  const r = radiusAt(x) * 1.07;
  const n = new THREE.Vector3(0, Math.sin(angle), Math.cos(angle) * DEPTH).normalize();
  const pos = new THREE.Vector3(x, Math.sin(angle) * r, Math.cos(angle) * r * DEPTH).addScaledVector(n, 0.01);
  const g = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.035, 40), padMat);
  const snap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.07, 24), snapMat(snapColor)); snap.position.y = 0.05;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.018, 10, 64), glowMat()); ring.rotation.x = Math.PI / 2; ring.position.y = 0.02;
  g.add(pad, snap, ring);
  g.position.copy(pos);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
  arm.add(g);
  const e = { group: g, ring, pos, normal: n };
  electrodes.push(e);
  return e;
}
const MID = electrode(2.75, 0.15, 0xd62b3a), END = electrode(2.15, 0.1, 0x2f6fe0), REF = electrode(3.95, 1.25, 0x1a1a1a);

// ---------- MyoWare (red triangle) ----------
export const myoware = new THREE.Group();
{
  const s = new THREE.Shape(); const R = 0.5;
  for (let i = 0; i < 3; i++) { const a = Math.PI / 2 + i * 2 * Math.PI / 3; const x = Math.cos(a) * R, y = Math.sin(a) * R; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.08, bevelSegments: 4 });
  g.rotateX(-Math.PI / 2);
  myoware.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.45 })));
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + i * 2 * Math.PI / 3;
    const snap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 24), new THREE.MeshStandardMaterial({ color: 0xd9d9d9, metalness: 0.9, roughness: 0.2 }));
    snap.position.set(Math.cos(a) * 0.36, 0.08, -Math.sin(a) * 0.36); myoware.add(snap);
  }
  const chip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.14), new THREE.MeshStandardMaterial({ color: 0x111111 })); chip.position.y = 0.07; myoware.add(chip);
}

// ---------- Arduino UNO Q ----------
export const board = new THREE.Group();
const ledCells = [];
{
  const pcb = new THREE.Mesh(new RoundedBoxGeometry(2.7, 0.07, 2.0, 3, 0.06), new THREE.MeshStandardMaterial({ color: 0x1b3550, roughness: 0.5, metalness: 0.2 }));
  board.add(pcb);
  const hdr = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4a640, metalness: 1, roughness: 0.25 });
  for (const z of [-0.88, 0.88]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.16, 0.14), hdr); strip.position.set(0.15, 0.115, z); board.add(strip);
    for (let i = 0; i < 18; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.02, 0.035), gold); p.position.set(-0.85 + i * 0.118, 0.2, z); board.add(p); }
  }
  const soc = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.55), new THREE.MeshStandardMaterial({ color: 0x0e0e10, metalness: 0.4, roughness: 0.35 })); soc.position.set(-0.55, 0.065, -0.2); board.add(soc);
  const mcu = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.34), new THREE.MeshStandardMaterial({ color: 0x141414 })); mcu.position.set(0.35, 0.06, -0.35); board.add(mcu);
  const usb = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.12, 0.22, 2, 0.05), new THREE.MeshStandardMaterial({ color: 0xbfc4c9, metalness: 1, roughness: 0.25 })); usb.position.set(-1.33, 0.09, 0.3); board.add(usb);
  // 13 x 8 LED matrix, the UNO Q's own
  const ledGeo = new THREE.BoxGeometry(0.045, 0.02, 0.045);
  for (let i = 0; i < 13; i++) for (let j = 0; j < 8; j++) {
    const m = new THREE.Mesh(ledGeo, new THREE.MeshBasicMaterial({ color: 0x3a8bff, toneMapped: false }));
    m.position.set(0.2 + i * 0.075, 0.05, 0.05 + j * 0.075); board.add(m); ledCells.push(m);
  }
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.font = '700 74px "JetBrains Mono", monospace'; g.fillText('UNO Q', 12, 90);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
  label.rotation.x = -Math.PI / 2; label.position.set(-0.75, 0.04, 0.55); board.add(label);
}

// ---------- battery ----------
export const battery = new THREE.Group();
const fillMat = new THREE.MeshStandardMaterial({ color: COLORS.mint, emissive: COLORS.mint, emissiveIntensity: 0.55, roughness: 0.4 });
const fill = new THREE.Mesh(new RoundedBoxGeometry(1.96, 0.86, 0.36, 4, 0.12), fillMat);
{
  const shell = new THREE.Mesh(new RoundedBoxGeometry(2.3, 1.12, 0.56, 6, 0.2), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, thickness: 0.25, roughness: 0.06, ior: 1.35, transparent: true }));
  const nub = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.42, 0.3, 3, 0.06), new THREE.MeshStandardMaterial({ color: 0xcfd6db, metalness: 0.8, roughness: 0.3 }));
  nub.position.x = 1.25;
  battery.add(fill, shell, nub);
}
export function setBattery(level) {
  const l = Math.max(0.02, Math.min(1, level));
  fill.scale.x = l; fill.position.x = -0.98 * (1 - l);
  const c = new THREE.Color(l >= 0.8 ? COLORS.mint : l >= 0.4 ? COLORS.amber : COLORS.red);
  fillMat.color.copy(c); fillMat.emissive.copy(c);
}

// ---------- wires and signal particles ----------
const wireMat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 });
const wires = new THREE.Group();
const flowPaths = [];
const particleMat = new THREE.MeshBasicMaterial({ color: 0x8fffd9, toneMapped: false });
const particles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 12, 8), particleMat, 90);
particles.frustumCulled = false;
function rebuildWires(myoPos, boardPos, batteryPos) {
  wires.clear(); flowPaths.length = 0;
  const worldOf = e => e.group.getWorldPosition(new THREE.Vector3());
  const myoIn = myoPos.clone().add(new THREE.Vector3(0, 0.1, 0));
  for (const [e, color] of [[MID, 0xd62b3a], [END, 0x2f6fe0], [REF, 0x222222]]) {
    const p0 = worldOf(e);
    const mid = p0.clone().lerp(myoIn, 0.5).add(new THREE.Vector3(0, 0.5, 0.4));
    const curve = new THREE.CatmullRomCurve3([p0, mid, myoIn]);
    wires.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.022, 8), wireMat(color)));
    if (e !== REF) flowPaths.push(curve);
  }
  const toBoard = new THREE.CatmullRomCurve3([myoPos, myoPos.clone().lerp(boardPos, 0.5).add(new THREE.Vector3(0, -0.2, 0.5)), boardPos.clone().add(new THREE.Vector3(-1.0, 0.1, 0.6))]);
  for (const [dz, color] of [[0, 0xe8c547], [0.08, 0xd62b3a], [-0.08, 0x222222]]) {
    const pts = toBoard.getPoints(30).map(p => p.clone().add(new THREE.Vector3(0, 0, dz)));
    wires.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.02, 8), wireMat(color)));
  }
  flowPaths.push(toBoard);
  if (batteryPos) flowPaths.push(new THREE.CatmullRomCurve3([boardPos.clone().add(new THREE.Vector3(0.8, 0.3, 0)), boardPos.clone().lerp(batteryPos, 0.5).add(new THREE.Vector3(0, 0.9, 0.3)), batteryPos.clone().add(new THREE.Vector3(-1.2, 0, 0))]));
}
const tmp = new THREE.Object3D();
function updateParticles(t, intensity = 1) {
  let k = 0;
  flowPaths.forEach((curve, ci) => {
    const n = ci === flowPaths.length - 1 && flowPaths.length > 3 ? 18 : 22;
    for (let i = 0; i < n && k < 90; i++, k++) {
      const u = ((i / n) + t * 0.45 + ci * 0.13) % 1;
      tmp.position.copy(curve.getPointAt(u));
      const s = intensity * (0.6 + 0.6 * Math.sin((u * 6 + t * 3) * Math.PI)) ;
      tmp.scale.setScalar(Math.max(0.001, s));
      tmp.updateMatrix(); particles.setMatrixAt(k, tmp.matrix);
    }
  });
  for (; k < 90; k++) { tmp.scale.setScalar(0.0001); tmp.updateMatrix(); particles.setMatrixAt(k, tmp.matrix); }
  particles.instanceMatrix.needsUpdate = true;
}
function pulseElectrodes(t, strength = 1) {
  electrodes.forEach((e, i) => {
    const p = 0.5 + 0.5 * Math.sin(t * 5 - i * 0.9);
    e.ring.material.opacity = strength * (0.25 + 0.75 * p);
    e.ring.scale.setScalar(1 + 0.25 * p * strength);
  });
}
function twinkle(t) { ledCells.forEach((m, i) => { const on = Math.sin(i * 12.9898 + Math.floor(t * 8) * 78.233) > 0.2; m.material.color.setHex(on ? 0x5aa9ff : 0x0d1f3a); }); }

scene.add(arm, myoware, board, battery, wires, particles);

// ---------- projection helper (for 2D labels) ----------
export function project(v) {
  const p = v.clone().project(camera);
  return { x: (p.x + 1) / 2 * size[0], y: (1 - p.y) / 2 * size[1], behind: p.z > 1 };
}
export const anchors = {
  mid: () => MID.group.getWorldPosition(new THREE.Vector3()),
  end: () => END.group.getWorldPosition(new THREE.Vector3()),
  myoware: () => myoware.getWorldPosition(new THREE.Vector3()),
  board: () => board.getWorldPosition(new THREE.Vector3()),
  battery: () => battery.getWorldPosition(new THREE.Vector3()),
  arm: () => arm.localToWorld(new THREE.Vector3(2.2, 0.7, 0)),
};

function show(o) { arm.visible = o.arm; myoware.visible = o.myo; board.visible = o.board; battery.visible = o.battery; wires.visible = o.wires; particles.visible = o.wires; }

// ---------- scenes: each takes local time u (s) and renders a frame; returns the canvas ----------
let built = '';
export function renderOpen(u, w = 1920, h = 1080) {
  setSize(w, h);
  if (built !== 'open') {
    built = 'open';
    arm.position.set(-2.2, -0.6, 0); arm.rotation.set(0, 0.25, 0);
    battery.position.set(0.6, 0.85, -0.8); battery.rotation.set(0.12, -0.35, 0);
    show({ arm: true, myo: false, board: false, battery: true, wires: false });
    sleeveMat.opacity = 1;
  }
  // battery: drains while "gripping", then recharges and flashes ready
  const lvl = u < 0.5 ? 1 : u < 2.0 ? lerp(1, 0.22, ease((u - 0.5) / 1.5)) : u < 2.9 ? lerp(0.22, 1, ease((u - 2.0) / 0.9)) : 1;
  setBattery(lvl);
  battery.rotation.y = -0.35 + u * 0.12;
  pulseElectrodes(u, u < 2.0 ? 1 : 0.6);
  // camera: tight on the electrodes, pulling out into a three-quarter view
  const mid = anchors.mid();
  const a = ease(u / 2.6);
  camera.position.set(lerp(mid.x + 0.7, 0.6, a), lerp(mid.y + 0.8, 1.7, a), lerp(mid.z + 2.6, 7.6, a));
  camera.lookAt(lerp(mid.x, -0.4, a), lerp(mid.y, 0.35, a), lerp(mid.z, 0, a));
  bloom.strength = BLOOM.strength + (u > 2.85 && u < 3.3 ? 0.8 * (1 - Math.abs(u - 3.05) / 0.25) : 0);
  composer.render();
  return canvas3d;
}

export function renderExplain(u, w, h) {
  setSize(w, h);
  if (built !== 'explain') {
    built = 'explain';
    arm.position.set(-2.8, 0.35, 0); arm.rotation.set(0, 0, 0);
    myoware.position.set(0.9, -0.75, 1.7); myoware.rotation.set(0.35, 0.3, 0);
    board.position.set(3.1, -1.0, 1.0); board.rotation.set(0.3, -0.45, 0);
    battery.visible = false;
    show({ arm: true, myo: true, board: true, battery: false, wires: true });
    arm.updateMatrixWorld(true); myoware.updateMatrixWorld(true); board.updateMatrixWorld(true);
    rebuildWires(myoware.position.clone(), board.position.clone(), null);
    sleeveMat.opacity = 0.9;
  }
  pulseElectrodes(u, 1); updateParticles(u, ease(u / 0.8)); twinkle(u);
  const ang = -0.5 + u * 0.09;
  camera.position.set(0.5 + Math.sin(ang) * 9.2, 2.6, Math.cos(ang) * 9.2);
  camera.lookAt(0.4, -0.25, 0.6);
  bloom.strength = BLOOM.strength;
  composer.render();
  return canvas3d;
}

export function renderPipeline(u, w = 1920, h = 1080) {
  setSize(w, h);
  if (built !== 'pipeline') {
    built = 'pipeline';
    arm.position.set(-4.2, 0, 0); arm.rotation.set(0, 0.15, 0);
    myoware.position.set(1.0, -0.6, 1.2); myoware.rotation.set(0.5, 0.2, 0);
    board.position.set(4.2, -0.5, 0.6); board.rotation.set(0.55, -0.25, 0);
    battery.position.set(9.0, 0.2, 0.2); battery.rotation.set(0.15, -0.4, 0);
    show({ arm: true, myo: true, board: true, battery: true, wires: true });
    arm.updateMatrixWorld(true); myoware.updateMatrixWorld(true); board.updateMatrixWorld(true);
    rebuildWires(myoware.position.clone(), board.position.clone(), battery.position.clone());
    sleeveMat.opacity = 1;
  }
  pulseElectrodes(u, 1); updateParticles(u * 1.3, 1); twinkle(u);
  setBattery(0.45 + 0.55 * ease((u - 3.4) / 2.2));
  battery.rotation.y = -0.4 + u * 0.08;
  // dolly across the three stations
  const x = lerp(-1.6, 6.6, ease(u / 5.4));
  camera.position.set(x, 2.3, 9.6);
  camera.lookAt(x + 0.4, 0, 0);
  bloom.strength = BLOOM.strength;
  composer.render();
  return canvas3d;
}

export function renderOutro(u, w = 1920, h = 1080) {
  setSize(w, h);
  if (built !== 'outro') {
    built = 'outro';
    show({ arm: false, myo: false, board: false, battery: true, wires: false });
    battery.position.set(0, 1.2, 0); battery.rotation.set(0.15, -0.5, 0);
  }
  setBattery(lerp(0.35, 1, ease((u - 0.2) / 1.6)));
  battery.rotation.y = -0.5 + u * 0.18;
  camera.position.set(0, 0.2, 8.6); camera.lookAt(0, 0.9, 0);
  bloom.strength = BLOOM.strength + (u > 1.7 && u < 2.3 ? 0.7 * (1 - Math.abs(u - 2.0) / 0.3) : 0);
  composer.render();
  return canvas3d;
}
