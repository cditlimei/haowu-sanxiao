import * as THREE from 'three';
import {RoundedBoxGeometry} from '../../node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from '../../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';

const templates=new Map();
const physical=(name,color,roughness,clearcoat=0)=>new THREE.MeshPhysicalMaterial({
 name,color,roughness,clearcoat,clearcoatRoughness:.11,
});
const ballSeam=physical('Football seam','#263740',.67);
const ballWhite=physical('Pearl synthetic leather','#f9efdf',.48,.29);
const ballBlue=physical('Midnight synthetic leather','#2f4266',.50,.33);
const darkSeam=physical('Recessed basketball seam','#473425',.73);
const purpleSeam=physical('Recessed volleyball seam','#625471',.63);
const mint=physical('Mint rotor enamel','#47baa1',.26,.85);
const warm=physical('Sunflower rotor tips','#efaf34',.26,.85);
const cockpit=physical('Translucent blue cabin resin','#429ab5',.21,.93);
const white=physical('Ivory molded helicopter frame','#fff3d4',.27,.71);
const edge=physical('Honey-colored trim','#cd8345',.39,.63);

function add(g,geometry,material,x=0,y=0,z=0){
 const part=new THREE.Mesh(geometry,material);
 part.position.set(x,y,z);g.add(part);return part;
}
function pathTube(g,points,radius,material,closed=false){
 const curve=new THREE.CatmullRomCurve3(points,closed);
 return add(g,new THREE.TubeGeometry(curve,points.length,radius,7,closed),material);
}
const polar=(theta,y,radius)=>{
 const r=Math.sqrt(1-y*y)*radius;
 return new THREE.Vector3(Math.cos(theta)*r,y*radius,Math.sin(theta)*r);
};

function surface(name,colors,type){
 const w=640,h=384;
 const make=()=>Object.assign(document.createElement('canvas'),{width:w,height:h}).getContext('2d');
 const ctx=make(),normal=make();
 const shades=ctx.createLinearGradient(0,0,w,h);
 for(const [i,color] of colors.entries())shades.addColorStop(i/(colors.length-1),color);
 ctx.fillStyle=shades;ctx.fillRect(0,0,w,h);
 normal.fillStyle='#8080ff';normal.fillRect(0,0,w,h);
 let seed=type.length*9277;
 const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const grain=type==='tennis'?10500:3500;
 for(let i=0;i<grain;i++){
  const x=rand()*w,y=rand()*h,r=(type==='tennis'?.35:1.12)+rand()*1.65;
  ctx.globalAlpha=.08+rand()*.19;
  ctx.fillStyle=i%2?colors[0]:colors[colors.length-1];
  ctx.beginPath();ctx.ellipse(x,y,r,r*.72,0,0,Math.PI*2);ctx.fill();
  if(type==='tennis')continue;
  normal.fillStyle='#6688ea';
  normal.beginPath();normal.arc(x-r*.25,y,r*.55,0,Math.PI*2);normal.fill();
  normal.fillStyle='#a479eb';
  normal.beginPath();normal.arc(x+r*.3,y,r*.50,0,Math.PI*2);normal.fill();
 }
 if(type==='rugby'){
  ctx.globalAlpha=1;
  ctx.fillStyle='#f6e2bb';
  ctx.fillRect(0,65,w,19);ctx.fillRect(0,303,w,19);
 }
 const map=new THREE.CanvasTexture(ctx.canvas);
 map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
 const normalMap=new THREE.CanvasTexture(normal.canvas);normalMap.anisotropy=4;
 const material=physical(name,'#ffffff',type==='tennis'?.81:.53,type==='tennis'?0:.27);
 material.map=map;
 if(type!=='tennis'){material.normalMap=normalMap;material.normalScale.setScalar(.72);}
 else normalMap.dispose();
 return material;
}

function soccer(){
 const g=new THREE.Group(),radius=.444;
 add(g,new THREE.SphereGeometry(radius-.012,48,36),ballSeam);
 const ico=new THREE.IcosahedronGeometry(1,0),attr=ico.attributes.position;
 const verts=[],faces=[],lookup=new Map();
 for(let i=0;i<attr.count;i+=3){
  const face=[];
  for(let j=i;j<i+3;j++){
   const v=new THREE.Vector3().fromBufferAttribute(attr,j);
   const hash=v.toArray().map(c=>Math.round(c*1000)).join(':');
   if(!lookup.has(hash)){lookup.set(hash,verts.length);verts.push(v);}
   face.push(lookup.get(hash));
  }
  faces.push(face);
 }
 ico.dispose();
 const atTip=(a,b)=>verts[a].clone().lerp(verts[b],1/3).normalize();
 const panel=(corners,paint)=>{
  const center=corners.reduce((sum,v)=>sum.add(v),new THREE.Vector3()).normalize();
  const tangent=new THREE.Vector3().crossVectors(center,new THREE.Vector3(.37,.86,.13)).normalize();
  const bitangent=new THREE.Vector3().crossVectors(center,tangent);
  const sorted=corners.slice().sort((a,b)=>
   Math.atan2(a.dot(bitangent),a.dot(tangent))-Math.atan2(b.dot(bitangent),b.dot(tangent)));
  const xyz=[];
  for(let k=0;k<sorted.length;k++){
   const [a,b]=[sorted[k],sorted[(k+1)%sorted.length]].map(v=>v.clone().lerp(center,.047).normalize());
   const at=(u,v)=>center.clone().multiplyScalar(1-u-v).addScaledVector(a,u).addScaledVector(b,v).normalize().multiplyScalar(radius);
   const slices=5;
   const triangle=(x,y,z)=>xyz.push(...x.toArray(),...y.toArray(),...z.toArray());
   for(let i=0;i<slices;i++)for(let j=0;j<slices-i;j++){
    const a0=at(i/slices,j/slices),b0=at((i+1)/slices,j/slices),c0=at(i/slices,(j+1)/slices);
    triangle(a0,b0,c0);
    if(i+j+1<slices)triangle(b0,at((i+1)/slices,(j+1)/slices),c0);
   }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(xyz,3));
  const normals=geometry.attributes.position.clone();
  for(let i=0;i<normals.count;i++)normals.setXYZ(i,normals.getX(i)/radius,normals.getY(i)/radius,normals.getZ(i)/radius);
  geometry.setAttribute('normal',normals);
  add(g,geometry,paint);
 };
 verts.forEach((_,i)=>{
  const neighbors=new Set(faces.filter(face=>face.includes(i)).flat().filter(id=>id!==i));
  panel([...neighbors].map(id=>atTip(i,id)),ballBlue);
 });
 for(const [a,b,c] of faces)panel([atTip(a,b),atTip(b,a),atTip(b,c),atTip(c,b),atTip(c,a),atTip(a,c)],ballWhite);
 g.rotation.set(.34,.15,-.14);
 return g;
}

function basketball(){
 const g=new THREE.Group(),r=.441;
 add(g,new THREE.SphereGeometry(r,52,36),surface('Pebbled basketball cover',['#aa5131','#dc7437','#efa452'],'basketball'));
 for(const angle of [0,Math.PI/2,Math.PI/4,-Math.PI/4]){
  const points=Array.from({length:48},(_,i)=>{
   const t=i/48*Math.PI*2;
   const warp=angle===0||angle===Math.PI/2?0:.225*Math.sin(t*2);
   return new THREE.Vector3(Math.sin(t)*r,Math.cos(t)*r,0).applyAxisAngle(new THREE.Vector3(0,1,0),angle+warp);
  });
  pathTube(g,points,.0075,darkSeam,true);
 }
 g.rotation.set(.55,.30,-.13);
 return g;
}

function volleyball(palette, seam = purpleSeam){
 const g=new THREE.Group(),r=.438;
 add(g,new THREE.SphereGeometry(r,52,36),surface('Sewn volleyball leather',palette ?? ['#e9d6f2','#f8eff0','#ad94c8'],'volleyball'));
 for(let i=0;i<5;i++){
  const samples=Array.from({length:48},(_,j)=>{
   const y=Math.cos(Math.PI*(j+.05)/47.2);
   return polar((i/5)*Math.PI*2+1.48*y,y,r);
  });
  pathTube(g,samples,.008,seam);
 }
 g.rotation.set(.62,.35,-.17);
 return g;
}

function rugby(){
 const g=new THREE.Group(),r=.387;
 const ellipsoid=new THREE.SphereGeometry(1,56,38);
 const pos=ellipsoid.attributes.position;
 for(let i=0;i<pos.count;i++){
  const y=pos.getY(i),v=1-.21*Math.abs(y)**1.65;
  pos.setXYZ(i,pos.getX(i)*r*v,y*.568,pos.getZ(i)*r*v);
 }
 ellipsoid.computeVertexNormals();
 add(g,ellipsoid,surface('Textured rugby leather',['#965b48','#b77553','#d6a272'],'rugby'));
 const lacing=Array.from({length:14},(_,i)=>new THREE.Vector3(0,-.180+i*.028,.390-(i-6.5)**2*.00065));
 pathTube(g,lacing,.008,ballWhite);
 for(let i=0;i<8;i++){
  const y=-.142+i*.040,z=.391-(i-3.5)**2*.0014;
  pathTube(g,[[-.044,y,z],[0,y+.005,z+.006],[.044,y,z]].map(p=>new THREE.Vector3(...p)),.008,ballWhite);
 }
 g.rotation.set(.11,.05,-.39);
 return g;
}

function tennis(){
 const g=new THREE.Group(),r=.398;
 add(g,new THREE.SphereGeometry(r,48,36),surface('Brushed tennis felt',['#87a529','#d0de48','#eff17d'],'tennis'));
 for(const sign of [-1,1]){
  const samples=Array.from({length:58},(_,i)=>{
   const t=i/58*Math.PI*2;
   const y=sign*(.48+.26*Math.cos(2*t));
   return polar(t,y,r);
  });
  pathTube(g,samples,.009,ballWhite,true);
 }
 g.rotation.set(.66,.26,.20);
 return g;
}

function heli(){
 const g=new THREE.Group();
 const globe=new THREE.SphereGeometry(1,34,23);
 const o=add(g,globe,cockpit,-.065,.031,0);
 o.scale.set(.352,.217,.232);
 const frame=add(g,new RoundedBoxGeometry(.58,.173,.33,3,.085),mint,-.05,-.061,.008);
 frame.rotation.z=.035;
 const tail=add(g,new RoundedBoxGeometry(.455,.089,.13,3,.041),mint,.300,.013,0);
 tail.rotation.z=.255;
 const fin=add(g,new RoundedBoxGeometry(.14,.227,.054,3,.025),warm,.467,.097,0);
 fin.rotation.z=.30;
 for(const z of [-.143,.143]){
  pathTube(g,[[-.286,-.240,z],[-.214,-.267,z],[-.085,-.262,z],[.177,-.242,z],[.228,-.204,z]].map(p=>new THREE.Vector3(...p)),.026,edge);
  for(const x of [-.193,.122])pathTube(g,[[x,-.12,z*.69],[x,-.186,z],[x,-.246,z]].map(p=>new THREE.Vector3(...p)),.019,white);
 }
 add(g,new THREE.CylinderGeometry(.052,.071,.114,25),mint,-.039,.229,0);
 for(const angle of [-.41,Math.PI-.41]){
  const blade=add(g,new RoundedBoxGeometry(.493,.031,.094,3,.015),warm,-.039+Math.cos(angle)*.248,.289,Math.sin(angle)*.248);
  blade.rotation.y=-angle;
 }
 const tailRotor=add(g,new RoundedBoxGeometry(.184,.037,.029,3,.014),white,.486,.106,.035);
 tailRotor.rotation.z=.84;
 g.rotation.set(.39,-.11,-.10);
 return g;
}

const volleyballColors={
  'volley-blue':['#4f83b7','#85b4d4','#d9eced'],
  'volley-green':['#709b61','#a3b979','#e9eaca'],
  'volley-orange':['#cb8c52','#eba965','#f8e4ba'],
  'volley-pink':['#bd7b9a','#de99ad','#f5e0e3'],
  'volley-white':['#b8b4aa','#e8e4da','#fff2dc'],
  'volley-yellow':['#b79847','#e9c66e','#fae4a5'],
};
const volleyBuilders={};
for(const [key,colors] of Object.entries(volleyballColors)){
 const seam=physical('Recessed color volleyball seam',colors[0],.67);
 volleyBuilders[key]=()=>volleyball(colors,seam);
}
const builders={...volleyBuilders,soccer,basketball,volleyball,rugby,tennis,helicopter:heli};
function build(key){
 const sculpt=builders[key]();
 sculpt.updateMatrixWorld(true);
 const root=new THREE.Group(),batches=new Map();
 sculpt.traverse(piece=>{
  if(!piece.isMesh)return;
  const geometry=piece.geometry.index?piece.geometry.toNonIndexed():piece.geometry.clone();
  geometry.applyMatrix4(piece.matrixWorld);
  if(!batches.has(piece.material))batches.set(piece.material,[]);
  batches.get(piece.material).push(geometry);
  piece.geometry.dispose();
 });
 for(const [material,parts] of batches){
  const mesh=add(root,mergeGeometries(parts),material);
  mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.sharedGeometry=true;
  parts.forEach(part=>part.dispose());
 }
 root.userData={solid:true,assetKind:key,assetRevision:Object.hasOwn(volleyBuilders,key)?'counter-props-1':'sport-props-1'};
 return root;
}
export const sportRebuildKind=key=>Object.hasOwn(builders,key)?key:null;
export function makeSportRebuild(key){
 if(!templates.has(key))templates.set(key,build(key));
 return templates.get(key).clone(true);
}
