import {challengeDeals} from './challenge-deals.mjs';
export function hasChallengeDeal(config){return config.variant===6&&Object.hasOwn(challengeDeals,config.id);}
export function rng(seed){
 return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
}
function shuffle(arr,r){
 for(let i=arr.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}
 return arr;
}
function lateStacks(config,types,r,recovery,challenge){
 // The last goal triple is split across the bottoms of three different stacks.
 // A safe witness is dealt in waves of four interleaved match types; the
 // fourth type enters while the first two still occupy tray slots.
 const goalTypes=config.goals.map(g=>g.type).filter(t=>types.includes(t));
 const last=goalTypes[0];
 const milestone=config.id%10===0&&!recovery;
 const triples=config.id<350?12:config.id<1500?15:milestone?18:[13,15,17,16,17,18,17,19][config.id%8];
 const closingSets=milestone?2:1;
 const bag=shuffle(types.filter(t=>t!==last),r);
 while(bag.length<triples-closingSets)bag.push(...shuffle([...types],r));
 const wave=bag.slice(0,triples-closingSets),route=[],pools=Array.from({length:6},()=>[]);
 function deal(type){
  const low=Math.min(...pools.map(p=>p.length));
  const eligible=shuffle(pools.map((p,i)=>i).filter(i=>pools[i].length===low),r);
  const index=eligible.find(i=>pools[i].at(-1)!==type)??eligible[0];
  pools[index].push(type);route.push(index);
 }
 for(let i=0;i<wave.length;i+=4){
  const group=wave.slice(i,i+4);
  const pattern=group.length===4?[0,1,2,0,3,1,0,2,1,3,2,3]:[...group.keys(),...group.keys(),...group.keys()];
  for(const slot of pattern)deal(group[slot]);
 }
 for(let i=0;i<3*closingSets;i++)deal(last);
 const goals=goalTypes.map(type=>({type,count:pools.flat().filter(t=>t===type).length}));
 return {id:config.id,variant:config.variant??0,piles:pools.map(a=>a.reverse()),route,goals,capacity:7,
  starAfter:recovery?2:3,pace:milestone?'压轴收集':recovery?'缓冲':challenge?'深堆挑战':'交错深堆'};
}
// Each stack lists item types from bottom to top.
const challengeStacks={
 10: {route:[2,0,1,3,4,5,2,0,4,3,5,1,5,4,2,1,3,0,4,3,1,2,0,5,3,2,5,0,4,1,1,3,5],variant:1, piles:[
  [30,11199,29,0,0],
  [2,30,4,11509,29,45],
  [11199,10961,29,33,33],
  [2,10961,11199,6,11509,33],
  [30,10961,6,45,0],
  [2,4,4,11509,6,45],
 ]},
 569: {route:[3,5,4,0,1,2,5,0,2,1,4,3,3,0,5,2,4,1,3,1,4,0,5,2,3,0,2,5,1,4,2,1,3,4,5,0,0,5,2,3,4,1,3,0,2],variant:6, piles:[
  [30,0,10961,33,29,45,12588,10961],
  [12588,6,10961,4,45,11509,11509],
  [30,0,11199,6,29,11509,29,29],
  [30,12588,33,11199,11509,11509,11509,10961],
  [0,10961,33,45,29,12588,12588],
  [12588,6,11199,4,4,10961,29],
 ]},
 1530: {route:[5,0,4,2,3,1,4,0,2,1,3,5,1,2,0,4,3,5,4,5,3,2,1,0,5,3,1,0,2,4,0,2,1,3,5,4,2,0,5,3,1,4,4,0,5,1,2,3,5,4,3,0,1,2],variant:6, piles:[
  [69,78,67,68,68,71,76,71,78],
  [69,67,67,12575,70,76,12576,77,78],
  [69,78,73,70,73,71,12575,78,12576],
  [70,67,73,73,12575,12575,71,71,77],
  [70,73,67,73,12575,12576,12576,12576,71],
  [70,67,78,70,68,76,12575,77,12576],
 ]},
};

export function hasSampleStacks(config){
 return challengeStacks[config.id]?.variant===config.variant&&Object.hasOwn(challengeStacks,config.id);
}
export function design(config,tuned=true,useSample=true){
 const plan=standardDesign(config,tuned);
 if(!useSample||!hasSampleStacks(config))return plan;
 const sample=challengeStacks[config.id];
 return {...plan,piles:sample.piles.map(stack=>[...stack]),route:[...sample.route]};
}
function standardDesign(config,tuned){
 if(config.layout?.chainStacks){
  const items=config.inventory.flatMap(({type,count})=>Array(count).fill(type));
  const piles=config.layout.fans.map(fan=>fan.map(id=>items[id]));
  const d={id:config.id,variant:config.variant,piles,route:[],capacity:7,starAfter:2,goals:config.goals,pace:'策略'};
  d.route=solve(d);return d;
 }
 // Hand-tuned deals ease players into the six-bottom collection milestone.
 const id=config.id;
 const calibrated=tuned&&hasChallengeDeal(config);
 const dealOffset=calibrated?challengeDeals[id]:({1529:12,1530:14})[id]??0;
 const r=rng((config.seed??id)+dealOffset), tier=id<5?0:id<16?1:id<65?2:id<350?3:id<1500?4:5;
 const beat=id%8, recovery=tier>=2&&beat===0, challenge=tier>=2&&beat===7;
 const types=[...new Set([...config.goals,...config.inventory,...(config.sourceCounts?.inventory??[])].map(g=>g.type))].slice(0,config.introSequence?config.inventory.length:[3,4,5,6,6,7][tier]);
 if((tier===5||calibrated)&&types.length>=4)return lateStacks(config,types,r,recovery,challenge);
 const stacks=Math.min(6,types.length*3);
 const sets=Math.max(types.length,[3,5,7,9,11,13][tier]+(recovery?-2:challenge?1:0));
 const width=Math.min(types.length,[1,2,2,3,3,3][tier]-(recovery?1:0));
 const pools=Array.from({length:stacks},()=>[]),route=[];
 const bag=[];while(bag.length<sets)bag.push(...shuffle([...types],r));
 for(let start=0;start<sets;){
  const batch=bag.slice(start,Math.min(start+width,sets));
  const sequence=[...batch,...shuffle([...batch],r),...shuffle([...batch],r)];
  for(const t of sequence){
   const min=Math.min(...pools.map(p=>p.length));
   const candidates=shuffle(pools.map((p,i)=>i).filter(i=>pools[i].length===min),r);
   const i=candidates.find(i=>pools[i].at(-1)!==t)??candidates[0];
   pools[i].push(t);route.push(i);
  }
  start+=batch.length;
 }
 const counts=new Map();for(const type of pools.flat())counts.set(type,(counts.get(type)??0)+1);
 const goals=config.goals.filter(g=>counts.has(g.type)).map(g=>({type:g.type,count:counts.get(g.type)}));
 return {id,goals,variant:config.variant??0,piles:pools.map(p=>p.reverse()),route,capacity:7,starAfter:tier>=2?2:0,
  pace:recovery?'缓冲':challenge?'挑战':['入门','熟悉','拆堆','交错','策略','进阶'][tier]};
}
export function createPlay(d){return {piles:d.piles.map(s=>[...s]),tray:[],sets:0,collected:{},used:false,status:'playing'};}
export function move(p,d,i,star=false){
 if(p.status!=='playing'||!p.piles[i]?.length)return false;
 const t=p.piles[i].at(-1);
 if(star){
  if(!d.starAfter||p.used||p.sets<d.starAfter)return false;
  let count=p.tray.filter(v=>v===t).length;
  if(count+p.piles.reduce((n,s)=>n+s.filter(v=>v===t).length,0)<3)return false;
  p.tray=p.tray.filter(v=>v!==t);
  p.piles[i].pop();count++;
  for(const s of p.piles)for(let j=s.length-1;j>=0&&count<3;j--)if(s[j]===t){s.splice(j,1);count++;}
  p.used=true;p.sets++;p.collected[t]=(p.collected[t]??0)+3;
 }else{
  p.tray.push(p.piles[i].pop());
  if(p.tray.filter(x=>x===t).length===3){p.tray=p.tray.filter(x=>x!==t);p.sets++;p.collected[t]=(p.collected[t]??0)+3;}
 }
 if(p.tray.length>=d.capacity)p.status='lost';
 else if(d.goals?.length?d.goals.every(g=>(p.collected[g.type]??0)>=g.count):!p.tray.length&&p.piles.every(s=>!s.length))p.status='won';
 return true;
}
export function certify(d){
 const p=createPlay(d);let peak=0;
 for(const i of d.route){if(p.status==='won')break;if(!move(p,d,i))return null;peak=Math.max(peak,p.tray.length);}
 return p.status==='won'?{peak,steps:d.route.length}:null;
}
// Search edited stacks without spending the star. Heights uniquely determine the tray counts.
export function solve(d){
 if(certify(d))return d.route;
 const seen=new Set(),path=[];
 function search(p){
  if(p.status==='won')return true;
  if(p.status==='lost'||seen.size>=80000)return false;
  const key=p.piles.map(a=>a.length).join(',');if(seen.has(key))return false;seen.add(key);
  const choices=p.piles.map((s,i)=>({i,t:s.at(-1)})).filter(x=>x.t!==undefined);
  const score=t=>p.tray.filter(v=>v===t).length*10+choices.filter(c=>c.t===t).length;
  for(const {i} of choices.sort((a,b)=>score(b.t)-score(a.t))){
   const q={...p,collected:{...p.collected},piles:p.piles.map(s=>[...s]),tray:[...p.tray]};move(q,d,i);path.push(i);
   if(search(q))return true;path.pop();
  }return false;
 }
 return search(createPlay(d))?[...path]:null;
}
