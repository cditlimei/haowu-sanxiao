import {availableHeads} from './assets/stack-order.mjs';
import {getLevel,ITEMS} from './data/levels.mjs';
export function createState(level=1,variant,config=getLevel(level,variant)){
 let id=0;const items=config.inventory.flatMap(({type,count})=>Array.from({length:count},()=>({id:id++,type})));
 return {level,config,items,tray:[],collected:Array(ITEMS.length).fill(0),goals:config.goals.map(g=>({...g})),status:'ready',remaining:config.seconds,frozen:0,uses:{...config.boosters},last:null};
}
export function settledGoalRemaining(s,type){
 const goal=s.goals.find(goal=>goal.type===type);
 return goal?Math.max(0,goal.count-s.collected[type]):0;
}
export function remainingGoal(s,type){
 const pending=s.tray.filter(item=>item.type===type).length;
 return Math.max(0,settledGoalRemaining(s,type)-pending);
}
export function pick(s,id){
 if(s.status!=='playing')return null;
 if(availableHeads(s)?.has(id)===false)return null;
 const i=s.items.findIndex(x=>x.id===id);if(i<0)return null;
 const [item]=s.items.splice(i,1);s.tray.push(item);s.last=item;
 const matches=s.tray.filter(x=>x.type===item.type);let matched=false;
 if(matches.length===3){s.tray=s.tray.filter(x=>x.type!==item.type);s.collected[item.type]+=3;s.last=null;matched=true;}
 if(s.goals.every(g=>s.collected[g.type]>=g.count))s.status='won';
 else if(s.tray.length>=s.config.capacity)s.status='lost';
 return {item,matched};
}
export function undo(s){if(s.status!=='playing'||!s.last||s.uses.undo<=0)return null;const i=s.tray.findIndex(x=>x.id===s.last.id);if(i<0)return null;const [item]=s.tray.splice(i,1);s.items.push(item);s.last=null;s.uses.undo--;return item;}
export function tick(s,dt){if(s.status!=='playing'||!Number.isFinite(dt)||dt<0)return;const freeze=Math.min(s.frozen,dt);s.frozen-=freeze;s.remaining=Math.max(0,s.remaining-(dt-freeze));if(s.remaining===0)s.status='timeout';}

export function vacuum(s){
 if(s.status!=='playing'||s.uses.hint<=0)return null;
 const openGoals=s.goals.filter(goal=>s.collected[goal.type]<goal.count);
 const goal=openGoals.find(({type})=>remainingGoal(s,type)>=3)??openGoals[0];
 if(!goal)return null;

 const result=collectTriple(s,goal.type);
 if(result)s.uses.hint--;
 return result;
}
export function clearStarStack(s,id){
 if(!s.config.layout?.chainStacks||s.status!=='playing'||!s.uses.star||!availableHeads(s).has(id))return null;
 if(s.collected.reduce((sum,n)=>sum+n,0)<3*(s.config.layout.starAfter??2))return null;
 const item=s.items.find(it=>it.id===id);
 const result=collectTriple(s,item.type,id);
 if(result)s.uses.star--;
 return result;
}
function collectTriple(s,type,preferredId){
 const fromTray=s.tray.filter(item=>item.type===type);
 const candidates=s.items.filter(item=>item.type===type);
 if(preferredId!==undefined)candidates.sort((a,b)=>Number(b.id===preferredId)-Number(a.id===preferredId));
 const fromBoard=candidates.slice(0,3-fromTray.length);
 if(fromBoard.length+fromTray.length!==3)return null;

 const cleared=new Set(fromBoard.map(item=>item.id));
 s.items=s.items.filter(item=>!cleared.has(item.id));
 s.tray=s.tray.filter(item=>item.type!==type);
 if(s.last?.type===type)s.last=null;
 s.collected[type]+=3;
 if(s.goals.every(g=>s.collected[g.type]>=g.count))s.status='won';
 return {type,fromBoard};
}
