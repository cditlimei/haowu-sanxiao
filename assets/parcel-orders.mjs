// Slots in each rule: pile, loose items above the package, seal type.
// Opening moves are verified in the game and reused by the editor and handbook.
const orders = new Map([
 [12, {seed:2061116726, seals:[[5,0,15]], opening:[0,0,4]}],
 [14, {seed:2061116746, seals:[[5,0,29],[2,0,16]], opening:[1,3,4,5,3,4,5]}],
 [569, {seed:2061120296, seals:[[4,0,29],[1,0,12588]], opening:[2,2,5,4,4,0,0]}],
 [15011, {seed:2061269716, seals:[[1,0,48]], opening:[0,2,5]}],
 [15012, {seed:2061269726, seals:[[1,0,46],[0,1,44]], opening:[3,3,0,2,4,4,2,5]}],
]);

export function parcelLayout(level, variant, seed, fans) {
 const entry = orders.get(level);
 if (variant !== 6 || entry?.seed !== seed) return {};
 const parcels = entry.seals.map(([lane, above, type]) => {
  const fan = fans[lane];
  return {lane, type, ids: fan.slice(0, fan.length - above)};
 });
 return {parcels};
}

export function withParcelPlan(config, plan) {
 const entry = orders.get(config.id);
 if (!entry || config.variant !== 6) return plan;
 const rest = plan.route.slice();
 for (const lane of entry.opening) rest.splice(rest.indexOf(lane), 1);
 const parcels = entry.seals.map(([lane, above, type])=>({lane, protectedCount:plan.piles[lane].length-above, type}));
 return {...plan, parcels, route:[...entry.opening,...rest]};
}

export function closedParcels(state) {
 return state.config.layout?.parcels?.filter(parcel => state.collected[parcel.type] < 3) ?? [];
}

export function sealedIds(state) {
 return new Set(closedParcels(state).flatMap(parcel => parcel.ids));
}
