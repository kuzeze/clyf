import { REC } from './recorded.js';
import { initViewer } from './viewer.js';

const $=id=>document.getElementById(id);
const prototypeVideo=$('prototype-video');
prototypeVideo.controls=false;
$('play-prototype').addEventListener('click',async()=>{
  $('video-error').hidden=true;
  $('play-prototype').hidden=true;
  prototypeVideo.controls=true;
  try{await prototypeVideo.play();}catch{$('play-prototype').hidden=false;$('video-error').hidden=false;}
});
prototypeVideo.addEventListener('play',()=>{$('play-prototype').hidden=true;});
prototypeVideo.addEventListener('ended',()=>{prototypeVideo.controls=false;$('play-prototype').hidden=false;});
prototypeVideo.addEventListener('error',()=>{$('video-error').hidden=false;});
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let selected=0,replaying=false,replayClock=0,lastReplay=0;
const chart=$('recorded-chart');

// Exact supplied summaries. Do not synthesize a high-frequency waveform from these values.
REC.forEach(([mean,min,max],i)=>{
  const row=document.createElement('tr');
  [i,mean.toFixed(2),min.toFixed(2),max.toFixed(2)].forEach(value=>{const cell=document.createElement('td');cell.textContent=value;row.append(cell);});
  $('recorded-table').append(row);
});
function selectSecond(value){
  selected=Number(value);$('recorded-time').value=selected;
  $('rec-value').textContent=REC[selected][0].toFixed(2);
  $('rec-state').textContent=REC[selected][0]>2?'Squeeze interval':'Lower signal';
  $('rec-time').textContent=`${String(selected).padStart(2,'0')} s / 18 s`;
  drawRecorded();
}
function playReplay(on){
  replaying=on;$('replay').textContent=on?'Pause recording':'Replay recording';$('replay').setAttribute('aria-pressed',String(on));
  lastReplay=performance.now();replayClock=0;
}
$('replay').addEventListener('click',()=>{if(!replaying&&selected===REC.length-1)selectSecond(0);playReplay(!replaying);});
$('recorded-time').addEventListener('input',e=>{playReplay(false);selectSecond(e.target.value);});
$('download-data').addEventListener('click',()=>{
  const csv='relative_second,capture_second,mean_V,min_V,max_V\n'+REC.map((r,i)=>[i,i+30,...r.map(v=>v.toFixed(2))].join(',')).join('\n')+'\n';
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='clyf-recorded-envelope-2026-10-03.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
});
function drawRecorded(){
  const w=chart.clientWidth,h=chart.clientHeight;if(!w||!h)return;
  const dpr=Math.min(devicePixelRatio||1,2);chart.width=w*dpr;chart.height=h*dpr;
  const c=chart.getContext('2d');c.scale(dpr,dpr);c.clearRect(0,0,w,h);
  const l=30,r=12,t=27,b=27,plotW=w-l-r,plotH=h-t-b;
  const x=i=>l+i/(REC.length-1)*plotW,y=v=>t+(1-v/3.3)*plotH;
  const widths=plotW/(REC.length-1);
  c.font='10px -apple-system, Arial';c.textBaseline='middle';c.textAlign='right';
  for(const v of [0,1,2,3]){c.fillStyle='#9b9b9f';c.fillText(`${v} V`,l-7,y(v));c.strokeStyle='#f0f0f1';c.lineWidth=1;c.beginPath();c.moveTo(l,y(v));c.lineTo(w-r,y(v));c.stroke();}
  c.fillStyle='#eef4f0';
  REC.forEach((row,i)=>{if(row[0]>2)c.fillRect(Math.max(l,x(i)-widths/2),t,Math.min(widths,w-r-Math.max(l,x(i)-widths/2)),plotH);});
  c.beginPath();REC.forEach((d,i)=>i?c.lineTo(x(i),y(d[2])):c.moveTo(x(i),y(d[2])));[...REC].reverse().forEach((d,j)=>c.lineTo(x(REC.length-1-j),y(d[1])));c.closePath();c.fillStyle='rgba(78,105,93,.09)';c.fill();
  c.beginPath();REC.forEach((d,i)=>i?c.lineTo(x(i),y(d[0])):c.moveTo(x(i),y(d[0])));c.strokeStyle='#4b6f60';c.lineWidth=2;c.lineJoin='round';c.stroke();
  REC.forEach((d,i)=>{c.beginPath();c.arc(x(i),y(d[0]),2.5,0,Math.PI*2);c.fillStyle='#4b6f60';c.fill();});
  c.setLineDash([3,4]);c.strokeStyle='#9ea9a3';c.lineWidth=1;c.beginPath();c.moveTo(x(selected),t);c.lineTo(x(selected),h-b);c.stroke();c.setLineDash([]);
  c.beginPath();c.arc(x(selected),y(REC[selected][0]),6,0,Math.PI*2);c.fillStyle='#fff';c.fill();c.strokeStyle='#426958';c.lineWidth=2;c.stroke();
  c.textAlign='center';c.fillStyle='#929299';c.font='9px -apple-system, Arial';
  for(let i=0;i<REC.length;i+=3)c.fillText(`${i}s`,x(i),h-9);
  if(w>480){c.fillStyle='#96a69c';[[3,'SQUEEZE 01'],[10,'SQUEEZE 02'],[16,'SQUEEZE 03']].forEach(([i,label])=>c.fillText(label,x(i),11));}
}
new ResizeObserver(drawRecorded).observe(chart);

// The original demo model remains a separate, explicitly simulated input path.
const CRITICAL=30,CAPACITY=800,TAU=20,READY=.8,RELAXED=10,LOAD_TAU=.4;
const sim={reserve:1,load:0,gripping:false,auto:false,autoStart:0};
let last=performance.now();
function grip(on){sim.gripping=on;$('grip').classList.toggle('held',on);$('grip').textContent=on?'Gripping… release to rest':'Hold to grip';}
function setAuto(on){sim.auto=on;sim.autoStart=performance.now();$('auto-demo').textContent=on?'Stop example':'Play an example';$('auto-demo').setAttribute('aria-pressed',String(on));if(!on)grip(false);}
$('grip').addEventListener('pointerdown',e=>{if(e.button!==0)return;setAuto(false);e.currentTarget.setPointerCapture(e.pointerId);grip(true);});
['pointerup','pointercancel','lostpointercapture'].forEach(event=>$('grip').addEventListener(event,()=>grip(false)));
$('grip').addEventListener('keydown',e=>{if(['Space','Enter'].includes(e.code)){e.preventDefault();if(!e.repeat){setAuto(false);grip(true);}}});
$('grip').addEventListener('keyup',e=>{if(['Space','Enter'].includes(e.code)){e.preventDefault();grip(false);}});
$('grip').addEventListener('blur',()=>{if(!sim.auto)grip(false);});
addEventListener('blur',()=>{setAuto(false);grip(false);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){setAuto(false);grip(false);playReplay(false);}last=performance.now();});
$('auto-demo').addEventListener('click',()=>setAuto(!sim.auto));
$('reset-demo').addEventListener('click',()=>{setAuto(false);sim.reserve=1;sim.load=0;renderSim();});
['effort','tension'].forEach(id=>$(id).addEventListener('input',()=>{$(`${id}-value`).textContent=`${$(id).value}%`;}));
function renderSim(){
  const p=Math.round(sim.reserve*100);$('reserve').textContent=p;$('reserve-meter').value=p;$('reserve-meter').textContent=`${p}%`;
  $('reserve-meter').style.setProperty('--meter-color',sim.reserve<.4?'#e4b393':sim.reserve<READY?'#ddcca2':'#a4d5bd');
  const speed=Math.min(1,Math.max(0,(CRITICAL-sim.load)/(CRITICAL-RELAXED)));
  let headline,subline;
  if(sim.gripping){headline=sim.reserve>.05?'Effort adds up.':'Time for a pause.';subline=`Simulated grip · ${$('effort').value}% of calibrated range`;}else if(sim.reserve<READY){
    if(speed<.001){headline='Still holding tension.';subline='Lower the resting tension to let the model recover.';}
    else{const eta=Math.ceil(TAU/speed*Math.log((1-sim.reserve)/(1-READY)));headline=`Recharging. About ${eta}s.`;subline='Estimated time to the model’s 80% ready line';}
  }else{headline='Ready for another try.';subline='Hold the button. Release to rest.';}
  if($('demo-headline').textContent!==headline)$('demo-headline').textContent=headline;
  $('demo-subline').textContent=subline;
}
function tick(){
  const now=performance.now(),dt=Math.min(.2,(now-last)/1000);last=now;if(document.hidden)return;
  if(sim.auto){const t=(now-sim.autoStart)/1000;if(t<8){if(!sim.gripping)grip(true);}else if(t<27){if(sim.gripping)grip(false);}else setAuto(false);}
  const target=sim.gripping?+$('effort').value:+$('tension').value;
  sim.load+=(target-sim.load)*(1-Math.exp(-dt/LOAD_TAU));
  const speed=Math.min(1,Math.max(0,(CRITICAL-sim.load)/(CRITICAL-RELAXED)));
  if(sim.load>CRITICAL)sim.reserve-=(sim.load-CRITICAL)*dt/CAPACITY;
  else sim.reserve+=(1-sim.reserve)*(1-Math.exp(-dt*speed/TAU));
  sim.reserve=Math.max(0,Math.min(1,sim.reserve));renderSim();
  if(replaying){replayClock+=Math.min(.2,(now-lastReplay)/1000);lastReplay=now;if(replayClock>=1){replayClock-=1;if(selected<REC.length-1)selectSecond(selected+1);else playReplay(false);}}
}
selectSecond(0);renderSim();setInterval(tick,100);initViewer();
