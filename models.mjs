import {householdAssetKey,makeHouseholdAsset} from './household-assets.mjs';
import {buildBambooSteamer} from './assets/household/bamboo-steamer.mjs';
import {makeTripoAsset,hasTripoAsset} from './tripo-assets.mjs';
import {makeSolidItem,makeCampaignProp,hasSolidItem,hasSewnVolleyball,hasMantelClock,hasRotaryTelephone,hasArcadeCabinet,hasCampingMatchbox,localizedObjectName} from './solid-items.mjs';
import * as THREE from './node_modules/three/build/three.module.js';
import {ITEMS} from './data/levels.mjs';
const mat=(color,roughness=.35)=>new THREE.MeshStandardMaterial({color,roughness,metalness:.02});
const materials={red:mat('#ec5543'),green:mat('#4d8d36'),brown:mat('#735032'),yellow:mat('#ffd44e'),white:mat('#fff9df'),pink:mat('#e987a6'),orange:mat('#ff983a'),blue:mat('#559bd4'),dark:mat('#24352e'),dough:mat('#d99a55')};
function mesh(g,geo,m,x=0,y=0,z=0,s=[1,1,1]){let o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(...s);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
const ball=(g,m,x,y,z,s)=>mesh(g,new THREE.SphereGeometry(1,24,16),m,x,y,z,s);
const referenceMaterials=new Map(),placeholderMaterials=new Map(),referencePlane=new THREE.PlaneGeometry(1,1);
// These public icons have an opaque white sticker outline. Flood only pixels
// connected to the surrounding transparency, and protect large white objects.
function removeStickerOutline(image){
 const {width,height,data}=image;
 const count=width*height;
 const exterior=new Uint8Array(count);
 const queue=new Uint32Array(count);
 let end=0;
 let opaque=0;
 function enqueue(index){
  if(exterior[index])return;
  const offset=index*4;
  const r=data[offset],g=data[offset+1],b=data[offset+2],a=data[offset+3];
  const nearWhite=Math.min(r,g,b)>=247&&Math.max(r,g,b)-Math.min(r,g,b)<=8;
  if(a>32&&!nearWhite)return;
  exterior[index]=1;
  queue[end++]=index;
 }
 for(let i=0;i<count;i++){
  const x=i%width,y=Math.floor(i/width);
  if(data[i*4+3]>32)opaque++;
  if(x===0||x===width-1||y===0||y===height-1||data[i*4+3]<=32)enqueue(i);
 }
 let removed=0;
 for(let read=0;read<end;read++){
  const i=queue[read],x=i%width,y=Math.floor(i/width);
  if(data[i*4+3]>32)removed++;
  if(x>0)enqueue(i-1);
  if(x<width-1)enqueue(i+1);
  if(y>0)enqueue(i-width);
  if(y<height-1)enqueue(i+width);
 }
 if(removed>opaque*.42)return;
 for(let i=0;i<end;i++)data[queue[i]*4+3]=0;
}

const referenceLoads=new Set();
export const referenceTexturesReady=()=>Promise.all([...referenceLoads]);
function boardTexture(item){
 let finish;
 const ready=new Promise(r=>{finish=r;});
 referenceLoads.add(ready);
 const done=()=>{referenceLoads.delete(ready);finish();};
 const texture=new THREE.TextureLoader().load(item.icon,tex=>{
  if(item.detailed){
   const canvas=document.createElement('canvas');
   canvas.width=tex.image.width;
   canvas.height=tex.image.height;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});
   ctx.drawImage(tex.image,0,0);
   const image=ctx.getImageData(0,0,canvas.width,canvas.height);
   removeStickerOutline(image);
   ctx.putImageData(image,0,0);
   tex.image=canvas;
   tex.userData.alpha=image;
   tex.needsUpdate=true;
  }
  done();
  window.dispatchEvent(new Event("model-texture-ready"));
 },undefined,done);
 texture.colorSpace=THREE.SRGBColorSpace;
 return texture;
}

function referenceModel(item){
 const g=new THREE.Group();
 g.userData.referenceModel=true;
 if(item.placeholder){
  if(!placeholderMaterials.has(item.key))placeholderMaterials.set(item.key,mat(item.color));
  mesh(g,new THREE.IcosahedronGeometry(.55,1),placeholderMaterials.get(item.key));
  return g;
 }
 let material=referenceMaterials.get(item.key);
 if(!material){
  material=new THREE.MeshBasicMaterial({
   map:boardTexture(item),transparent:!!item.detailed,alphaTest:item.detailed?.2:0,side:THREE.DoubleSide
  });
  referenceMaterials.set(item.key,material);
 }
 if(item.detailed){const plane=mesh(g,referencePlane,material);plane.userData.sharedGeometry=true;const original=plane.raycast;plane.raycast=function(raycaster,hits){const candidates=[];original.call(this,raycaster,candidates);const alpha=material.map.userData.alpha;for(const hit of candidates){if(!alpha)continue;const x=Math.min(alpha.width-1,Math.max(0,Math.floor(hit.uv.x*alpha.width))),y=Math.min(alpha.height-1,Math.max(0,Math.floor((1-hit.uv.y)*alpha.height)));if(alpha.data[(y*alpha.width+x)*4+3]>50)hits.push(hit);}};return g;}
 mesh(g,new THREE.BoxGeometry(.95,1.05,.18),materials.white);mesh(g,new THREE.PlaneGeometry(.87,.97),material,0,0,.1);return g;}
export function releaseReferenceTextures(activeTypes){const active=new Set(activeTypes.map(t=>ITEMS[t].key));for(const [key,material]of referenceMaterials){if(!active.has(key)){material.map.dispose();material.dispose();referenceMaterials.delete(key);}}}
export const hasSolidModel=type=>hasTripoAsset(ITEMS[type]?.sourceItemId)||hasSolidItem(ITEMS[type]?.sourceItemId);
const orchardFallbackIds={apple:40,yellowapple:41,pear:55,banana:43,cherry:45,lemon:53};
let steamerFallback;
export function make(type,level,variant,originalOnly=false){
 const item=ITEMS[type],id=item?.sourceItemId;
 const campaignKey=level===25&&item?.key==='ice'?'drink-ice':item?.key;
 const campaignProp=makeCampaignProp(campaignKey);
 if(campaignProp)return campaignProp;
 const asset=item&&householdAssetKey(item,level,variant);
 const production=makeHouseholdAsset(level,asset);
 if(production)return production;
 if(asset==='bamboo-steamer'){
  if(!steamerFallback){
   steamerFallback=buildBambooSteamer();
   steamerFallback.traverse(object=>{
    if(!object.isMesh)return;
    object.castShadow=true;
    object.receiveShadow=true;
    object.userData.sharedGeometry=true;
   });
  }
  const steamer=steamerFallback.clone(true);
  steamer.userData.solid=true;
  return steamer;
 }
 if(level===4&&Object.hasOwn(orchardFallbackIds,item?.key))return makeSolidItem(orchardFallbackIds[item.key]);const local=localizedObjectName(level,id)?makeSolidItem(id,level):null;if(local)return local;if(hasMantelClock(id)||hasRotaryTelephone(id)||hasArcadeCabinet(id)||hasCampingMatchbox(id))return makeSolidItem(id);const tripo=originalOnly||hasSewnVolleyball(id)?null:makeTripoAsset(id);if(tripo)return tripo;const solid=makeSolidItem(id);if(solid)return solid;if(item?.icon||item?.placeholder){
 if(originalOnly)throw new Error('Missing authored object: '+item.key);
 return referenceModel(item);
}if(type>=6)return extra(type);const g=new THREE.Group();let o;
 if(type===0){ball(g,materials.red,-.2,0,0,[.46,.52,.43]);ball(g,materials.red,.2,0,0,[.46,.52,.43]);o=mesh(g,new THREE.CylinderGeometry(.06,.08,.35,10),materials.brown,0,.55,0);o.rotation.z=-.2;ball(g,materials.green,.24,.57,.03,[.28,.1,.12]).rotation.z=.4;}
 if(type===1){ball(g,materials.yellow,0,0,0,[.69,.43,.41]);ball(g,materials.yellow,-.63,0,0,[.11,.12,.12]);ball(g,materials.yellow,.63,0,0,[.11,.12,.12]);ball(g,materials.green,.3,.36,0,[.25,.1,.1]).rotation.z=-.5;}
 if(type===2){mesh(g,new THREE.TorusGeometry(.42,.22,16,32),materials.dough);mesh(g,new THREE.TorusGeometry(.42,.195,16,32),materials.pink,0,0,.13);for(let i=0;i<12;i++){let a=i/12*Math.PI*2;o=mesh(g,new THREE.CapsuleGeometry(.022,.12,3,5),i%2?materials.white:materials.yellow,Math.cos(a)*.43,Math.sin(a)*.43,.33);o.rotation.z=a+.5;}}
 if(type===3){o=mesh(g,new THREE.CylinderGeometry(.43,.33,.75,32),materials.blue,0,-.03,0);o.rotation.x=.36;const ring=mesh(g,new THREE.TorusGeometry(.25,.09,10,20),materials.blue,.48,0,0);ring.scale.y=1.25;let rim=mesh(g,new THREE.TorusGeometry(.40,.055,10,32),materials.white,0,.33,.14);rim.rotation.x=Math.PI/2-.36;let tea=mesh(g,new THREE.CircleGeometry(.36,32),materials.brown,0,.32,.145);tea.rotation.x=-Math.PI/2+.36;}
 if(type===4){ball(g,materials.yellow,0,-.15,0,[.6,.43,.4]);ball(g,materials.yellow,.2,.35,.07,[.34,.35,.32]);ball(g,materials.orange,.5,.30,.24,[.24,.1,.16]);ball(g,materials.dark,.29,.43,.36,[.045,.055,.04]);ball(g,materials.orange,-.15,-.14,.32,[.3,.2,.12]);}
 if(type===5){let sh=new THREE.Shape();for(let i=0;i<10;i++){let a=i*Math.PI/5+Math.PI/2,r=i%2?.31:.7;i?sh.lineTo(Math.cos(a)*r,Math.sin(a)*r):sh.moveTo(Math.cos(a)*r,Math.sin(a)*r)}sh.closePath();o=mesh(g,new THREE.ExtrudeGeometry(sh,{depth:.22,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.06,bevelThickness:.06}),materials.orange);}
 const hit=new THREE.Mesh(new THREE.CircleGeometry(.66,20),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));hit.position.z=-.25;g.add(hit);return g;}
const palette={red:'#e85245',green:'#72b63e',yellow:'#ffcf44',blue:'#429ee0',pink:'#f58fbd',cream:'#fff1d1',bread:'#d69a52',purple:'#9356d1',white:'#f8faf6',dark:'#334855',brown:'#744733'};
const M=Object.fromEntries(Object.entries(palette).map(([k,v])=>[k,mat(v)]));
const sphere=(g,c,x=0,y=0,z=0,s=[.5,.5,.5])=>ball(g,M[c]||mat(c),x,y,z,s);
const box=(g,c,x=0,y=0,z=0,s=[1,1,1])=>mesh(g,new THREE.BoxGeometry(...s),M[c],x,y,z);
const ring=(g,c,r=.4,t=.08,x=0,y=0,z=0)=>mesh(g,new THREE.TorusGeometry(r,t,10,32),M[c],x,y,z);
function rod(g,c,a,b,r=.07){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p);const m=mesh(g,new THREE.CylinderGeometry(r,r,d.length(),10),M[c]);m.position.copy(p.add(q).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;}
function extra(type){const g=new THREE.Group(),key=ITEMS[type].key;let o;
 if(key==='strawberry'){o=sphere(g,'red',0,0,0,[.5,.59,.4]);for(let i=0;i<18;i++){let a=i*2.4,r=.12+.27*(i%4)/3;sphere(g,'yellow',Math.cos(a)*r,Math.sin(a)*r,.36,[.025,.045,.02]);}for(let i=0;i<5;i++){o=sphere(g,'green',Math.sin(i*1.26)*.16,.45+Math.cos(i*1.26)*.1,.1,[.08,.23,.05]);o.rotation.z=i*1.26;}}
 else if(key==='watergun'){box(g,'blue',0,0,0,[.9,.5,.35]);box(g,'red',.15,-.4,0,[.23,.5,.28]);box(g,'yellow',.58,0,0,[.3,.23,.23]);sphere(g,'cream',-.2,.2,0,[.26,.36,.23]);}
 else if(key==='helicopter'){sphere(g,'yellow',0,0,0,[.42,.5,.35]);sphere(g,'blue',0,.15,.27,[.3,.28,.15]);rod(g,'red',[0,-.25,0],[0,-.85,0],.1);box(g,'blue',0,.5,.1,[1.25,.1,.08]);rod(g,'red',[-.3,-.35,-.15],[-.4,.2,-.15]);rod(g,'red',[.3,-.35,-.15],[.4,.2,-.15]);}
 else if(key==='ice'){box(g,'blue',0,0,0,[.86,.86,.7]);box(g,'white',-.28,.28,.36,[.2,.08,.02]);}
 else if(key==='blueball'){sphere(g,'blue');for(let i=0;i<6;i++){const a=i*Math.PI/3;sphere(g,'white',Math.cos(a)*.32,Math.sin(a)*.32,.36,[.1,.1,.045]);}}
 else if(key==='burger'||key==='sandwich'){const sandwich=key==='sandwich';for(const [y,c,w,h]of [[-.3,'bread',1,.2],[-.12,'green',1.08,.09],[0,'brown',1,.14],[.12,'yellow',1.05,.07],[.29,'bread',1,.3]]){if(sandwich)box(g,c,0,y,0,[w,h,.65]);else sphere(g,c,0,y,0,[w/2,h/2,.43]);}for(let i=0;i<7&&!sandwich;i++)sphere(g,'cream',(i%4-1.5)*.18,.38,.15+Math.floor(i/4)*.14,[.025,.025,.06]);}
 else if(key==='fries'){box(g,'red',0,-.18,0,[.8,.65,.45]);box(g,'white',0,-.15,.24,[.12,.5,.02]);for(let i=0;i<5;i++)box(g,'yellow',(i-2)*.15,.3+(i%2)*.1,0,[.12,.65,.18]);}
 else if(key==='icecream'){mesh(g,new THREE.ConeGeometry(.3,.8,24),M.bread,0,-.28,0).rotation.z=Math.PI;sphere(g,'cream',0,.28,0,[.36,.4,.34]);sphere(g,'cream',0,.6,0,[.17,.2,.17]);}
 else if(key==='yellowapple'||key==='tomato'||key==='orange'||key==='pear'){const c=key==='tomato'?'red':key==='pear'?'green':key==='orange'?'#fa9a27':'yellow';sphere(g,c,0,-.05,0,[.52,.5,.45]);if(key==='pear')sphere(g,c,0,.3,0,[.29,.37,.29]);rod(g,'brown',[0,.4,0],[.04,.65,0],.04);sphere(g,'green',.2,.47,.03,[.26,.08,.08]);}
 else if(key==='banana'){const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.55,.3,0),new THREE.Vector3(-.25,-.27,0),new THREE.Vector3(.3,-.3,0),new THREE.Vector3(.6,.12,0)]);mesh(g,new THREE.TubeGeometry(curve,24,.16,10,false),M.yellow);}
 else if(key==='cherry'){sphere(g,'red',-.25,-.2,0,[.28,.28,.27]);sphere(g,'red',.25,-.12,0,[.28,.28,.27]);rod(g,'green',[-.25,0,0],[0,.55,0],.035);rod(g,'green',[.25,.1,0],[0,.55,0],.035);}
 else if(key==='radio'||key==='speaker'){box(g,key==='radio'?'purple':'blue',0,0,0,[1.05,.72,.42]);for(const x of [-.27,.27]){sphere(g,'dark',x,0,.24,[.2,.2,.04]);ring(g,'white',.18,.025,x,0,.27);}rod(g,'yellow',[-.4,.42,0],[.4,.42,0],.05);}
 else if(key==='headphones'){ring(g,'purple',.43,.1,0,.04,0);box(g,'purple',-.4,-.2,.04,[.22,.48,.36]);box(g,'purple',.4,-.2,.04,[.22,.48,.36]);box(g,'white',-.28,-.2,.04,[.08,.4,.3]);box(g,'white',.28,-.2,.04,[.08,.4,.3]);}
 else if(key==='mic'){rod(g,'blue',[0,-.6,0],[0,.18,0],.15);sphere(g,'white',0,.3,0,[.32,.36,.32]);for(let i=-2;i<=2;i++)rod(g,'dark',[-.25,i*.08+.3,.25],[.25,i*.08+.3,.25],.012);}
 else if(key==='note'){sphere(g,'yellow',-.25,-.3,0,[.25,.17,.1]);rod(g,'yellow',[0,-.3,0],[0,.5,0],.05);rod(g,'yellow',[0,.5,0],[.4,.3,0],.07);}
 else if(['soccer','basketball','volleyball','rugby','tennis','disco'].includes(key)){const c={soccer:'white',basketball:'bread',volleyball:'yellow',rugby:'brown',tennis:'green',disco:'white'}[key];sphere(g,c,0,0,0,key==='rugby'?[.36,.66,.36]:[.53,.53,.53]);if(key==='soccer'){for(let i=0;i<6;i++){let a=i*1.256,r=i===5?0:.36;mesh(g,new THREE.CircleGeometry(.13,5),M.dark,Math.cos(a)*r,Math.sin(a)*r,i===5?.535:.40);}}else if(key==='disco'){for(let x=-2;x<=2;x++)for(let y=-2;y<=2;y++)if(x*x+y*y<7)box(g,(x+y)%2?'white':'blue',x*.18,y*.18,Math.sqrt(.28-(x*x+y*y)*.032)+.01,[.15,.15,.02]);}else{for(let i=0;i<3;i++){o=ring(g,key==='basketball'?'dark':'white',.535,.018);o.rotation.set(i*Math.PI/3,Math.PI/2,0);}if(key==='rugby')for(let i=-2;i<=2;i++)rod(g,'white',[-.12,i*.11,.35],[.12,i*.11,.35],.025);}}
 else if(key==='pencil'||key==='brush'){rod(g,key==='pencil'?'yellow':'brown',[0,-.5,0],[0,.4,0],.11);mesh(g,new THREE.ConeGeometry(.12,.3,12),M[key==='pencil'?'cream':'blue'],0,.55,0);box(g,'pink',0,-.6,0,[.2,.18,.2]);}
 else if(key==='scissors'){ring(g,'yellow',.19,.07,-.22,-.3,0);ring(g,'yellow',.19,.07,.22,-.3,0);rod(g,'white',[-.22,-.15,0],[.18,.65,0],.055);rod(g,'white',[.22,-.15,0],[-.18,.65,0],.055);sphere(g,'bread',0,.06,.05,[.09,.09,.04]);}
 else if(key==='chair'||key==='stool'){if(key==='chair'){box(g,'blue',0,.02,0,[.75,.65,.18]);box(g,'blue',0,.4,-.25,[.75,.16,.65]);}else sphere(g,'yellow',0,0,0,[.49,.42,.12]);for(const x of [-.3,.3])for(const y of [-.25,.25])rod(g,'brown',[x,y,0],[x*1.2,y*1.2,-.7],.06);}
 else if(key==='book'){box(g,'brown',0,0,0,[.74,1,.3]);box(g,'cream',0,0,.16,[.62,.9,.02]);box(g,'brown',-.33,0,.2,[.08,1,.08]);}
 else if(key==='friedegg'){sphere(g,'white',0,0,0,[.66,.5,.09]);sphere(g,'yellow',.05,0,.1,[.27,.27,.11]);}
 else if(key==='toast'){box(g,'bread',0,-.06,0,[.8,.8,.2]);sphere(g,'bread',0,.3,0,[.5,.27,.11]);box(g,'cream',0,-.03,.12,[.65,.64,.02]);sphere(g,'cream',0,.26,.12,[.4,.2,.02]);}
 else if(key==='avocado'){sphere(g,'green',0,0,0,[.44,.64,.2]);sphere(g,'yellow',0,0,.13,[.35,.54,.1]);sphere(g,'brown',0,-.15,.23,[.22,.23,.1]);}
 else if(key==='egg'){sphere(g,'cream',0,0,0,[.36,.53,.36]);}
 else if(key==='pepper'){sphere(g,'green',0,-.1,0,[.3,.57,.27]);rod(g,'brown',[0,.45,0],[.15,.6,0],.05);}
 else if(key==='cupcake'){mesh(g,new THREE.CylinderGeometry(.4,.28,.52,24),M.brown,0,-.2,0);sphere(g,'brown',0,.15,0,[.43,.3,.4]);for(let i=0;i<9;i++)sphere(g,'cream',Math.sin(i*2.4)*.3,.3,Math.cos(i*2.4)*.3,[.04,.04,.04]);}
 else if(key==='macaron'){sphere(g,'pink',0,.13,0,[.49,.22,.45]);sphere(g,'cream',0,0,0,[.46,.08,.43]);sphere(g,'pink',0,-.13,0,[.49,.22,.45]);}
 else if(key==='coffee'){mesh(g,new THREE.CylinderGeometry(.36,.27,.88,24),M.white);mesh(g,new THREE.CylinderGeometry(.33,.3,.34,24),M.brown);mesh(g,new THREE.CylinderGeometry(.4,.39,.1,24),M.white,0,.49,0);sphere(g,'green',0,0,.34,[.13,.13,.025]);}
 else if(key==='waffle'){box(g,'bread',0,0,0,[.85,.85,.18]);for(let i=-2;i<=2;i++){rod(g,'cream',[-.43,i*.17,.12],[.43,i*.17,.12],.025);rod(g,'cream',[i*.17,-.43,.12],[i*.17,.43,.12],.025);}}
 else if(key==='cake'){for(const [y,c]of [[-.2,'bread'],[0,'pink'],[.2,'cream']])box(g,c,0,y,0,[.85,.2,.65]);sphere(g,'red',0,.37,0,[.14,.14,.14]);}
 else if(key==='croissant'){const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.55,0,0),new THREE.Vector3(-.3,.25,0),new THREE.Vector3(.3,.25,0),new THREE.Vector3(.55,0,0)]);mesh(g,new THREE.TubeGeometry(curve,24,.2,12,false),M.bread);for(let i=-1;i<=1;i++){o=ring(g,'cream',.21,.02,i*.25,.22,0);o.rotation.y=Math.PI/2;}}
 else if(key.startsWith('bowling')){const c=key.endsWith('blue')?'blue':key.endsWith('green')?'green':'pink';sphere(g,c,0,0,0,[.53,.53,.53]);for(const [x,y]of [[-.12,.13],[.12,.13],[0,-.08]])sphere(g,'dark',x,y,.49,[.065,.065,.035]);}
 else if(key.startsWith('pin')){sphere(g,'white',0,-.22,0,[.28,.4,.25]);sphere(g,'white',0,.35,0,[.16,.23,.16]);rod(g,'white',[0,-.15,0],[0,.35,0],.115);mesh(g,new THREE.CylinderGeometry(.13,.13,.13,16),M[key.endsWith('blue')?'blue':key.endsWith('green')?'green':'pink'],0,.17,0);}
 else if(key.startsWith('gift')){const c=key.slice(4);box(g,c,0,0,0,[.88,.9,.65]);const ribbon=c==='green'||c==='yellow'?'red':'yellow';box(g,ribbon,0,0,.34,[.14,.92,.03]);box(g,ribbon,0,0,.35,[.9,.14,.03]);for(const x of [-.16,.16]){o=ring(g,ribbon,.14,.045,x,.5,0);o.scale.y=.65;}if(c==='purple'||c==='blue')for(let x=-2;x<=2;x++)for(let y=-2;y<=2;y++)if(x&&y)sphere(g,'white',x*.16,y*.16,.34,[.025,.025,.018]);}
 else if(key==='gamepad'){box(g,'white',0,0,0,[.78,.45,.3]);for(const x of [-.38,.38])sphere(g,'white',x,-.12,0,[.24,.34,.18]);box(g,'dark',-.28,.04,.19,[.24,.07,.04]);box(g,'dark',-.28,.04,.19,[.07,.24,.04]);for(const [x,y,c]of [[.25,.1,'red'],[.38,-.02,'blue']])sphere(g,c,x,y,.19,[.06,.06,.035]);}
 else if(key==='handheld'){box(g,'white',0,0,0,[.64,1.05,.25]);box(g,'dark',0,.2,.14,[.49,.38,.02]);box(g,'green',0,.2,.16,[.37,.26,.02]);box(g,'dark',-.16,-.26,.14,[.23,.06,.03]);box(g,'dark',-.16,-.26,.14,[.06,.23,.03]);for(const x of [.12,.25])sphere(g,'purple',x,-.25,.15,[.055,.055,.035]);}
 else if(key==='toytruck'){box(g,'red',0,0,0,[1,.42,.45]);box(g,'red',.25,.3,0,[.45,.4,.45]);box(g,'blue',.25,.32,.24,[.3,.22,.02]);for(const x of [-.34,.34])for(const z of [-.25,.25]){o=mesh(g,new THREE.CylinderGeometry(.22,.22,.15,16),M.dark,x,-.24,z);o.rotation.x=Math.PI/2;}}
 else if(key==='toyrobot'||key==='soldier'){const c=key==='soldier'?'green':'red';box(g,c,0,0,0,[.5,.55,.35]);sphere(g,c,0,.43,0,[.3,.3,.27]);for(const x of [-.13,.13]){sphere(g,'white',x,.46,.24,[.1,.1,.04]);sphere(g,'dark',x,.46,.28,[.045,.045,.02]);rod(g,c,[x,-.2,0],[x*1.4,-.65,0],.09);rod(g,c,[x*2,.18,0],[x*3,-.22,0],.08);}if(key==='soldier')box(g,'green',0,-.7,0,[.75,.08,.4]);}
 else if(key==='rubik'){box(g,'dark',0,0,0,[.83,.83,.65]);for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)box(g,['yellow','green','red'][(x+y+3)%3],x*.27,y*.27,.34,[.23,.23,.03]);}
 else if(key==='toytelevision'||key==='camera'){box(g,'blue',0,0,0,[1,.72,.45]);if(key==='camera'){mesh(g,new THREE.CylinderGeometry(.27,.27,.3,24),M.dark,0,0,.3).rotation.x=Math.PI/2;ring(g,'white',.26,.035,0,0,.47);box(g,'white',.32,.22,.24,[.18,.12,.02]);}else{box(g,'dark',0,0,.24,[.78,.52,.02]);sphere(g,'brown',0,0,.28,[.22,.22,.025]);rod(g,'white',[-.2,.35,0],[-.4,.6,0],.025);rod(g,'white',[.2,.35,0],[.4,.6,0],.025);}}
 else if(key==='drum'){mesh(g,new THREE.CylinderGeometry(.48,.48,.55,24),M.red);for(const y of [-.29,.29]){mesh(g,new THREE.CylinderGeometry(.51,.51,.06,24),M.blue,0,y,0);mesh(g,new THREE.CylinderGeometry(.45,.45,.02,24),M.white,0,y+(y>0?.04:-.04),0);}for(let x=-2;x<=2;x++)rod(g,'white',[x*.2,-.25,.43],[x*.2+.1,.25,.43],.025);g.rotation.x=.65;}
 else if(key==='clarinet'){rod(g,'blue',[0,-.5,0],[0,.52,0],.1);mesh(g,new THREE.CylinderGeometry(.1,.25,.25,24),M.blue,0,-.57,0);for(let y=-2;y<=2;y++)sphere(g,'white',0,y*.16,.12,[.045,.045,.025]);}
 else if(key==='maraca'){rod(g,'blue',[0,-.65,0],[0,.1,0],.1);sphere(g,'blue',0,.25,0,[.34,.43,.32]);box(g,'white',0,.25,.29,[.45,.32,.02]);sphere(g,'red',0,.25,.32,[.11,.11,.02]);}
 else if(key==='harp'){rod(g,'yellow',[-.4,-.5,0],[-.35,.6,0],.09);rod(g,'yellow',[-.35,.6,0],[.45,-.5,0],.09);rod(g,'yellow',[-.4,-.5,0],[.45,-.5,0],.09);for(let i=0;i<5;i++)rod(g,'white',[-.27+i*.13,-.43,0],[-.27+i*.13,.4-i*.18,0],.012);}
 else if(key==='trumpet'){rod(g,'yellow',[-.6,0,0],[.3,0,0],.1);o=mesh(g,new THREE.CylinderGeometry(.12,.32,.3,24),M.yellow,.4,0,0);o.rotation.z=Math.PI/2;ring(g,'yellow',.24,.07,0,-.17,0);for(let x=-1;x<=1;x++)rod(g,'yellow',[x*.14,0,0],[x*.14,.28,0],.04);}
 else if(key==='treble'){ring(g,'yellow',.24,.065,0,-.15,0);ring(g,'yellow',.16,.055,0,.36,0);rod(g,'yellow',[.08,-.6,0],[-.08,.6,0],.045);}
 else if(key.endsWith('can')){const c=key==='corncan'?'yellow':key==='tomatocan'?'red':'green';mesh(g,new THREE.CylinderGeometry(.38,.38,.85,24),M[c]);for(const y of [-.44,.44])mesh(g,new THREE.CylinderGeometry(.4,.4,.045,24),M.white,0,y,0);sphere(g,'cream',0,0,.37,[.22,.26,.025]);sphere(g,key==='tomatocan'?'red':c,0,0,.4,[.15,.19,.025]);}
 else if(key==='corn'){sphere(g,'yellow',0,.05,0,[.29,.6,.26]);for(let x=-1;x<=1;x++)for(let y=-3;y<=3;y++)sphere(g,'cream',x*.14,y*.14,.25,[.06,.055,.035]);for(const x of [-.23,.23]){o=sphere(g,'green',x,-.25,0,[.17,.45,.12]);o.rotation.z=x;}}
 else if(key==='taco'){sphere(g,'bread',0,0,0,[.65,.42,.2]);sphere(g,'green',0,.15,.17,[.58,.25,.08]);for(const x of [-.3,0,.3])sphere(g,'red',x,.2,.24,[.13,.13,.05]);sphere(g,'yellow',0,-.1,.28,[.65,.32,.07]);}
 else if(key==='watermelon'){mesh(g,new THREE.CircleGeometry(.62,32,0,Math.PI),M.green);mesh(g,new THREE.CircleGeometry(.54,32,0,Math.PI),M.white,0,0,.02);mesh(g,new THREE.CircleGeometry(.48,32,0,Math.PI),M.red,0,0,.04);for(const x of [-.25,0,.25])sphere(g,'dark',x,.22,.06,[.025,.05,.02]);}
 const hit=mesh(g,new THREE.CircleGeometry(.63,20),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),0,0,-.38);hit.castShadow=false;return g;
}
