import {stackOrder} from './assets/stack-order.mjs?rev=parcel26';
import {level94Layout} from './level-94-layout.mjs';
import {level56Layout} from './level-56-layout.mjs';
import {level499Layout} from './level-499-layout.mjs';
import {level572And2009Layout} from './level-572-2009-layout.mjs';
import {level111Layout} from './level-111-layout.mjs';
import {level211235780Layout} from './level-211-235-780-layout.mjs';
import {level168Layout} from './level-168-layout.mjs';
import {level106And595Layout} from './level-106-595-layout.mjs';
import {level2986Layout} from './level-2986-layout.mjs';
import {level99Layout} from './level-99-layout.mjs';
import {level42Layout} from './level-42-layout.mjs';
import {level37Layout} from './level-37-layout.mjs';
import {adjacentLayout} from './adjacent-layout.mjs';
import {level707Layout} from './level-707-layout.mjs';
import {level2815Layout} from './level-2815-layout.mjs';
import {level62Layout} from './level-62-layout.mjs';
import {level118Layout} from './level-118-layout.mjs';
import {level719Layout} from './level-719-layout.mjs';

// The envelope comes from the reference image; per-object positions remain an approximation.
export function random(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
export function buildPile(items,config,shuffle=0,presentation={}){
 const rand=random(config.seed+shuffle),layout=config.layout,aspect=layout.aspect||.675;
 const width=10,height=width/aspect,[left,top,right,bottom]=layout.bounds;
 const x0=(left-.5)*width,x1=(right-.5)*width,y0=(.5-bottom)*height,y1=(.5-top)*height;
 if(layout.chainStacks){
  const positions=new Map(),slots=[0,5,1,2,3,4];
  if(shuffle)for(let i=slots.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}
  const fans=stackOrder(layout,shuffle);
  fans.forEach((ids,i)=>ids.forEach((id,layer)=>{
   const slot=slots[i],x=x0+(x1-x0)*(.26+.48*(slot%2));
   const y=y1-(y1-y0)*(.18+.32*Math.floor(slot/2));
   positions.set(items[id].id,{x:x+(layer-(ids.length-1)/2)*.33,y:y+(layer-(ids.length-1)/2)*.20,z:layer*.36,
    scale:1.8,depth:layer,rotation:(layer-(ids.length-1)/2)*.17+(rand()-.5)*.15,tiltX:.26,tiltY:.05});
  }));
  return {positions,width,height,depth:Math.max(...fans.map(fan=>fan.length))};
 }
 if(layout.spreadTriples){
  const positions=new Map();
  const triples=config.vinyl?[[2,4,9],[0,5,10],[3,7,11],[1,6,8]]:[[0,5,10],[1,6,11],[2,4,9],[3,7,8]];
  for(let i=config.vinyl && !shuffle?0:triples.length-1;i>0;i--){
   const j=Math.floor(rand()*(i+1));[triples[i],triples[j]]=[triples[j],triples[i]];
  }
  items.forEach((item,index)=>{
   const triple=Math.floor(index/3),slot=triples[triple][index%3];
   const x=x0+(x1-x0)*(slot%3+.5)/3;
   const y=y1-(y1-y0)*(Math.floor(slot/3)+.5)/4;
   positions.set(item.id,{x,y,z:0,scale:1.7,depth:triple,rotation:(rand()-.5)*(config.vinyl?.32:.95),
    tiltX:.25+rand()*.16,tiltY:(rand()-.5)*.25});
  });
  return {positions,width,height,depth:1};
 }
 const profile=presentation.solid?(level94Layout(config,shuffle)??level719Layout(config,shuffle)??adjacentLayout(config,shuffle)??level118Layout(config,shuffle)??level62Layout(config,shuffle)??level2815Layout(config,shuffle)??level707Layout(config,shuffle)??level37Layout(config,shuffle)??level42Layout(config,shuffle)??level99Layout(config,shuffle)??level2986Layout(config,shuffle)??level106And595Layout(config,shuffle)??(presentation.foregroundGoals?null:level168Layout(config,shuffle))??(presentation.foregroundGoals&&[211,235].includes(config.id)?null:level211235780Layout(config,shuffle))??level111Layout(config,shuffle)??level572And2009Layout(config,shuffle)??level499Layout(config,shuffle)??level56Layout(config,shuffle)):null;
 const featuredOpening=config.id===1529&&config.variant===1&&shuffle===0&&presentation.foregroundGoals;
 const grid=presentation.foregroundGoals?layout.openingGrid:undefined;
 const density=presentation.studio?Math.max(.16,Math.min(1,(items.length-60)/250)):0;
 const studioTilt=presentation.studio?1.66:Infinity;
 const centerWeight=presentation.foregroundGoals?layout.openingCenterWeight??0:0;
 const centerX=(x0+x1)/2,centerY=(y0+y1)/2;
 const gridPoints=new Map();
 const baseScale=profile?.baseScale??Math.min(grid?.maxScale??2.4,(x1-x0)/3.1,(y1-y0)/3.1,Math.max(.7,Math.sqrt((x1-x0)*(y1-y0)*8/items.length)));
 const byType=new Map();for(const item of items){if(!byType.has(item.type))byType.set(item.type,[]);byType.get(item.type).push(item);}
 const triples=[];for(const list of byType.values())for(let i=0;i<list.length;i+=3)triples.push(list.slice(i,i+3));
 for(let i=config.vinyl && !shuffle?0:triples.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[triples[i],triples[j]]=[triples[j],triples[i]];}
 // Reserve the photographed surface objects before generating the hidden layers.
 const surface=new Map(),surplus=[];
 for(const anchor of profile?.anchors??[]){
  const index=triples.findIndex(triple=>!surface.has(triple)&&triple[0].type===anchor.type);
  if(index<0){surplus.push(anchor);continue;}
  const [triple]=triples.splice(index,1);surface.set(triple,[anchor]);triples.push(triple);
 }
 if(presentation.foregroundGoals){
  const goals=new Set(config.goals.map(goal=>goal.type));
  const upper=[],middle=[],clutter=[],counts=new Map();
  for(const triple of triples){
   const type=triple[0].type;
   if(!goals.has(type)){clutter.push(triple);continue;}
   const count=counts.get(type)??0;
   const layer=count<(config.openingGoalSets??Infinity)?upper:middle;
   layer.push(triple);
   counts.set(type,count+1);
  }
  const split=Math.ceil(clutter.length*.65);
  const topClutter=clutter.splice(split);
  // Keep later target matches within reach while letting clutter show between them.
  const upperMiddle=[];
  for(let index=0;index<topClutter.length;index++){
   upperMiddle.push(topClutter[index]);
   if(middle.length&&index>=Math.floor(topClutter.length/3))upperMiddle.push(middle.shift());
  }
  if(featuredOpening){
   // One readable triple per goal, staggered over the supporting pile.
   const featured=[];
   for(const type of goals){
    const index=upper.findLastIndex(triple=>triple[0].type===type);
    if(index>=0)featured.push(upper.splice(index,1)[0]);
   }
   const slots=[
    [.17,.12],[.39,.11],[.61,.12],[.83,.14],
    [.24,.30],[.48,.29],[.74,.31],
    [.16,.49],[.38,.48],[.62,.50],[.84,.50],
    [.26,.69],[.50,.68],[.75,.70],
    [.17,.86],[.39,.87],[.61,.86],[.82,.87],
   ];
   // The same type appears once in each band of six, away from its other copies.
   const order=[0,4,1,2,5,3, 1,2,0,5,3,4, 2,4,0,5,1,3];
   for(const [index,[u,v]] of slots.entries()){
    const triple=featured[order[index]];
    if(!gridPoints.has(triple))gridPoints.set(triple,[]);
    gridPoints.get(triple).push({x:x0+(x1-x0)*u,y:y1-(y1-y0)*v});
   }
   upper.push(...featured);
  }else if(grid){
   const top=[];
   for(const type of goals){
    const index=upper.findLastIndex(triple=>triple[0].type===type);
    if(index>=0)top.push(upper.splice(index,1)[0]);
   }
   const {columns,rows,stagger=0}=grid;
   const slots=Array.from({length:columns*rows},(_,index)=>{
    const column=index%columns;
    const u=(column+.5+(rand()-.5)*.13)/columns;
    const v=(Math.floor(index/columns)+.5+(rand()-.5)*.13+(column%2?.5:-.5)*stagger)/rows;
    return {x:x0+(x1-x0)*u,y:y0+(y1-y0)*v};
   });
   const count=top.reduce((total,triple)=>total+triple.length,0);
   while(slots.length>count){
    slots.pop();
    if(slots.length>count)slots.shift();
   }
   for(let i=slots.length-1;i>0;i--){
    const index=Math.floor(rand()*(i+1));
    [slots[i],slots[index]]=[slots[index],slots[i]];
   }
   for(const triple of top)gridPoints.set(triple,triple.map(()=>slots.pop()));
   upper.push(...top);
  }
  triples.splice(0,triples.length,...clutter,...upperMiddle,...middle,...upper);
 }
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 function toPoint(anchor,scale){
  if(profile.clampAnchors===false)return {x:(anchor.x-.5)*width,y:(.5-anchor.y)*height};
  const margin=scale*.49;
  return {x:clamp((anchor.x-.5)*width,x0+margin,x1-margin),y:clamp((.5-anchor.y)*height,y0+margin,y1-margin)};
 }
 for(const anchor of surplus){
  const scale=baseScale*(profile.anchorScales?.get(anchor.type)??profile.scales.get(anchor.type)??1);
  const p=toPoint(anchor,scale);
  for(const [triple,poses] of surface){
   if(triple[0].type!==anchor.type||poses.length>=triple.length)continue;
   if(poses.some(pose=>{const q=toPoint(pose,scale);return Math.hypot(p.x-q.x,p.y-q.y)<=scale*1.5;}))continue;
   poses.push(anchor);break;
  }
 }
 const frozen=[...surface.values()].flat().map(p=>({x:(p.x-.5)*width,y:(.5-p.y)*height}));
 // In densely packed reference boards, keep a light occupancy map so
 // random hidden triples fill gaps across the whole footprint.
 const coverage=profile?.coverage||presentation.foregroundGoals?new Uint16Array(16*18):null;
 function coverageCell({x,y}){
  const row=clamp(Math.floor((y-y0)/(y1-y0)*18),0,17);
  const col=clamp(Math.floor((x-x0)/(x1-x0)*16),0,15);
  return row*16+col;
 }
 function coverageScore(point){
  if(!coverage)return 0;
  const cell=coverageCell(point),col=cell%16,row=Math.floor(cell/16);
  let filled=0,weight=0;
  for(let r=Math.max(0,row-1);r<=Math.min(17,row+1);r++){
   for(let c=Math.max(0,col-1);c<=Math.min(15,col+1);c++){
    const influence=r===row&&c===col?4:1;
    filled+=coverage[r*16+c]*influence;
    weight+=influence;
   }
  }
  return -.76*filled/weight;
 }
 const footprint=profile?.footprint;
 function footprintScore({x,y}){
  const cols=footprint[0].length,rows=footprint.length;
  const u=clamp((x-x0)/(x1-x0)*cols-.5,0,cols-1);
  const v=clamp((y1-y)/(y1-y0)*rows-.5,0,rows-1);
  const col=Math.floor(u),row=Math.floor(v);
  const c=Math.min(col+1,cols-1),r=Math.min(row+1,rows-1);
  const top=footprint[row][col]+(footprint[row][c]-footprint[row][col])*(u-col);
  const bottom=footprint[r][col]+(footprint[r][c]-footprint[r][col])*(u-col);
  return profile.footprintWeight*(top+(bottom-top)*(v-row)-1);
 }
 if(coverage)for(const point of frozen)coverage[coverageCell(point)]++;
 const result=new Map(),recent=[];let highest=0;
 triples.forEach((triple,depth)=>{
  const type=triple[0].type;
  const scale=baseScale*(profile?.scales.get(type)??config.itemScales?.[type]??1);
  const margin=scale*(profile?.anchors.length ? .49 : .75);
  const minX=x0+margin,maxX=x1-margin,minY=y0+margin,maxY=y1-margin;
  const anchors=surface.get(triple)??[];
  const points=gridPoints.get(triple)??anchors.map(anchor=>toPoint(anchor,scale));
  const featured=featuredOpening&&gridPoints.has(triple);
  const anchorScale=profile?.anchorScales?.get(type);
  const separation=anchors.length&&anchorScale?Math.max(scale,baseScale*anchorScale):scale;
  let placed=[],best=-Infinity;
  // Prefer open screen space among the most recent surface objects. Keep the
  // triple separation invariant so removing upper triples cannot deadlock play.
  for(let attempt=0;attempt<80;attempt++){
   const candidate=triple.map((_,i)=>points[i]??({x:minX+rand()*(maxX-minX),y:minY+rand()*(maxY-minY)}));
   if(!candidate.every((p,i)=>candidate.slice(i+1).every(q=>Math.hypot(p.x-q.x,p.y-q.y)>separation*1.5)))continue;
   const score=candidate.reduce((sum,p)=>{
    const gap=Math.min(scale*1.5,...recent.map(q=>Math.hypot(p.x-q.x,p.y-q.y)));
    const reserved=anchors.length&&!points.includes(p)?Math.min(scale,...frozen.map(q=>Math.hypot(p.x-q.x,p.y-q.y))):scale;
    const distance=centerWeight?Math.hypot((p.x-centerX)/(x1-x0),(p.y-centerY)/(y1-y0)):0;
    const balance=points.includes(p)?0:coverageScore(p)+(footprint?footprintScore(p):0)-centerWeight*distance;
    return sum+gap*(1+density*.30)+balance+(anchors.length?2*reserved:0);
   },0);
   if(score>best){best=score;placed=candidate;}
  }
  if(!placed.length){
   const corners=[{x:minX,y:minY},{x:maxX,y:minY},{x:minX,y:maxY},{x:maxX,y:maxY}];
   placed=points.length?[...points]:[corners[0],corners[1],{x:(minX+maxX)/2,y:maxY}];
   while(placed.length<triple.length){
    const gap=p=>Math.min(...placed.map(q=>Math.hypot(p.x-q.x,p.y-q.y)));
    placed.push(corners.sort((a,b)=>gap(b)-gap(a))[0]);
   }
  }
  if(coverage)for(const point of placed)if(!points.includes(point))coverage[coverageCell(point)]++;
  recent.push(...placed);while(recent.length>12)recent.shift();
  let z=0;
  if(presentation.solid){
   for(const p of placed)for(const q of result.values())if(Math.hypot(p.x-q.x,p.y-q.y)<(scale+q.scale)*.625)z=Math.max(z,q.z+(scale+q.scale)*.325);
   highest=Math.max(highest,z+scale);
  }else z=depth/Math.max(1,triples.length)*5;
  triple.forEach((item,i)=>{
   const {x,y}=placed[i];const pose=anchors[i];
   const rotation=(rand()-.5)*Math.PI*2;
   const tiltX=(rand()-.5)*Math.min(studioTilt,profile?.tiltRange??(profile?2.15:1.1));
   const tiltY=(rand()-.5)*Math.min(studioTilt,profile?.tiltRange??(profile?2.1:1.1));
   const fallbackTiltY=profile?.unanchoredTiltY?.get(item.type);
   const visibleScale=pose&&(profile.anchorScales?.get(item.type));
   const exposed=depth/Math.max(1,triples.length-1);
   const studioScale=featured?1.27:1-density*(.045+.09*(1-exposed))*(featuredOpening?1.28:1);
   const featuredRotation=[-.17,.11,-.04][i];
   result.set(item.id,{x,y,z,scale:visibleScale?baseScale*visibleScale:scale*(pose?1:(profile?.underlayScale??1)*studioScale),rotation:pose?.rotation??(featured?featuredRotation:rotation),tiltX:pose?.tiltX??(featured?tiltX*.35:tiltX),
    tiltY:pose?.tiltY??(featured?tiltY*.35:fallbackTiltY?fallbackTiltY(tiltY):tiltY),depth,referenceAnchor:Boolean(pose),...(featured?{featured}:null)});
  });
 });
 if(profile?.surfaceOrder&&profile.anchors.length){
  const goalIds=profile.upperGoalTypes?new Set(items.filter(({type})=>profile.upperGoalTypes.has(type)).map(({id})=>id)):null;
  const surfaceLayer=([id,pose])=>pose.referenceAnchor?2:goalIds?.has(id)?1:0;
  const ordered=new Map([...result].sort((a,b)=>surfaceLayer(a)-surfaceLayer(b)));
  let order=0;for(const pose of ordered.values())pose.supportOrder=order++;
  const positions=settlePile(ordered,ordered.keys());
  return {positions,width,height,depth:Math.max(...[...positions.values()].map(p=>p.z+p.scale))};
 }
 return {positions:result,width,height,depth:presentation.solid?highest:5};
}

// Conservative screen-space support envelopes. This is settling, not a rigid-body solver.
export function settlePile(positions,activeIds){
 const result=new Map(),layers=new Map();
 for(const id of activeIds){const p=positions.get(id);if(!p)continue;const order=p.supportOrder??p.depth;if(!layers.has(order))layers.set(order,[]);layers.get(order).push([id,p]);}
 for(const [,layer] of [...layers].sort((a,b)=>a[0]-b[0])){
  let z=0;
  for(const [,p] of layer)for(const q of result.values())if(Math.hypot(p.x-q.x,p.y-q.y)<(p.scale+q.scale)*.625)z=Math.max(z,q.z+(p.scale+q.scale)*.325);
  for(const [id,p] of layer)result.set(id,{...p,z});
 }
 return result;
}
