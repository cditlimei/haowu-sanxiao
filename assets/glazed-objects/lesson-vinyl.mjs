import * as THREE from 'three';

// Oil glands interrupt the waxy surface at two scales. A periodic height field
// keeps the normal continuous around the seam of the revolved fruit.
let rindNormals;
function peelRelief(){
 if(rindNormals)return rindNormals;
 const w=768,h=384,height=new Float32Array(w*h);
 let seed=11491;
 const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const u=x*2*Math.PI/w,v=y*2*Math.PI/h;
  height[y*w+x]=.12*Math.sin(29*u+2*Math.sin(5*v))*Math.sin(14*v+2*Math.cos(8*u));
 }
 for(let n=0;n<13000;n++){
  const cx=random()*w,cy=random()*h,radius=1.0+1.75*random()**2;
  const patch=.65+.32*Math.sin(cx/w*Math.PI*8+2*Math.cos(cy/h*11))*Math.cos(cy/h*15);
  const rx=radius*(1.2+.35*random()),ry=radius;
  for(let y=Math.max(0,Math.floor(cy-ry));y<=Math.min(h-1,cy+ry);y++)
   for(let x=Math.floor(cx-rx);x<=cx+rx;x++){
    const d=((x-cx)/rx)**2+((y-cy)/ry)**2;
    if(d<1)height[y*w+(x+w)%w]-=.45*patch*(1-d)**2;
   }
 }
 const data=new Uint8Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const nx=height[y*w+(x+w-1)%w]-height[y*w+(x+1)%w];
  const ny=height[Math.min(h-1,y+1)*w+x]-height[Math.max(0,y-1)*w+x];
  const k=127/Math.hypot(nx,ny,1),i=(y*w+x)*4;
  data.set([128+k*nx,128+k*ny,128+k,255],i);
 }
 rindNormals=new THREE.DataTexture(data,w,h);
 rindNormals.wrapS=THREE.RepeatWrapping;
 rindNormals.generateMipmaps=true;
 rindNormals.minFilter=THREE.LinearMipmapLinearFilter;
 rindNormals.magFilter=THREE.LinearFilter;
 rindNormals.needsUpdate=true;
 return rindNormals;
}
// Keep the hue in the diffuse coat. The scene's window reflection follows the molded surface.
const palette={
 'Duck lacquer':['#ffd11c',.26,.78,.13], 'Duck wing lacquer':['#fbc71f',.30,.63,.16],
 'Berry skin':['#ac0634',.39,.39,.28], 'Berry seed recess':['#99162f',.38,.28,.21],
 'Golden berry seed':['#c99857',.51,.13,.25], 'Orchard leaf':['#457b29',.44,.28,.22],
 'Teal molded resin':['#124bc2',.24,.87,.13], 'Aqua colored resin':['#265fd8',.23,.83,.12],
 'Teal soft grip':['#183f99',.39,.33,.22], 'Molded cream resin':['#2859c5',.28,.72,.15],
 'Dimpled mandarin rind':[null,.44,.44,.27]
};
const mandarinShapes=new WeakMap();
function mandarinShape(source){
 if(mandarinShapes.has(source))return mandarinShapes.get(source);
 const geometry=source.clone(),pos=geometry.attributes.position;
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),r=Math.hypot(x,z),a=Math.atan2(z,x);
  const folds=.5+.5*Math.cos(9*a+.4*Math.sin(3*a));
  const shoulder=Math.exp(-((r-.19)**2)/.016)*Math.max(0,y/.38);
  const lobe=1+.018*Math.cos(7*a+.7*y)*Math.min(1,r/.15);
  pos.setXYZ(i,x*lobe,y-.036*shoulder*folds,z*lobe);
 }
 geometry.computeVertexNormals();
 mandarinShapes.set(source,geometry);return geometry;
}
const caches=new Map();
export function finishLessonVinyl(model,kind){
 if(!caches.has(kind))caches.set(kind,new WeakMap());
 const cache=caches.get(kind);
 function coat(original){
  if(cache.has(original))return cache.get(original);
  const m=original.clone();
  const recipe=kind==='watergun'&&m.name==='Orange lacquer'?['#f6e9ce',.29,.65,.16]:palette[m.name];
  if(recipe){
   const [color,roughness,clearcoat,clearcoatRoughness]=recipe;
   if(color)m.color.set(color);
   Object.assign(m,{roughness,clearcoat,clearcoatRoughness,metalness:0,transmission:0});
   if(m.name==='Berry skin')m.vertexColors=true;
   if(m.name==='Orchard leaf')m.side=THREE.DoubleSide;
   if(m.name==='Dimpled mandarin rind'){
    const source=m.map.image,skin=document.createElement('canvas');
    skin.width=source.width;skin.height=source.height;
    const ctx=skin.getContext('2d');ctx.drawImage(source,0,0);
    const pixels=ctx.getImageData(0,0,skin.width,skin.height);
    for(let y=0;y<skin.height;y++)for(let x=0;x<skin.width;x++){
     const a=x/skin.width*2*Math.PI,v=y/skin.height;
     const bloom=Math.sin(3*a+8*v+.6*Math.sin(7*a))*Math.cos(14*v-2*a);
     const crown=Math.exp(-8*v)*(1+.45*Math.cos(9*a));
     const i=(y*skin.width+x)*4;
     pixels.data[i]-=23*crown;
     pixels.data[i+1]+=9*bloom+18*crown;
     pixels.data[i+2]+=3*bloom;
    }
    ctx.putImageData(pixels,0,0);
    m.map=m.map.clone();m.map.source=new THREE.Source(skin);m.map.needsUpdate=true;
    m.normalScale.setScalar(.60);
    m.normalMap=peelRelief();
    m.clearcoatNormalMap=m.normalMap;
    m.clearcoatNormalScale.setScalar(.33);
   }
  }
  cache.set(original,m);return m;
 }
 model.traverse(o=>{if(o.isMesh)o.material=Array.isArray(o.material)?o.material.map(coat):coat(o.material);});
 // Widen the fruit through its equator while keeping rind and calyx together.
 model.traverse(part=>{
  if(part.material?.name==='Dimpled mandarin rind')part.geometry=mandarinShape(part.geometry);
 });
 if(model.children.some(child=>child.material?.name==='Dimpled mandarin rind') || kind==='mandarin'){
  for(const child of model.children){
   child.scale.x*=1.045;
   child.scale.y*=.80;
   child.position.x*=1.045;
   child.position.y*=.80;
  }
 }
 return model;
}
