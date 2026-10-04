import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';
import { createSleeve, cableGeometry } from './model.js';

const $ = id => document.getElementById(id);
const data = [
  { id:'emg', kind:'emg', y:.65, angle:.08, color:0x91b5a6 },
  { id:'fsr', kind:'fsr', y:-1.12, angle:-.25, color:0xd7b989 },
];
const descriptions = {
  emg:'MyoWare 2.0 · muscle electrical activity. The illustrated electrodes sit against the forearm; the prototype reads the ENV output.',
  fsr:'FSR 400 · pressure at one contact point. Position shown is a design study; sensor placement still needs testing.',
  uno:'Arduino UNO Q · samples both channels at 100 Hz. Shown separately because the current prototype uses an external board.',
};
const state = {mode:'surface', selected:'emg', amount:0};
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer, camera, controls, model, board, scene, goal = null, active = true, last = performance.now();
let boardOutline;

function component(id) {
  state.selected=id;
  document.querySelectorAll('[data-component]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.component===id)));
  $('component-copy').textContent=descriptions[id];
  model?.pods.forEach(p=>p.outline.material.opacity=p.data.id===id?.7:0);
  if(boardOutline)boardOutline.material.opacity=id==='uno'?.7:0;
}
function mode(next) {
  state.mode=next;
  document.querySelector('.hero').classList.toggle('is-open', next!=='surface');
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===next)));
  $('component-detail').hidden=next==='surface';
  $('model-caption').firstChild.textContent={surface:'White textile. Technology on the inside.',inside:'Two sensor inputs. One external controller.',exploded:'Explore the layers of the concept.'}[next];
  if(!model)return;
  const surface=next==='surface';
  model.body.visible=next!=='inside';
  model.fabricMat.opacity=surface?1:.075;
  model.fabricMat.transparent=!surface;model.fabricMat.depthWrite=surface;model.fabricMat.needsUpdate=true;
  model.cuffMat.opacity=surface?1:.35;model.cuffMat.transparent=!surface;model.cuffMat.depthWrite=surface;model.cuffMat.needsUpdate=true;
  model.linerMat.opacity=surface?1:.16;model.linerMat.transparent=!surface;model.linerMat.depthWrite=surface;model.linerMat.needsUpdate=true;
  model.hardware.visible=!surface;model.circuit.visible=!surface;board.visible=!surface;model.logo.visible=surface;model.accent.visible=surface;
  model.trims.forEach(t=>t.material.opacity=surface?.25:.14);
  model.pods.forEach(p=>p.cable.visible=next==='exploded');
  goal=surface?new THREE.Vector3(2.8,2.5,10.6):new THREE.Vector3(.8,1.7,12.7);
  controls.target.set(surface?0:.5,0,0);
  component(state.selected);
}

export function initViewer() {
  const viewer=$('viewer');
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>mode(b.dataset.view)));
  document.querySelectorAll('[data-component]').forEach(b=>b.addEventListener('click',()=>component(b.dataset.component)));
  $('explore-sleeve').addEventListener('click',()=>{mode('inside');$('product').scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'});});
  $('reset-view').addEventListener('click',()=>{if(controls){mode('surface');model.root.rotation.set(0,0,-.34);}});
  try {
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xffffff,0);
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.91;
    viewer.prepend(renderer.domElement);
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.set(2.8,2.5,10.6);
    controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=!reduced;controls.dampingFactor=.08;controls.minDistance=7.5;controls.maxDistance=17;controls.enablePan=false;controls.minPolarAngle=.2;controls.maxPolarAngle=Math.PI-.2;
    controls.enableZoom=false; // Preserve ordinary page scrolling; intentional modifier zoom below.
    controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_ROTATE;
    controls.addEventListener('start',()=>{goal=null;});
    renderer.domElement.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();camera.position.multiplyScalar(e.deltaY>0?1.05:.95);camera.position.clampLength(7.5,17);goal=null;},{passive:false});
    $('view-hint').textContent='Drag to rotate · + / − to zoom';
    viewer.addEventListener('keydown',e=>{
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-'].includes(e.key)){
        e.preventDefault();goal=null;
        if(e.key==='ArrowLeft')model.root.rotation.y-=.14;
        if(e.key==='ArrowRight')model.root.rotation.y+=.14;
        if(e.key==='ArrowUp')model.root.rotation.x-=.1;
        if(e.key==='ArrowDown')model.root.rotation.x+=.1;
        if(e.key==='+'||e.key==='=')camera.position.multiplyScalar(.95);
        if(e.key==='-')camera.position.multiplyScalar(1.05);
        camera.position.clampLength(7.5,17);
      }
    });
    const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xffffff,0x989ea5,1));
    const key=new THREE.DirectionalLight(0xffffff,2.8);key.position.set(-3,6,4);scene.add(key);
    const rim=new THREE.DirectionalLight(0xf0f4ff,1.6);rim.position.set(5,2,-4);scene.add(rim);
    model=createSleeve(data);model.root.rotation.z=-.34;scene.add(model.root);
    board=makeBoard();board.position.set(1.65,-1.3,.4);board.rotation.y=-.13;model.root.add(board);
    resize();new ResizeObserver(resize).observe(viewer);
    new IntersectionObserver(entries=>{active=entries[0].isIntersecting;},{rootMargin:'150px'}).observe(viewer);
    mode('surface');component('emg');$('viewer-loading').hidden=true;
    renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('viewer-loading').textContent='The 3D view paused. Reload the page to restore it.';$('viewer-loading').hidden=false;});
    requestAnimationFrame(frame);
  } catch(error) {
    console.warn('CLYF 3D unavailable:',error.message);
    $('viewer-loading').innerHTML='<p>3D is unavailable in this browser.<br>The sensor story and recorded data are available below.</p>';
    document.querySelectorAll('[data-view],#reset-view').forEach(b=>b.disabled=true);
    $('explore-sleeve').textContent='Explore the sensors';
    $('explore-sleeve').addEventListener('click',()=>document.querySelector('.sensing').scrollIntoView());
  }
}
function makeBoard(){
  const group=new THREE.Group();
  const green=new THREE.MeshStandardMaterial({color:0x376f64,roughness:.65}),black=new THREE.MeshStandardMaterial({color:0x252b2a,roughness:.62}),silver=new THREE.MeshStandardMaterial({color:0xc0c7c5,roughness:.38,metalness:.7});
  const add=(w,h,d,mat,x=0,y=0,z=0)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);group.add(mesh);return mesh;};
  add(.95,1.4,.04,green);add(.44,.49,.065,black,0,.13,.053);add(.28,.32,.06,silver,0,-.38,.055);
  for(const x of [-.39,.39]){add(.105,1.06,.12,black,x,0,.08);for(let j=0;j<9;j++)add(.035,.035,.012,silver,x,-.46+j*.116,.148);}
  add(.23,.18,.10,silver,0,.7,.06);
  boardOutline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.04,1.49,.08)),new THREE.LineBasicMaterial({color:0x75ac94,transparent:true,opacity:0}));group.add(boardOutline);
  return group;
}
function resize(){if(!renderer)return;const v=$('viewer');renderer.setSize(v.clientWidth,v.clientHeight,false);camera.aspect=v.clientWidth/v.clientHeight;camera.updateProjectionMatrix();}
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min((now-last)/1000,.06);last=now;
  if(!active||document.hidden)return;
  if(!reduced)model.root.position.y=Math.sin(now*.0006)*.055;
  const target=state.mode==='exploded'?1:0;
  const old=state.amount;state.amount=reduced?target:THREE.MathUtils.damp(old,target,5,dt);
  if(Math.abs(old-state.amount)>.00001||Math.abs(target-state.amount)>.00001){
    for(const p of model.pods){p.group.position.copy(p.base);p.group.position.x+=(p.data.id==='emg'?-.9:.25)*state.amount;p.group.position.z+=1.3*state.amount;
      p.cable.geometry.dispose();p.cable.geometry=cableGeometry(p.dock,p.group.position);
    }
    board.position.set(1.65+.6*state.amount,-1.3,.4+.6*state.amount);
  }
  if(goal){if(reduced){camera.position.copy(goal);goal=null;}else{camera.position.lerp(goal,1-Math.exp(-5*dt));if(camera.position.distanceTo(goal)<.005)goal=null;}}
  controls.update();renderer.render(scene,camera);
}
