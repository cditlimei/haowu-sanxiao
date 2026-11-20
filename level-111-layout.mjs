import {ITEMS} from './data/levels.mjs';

// Visible cups estimated from the first board frame of the level 111
// walkthrough. Booster rockets are excluded. All four inventories share its HUD.
// Use the surface for the largest configuration as a provisional reference.
const visible=[
 [672,89,181,-38,-57,18],[670,148,181,-32,16,31],[671,190,169,-28,32,15],
 [670,257,169,15,15,22],[668,209,208,-27,-65,20],[669,281,220,-21,10,-24],
 [666,135,237,-26,-18,64],[670,96,276,-35,25,31],[672,153,276,24,35,-20],
 [666,217,252,28,-52,14],[668,274,277,-16,-28,24],
 [668,91,332,29,31,18],[672,149,333,-29,-58,21],
 [666,216,339,-13,-27,-31],[671,276,338,-31,22,24],
 [671,96,387,-12,-12,32],[672,153,387,-44,-52,-29],
 [668,222,377,32,24,36],[667,324,373,-29,-54,-24],
 [672,151,456,-35,45,-30],
 [667,199,445,32,28,24],[667,251,449,-9,-37,23],
 [666,318,451,-24,13,-21],[669,315,492,12,24,15],
 [672,105,497,-21,-40,52],[667,222,506,-28,-42,17],
];

export function level111Layout(config,shuffle){
 if(config.id!==111||!config.detailed)return null;
 const types=new Map(config.inventory.map(({type})=>[ITEMS[type].sourceItemId,type]));
 const scales=new Map([...types].map(([id,type])=>[type,id>=755?.81:1]));
 const radians=Math.PI/180;
 const anchors=config.variant===1&&shuffle===0?visible.map(([id,x,y,rotation,tiltX,tiltY])=>({
  type:types.get(id),
  x:.04+.92*(x-48)/332,
  y:.08+.84*(y-119)/406,
  rotation:rotation*radians,tiltX:tiltX*radians,tiltY:tiltY*radians,
 })):[];
 return {anchors,scales,baseScale:[1.70,1.76,1.82,1.9][config.variant-1],coverage:true};
}
