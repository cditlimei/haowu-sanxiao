import {Euler, Quaternion, Vector3} from './node_modules/three/build/three.module.js';

const clearance=.008;
const boardHeight=-1+clearance;
const gravity=75;
const epsilon=1e-7;
const flightTurnSeconds=.58;
const contactTurnSeconds=.24;
const maxTravel=.76;

function makeBody(id,pose,bounds,modelSphereRadius=0,modelParts){
 const rotation=new Quaternion().setFromEuler(new Euler(pose.tiltX,pose.tiltY,pose.rotation));
 const axes=[new Vector3(1,0,0),new Vector3(0,1,0),new Vector3(0,0,1)].map(axis=>axis.applyQuaternion(rotation));
 const half=bounds.getSize(new Vector3()).multiplyScalar(pose.scale/2).toArray();
 const center=bounds.getCenter(new Vector3()).multiplyScalar(pose.scale).applyQuaternion(rotation);
 const centerRadius=center.length();
 center.x+=pose.x;center.y+=pose.y;
 const reach=key=>axes.reduce((sum,axis,i)=>sum+Math.abs(axis[key])*half[i],0);
 const top=center.z+reach('z'),bottom=center.z-reach('z');
 const sphereRadius=modelSphereRadius*pose.scale;
 const parts=modelParts?.map(part=>{
  const q=rotation.clone().multiply(new Quaternion(...part.quaternion));
  const axes=[new Vector3(1,0,0),new Vector3(0,1,0),new Vector3(0,0,1)].map(axis=>axis.applyQuaternion(q));
  const half=part.half.map(v=>v*pose.scale);
  const center=new Vector3(...part.center).multiplyScalar(pose.scale).applyQuaternion(rotation);
  center.x+=pose.x;center.y+=pose.y;
  const reach=key=>axes.reduce((sum,axis,i)=>sum+Math.abs(axis[key])*half[i],0);
  return {center,axes,half,reachX:reach('x'),reachY:reach('y'),top:center.z+reach('z'),bottom:center.z-reach('z')};
 });
 const shapeBottom=parts?Math.min(...parts.map(p=>p.bottom)):bottom;
 const shapeTop=parts?Math.max(...parts.map(p=>p.top)):top;
 return {id,depth:pose.supportOrder??pose.depth,center,axes,half,reachX:parts?Math.max(...parts.map(p=>Math.abs(p.center.x-center.x)+p.reachX)):reach('x'),reachY:parts?Math.max(...parts.map(p=>Math.abs(p.center.y-center.y)+p.reachY)):reach('y'),top:shapeTop,bottom:shapeBottom,
  floor:boardHeight-(sphereRadius?center.z-sphereRadius:shapeBottom),radius:parts?Math.max(...parts.map(p=>Math.hypot(...p.half)+p.center.clone().sub(new Vector3(pose.x,pose.y,0)).length())):Math.hypot(...half)+centerRadius,
  modelSphereRadius,sphereRadius,modelParts,parts,
  pose,bounds,supports:[],nearby:[]};
}

// Sweep down the Z axis to the first contact, using round surfaces for
// two balls and unions of oriented boxes for authored compound shapes.
function contactHeight(upper,lower,delta,cross){
 delta.subVectors(upper.center,lower.center);
 if(upper.sphereRadius&&lower.sphereRadius){
  const radius=upper.sphereRadius+lower.sphereRadius;
  const square=radius*radius-delta.x*delta.x-delta.y*delta.y;
  return square>0?Math.sqrt(square)-delta.z+clearance:null;
 }
 if(Math.abs(delta.x)>=upper.reachX+lower.reachX||Math.abs(delta.y)>=upper.reachY+lower.reachY)return null;
 if(!upper.parts&&!lower.parts)return boxContactHeight(upper,lower,delta,cross);
 let highest=null;
 for(const a of upper.parts??[upper])for(const b of lower.parts??[lower]){
  const height=boxContactHeight(a,b,delta,cross);
  if(height!==null&&(highest===null||height>highest))highest=height;
 }
 return highest;
}

function boxContactHeight(upper,lower,delta,cross){
 delta.subVectors(upper.center,lower.center);
 if(Math.abs(delta.x)>=upper.reachX+lower.reachX||Math.abs(delta.y)>=upper.reachY+lower.reachY)return null;
 let min=-Infinity,max=Infinity;
 function intersect(axis){
  if(axis.lengthSq()<epsilon)return true;
  let radius=0;
  for(let i=0;i<3;i++){
   radius+=upper.half[i]*Math.abs(axis.dot(upper.axes[i]));
   radius+=lower.half[i]*Math.abs(axis.dot(lower.axes[i]));
  }
  const center=axis.dot(delta);
  if(Math.abs(axis.z)<epsilon)return Math.abs(center)<radius;
  const first=(-radius-center)/axis.z,last=(radius-center)/axis.z;
  min=Math.max(min,Math.min(first,last));
  max=Math.min(max,Math.max(first,last));
  return min<max;
 }
 for(const axis of upper.axes)if(!intersect(axis))return null;
 for(const axis of lower.axes)if(!intersect(axis))return null;
 for(const a of upper.axes)for(const b of lower.axes)if(!intersect(cross.crossVectors(a,b)))return null;
 return max+clearance;
}

export function createCollisionPile(positions,boundsById,sphereRadii=new Map(),compoundShapes=new Map()){
 const bodies=[...positions].map(([id,pose])=>makeBody(id,pose,boundsById.get(id),sphereRadii.get(id),compoundShapes.get(id)));
 const delta=new Vector3(),cross=new Vector3();
 for(let i=0;i<bodies.length;i++)for(let j=0;j<i;j++){
  const upper=bodies[i],lower=bodies[j];
  const height=contactHeight(upper,lower,delta,cross);
  if(height!==null)upper.supports.push({id:lower.id,height});
  const range=upper.radius+lower.radius+maxTravel*2;
  if(Math.hypot(upper.pose.x-lower.pose.x,upper.pose.y-lower.pose.y)<range)upper.nearby.push({lower,height});
 }
 function supportedHeight(body,getZ){
  let z=body.floor;
  for(const contact of body.supports){
   const below=getZ(contact.id);
   if(below!==undefined)z=Math.max(z,below+contact.height);
  }
  return z;
 }
 function settle(activeIds){
  const active=new Set(activeIds),heights=new Map();
  for(const body of bodies){
   if(active.has(body.id))heights.set(body.id,supportedHeight(body,id=>heights.get(id)));
  }
  return heights;
 }
 function openingPose(body,group,elapsed){
  const {pose,id}=body;
  const age=elapsed-group.userData.fallDelay;
  const angle=(id*.61803398875%1)*Math.PI*2;
  const dx=Math.cos(angle),dy=Math.sin(angle);
  const remaining=1-Math.max(0,Math.min(1,age/flightTurnSeconds));
  const flight=remaining*remaining;
  const impact=group.userData.openingImpact;
  const response=impact?Math.max(0,1-(elapsed-impact.at)/contactTurnSeconds):0;
  const slip=response>0?Math.sin(response*Math.PI)*(1-response)*impact.force:0;
  const shift=flight*.47,turn=flight*.47;
  if(!shift&&!slip)return pose;
  const sx=impact?.x??0,sy=impact?.y??0;
  return {...pose,
   x:pose.x+shift*dx+slip*sx,y:pose.y+shift*dy+slip*sy,
   tiltX:pose.tiltX+turn*dy-slip*sy,tiltY:pose.tiltY-turn*dx+slip*sx,
   rotation:pose.rotation+turn*.48*Math.sin(angle*2),
  };
 }
 function launch(groups){
  const maxDepth=bodies.reduce((max,body)=>Math.max(max,body.depth),1);
  for(const body of bodies){
   const group=groups.get(body.id);
   if(!group)continue;
   const rank=body.depth/maxDepth;
   group.position.copy(group.userData.target);
   group.position.z+=8+rank*9;
   group.userData.fallDelay=rank*.32+(body.id*.61803398875%1)*.13;
   group.userData.fallVelocity=0;
   group.userData.openingImpact=null;
  }
  advance(groups,0,0);
 }
 function advance(groups,dt,elapsed=Infinity){
  let moving=false,impacts=0,turning=0,sliding=0;
  const opening=Number.isFinite(elapsed);
  const transformed=new Map();
  for(const body of bodies){
   const group=groups.get(body.id);
   if(!group)continue;
   let support,contact;
   if(opening){
    const pose=openingPose(body,group,elapsed);
    group.position.x=pose.x;group.position.y=pose.y;
    group.rotation.set(pose.tiltX,pose.tiltY,pose.rotation);
    const upper=pose===body.pose?body:makeBody(body.id,pose,body.bounds,body.modelSphereRadius,body.modelParts);
    if(upper!==body){
     transformed.set(body.id,upper);
     turning++;moving=true;
    }
    if(group.userData.openingImpact&&elapsed-group.userData.openingImpact.at<contactTurnSeconds)sliding++;
    support=upper.floor;
    for(let i=body.nearby.length-1;i>=0;i--){
     const {lower,height}=body.nearby[i];
     const below=groups.get(lower.id);
     if(!below)continue;
     const currentLower=transformed.get(lower.id)??lower;
     if(below.position.z+currentLower.top-upper.bottom+clearance<=support)continue;
     const gap=upper===body&&currentLower===lower?height:contactHeight(upper,currentLower,delta,cross);
     if(gap!==null&&below.position.z+gap>support){support=below.position.z+gap;contact=currentLower;}
    }
   }else support=supportedHeight(body,id=>groups.get(id)?.position.z);
   if(elapsed<(group.userData.fallDelay??0)){
    group.position.z=Math.max(group.position.z,support);
    moving=true;
    continue;
   }
   let velocity=group.userData.fallVelocity??0;
   let z=group.position.z;
   if(z>support+epsilon||velocity>0){
    velocity-=gravity*dt;
    z+=velocity*dt;
    if(z<=support){
     let rebound=0;
     if(velocity<-2&&(!opening||!group.userData.openingImpact)){
      impacts++;
      if(opening){
       // Only the first strike rebounds. Contacts in the pile absorb more energy than the tray.
       rebound=Math.min(body.sphereRadius?6:4.8,-velocity*(contact ? .08 : body.sphereRadius ? .22 : .15));
       const point=contact?.pose??{x:0,y:0};
       const x=group.position.x-point.x,y=group.position.y-point.y;
       const distance=Math.hypot(x,y)||1;
       group.userData.openingImpact={at:elapsed,x:x/distance,y:y/distance,force:Math.min(.21,-velocity*.0075)};
      }
     }
     z=support;velocity=rebound;
    }
   }else{z=support;velocity=0;}
   const changed=Math.abs(group.position.z-z)>epsilon;
   moving ||= changed||Math.abs(velocity)>epsilon;
   group.position.z=z;
   group.userData.fallVelocity=velocity;
  }
  return {moving,impacts,turning,sliding};
 }
 return {settle,launch,advance};
}
