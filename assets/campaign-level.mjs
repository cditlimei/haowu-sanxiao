import {getLevel} from '../data/levels.mjs';
import {createState} from '../rules.mjs';
import {design,hasChallengeDeal,hasSampleStacks} from './level-workshop/design.mjs?rev=challenge3';

const compiled=new WeakMap();
export function campaignConfig(level,variant,savedSeed){
 const base=getLevel(level,variant);
 if(level<=2||base.layout?.chainStacks||base.layout?.spreadTriples)return base;
 const oldSeed=base.seed+([1529,1530].includes(level)?35001000:35000000);
 const tuned=hasChallengeDeal(base)&&savedSeed!==oldSeed;
 const historical=hasChallengeDeal(base)&&!tuned;
 const sample=hasSampleStacks(base);
 const sampleSeed=base.seed+35003000;
 const useSample=sample&&(savedSeed===undefined||savedSeed===sampleSeed);
 const cacheable=!historical&&(!sample||useSample);
 if(cacheable&&compiled.has(base))return compiled.get(base);
 const plan=design(base,!historical,useSample);
 const piles=plan.piles;
 const counts=new Map();
 for(const type of piles.flat())counts.set(type,(counts.get(type)??0)+1);
 const inventory=[...counts].map(([type,count])=>({type,count}));
 let id=0;
 const ids=new Map(inventory.map(({type,count})=>[type,Array.from({length:count},()=>id++)]));
 const fans=piles.map(pile=>pile.map(type=>ids.get(type).pop()));
 const config={...base,seed:useSample?sampleSeed:tuned?base.seed+35002000:oldSeed,inventory,
  goals:plan.goals,boosters:{...base.boosters,star:plan.starAfter?1:0},
  layout:{...base.layout,aspect:.675,bounds:[.035,.08,.965,.89],fans,chainStacks:true,starAfter:plan.starAfter},
  accuracy:plan.pace+' · 分层拆堆',notes:'点取各堆最上方的物件，凑齐三个同款。'};
 if(cacheable)compiled.set(base,config);
 return config;
}
export function createCampaignState(level,variant,savedSeed){
 return createState(level,variant,campaignConfig(level,variant,savedSeed));
}
