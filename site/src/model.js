import * as THREE from 'three';

const TAU=Math.PI*2;
export function radius(y){const t=(y+2.45)/4.9;return .53+.43*t+.095*Math.sin(Math.PI*t);}
function center(y){return .095*Math.sin((y+2.45)/4.9*Math.PI)-.045*y;}
export function surfacePoint(y,a,offset=0){const r=radius(y)+offset;return new THREE.Vector3(Math.sin(a)*r+center(y),y,Math.cos(a)*r*.84);}

function textileTexture(){
  const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');
  ctx.fillStyle='#a5a59c';ctx.fillRect(0,0,256,256);
  for(let y=-16;y<272;y+=16)for(let x=-16;x<272;x+=16){
    const xx=x+(Math.round(y/16)%2)*1;
    ctx.lineCap='round';ctx.lineWidth=5;ctx.strokeStyle='#797c71';ctx.beginPath();ctx.moveTo(xx+2,y-2);ctx.quadraticCurveTo(xx+6,y+7,xx+8,y+11);ctx.quadraticCurveTo(xx+10,y+7,xx+14,y-2);ctx.stroke();
    ctx.lineWidth=2.6;ctx.strokeStyle='#d4d4c7';ctx.beginPath();ctx.moveTo(xx+1,y-3);ctx.quadraticCurveTo(xx+5,y+5,xx+7,y+9);ctx.moveTo(xx+10,y+9);ctx.quadraticCurveTo(xx+12,y+5,xx+14,y-3);ctx.stroke();
    ctx.lineWidth=.7;ctx.strokeStyle='#ecebde';ctx.beginPath();ctx.moveTo(xx+2,y-3);ctx.lineTo(xx+6,y+6);ctx.moveTo(xx+11,y+6);ctx.lineTo(xx+13,y-3);ctx.stroke();
  }
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(4,4);t.anisotropy=8;return t;
}

function shellGeometry(y0,y1,offset=0,segments=80,rings=70,rib=0){
  const positions=[],uvs=[],indices=[];
  for(let j=0;j<=rings;j++){const t=j/rings,y=THREE.MathUtils.lerp(y0,y1,t);for(let i=0;i<=segments;i++){
    const a=i/segments*TAU,r=radius(y)+offset+rib*(.5+.5*Math.cos(a*90));
    const wrinkle=.008*Math.sin(y*22+a*3)*Math.pow(Math.sin(t*Math.PI),2);
    positions.push(Math.sin(a)*(r+wrinkle)+center(y),y,Math.cos(a)*(r+wrinkle)*.84);uvs.push(i/segments,t);
    if(j<rings&&i<segments){const k=j*(segments+1)+i;indices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}
  }}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function roundedBox(w,h,d,r=.06){const s=new THREE.Shape(),x=-w/2,y=-h/2;r=Math.min(r,w/2,h/2);
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.009,bevelThickness:.009,curveSegments:9});g.translate(0,0,-d/2);return g;
}
function mesh(geometry,material,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function standard(color,options={}){return new THREE.MeshStandardMaterial({color,roughness:.6,metalness:.1,...options});}
function print(text,color='#e5e7d7',size=55){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.font=`500 ${size}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide});}
function pathLine(points,color,opacity=1,r=.007){const curve=new THREE.CatmullRomCurve3(points);return new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(24,points.length*6),r,5,false),new THREE.MeshStandardMaterial({color,transparent:opacity<1,opacity,roughness:.8}));}

export function createSleeve(sensorData){
  const root=new THREE.Group();root.name='CLYF Sleeve Concept';
  const cloth=new THREE.Group();root.add(cloth);const texture=textileTexture();
  const fabricMat=new THREE.MeshPhysicalMaterial({color:0xe2e4e8,roughness:.94,metalness:0,sheen:.35,sheenColor:0xffffff,sheenRoughness:.8,bumpMap:texture,bumpScale:.040,side:THREE.DoubleSide,transparent:true,opacity:.34,depthWrite:false});
  const cuffMat=fabricMat.clone();cuffMat.color.set(0xe4e6e9);cuffMat.bumpScale=.035;cuffMat.opacity=.47;
  const linerMat=new THREE.MeshStandardMaterial({color:0x969b9b,roughness:.92,bumpMap:texture,bumpScale:.014,side:THREE.DoubleSide});
  const body=mesh(shellGeometry(-2.45,2.45),fabricMat,cloth);body.renderOrder=4;
  const liner=mesh(shellGeometry(-2.45,2.45,-.09),linerMat,cloth);liner.renderOrder=1;
  const top=mesh(shellGeometry(1.99,2.46,.012,180,10,.01),cuffMat,cloth);top.renderOrder=5;
  const bottom=mesh(shellGeometry(-2.46,-2.12,.01,180,10,.009),cuffMat,cloth);bottom.renderOrder=5;
  const trims=[];
  for(const y of [-2.46,-2.15,2.03,2.46]){const points=[];for(let i=0;i<=120;i++)points.push(surfacePoint(y,i/120*TAU,.018));const line=pathLine(points,0xc3c7ce,.6,.009);cloth.add(line);trims.push(line);}
  // A diagonal knit seam and fabric wordmark, rather than a protruding enclosure.
  const seamPoints=[];for(let i=0;i<=60;i++){const y=-1.9+i/60*3.7;seamPoints.push(surfacePoint(y,-.36+.24*Math.sin(i/60*Math.PI),.012));}
  const seam=pathLine(seamPoints,0xbec3ca,.35,.006);cloth.add(seam);trims.push(seam);
  const logo=mesh(new THREE.PlaneGeometry(.36,.09),print('C L Y F','#c0c4ca',49),cloth);logo.position.copy(surfacePoint(-1.72,.07,.028));logo.rotation.y=.07;logo.renderOrder=6;
  const accent=mesh(new THREE.BoxGeometry(.09,.016,.005),standard(0xcbd0d6),cloth);accent.position.copy(surfacePoint(-1.84,.07,.03));accent.rotation.y=.07;accent.renderOrder=6;
  const hardware=new THREE.Group();root.add(hardware);const gold=standard(0xc5a574,{roughness:.47,metalness:.68}),silver=standard(0xb7bbb5,{roughness:.38,metalness:.6}),dark=standard(0x25322b,{roughness:.56}),black=standard(0x111d17,{roughness:.3}),pcb=standard(0x355347,{roughness:.75});
  const pods=[];const hitMeshes=[];
  for(const data of sensorData){
    const group=new THREE.Group();group.name=data.id;hardware.add(group);const base=surfacePoint(data.y,data.angle,-.055);group.position.copy(base);group.rotation.y=data.angle;
    const accentMat=standard(data.color,{roughness:.48,metalness:.32});let w=.39,h=.36,d=.055;
    if(data.kind==='nirs'){w=.92;h=.29;d=.085;}if(data.kind==='core'){w=.42;h=.69;d=.105;}if(data.kind==='imu'){w=.35;h=.32;d=.045;}if(data.kind==='temp'){w=.22;h=.26;d=.026;}
    const parts=[];let casing;
    if(data.kind==='emg'){
      w=.34;h=.95;d=.022;
      for(const y of [-.23,.23]){mesh(roundedBox(.30,.31,.025,.08),silver,group,0,y,0);mesh(roundedBox(.235,.24,.008,.065),accentMat,group,0,y,.022);}
      mesh(roundedBox(.13,.15,.018,.03),silver,group,.22,-.03,-.006);
      mesh(new THREE.BoxGeometry(.055,.74,.014),gold,group,0,0,-.022);
      casing=group.children[1];
    }else if(data.kind==='fsr'){
      w=.35;h=.72;d=.025;
      mesh(new THREE.CircleGeometry(.18,48),black,group,0,.17,.013);
      mesh(new THREE.RingGeometry(.145,.18,48),silver,group,0,.17,.018);
      mesh(roundedBox(.12,.43,.015,.02),standard(0xb59a67),group,0,-.14,0);
      for(const x of [-.027,.027])mesh(new THREE.BoxGeometry(.012,.31,.006),silver,group,x,-.16,.014);
      casing=group.children[0];
    }else{
      mesh(roundedBox(w+.055,h+.055,.013,.065),gold,group,0,0,-d/2-.012);
      casing=mesh(roundedBox(w,h,d,.06),data.kind==='imu'?pcb:dark,group);
      if(data.kind==='nirs'){
        for(const x of [-.29,-.09,.14,.32]){
          mesh(new THREE.CylinderGeometry(.047,.047,.016,24),black,group,x,0,-d/2-.017).rotation.x=Math.PI/2;
          mesh(new THREE.CircleGeometry(.032,24),standard(x<0?0xc1704a:0x34554a,{emissive:x<0?0xa34021:0x123222,emissiveIntensity:.30}),group,x,0,-d/2-.027).rotation.y=Math.PI;
        }
        mesh(new THREE.PlaneGeometry(.65,.135),print('N I R S','#d6d8c1',33),group,0,0,d/2+.012);
      }else if(data.kind==='ppg'){
        mesh(roundedBox(.23,.19,.015,.035),black,group,0,0,-d/2-.014);
        for(const x of [-.065,.065])mesh(new THREE.SphereGeometry(.029,16,12),standard(0x71b883,{emissive:0x387b45,emissiveIntensity:.55}),group,x,0,-d/2-.024);
        mesh(new THREE.PlaneGeometry(.28,.1),print('PPG','#a2c5a4',32),group,0,.055,d/2+.011);
        mesh(new THREE.BoxGeometry(.06,.017,.006),accentMat,group,0,-.053,d/2+.009);
      }else if(data.kind==='imu'){
        mesh(new THREE.BoxGeometry(.13,.13,.036),black,group,0,.015,.035);
        for(const x of [-.125,.125])for(const y of [-.10,-.04,.02,.08])mesh(new THREE.BoxGeometry(.028,.023,.013),silver,group,x,y,.029);
        mesh(new THREE.PlaneGeometry(.2,.06),print('6-AXIS','#cad5c7',28),group,0,-.11,.035);
      }else if(data.kind==='core'){
        mesh(roundedBox(.32,.43,.009,.04),standard(0x475846,{roughness:.8}),group,0,.05,d/2+.012);
        mesh(new THREE.PlaneGeometry(.28,.08),print('CLIP','#e3e8d8',37),group,0,.07,d/2+.024);
        for(const x of [-.09,0,.09])mesh(new THREE.SphereGeometry(.017,12,8),gold,group,x,-.24,d/2+.014);
        mesh(new THREE.BoxGeometry(.02,.06,.008),accentMat,group,.135,.25,d/2+.014);
      }else{
        mesh(new THREE.BoxGeometry(.11,.12,.016),silver,group,0,0,d/2+.01);
        mesh(new THREE.PlaneGeometry(.10,.055),print('T°','#354c38',40),group,0,0,d/2+.020);
      }
    }
    const outline=new THREE.LineSegments(new THREE.EdgesGeometry(roundedBox(w+.11,h+.11,.003,.075),25),new THREE.LineBasicMaterial({color:data.color,transparent:true,opacity:0}));group.add(outline);outline.position.z=d/2+.025;
    const hit=mesh(new THREE.BoxGeometry(w+.10,h+.10,.17),new THREE.MeshBasicMaterial({visible:false}),group);hit.userData.sensorId=data.id;hitMeshes.push(hit);
    const anchor=new THREE.Object3D();anchor.position.set(w/2+.12,0,.09);group.add(anchor);
    const cableMaterial=gold.clone();cableMaterial.transparent=true;cableMaterial.opacity=.65;
    const cable=new THREE.Mesh(new THREE.BufferGeometry(),cableMaterial);root.add(cable);
    const dock=base.clone();dock.y+=.015;
    pods.push({data,group,base,outline,anchor,cable,dock,width:w,casing});
  }
  const circuit=new THREE.Group();root.add(circuit);
  for(let line=0;line<3;line++){const p=[];for(let i=0;i<=55;i++){const y=-1.55+i/55*3.60;p.push(surfacePoint(y,.55+line*.029,-.029));}circuit.add(pathLine(p,0xbd9964,.65,.006));}
  for(const data of sensorData.filter(s=>s.kind!=='core')){const points=[];for(let i=0;i<=30;i++){const a=THREE.MathUtils.lerp(data.angle,.58,i/30);points.push(surfacePoint(data.y,a,-.029));}circuit.add(pathLine(points,0xbd9964,.65,.006));}
  return {root,cloth,body,liner,top,bottom,fabricMat,cuffMat,linerMat,hardware,pods,hitMeshes,circuit,trims,logo,accent};
}

export function cableGeometry(start,end){const a=start.clone(),b=end.clone(),mid=a.clone().lerp(b,.5);mid.y-=.09;return new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a,mid,b]),18,.009,5,false);}
