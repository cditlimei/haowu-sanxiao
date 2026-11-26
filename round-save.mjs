import {createState} from './rules.mjs?rev=parcel26';
import {typeId} from './data/levels.mjs';

const legacyRoundItems={
 2:['ice','blueball','helicopter'],
 3:['burger','fries','icecream'],
 5:['mic','speaker','note','radio','disco','headphones'],
};

function remapLegacyRound(saved,config){
 const oldTypes=config.legacyInventoryTypes??legacyRoundItems[config.id]?.map(typeId);
 if(!oldTypes||!Array.isArray(saved.collected))return null;
 const retainedTypes=oldTypes.slice(0,config.inventory.length);
 const oldToNew=new Map(retainedTypes.map((type,index)=>[type,config.inventory[index].type]));
 const oldGoals=config.goals.map(({type,count})=>({
  type:[...oldToNew].find(([,current])=>current===type)?.[0],count,
 }));
 if(JSON.stringify(saved.goals)!==JSON.stringify(oldGoals))return null;
 const removedTypes=oldTypes.slice(config.inventory.length);
 if(removedTypes.length){
  saved=removeLegacyProps(saved,config,removedTypes);
  if(!saved)return null;
 }
 const collected=saved.collected.map(entry=>Array.isArray(entry)&&entry.length===2?[oldToNew.get(entry[0]),entry[1]]:entry);
 return {...saved,goals:config.goals,collected};
}

function removeLegacyProps(saved,config,removedTypes){
 if(!Array.isArray(saved.boardOrder)||!Array.isArray(saved.itemOrder)||!Array.isArray(saved.tray)
   ||saved.tray.length>=config.capacity)return null;
 const firstRemoved=config.inventory.reduce((total,item)=>total+item.count,0);
 // Every old placeholder type occupied nine consecutive IDs after the goals.
 const oldItemCount=firstRemoved+removedTypes.length*9;
 const activeIds=[...saved.boardOrder,...saved.tray];
 if(new Set(activeIds).size!==activeIds.length||activeIds.some(id=>!Number.isInteger(id)||id<0||id>=oldItemCount))return null;
 const oldBoardIds=new Set(saved.boardOrder);
 if(saved.itemOrder.length!==oldBoardIds.size||new Set(saved.itemOrder).size!==oldBoardIds.size
   ||saved.itemOrder.some(id=>!oldBoardIds.has(id)))return null;
 if(saved.last!==null&&(!Number.isInteger(saved.last)||saved.tray.at(-1)!==saved.last))return null;
 for(const [index,type] of removedTypes.entries()){
  const start=firstRemoved+index*9;
  const remaining=activeIds.filter(id=>id>=start&&id<start+9).length;
  const entries=saved.collected.filter(entry=>Array.isArray(entry)&&entry[0]===type);
  if(remaining===9&&entries.length===0)continue;
  if(entries.length!==1||entries[0].length!==2||entries[0][1]!==9-remaining||(9-remaining)%3!==0)return null;
 }
 const isRetained=id=>id<firstRemoved;
 return {...saved,boardOrder:saved.boardOrder.filter(isRetained),itemOrder:saved.itemOrder.filter(isRetained),
  tray:saved.tray.filter(isRetained),last:isRetained(saved.last)?saved.last:null,
  collected:saved.collected.filter(entry=>!Array.isArray(entry)||!removedTypes.includes(entry[0]))};
}

// Keep teaching progress from the kitchen board. The first nine IDs are its three goals.
function remapKitchenRound(saved,config){
 const oldTypes=['detail-1472','detail-399','detail-86'].map(typeId);
 const oldGoals=oldTypes.map(type=>({type,count:3}));
 if(JSON.stringify(saved.goals)!==JSON.stringify(oldGoals))return null;
 if(![saved.boardOrder,saved.itemOrder,saved.tray,saved.collected].every(Array.isArray)
   ||saved.tray.length>=config.capacity)return null;
 const active=[...saved.boardOrder,...saved.tray];
 const boardIds=new Set(saved.boardOrder);
 if(new Set(active).size!==active.length||saved.itemOrder.length!==boardIds.size
   ||new Set(saved.itemOrder).size!==boardIds.size||saved.itemOrder.some(id=>!boardIds.has(id))
   ||saved.last!==null&&saved.tray.at(-1)!==saved.last)return null;
 const retiredKeys=['detail-1048','detail-1126','detail-293','detail-1380','detail-1441','detail-1492'];
 const baseTypes=[...oldTypes,...retiredKeys.slice(0,5).map(typeId)];
 const extension=[retiredKeys[5],...Array(2).fill(retiredKeys[0]),...retiredKeys.slice(1,5)].map(typeId);
 const possibleInventories=[baseTypes,[...baseTypes,...extension],[...baseTypes,...extension,typeId('bamboo-steamer')]];
 const validInventory=possibleInventories.some(types=>{
  const remaining=new Map();
  for(const type of types)remaining.set(type,(remaining.get(type)??0)+3);
  for(const id of active){
   if(!Number.isInteger(id)||id<0||id>=types.length*3)return false;
   const type=types[Math.floor(id/3)];
   remaining.set(type,remaining.get(type)-1);
  }
  for(const entry of saved.collected){
   if(!Array.isArray(entry)||entry.length!==2||!Number.isInteger(entry[1])||entry[1]<=0
     ||entry[1]%3!==0||remaining.get(entry[0])!==entry[1])return false;
   remaining.delete(entry[0]);
  }
  return [...remaining.values()].every(count=>count===0);
 });
 if(!validInventory)return null;
 const teach=id=>id<9;
 const mapping=new Map(oldTypes.map((type,index)=>[type,config.goals[index].type]));
 return {...saved,goals:config.goals,boardOrder:saved.boardOrder.filter(teach),itemOrder:saved.itemOrder.filter(teach),
  tray:saved.tray.filter(teach),last:saved.last!==null&&teach(saved.last)?saved.last:null,
  collected:saved.collected.filter(([type])=>mapping.has(type)).map(([type,count])=>[mapping.get(type),count])};
}

export function captureRound(state,boardOrder){
 return {
  ...(state.config.layout?.parcels?{parcelEdition:1}:{}),
  version:1,level:state.level,variant:state.config.variant,seed:state.config.seed,
  goals:state.goals,boardOrder,itemOrder:state.items.map(item=>item.id),tray:state.tray.map(item=>item.id),
  collected:state.collected.flatMap((count,type)=>count?[[type,count]]:[]),
  remaining:state.remaining,frozen:state.frozen,uses:state.uses,last:state.last?.id??null,
 };
}

export function restoreRound(saved,level,variant,makeState=createState){
 const state=makeState(level,variant);
 const config=state.config;
 if(config.legacySequence&&config.variant===0&&saved?.variant===undefined&&saved?.level===level){
  saved={...saved,variant:0};
 }
 if(saved?.version!==1||saved.level!==level||saved.variant!==config.variant||saved.seed!==config.seed)return null;
 if(config.layout?.parcels&&!saved.parcelEdition){
  const {parcels,...layout}=config.layout;
  state.config={...config,layout};
 }
 if(JSON.stringify(saved.goals)!==JSON.stringify(state.goals)){
  saved=level===1?remapKitchenRound(saved,config):remapLegacyRound(saved,config);
  if(!saved)return null;
 }
 if(!Array.isArray(saved.boardOrder)||!Array.isArray(saved.itemOrder)||!Array.isArray(saved.tray)||!Array.isArray(saved.collected)
   ||saved.tray.length>=config.capacity
   ||!Number.isFinite(saved.remaining)||saved.remaining<=0||saved.remaining>config.seconds
   ||!Number.isFinite(saved.frozen)||saved.frozen<0)return null;

 const items=state.items;
 const activeIds=[...saved.boardOrder,...saved.tray];
 if(activeIds.some(id=>!Number.isInteger(id)||!items[id])||new Set(activeIds).size!==activeIds.length)return null;
 const countByType=new Map();
 for(const {type} of items)countByType.set(type,(countByType.get(type)??0)+1);
 for(const id of activeIds){
  const type=items[id].type;
  countByType.set(type,countByType.get(type)-1);
 }
 for(const entry of saved.collected){
  if(!Array.isArray(entry)||entry.length!==2)return null;
  const [type,count]=entry;
  if(!Number.isInteger(count)||count<=0||count%3!==0||countByType.get(type)!==count)return null;
  state.collected[type]=count;
  countByType.delete(type);
 }
 if([...countByType.values()].some(count=>count!==0)
   ||state.goals.every(goal=>state.collected[goal.type]>=goal.count)&&!state.config.layout?.parcels?.some(p=>state.collected[p.type]<3))return null;

 const tray=saved.tray.map(id=>items[id]);
 if(tray.some(item=>tray.filter(other=>other.type===item.type).length>=3))return null;
 if(saved.last!==null&&(!Number.isInteger(saved.last)||tray.at(-1)?.id!==saved.last))return null;
 for(const [key,max] of Object.entries(config.boosters)){
  const uses=saved.uses?.[key];
  if(!Number.isInteger(uses)||uses<0||uses>max)return null;
  state.uses[key]=uses;
 }
 if(saved.frozen>10*(config.boosters.freeze-state.uses.freeze))return null;

 const onBoard=new Set(saved.boardOrder);
 if(saved.itemOrder.length!==onBoard.size||new Set(saved.itemOrder).size!==onBoard.size
   ||saved.itemOrder.some(id=>!onBoard.has(id)))return null;
 state.items=saved.itemOrder.map(id=>items[id]);
 state.tray=tray;
 state.last=saved.last===null?null:tray.at(-1);
 state.remaining=saved.remaining;
 state.frozen=saved.frozen;
 return {state,boardOrder:saved.boardOrder,shuffleCount:config.boosters.shuffle-state.uses.shuffle};
}
