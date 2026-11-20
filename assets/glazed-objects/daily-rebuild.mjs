import {printInk} from '../real-surfaces/print-ink.mjs';
import * as THREE from 'three';
import {RoundedBoxGeometry} from '../../node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from '../../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';

const models=new Map();
const surface=(name,color,roughness,clearcoat=0,metalness=0)=>new THREE.MeshPhysicalMaterial({
 name,color,roughness,clearcoat,metalness,clearcoatRoughness:.09,
});
const paper=surface('Warm book paper','#fff1d4',.77);
const paperShadow=surface('Paper page edges','#dab890',.73);
const brass=surface('Brass hardware','#d9a455',.22,.30,.73);
const wood=surface('Natural bamboo wood','#ba813e',.58);
const turquoise=surface('Glazed turquoise resin','#23a297',.25,.81);
const ivory=surface('Warm ivory molded shell','#fff1d6',.28,.71);
const steel=surface('Brushed scissor steel','#bbccd0',.24,.30,.78);
const steelEdge=surface('Honed steel edge','#eef1ed',.17,.23,.74);
const cream=surface('Cream printed paper','#ffefcb',.71);
const gold=surface('Golden pencil enamel','#f3ae30',.23,.82);
const pencilWood=surface('Natural cedar wood','#e6b375',.62);
const graphite=surface('Graphite core','#3b3034',.55);
const dough=surface('Baked pastry dough','#db943f',.66);
const icing=surface('Strawberry sugar glaze','#db567d',.32,.61);
const sprinkleColors=['#fbf0d1','#d4bd48','#9be4cc','#d84461'].map((color,i)=>surface('Sugar sprinkles '+i,color,.47,.25));

function add(group,geometry,material,x=0,y=0,z=0){
 const part=new THREE.Mesh(geometry,material);part.position.set(x,y,z);group.add(part);return part;
}
function rounded(group,w,h,d,r,material,x=0,y=0,z=0){
 return add(group,new RoundedBoxGeometry(w,h,d,3,r),material,x,y,z);
}
function tube(group,points,radius,material){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 return add(group,new THREE.TubeGeometry(curve,16,radius,8,false),material);
}
function frontDisc(group,r,height,material,x=0,y=0,z=0){
 return add(group,new THREE.CylinderGeometry(r,r,height,28).rotateX(Math.PI/2),material,x,y,z);
}
function printedFace(width,height,paint,material){
 const canvas=Object.assign(document.createElement('canvas'),{width,height});
 paint(canvas.getContext('2d'),width,height);
 const map=new THREE.CanvasTexture(canvas);
 map.colorSpace=THREE.SRGBColorSpace;
 map.anisotropy=4;
 const printed=material.clone();printed.map=map;
 return printed;
}
function strip(group,shape,material,x=0,y=0,z=0){
 return add(group,new THREE.ExtrudeGeometry(shape,{depth:.044,bevelEnabled:true,bevelSize:.014,
  bevelThickness:.013,bevelSegments:3,curveSegments:24,steps:1}),material,x,y,z);
}

function foldingFan(color = '#f8d88b',variant=false){
 const group=new THREE.Group();
 const printed=printedFace(768,256,(ctx,w,h)=>{
  ctx.fillStyle=color;ctx.fillRect(0,0,w,h);
  for(let i=0;i<15;i++){
   const edge=ctx.createLinearGradient(i*w/15,0,(i+1)*w/15,0);
   edge.addColorStop(0,variant?'#42332443':'#8d4e19ac');
   edge.addColorStop(.24,variant?'#fffdfa17':'#f9edb736');
   edge.addColorStop(.66,variant?'#fffdfa39':'#fff7d78c');
   edge.addColorStop(1,variant?'#55443b31':'#ac682aaa');
   ctx.fillStyle=edge;ctx.fillRect(i*w/15,0,w/15+1,h);
  }
  ctx.strokeStyle=variant?'#fff2cbb0':'#953c28';ctx.lineWidth=variant?7:8;
  ctx.beginPath();ctx.moveTo(0,20);ctx.lineTo(w,20);ctx.stroke();
  ctx.strokeStyle='#533f31';ctx.lineWidth=3;
  for(const [x,y,dir] of [[278,169,-1],[447,147,1],[513,104,-1]]){
   ctx.beginPath();ctx.moveTo(x-dir*22,y+64);ctx.quadraticCurveTo(x+dir*7,y+23,x,y);ctx.stroke();
   for(let j=0;j<5;j++){
    const angle=j*Math.PI*2/5;
    ctx.fillStyle=j%2?'#b84238':'#ae3e2c';
    ctx.beginPath();ctx.ellipse(x+Math.cos(angle)*11,y+Math.sin(angle)*12,8,11,angle,0,Math.PI*2);ctx.fill();
   }
  }
 },surface('Fan paper','#ffffff',.68));
 printed.side=THREE.DoubleSide;
 const sections=30,positions=[],uvs=[],indices=[];
 const span=1.27,inner=.284,outer=.632,y=-.308;
 for(let i=0;i<=sections;i++){
  const t=i/sections,a=(t*2-1)*span,z=(i%2?-.028:.027);
  for(const [r,v] of [[inner,0],[outer,1]]){
   positions.push(Math.sin(a)*r,Math.cos(a)*r+y,z);
   uvs.push(t,v);
  }
  if(i<sections){const a=i*2,b=a+2;indices.push(a,b,a+1,a+1,b,b+1);}
 }
 const panel=new THREE.BufferGeometry();
 panel.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 panel.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 panel.setIndex(indices);panel.computeVertexNormals();
 add(group,panel,printed);
 for(let i=0;i<=15;i++){
  const a=(i/15*2-1)*span,r=i===0||i===15?outer:outer-.014;
  const guard=i===0||i===15;
  const visibleLength=variant&&!guard?inner+.064:r;
  const rib=rounded(group,guard?.040:variant?.015:.021,visibleLength,.030,.008,wood,
   Math.sin(a)*visibleLength/2,y+Math.cos(a)*visibleLength/2,.017);
  rib.rotation.z=-a;
 }
 frontDisc(group,.041,.032,brass,0,y,.031);
 group.rotation.set(.11,0,-.08);
 return group;
}

function scissors(handle=turquoise){
 const group=new THREE.Group();
 for(const side of [-1,1]){
  const arm=new THREE.Group();
  const hole=new THREE.TorusGeometry(.121,.039,12,44).scale(1,1.18,1);
  add(arm,hole,handle,side*.121,-.291,.007);
  tube(arm,[[side*.12,-.20,0],[side*.088,-.13,0],[side*.054,-.045,0]],.040,handle);
  const blade=new THREE.Shape();
  blade.moveTo(-.038,-.083);blade.lineTo(.052,-.078);blade.lineTo(.060,.258);
  blade.quadraticCurveTo(.034,.423,-.030,.465);blade.quadraticCurveTo(-.049,.467,-.046,.438);
  blade.lineTo(-.038,-.083);
  strip(arm,blade,steel,0,0,side*.019-.018);
  rounded(arm,.018,.292,.012,.005,steelEdge,.051,.081,side*.019+.028);
  arm.rotation.z=side*.183;
  group.add(arm);
 }
 frontDisc(group,.043,.022,brass,0,-.035,.067);
 rounded(group,.055,.009,.008,.004,steel,0,-.035,.080).rotation.z=.5;
 group.rotation.z=-.21;
 return group;
}

function pencil(enamel=gold){
 const group=new THREE.Group();
 add(group,new THREE.CylinderGeometry(.065,.065,.77,6),enamel,0,-.020,0);
 add(group,new THREE.CylinderGeometry(.004,.065,.175,6),pencilWood,0,.447,0);
 add(group,new THREE.ConeGeometry(.021,.061,14),graphite,0,.519,0);
 add(group,new THREE.CylinderGeometry(.068,.068,.111,32),brass,0,-.432,0);
 const rose=surface('Matte pink rubber','#c57978',.68);
 rounded(group,.115,.102,.115,.048,rose,0,-.520,0);
 for(const y of [-.468,-.445,-.420])add(group,new THREE.TorusGeometry(.068,.006,7,36).rotateX(Math.PI/2),brass,0,y,0);
 group.rotation.z=-.17;
 return group;
}

function notebook(){
 const group=new THREE.Group();
 const cover=surface('Laminated turquoise cover','#5bb7a5',.33,.51);
 rounded(group,.726,.874,.128,.044,paper,0,0,0);
 rounded(group,.756,.898,.049,.027,cover,0,0,.074);
 rounded(group,.756,.898,.044,.025,cover,0,0,-.072);
 rounded(group,.091,.899,.156,.043,cover,-.339,0,0);
 for(let i=0;i<5;i++){
  const z=-.045+i*.022;
  rounded(group,.012,.785,.006,.002,paperShadow,.347,0,z);
 }
 const label=printedFace(512,640,(ctx,w,h)=>{
  ctx.fillStyle='#337e71';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#fff3d5';ctx.fillRect(21,123,470,337);
  ctx.strokeStyle='#a09166';ctx.lineWidth=3;ctx.strokeRect(31,133,450,317);
  ctx.fillStyle='#122d28';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='700 138px "PingFang SC","Noto Sans CJK SC",sans-serif';
  printInk(ctx,'练习本',w/2,265,438);
  ctx.fillStyle='#9a9778';ctx.fillRect(89,374,334,4);
 },surface('Notebook title ink','#ffffff',.82,.02));
 add(group,new THREE.PlaneGeometry(.697,.820),label,0,0,.100);
 group.rotation.set(.15,-.12,-.07);
 return group;
}

function lathe(group,profile,material){
 return add(group,new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),56),material);
}
function coffee(){
 const group=new THREE.Group();
 const sleeve=surface('Uncoated teal paper sleeve','#3e8f83',.71);
 lathe(group,[[0,-.433],[.195,-.433],[.216,-.409],[.292,.318],[0,.318]],cream);
 lathe(group,[[.230,-.254],[.235,-.260],[.277,.164],[.274,.173]],sleeve);
 for(let i=0;i<31;i++){
  const a=i*Math.PI*2/31;
  const ridge=tube(group,[[Math.cos(a)*.237,-.239,Math.sin(a)*.237],
    [Math.cos(a)*.254,-.051,Math.sin(a)*.254],[Math.cos(a)*.276,.145,Math.sin(a)*.276]],.0036,sleeve);
  ridge.castShadow=false;
 }
 lathe(group,[[.267,.264],[.295,.265],[.306,.28],[.309,.316],[.284,.358],
  [.270,.378],[.185,.392],[0,.389]],ivory);
 const mark=frontDisc(group,.107,.007,cream,0,-.012,.265);
 mark.rotation.x=.09;
 const bean=frontDisc(group,.043,.014,surface('Espresso mark','#81583b',.50),0,-.013,.272);
 bean.scale.y=.72;bean.rotation.z=.47;
 rounded(group,.081,.016,.057,.006,graphite,0,.387,.147).rotation.x=.21;
 group.rotation.set(.45,-.19,-.14);
 return group;
}

function donut(glaze=icing){
 const group=new THREE.Group();
 const radius=.288,tubeRadius=.142;
 const ring=new THREE.TorusGeometry(radius,tubeRadius,24,64);
 const vertices=ring.attributes.position;
 for(let i=0;i<vertices.count;i++){
  const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i),a=Math.atan2(y,x);
  const wave=1+.035*Math.sin(a*5)+.019*Math.cos(a*7);
  vertices.setXYZ(i,x*wave,y*wave,z*.86+.014*Math.sin(a*3));
 }
 ring.computeVertexNormals();add(group,ring,dough);
 const icingPositions=[],icingIndices=[];
 for(let i=0;i<=72;i++)for(let j=0;j<=12;j++){
  const u=i/72*Math.PI*2;
  const a=.14+Math.sin(u*6)*.18+Math.cos(u*9)*.08;
  const b=Math.PI-.23+Math.cos(u*4)*.13;
  const v=a+(b-a)*j/12;
  const radiusAt=(radius+Math.cos(v)*(tubeRadius+.012))*(1+.035*Math.sin(u*5)+.019*Math.cos(u*7));
  icingPositions.push(Math.cos(u)*radiusAt,Math.sin(u)*radiusAt,Math.sin(v)*.139+.017+.014*Math.sin(u*3));
  if(i<72&&j<12){const p=i*13+j;icingIndices.push(p,p+13,p+1,p+1,p+13,p+14);}
 }
 const top=new THREE.BufferGeometry();
 top.setAttribute('position',new THREE.Float32BufferAttribute(icingPositions,3));top.setIndex(icingIndices);
 top.computeVertexNormals();add(group,top,glaze);
 for(let i=0;i<30;i++){
  const angle=i*2.399963,rad=.259+(i%4)*.025;
  const x=Math.cos(angle)*rad,y=Math.sin(angle)*rad,z=.151-Math.abs(rad-radius)*.24;
  rounded(group,.041,.014,.016,.006,sprinkleColors[i%4],x,y,z).rotation.z=i*.89;
 }
 group.rotation.set(.16,-.1,.08);
 return group;
}

const colors={Black:'#645c5a',Blue:'#588cae',Green:'#88a570',Orange:'#d3965c',Pink:'#d78fac',Red:'#cf7566',White:'#eddec1',Yellow:'#ddba67',Purple:'#9b7cae',Brown:'#ac8264',Grey:'#a2a2a5',Striped:'#719396'};
const fanPaper={Black:'#57515d',Blue:'#458fb0',Green:'#5c9d6a',Orange:'#da8739',Pink:'#d477a8',Red:'#c9484d',White:'#f2ead7',Yellow:'#e5be41'};
const styledItems=new Map();
const styledBuilders={};
const styledFamilies=[
 ['Folding Fan','折扇',(_color,name)=>()=>foldingFan(fanPaper[name],true),{1354:'Black',1355:'Blue',1356:'Green',1357:'Orange',1358:'Pink',1359:'Red',1360:'White',1361:'Yellow'}],
 ['Scissors','剪刀',c=>()=>scissors(surface('Molded scissor handle',c,.29,.75)),{359:'Blue',360:'Green',361:'Orange',362:'Pink',363:'Purple',364:'Red',365:'Yellow'}],
 ['Pencil','铅笔',c=>()=>pencil(surface('Colored pencil enamel',c,.31,.64)),{342:'Blue',343:'Green',344:'Grey',345:'Orange',346:'Purple',347:'Red',348:'Striped',349:'Yellow'}],
 ['Doughnut Particle','甜甜圈',c=>()=>donut(surface('Colored sugar glaze',c,.37,.55)),{425:'Blue',426:'Brown',427:'Green',428:'Orange',429:'Pink',430:'Purple',431:'White',432:'Yellow'}],
];
for(const [family,local,make,items] of styledFamilies){
 for(const [id,color] of Object.entries(items)){
  const kind=family.toLowerCase().replaceAll(' ','-')+'-'+color.toLowerCase();
  styledItems.set(Number(id),{title:family+' '+color,local,kind});
  styledBuilders[kind]=make(colors[color],color);
 }
}
export function dailyVariantKind(item,localName){
 const entry=styledItems.get(item.sourceItemId);
 return entry&&item.name===entry.title&&(!localName||localName.includes(entry.local))?entry.kind:null;
}
const builders={...styledBuilders,'folding-fan':foldingFan,scissors,pencil,book:notebook,coffee,donut};

function batched(kind){
 const root=new THREE.Group();
 const original=builders[kind]();
 original.updateMatrixWorld(true);
 const batches=new Map();
 original.traverse(part=>{
  if(!part.isMesh)return;
  const geometry=part.geometry.index?part.geometry.toNonIndexed():part.geometry.clone();
  geometry.applyMatrix4(part.matrixWorld);
  if(!batches.has(part.material))batches.set(part.material,[]);
  batches.get(part.material).push(geometry);
  part.geometry.dispose();
 });
 for(const [material,geometries] of batches){
  const mesh=add(root,mergeGeometries(geometries),material);
  mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.sharedGeometry=true;
  geometries.forEach(geometry=>geometry.dispose());
 }
 root.userData={solid:true,assetRevision:Object.hasOwn(styledBuilders,kind)?'detail-shelf-1':'daily-props-1',assetKind:kind};
 return root;
}

export function dailyRebuildKind(key,level,itemId){
 if(itemId===1380&&[1,2,3,5,29,32,719].includes(level))return 'folding-fan';
 return Object.hasOwn(builders,key)?key:null;
}
export function makeDailyRebuild(kind){
 if(!models.has(kind))models.set(kind,batched(kind));
 return models.get(kind).clone(true);
}
