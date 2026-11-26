import {closedParcels} from './parcel-orders.mjs';

export function parcelView(field, icon, name, notify, project) {
 const layer = document.createElement('div');
 layer.className = 'parcel-layer';
 field.append(layer);
 const cards = new Map();
 let previousRound;

 function clear() {
  cards.clear();
  layer.replaceChildren();
 }
 function makeCard(parcel) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'sealed-parcel';
  const ticket = document.createElement('span');
  ticket.className = 'parcel-ticket';
  const image = document.createElement('img');
  image.alt = '';
  image.src = icon(parcel.type);
  const count = document.createElement('b');
  ticket.append(image, count);
  card.append(ticket);
  card.onclick = () => notify('收齐三个' + name(parcel.type) + '，就能拆开这包');
  layer.append(card);
  return {card,count};
 }
 function refresh(state) {
  if (state !== previousRound) { clear(); previousRound = state; }
  if (!state.config.layout?.parcels) return;
  const closed = closedParcels(state);
  for (const [parcel, {card}] of cards) {
   if (closed.includes(parcel)) continue;
   cards.delete(parcel);
   card.disabled = true;
   card.classList.add('unwrapping');
   const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
   card.animate([{opacity:1,scale:1},{opacity:0,scale:1.18,translate:'0 -9px'}],{duration:reduce?0:320}).finished.then(()=>card.remove(),()=>card.remove());
   if (state.status === 'playing') notify(name(parcel.type) + '收齐，包裹拆开了！');
  }
  const live = new Set(state.items.map(item => item.id));
  for (const parcel of closed) {
   const head = state.config.layout.fans[parcel.lane].findLast(id => live.has(id));
   if (!parcel.ids.includes(head)) continue;
   const view = cards.get(parcel) ?? makeCard(parcel);
   cards.set(parcel,view);
   view.card.dataset.head = String(head);
   const amount = state.tray.filter(item=>item.type===parcel.type).length;
   view.count.textContent = amount + '/3';
   view.card.setAttribute('aria-label','封签包裹，收齐三个' + name(parcel.type) + '拆开，已取' + amount + '个');
  }
  // Undo can put a loose item back on top of a buried seal.
  for (const [parcel,{card}] of cards) {
   const head = state.config.layout.fans[parcel.lane].findLast(id=>live.has(id));
   card.hidden = !parcel.ids.includes(head);
  }
 }
 function position(state,groups) {
  layer.hidden = state.status !== 'playing';
  if (layer.hidden || !cards.size) return;
  const rect = field.getBoundingClientRect();
  for (const {card} of cards.values()) {
   const group = groups.get(Number(card.dataset.head));
   if (!group || card.hidden) continue;
   const point = project(group.position);
   card.style.left = (point.x - rect.left) + 'px';
   card.style.top = (point.y - rect.top) + 'px';
  }
 }
 return {refresh,position};
}
