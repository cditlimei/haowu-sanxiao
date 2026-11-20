import * as THREE from '../../node_modules/three/build/three.module.js';
import {mergeGeometries} from '../../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';

const rimRadius=.423;
const tilt=.90;
const stripPitch=.090;

function weave(slot,alongX,segments){
 const halfWidth=.042;
 const width=2*halfWidth;
 const reach=Math.sqrt(.364**2-(Math.abs(slot)+halfWidth)**2);
 const positions=[],indices=[],colors=[];
 for(let step=0;step<=segments;step++){
  const u=2*step/segments-1;
  const along=u*reach;
  const over=Math.cos(Math.PI*(along/stripPitch+Math.round(slot/stripPitch)))*(alongX?1:-1);
  for(let edge=0;edge<3;edge++){
   const across=slot+(edge/2-.5)*width;
   const y=.184+over*.012+(edge===1?.006:0);
   const light=(edge===1?1:.83)-(alongX?.02:.085)+.042*Math.cos(slot*37+along*6)+Math.min(0,over)*.11;
   positions.push(alongX?along:across,y,alongX?across:along);
   colors.push(light,light*.992,light*.975);
  }
  if(step===0)continue;
  const a=(step-1)*3;
  for(let j=0;j<2;j++){
   const i=a+j;
   if(alongX)indices.push(i,i+1,i+3,i+1,i+4,i+3);
   else indices.push(i,i+3,i+1,i+1,i+3,i+4);
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.setIndex(indices);
 geometry.computeVertexNormals();
 return geometry;
}

export function buildBambooSteamer(high=false){
 const group=new THREE.Group();
 group.name='Bamboo steamer with woven lid';
 const material=(name,color,roughness,vertexColors=false)=>new THREE.MeshStandardMaterial({name,color,roughness,vertexColors});
 const wall=material('Honey bamboo wall','#d79947',.63,true);
 const rim=material('Rolled bamboo lip','#f4bd68',.58);
 const weaveMaterial=material('Cross-woven bamboo strips','#eab766',.69,true);
 const seam=material('Recessed seams','#8d5426',.74);
 const segments=high?96:40;
 function turned(profile,surface){
  const geo=new THREE.LatheGeometry(profile.map(([radius,y])=>new THREE.Vector2(radius,y)),segments);
  if(surface.vertexColors){
   const p=geo.attributes.position,colors=[];
   for(let i=0;i<p.count;i++){
    const a=Math.atan2(p.getX(i),p.getZ(i));
    const y=p.getY(i);
    const grain=.90+.043*Math.sin(a*13+Math.cos(y*29)*.26)+.025*Math.cos(a*29+y*9);
    const lighting=THREE.MathUtils.smoothstep(y,-.22,-.14);
    const tint=grain*(.79+.21*lighting);
    colors.push(tint,tint*.975,tint*.936);
   }
   geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  }
  group.add(new THREE.Mesh(geo,surface));
 }
 turned([[0,-.238],[.349,-.238],[.383,-.232],[.401,-.218],[.41,-.193],
  [.414,-.156],[.418,-.065],[.417,-.021],[.410,.014],[.393,.020],[0,.008]],wall);
 turned([[.407,-.058],[.422,-.054],[.424,-.040],[.418,-.030]],rim);
 turned([[.415,-.031],[.421,-.028],[.421,-.015],[.412,-.013]],seam);
 turned([[.406,-.014],[.428,.002],[.432,.029],[.428,.129],[.423,.159],
  [.408,.183],[.389,.195],[.366,.193],[.354,.176],[.351,.154],[.363,.141],[.394,.140]],rim);
 turned([[.366,.141],[.354,.157],[0,.157]],seam);
 const strips=[];
 for(let i=-3;i<=3;i++){
  for(const alongX of [true,false])strips.push(weave(i*stripPitch,alongX,high?48:24));
 }
 group.add(new THREE.Mesh(mergeGeometries(strips),weaveMaterial));
 for(const strip of strips)strip.dispose();
 const orientation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),tilt);
 for(const mesh of group.children)mesh.geometry.applyQuaternion(orientation);

 const parts=[];
 for(let row=0;row<5;row++){
  const lo=rimRadius*(row*2/5-1),hi=lo+rimRadius*2/5;
  const near=lo<=0&&hi>=0?0:Math.min(Math.abs(lo),Math.abs(hi));
  parts.push({
   center:new THREE.Vector3(0,-.02,(lo+hi)/2).applyQuaternion(orientation).toArray(),
   half:[Math.sqrt(rimRadius**2-near**2),.214,(hi-lo)/2],
   quaternion:orientation.toArray(),
  });
 }
 group.userData.collisionParts=parts;
 return group;
}
