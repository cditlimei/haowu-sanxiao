import {sealedIds} from './parcel-orders.mjs';
export function stackOrder(layout,shuffle){
 return shuffle%2&&!layout.parcels?layout.fans.map(fan=>[...fan].reverse()):layout.fans;
}
export function availableHeads(state){
 const layout=state.config.layout;
 if(!layout?.chainStacks)return null;
 const ids=new Set(state.items.map(item=>item.id));
 const sealed=layout.parcels?sealedIds(state):null;
 return new Set(stackOrder(layout,state.config.boosters.shuffle-state.uses.shuffle)
  .map(fan=>fan.findLast(id=>ids.has(id))).filter(id=>id!==undefined&&!sealed?.has(id)));
}
