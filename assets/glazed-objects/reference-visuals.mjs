import {typeId} from '../../data/levels.mjs';
import {recognizedGoals} from './recognized-goals.mjs';

const reserveProps=[
 'bamboo-steamer','cloth-tiger','lunch-tin','toy-bus','record-mint',
 'balloon-star','enamel-kettle','pellet-drum','school-backpack',
].map(typeId);

const preferredProps={
 33:[['detail-52',34],['corn',33],['pepper',33]],
 34:[['detail-822',33],['handheld',34],['toytelevision',34]],
 654:[['record-berry',654],['detail-1526',654],['detail-178',654]],
};

export const referenceTableLayout={
 aspect:.73,
 bounds:[.085,.075,.915,.875],
 openingGrid:{columns:6,rows:4,maxScale:2.05,stagger:.17},
};

function goalDifference(original,variant){
 const counts=variant.goals.map(item=>item.count);
 const difference=original.goals.reduce((distance,{count},i)=>distance+Math.abs(count-(counts[i]??0)),0);
 return difference+12*Math.abs(counts.length-original.goals.length);
}

export function referenceVisuals(config,levelVariants){
 const level=config.id;
 const known=recognizedGoals[level]??[];
 const donorVotes=new Map();
 for(const appearance of known){
  if(appearance)donorVotes.set(appearance[1],(donorVotes.get(appearance[1])??0)+1);
 }
 const majority=[...donorVotes].find(([,votes])=>votes>=2&&votes>config.goals.length/2)?.[0]??level;
 const ordered=[...new Set([majority,level])].flatMap(donor=>levelVariants(donor)
  .filter(candidate=>candidate.detailed).sort((a,b)=>goalDifference(config,a)-goalDifference(config,b)));
 const best=ordered[0];
 if(!best)throw new Error('No modeled comparison for level '+level);

 const pool=[
  ...ordered.flatMap(variant=>variant.inventory.map(({type})=>({type,level:variant.id}))),
  ...reserveProps.map(type=>({type,level})),
 ];
 const mapping=new Map(),used=new Set();
 const assign=(original,appearance)=>{
  mapping.set(original,appearance);
  used.add(appearance.type);
 };
 for(const [index,{type}] of config.goals.entries()){
  const match=known[index];
  if(match&&!used.has(match[0]))assign(type,{type:match[0],level:match[1]});
 }
 for(const [index,{type,count}] of config.goals.entries()){
  if(mapping.has(type))continue;
  const candidates=best.goals.flatMap((goal,i)=>used.has(goal.type)?[]:[{
   appearance:{type:goal.type,level:best.id},score:Math.abs(count-goal.count)*4+Math.abs(index-i),
  }]);
  const match=candidates.sort((a,b)=>a.score-b.score)[0]?.appearance;
  assign(type,match??pool.find(item=>!used.has(item.type)));
 }
 const props=(preferredProps[level]??[]).map(([key,donor])=>({type:typeId(key),level:donor}));
 for(const {type} of config.inventory){
  if(mapping.has(type))continue;
  assign(type,props.find(item=>!used.has(item.type))??pool.find(item=>!used.has(item.type)));
 }
 return mapping;
}
