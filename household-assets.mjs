import * as THREE from './node_modules/three/build/three.module.js';
import {GLTFLoader} from './node_modules/three/examples/jsm/loaders/GLTFLoader.js';
const loader=new GLTFLoader(),loaded=new Map(),pending=new Map(),errors=new Map(),stats=new Map();
const catalog=await fetch(new URL('./data/household-assets.json',import.meta.url),{cache:'no-cache'})
 .then(response=>{
  if(!response.ok)throw Error('Household catalog unavailable');
  return response.json();
 })
 .catch(error=>{
  errors.set('catalog',error.message);
  console.warn('Household catalog unavailable; retaining native models',error.message);
  return {};
 });
function entryFor(level,id){
 const entry=catalog[id];
 if(!entry)return null;
 if(entry.levels)return entry.levels.includes(level)?entry:null;
 if(entry.level!==undefined)return entry.level===level?entry:null;
 return level===719||level===5||(level>=1&&level<=3)?entry:null;
}
export function householdAssetKey(item,level,variant){
 return level===719&&variant===1&&item.sourceItemId===1148?'bamboo-steamer':item.sourceItemId??item.key;
}
export function householdAssetTag(level,id){return loaded.has(String(id))?entryFor(level,id)?.revision??'native':'native';}
export function makeHouseholdAsset(level,id){return entryFor(level,id)?loaded.get(String(id))?.clone(true)??null:null;}
export async function prepareHouseholdAssets(level,items,variant){
 const ids=[...new Set(items.map(item=>String(householdAssetKey(item,level,variant))).filter(id=>entryFor(level,id)))];
 return Promise.allSettled(ids.map(id=>{
  if(loaded.has(id))return;
  if(!pending.has(id))pending.set(id,loader.loadAsync(catalog[id].url+'?v='+encodeURIComponent(catalog[id].revision)).then(({scene})=>{
   let triangles=0,meshes=0,textured=0;scene.traverse(o=>{if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;
    o.userData.sharedGeometry=true;o.castShadow=true;o.receiveShadow=true;
    const materials=Array.isArray(o.material)?o.material:[o.material];textured+=materials.filter(m=>m.map||m.normalMap).length;
   });
   if(triangles!==catalog[id].triangles||meshes!==catalog[id].meshes)throw Error('Household mesh inventory mismatch: '+id);
   const root=new THREE.Group();root.add(scene);let collisionParts;scene.traverse(o=>{if(o.userData.collisionParts)collisionParts=o.userData.collisionParts;});if(collisionParts?.length)root.userData.collisionParts=collisionParts;root.userData.solid=true;root.userData.householdAsset=id;loaded.set(id,root);errors.delete(id);stats.set(id,{triangles,meshes,textured,collisionParts:collisionParts?.length??0,bytes:catalog[id].bytes,revision:catalog[id].revision});
  }).catch(error=>{pending.delete(id);errors.set(id,error.message);console.warn('Household asset failed; retaining native fallback',id,error.message);throw error;}));
  return pending.get(id);
 }));
}
export function householdAssetStatus(){return {loaded:[...loaded.keys()],errors:Object.fromEntries(errors),models:Object.fromEntries(stats)};}
