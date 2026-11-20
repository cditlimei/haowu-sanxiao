import * as THREE from './node_modules/three/build/three.module.js';
import {GLTFLoader} from './node_modules/three/examples/jsm/loaders/GLTFLoader.js';
const manifest=await fetch(new URL('./data/tripo-assets.json',import.meta.url),{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Asset catalog unavailable');return r.json();}).catch(error=>{console.warn('Tripo catalog unavailable; using existing objects',error.message);return {};});
const loader=new GLTFLoader(),loaded=new Map(),pending=new Map(),shared=new Map();
export const hasTripoAsset=id=>loaded.has(String(id));
export async function prepareTripoAssets(items){
 const ids=[...new Set(items.map(x=>String(x.sourceItemId)).filter(id=>manifest[id]))];
 return Promise.allSettled(ids.map(id=>{
  if(loaded.has(id))return;
  if(!pending.has(id))pending.set(id,loader.loadAsync(manifest[id].url).then(({scene})=>{
   const family=manifest[id].family;
   scene.traverse(o=>{if(!o.isMesh)return;
    if(!shared.has(family))shared.set(family,{geometry:o.geometry,normal:o.material.normalMap,roughness:o.material.roughnessMap,metalness:o.material.metalnessMap});
    const common=shared.get(family);
    if(o.geometry!==common.geometry){o.geometry.dispose();o.geometry=common.geometry;}
    for(const [prop,key] of [['normalMap','normal'],['roughnessMap','roughness'],['metalnessMap','metalness']]){if(o.material[prop]&&o.material[prop]!==common[key])o.material[prop].dispose();o.material[prop]=common[key];}
    o.userData.sharedGeometry=true;o.castShadow=true;o.receiveShadow=true;
   });
   const box=new THREE.Box3().setFromObject(scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
   const scale=1/Math.max(size.x,size.y,size.z);scene.position.copy(center).multiplyScalar(-scale);scene.scale.setScalar(scale);
   const root=new THREE.Group();root.add(scene);root.userData.tripo=true;root.userData.tripoFamily=family;loaded.set(id,root);
  }).catch(error=>{pending.delete(id);console.warn('Tripo asset failed',id,error.message);throw error;}));
  return pending.get(id);
 }));
}
export function makeTripoAsset(id){return loaded.get(String(id))?.clone(true)??null;}
export function tripoAssetStatus(){return {loaded:[...loaded.keys()],registered:Object.keys(manifest),families:[...shared.keys()]};}

// Called only after old scene objects and removal animations have been disposed.
export function releaseUnusedTripoAssets(items){
 const active=new Set(items.map(x=>String(x.sourceItemId)));
 const retained=[...loaded].filter(([id])=>active.has(id));
 const keepTextures=new Set(),keepMaterials=new Set();
 for(const [,root] of retained)root.traverse(o=>{if(o.isMesh){keepMaterials.add(o.material);for(const value of Object.values(o.material))if(value?.isTexture)keepTextures.add(value);}});
 const removedTextures=new Set(),removedMaterials=new Set();
 for(const [id,root] of loaded){if(active.has(id))continue;
  root.traverse(o=>{if(o.isMesh&&!keepMaterials.has(o.material)){removedMaterials.add(o.material);for(const value of Object.values(o.material))if(value?.isTexture&&!keepTextures.has(value))removedTextures.add(value);}});
  loaded.delete(id);pending.delete(id);
 }
 removedTextures.forEach(t=>t.dispose());removedMaterials.forEach(m=>m.dispose());
 const activeFamilies=new Set([...loaded.keys()].map(id=>manifest[id].family));
 for(const [family,asset] of shared)if(!activeFamilies.has(family)){asset.geometry.dispose();shared.delete(family);}
}
