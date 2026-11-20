import * as THREE from 'three';

const models=new Map();
const fruitProfiles={
 apple:[[0,-.354],[.121,-.382],[.251,-.365],[.36,-.293],[.433,-.158],[.453,.02],
  [.456,.155],[.425,.268],[.354,.359],[.263,.400],[.175,.395],[.095,.354],[0,.343]],
 mandarin:[[0,-.386],[.104,-.404],[.231,-.372],[.355,-.279],[.422,-.151],[.448,.01],
  [.452,.137],[.421,.244],[.351,.321],[.252,.372],[.154,.389],[.072,.365],[0,.350]],
};

function add(group,geometry,material,x=0,y=0,z=0){
 const object=new THREE.Mesh(geometry,material);
 object.position.set(x,y,z);
 object.castShadow=true;
 object.receiveShadow=true;
 object.userData.sharedGeometry=true;
 group.add(object);
 return object;
}

function revolve(points,steps=52,sides=60){
 const profile=points.map(point=>new THREE.Vector2(...point));
 const sampled=steps?new THREE.SplineCurve(profile).getPoints(steps):profile;
 sampled.forEach(point=>{point.x=Math.max(0,point.x);});
 return new THREE.LatheGeometry(sampled,sides);
}

function texture(canvas,srgb){
 const map=new THREE.CanvasTexture(canvas);
 if(srgb)map.colorSpace=THREE.SRGBColorSpace;
 map.anisotropy=4;
 return map;
}

function fruitMaps(orange){
 const width=768,height=512;
 const canvas=()=>Object.assign(document.createElement('canvas'),{width,height}).getContext('2d');
 const color=canvas(),normal=canvas();
 const albedo=color.createImageData(width,height),normals=normal.createImageData(width,height);
 const relief=new Float32Array(width*height),freckles=new Float32Array(width*height);
 let seed=orange?130811:240201;
 const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const wrap=x=>(x+width)%width;
 const pores=orange?4400:2300;
 for(let i=0;i<pores;i++){
  const x=Math.floor(random()*width),y=Math.floor(random()*height);
  const radius=orange?1.35+random()*2.9:.7+random()*1.9;
  const strength=.45+random()*.55;
  const distance=Math.ceil(radius);
  for(let dy=-distance;dy<=distance;dy++)for(let dx=-distance;dx<=distance;dx++){
   if(y+dy<0||y+dy>=height)continue;
   const r=Math.hypot(dx,dy)/radius;
   if(r>=1)continue;
   const j=(y+dy)*width+wrap(x+dx);
   const core=(1-r*r)**2*strength;
   if(orange)relief[j]-=core*.22;
   freckles[j]=Math.max(freckles[j],core);
  }
 }
 const heightAt=(x,y)=>relief[Math.max(0,Math.min(height-1,y))*width+wrap(x)];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=x/width*Math.PI*2,v=y/height;
  const variation=Math.sin(u*3+v*5)*Math.cos(v*11-u*2)*.53+Math.cos(u*7-v*15)*.20;
  const flushing=Math.sin(u+.44)*.5+.5;
  const i=(y*width+x)*4,dot=freckles[i/4];
  const base=orange
   ?[248+variation*7-dot*16,116+variation*30+flushing*22-dot*17,18+variation*12-dot*5]
   :[136+flushing*78+variation*16+dot*22,14+flushing*13+variation*9+dot*30,23+flushing*5+dot*16];
  albedo.data.set([...base,255],i);
  const nx=(heightAt(x-1,y)-heightAt(x+1,y))*1.27;
  const ny=(heightAt(x,y+1)-heightAt(x,y-1))*1.27;
  const scale=127.5/Math.hypot(1,nx,ny);
  normals.data.set([127.5+nx*scale,127.5+ny*scale,127.5+scale,255],i);
 }
 color.putImageData(albedo,0,0);
 normal.putImageData(normals,0,0);
 return {map:texture(color.canvas,true),normalMap:orange?texture(normal.canvas,false):null};
}

const leafMaterial=new THREE.MeshPhysicalMaterial({
 name:'Fresh orchard leaf',color:'#628723',roughness:.43,clearcoat:.30,
 clearcoatRoughness:.20,side:THREE.DoubleSide,
});
const veinMaterial=new THREE.MeshStandardMaterial({name:'Leaf veins',color:'#9aab45',roughness:.55});
const stemMaterial=new THREE.MeshStandardMaterial({name:'Dry orchard stem',color:'#825230',roughness:.67});
const curve=coords=>new THREE.CatmullRomCurve3(coords.map(p=>new THREE.Vector3(...p)));
function leaf(group){
 const coordinates=[],indices=[];
 const sections=18,bands=6;
 for(let i=0;i<=sections;i++)for(let j=0;j<=bands;j++){
  const t=i/sections,q=j/bands*2-1;
  const half=Math.sin(t*Math.PI)**.93*.059;
  coordinates.push(.011-t*.196,.413+t*.050+q*half,.060+(1-q*q)*half*.58+t*.045);
  if(i<sections&&j<bands){
   const a=i*(bands+1)+j,b=a+bands+1;
   indices.push(a,b,a+1,a+1,b,b+1);
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(coordinates,3));
 geometry.setIndex(indices);
 geometry.computeVertexNormals();
 add(group,geometry,leafMaterial);
 add(group,new THREE.TubeGeometry(curve([[.01,.414,.062],[-.078,.437,.108],[-.176,.459,.107]]),14,.0032,6,false),veinMaterial);
}

function fruit(kind){
 const orange=kind==='mandarin',group=new THREE.Group();
 const skin=new THREE.MeshPhysicalMaterial({
  name:orange?'Dimpled mandarin rind':'Burgundy apple wax',
  ...fruitMaps(orange),roughness:orange?.43:.32,
  clearcoat:orange?.41:.91,clearcoatRoughness:orange?.24:.058,
  normalScale:new THREE.Vector2(1.32,1.32),ior:orange?1.42:1.52,
 });
 const geometry=revolve(fruitProfiles[kind]);
 const positions=geometry.attributes.position;
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
  const a=Math.atan2(x,z);
  const waves=orange?1+.014*Math.cos(a*5+y*13):1+.044*Math.cos(a*5)*(.26+.75*Math.abs(y)/.4);
  positions.setXYZ(i,x*waves,y+(orange?.004:.012)*Math.cos(a*5)*Math.hypot(x,z)*2,z*waves*(orange?.962:.95));
 }
 geometry.computeVertexNormals();
 add(group,geometry,skin);
 const length=orange?.071:.119;
 const stem=revolve([[0,.351],[.026,.352],[.023,.37],[.016,.36+length],[.019,.37+length],[0,.37+length]],0,16);
 stem.rotateZ(-.14);
 add(group,stem,stemMaterial,-.035,orange?.032:0,0);
 leaf(group);
 group.rotation.x=orange?.11:.09;
 return group;
}

function blossomTransfer(){
 const canvas=Object.assign(document.createElement('canvas'),{width:768,height:768});
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#a91b24';
 ctx.fillRect(0,0,768,768);
 for(const center of [0,384,768]){
  ctx.save();
  ctx.translate(center,387);
  ctx.lineWidth=5;
  ctx.strokeStyle='#65783f';
  ctx.beginPath();
  ctx.moveTo(-2,7);
  ctx.bezierCurveTo(-12,50,16,65,-13,115);
  ctx.stroke();
  ctx.fillStyle='#5c7740';
  ctx.beginPath();
  ctx.moveTo(3,79);
  ctx.quadraticCurveTo(20,39,46,53);
  ctx.quadraticCurveTo(37,77,3,79);
  ctx.moveTo(1,88);
  ctx.quadraticCurveTo(-22,55,-43,68);
  ctx.quadraticCurveTo(-28,90,1,88);
  ctx.fill();
  for(let i=0;i<5;i++){
   ctx.save();
   ctx.rotate(i*Math.PI*2/5+.1);
   ctx.fillStyle='#fff0cd';
   ctx.beginPath();
   ctx.moveTo(0,5);
   ctx.bezierCurveTo(-36,-21,-35,-58,-5,-60);
   ctx.bezierCurveTo(18,-64,36,-36,0,5);
   ctx.fill();
   ctx.strokeStyle='#e7b976';
   ctx.lineWidth=1.4;
   ctx.beginPath();
   ctx.moveTo(0,0);
   ctx.quadraticCurveTo(-13,-17,-8,-36);
   ctx.stroke();
   ctx.restore();
  }
  ctx.fillStyle='#ffce6a';
  ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#b87933';
  for(let i=0;i<7;i++){
   const a=i*Math.PI*2/7;
   ctx.beginPath();ctx.arc(Math.cos(a)*6,Math.sin(a)*6,1.6,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
 }
 return texture(canvas,true);
}

function flask(){
 const group=new THREE.Group();
 const enamel=new THREE.MeshPhysicalMaterial({name:'Ruby vitreous enamel',map:blossomTransfer(),
  roughness:.25,clearcoat:1,clearcoatRoughness:.055,metalness:.055});
 const porcelain=new THREE.MeshPhysicalMaterial({name:'Ivory porcelain flask lid',color:'#ffe8c5',
  roughness:.27,clearcoat:.71,clearcoatRoughness:.10});
 const brass=new THREE.MeshPhysicalMaterial({name:'Rolled brass bands',color:'#e6ac52',metalness:.74,
  roughness:.22,clearcoat:.55,clearcoatRoughness:.125});
 const rubber=new THREE.MeshStandardMaterial({name:'Wine rubber foot',color:'#471a19',roughness:.71});
 const body=revolve([[0,-.437],[.181,-.437],[.223,-.42],[.244,-.393],[.244,.120],
  [.235,.211],[.199,.276],[.144,.305],[.124,.349],[0,.354]],40,48);
 const uv=body.attributes.uv,position=body.attributes.position;
 for(let i=0;i<uv.count;i++)uv.setY(i,(position.getY(i)+.437)/.791);
 add(group,body,enamel);
 add(group,revolve([[0,-.474],[.216,-.474],[.241,-.463],[.25,-.441],[.25,-.411],[.239,-.404],[0,-.402]],0),rubber);
 const collar=(y,r)=>add(group,revolve([[r-.012,y-.022],[r,y-.022],[r+.008,y-.014],
  [r+.009,y+.012],[r+.002,y+.023],[r-.012,y+.024]],0,48),brass);
 collar(-.425,.245);
 collar(.216,.236);
 collar(.336,.131);
 add(group,revolve([[0,.345],[.151,.345],[.181,.36],[.194,.391],[.187,.468],
  [.166,.491],[.129,.499],[.080,.504],[0,.505]],38),porcelain);
 const handle=curve([[.213,.207,0],[.320,.231,.018],[.384,.183,.021],
  [.401,.048,.025],[.394,-.117,.018],[.350,-.22,.013],[.233,-.25,0]]);
 add(group,new THREE.TubeGeometry(handle,38,.043,12,false),porcelain);
 for(const y of [.205,-.249]){
  const socket=add(group,new THREE.SphereGeometry(.049,22,14),brass,.239,y,0);
  socket.scale.set(.65,1,1);
 }
 group.rotation.x=.16;
 return group;
}

// Bake the authored angle before the physics system applies an opening pose.
function build(kind){
 const sculpt=kind==='flask'?flask():fruit(kind);
 const root=new THREE.Group();
 root.userData={solid:true,assetRevision:kind==='flask'?'orchard-enamel-1':'fruit-glaze-2',assetKind:kind};
 root.add(sculpt);
 return root;
}

export function orchardRebuildKind(key,level,itemId){
 return key==='apple'?'apple':
  key==='orange'||itemId===1048&&[1,2,3,5,32,719].includes(level)?'mandarin':
  itemId===1126&&[1,2,3,5,29,31,32,719].includes(level)?'flask':null;
}

export function makeOrchardRebuild(kind){
 if(!models.has(kind))models.set(kind,build(kind));
 return models.get(kind).clone(true);
}
