import {originalFamilyMaps} from './original-grain.mjs';
import {bindIndividualFinish,individualAtlas} from './individual-finish.mjs';
import * as THREE from 'three';
import {profiledProp} from './profiled-prop.mjs';
import {profiles} from './produce-profiles.mjs';
import {profiledFruit} from '../glazed-objects/profiled-fruit.mjs';
import {lessonMandarin,prepareLessonMandarin} from '../glazed-objects/lesson-mandarin.mjs';
import {lessonStrawberry,prepareLessonStrawberry} from '../glazed-objects/lesson-strawberry.mjs';

const fruits=new Map([
 ['mandarin',{make:lessonMandarin,prepare:prepareLessonMandarin}],
 ['strawberry',{make:lessonStrawberry,prepare:prepareLessonStrawberry}],
]);
for(const [kind,[units,profile]] of Object.entries(profiles)){
 fruits.set(kind,profiledFruit(profile,units,new URL('./'+kind+'.webp',import.meta.url).href,kind,.45));
}
for(const [kind,depth] of Object.entries({watermelon:.23,corn:.55,taco:.48,'cloth-tiger':.70,maraca:.45,camera:.40})){
 fruits.set(kind,profiledProp(kind,depth));
}
const aliases={orange:'mandarin','yellow-apple':'yellowapple'};
export function photographedAsset(kind){return fruits.get(aliases[kind]??kind);}

// Prefer the authored part name over the complete object's name: a guitar
// uses different surfaces for its wooden body, strings and rubber hardware.
const finishes=[
 ['metal',/steel|chrome|brass|copper|aluminium|aluminum|silver|metal|foil|wire|magnet|blade|金属|钢|铁|铜/i,.31,.78,.12,.002],
 ['wood',/wood|timber|maple|oak|bamboo|rattan|walnut|mahogany|plywood|birch|cork|木|竹|藤/i,.48,0,.28,.008],
 ['fabric',/wool|cloth|fabric|knit|cotton|felt|rope|velvet|towel|plush|canvas|fur\b|织|布|棉|绒/i,.89,0,.01,.009],
 ['leather',/leather|hide|suede|pigskin|rugby|basketball|橄榄球|篮球|皮革/i,.57,0,.16,.009],
 ['paper',/paper|cardboard|page|ticket|print stock|kraft|纸/i,.77,0,.025,.003],
 ['ceramic',/porcelain|enamel|vitreous|ceramic|glaze|plate|瓷|陶|搪/i,.23,0,.72,.001],
 ['crust',/bread|toast|dough|crumb|crust|biscuit|cookie|waffle|croissant|cake|面包|饼|蛋糕/i,.77,0,.04,.009],
 ['peel',/rind|fruit|skin|berry|peel|apple|lemon|banana|cherry|grape|produce|citrus|果|莓|蕉|柠檬/i,.43,0,.39,.004],
 ['polymer',/rubber|grip|silicone|tire|foam|橡胶|握把/i,.68,0,.08,.005],
 ['ceramic',/glass|lens|crystal|玻璃/i,.16,0,.82,.0003],
 ['polymer',/resin|plastic|lacquer|molded|shell|vinyl|toy|paint|树脂|玩具|塑/i,.32,0,.54,.0015],
];
const defaultFinish=finishes.at(-1),textures=new Map(),tones=new Map(),materials=new WeakMap();
let pending;
export function prepareSurfaces(){
 if(!pending)pending=Promise.all([...new Set(finishes.map(r=>r[0]))].map(async name=>{
  const [texture,tone]=originalFamilyMaps(name);
  for(const map of [texture,tone]){
   map.wrapS=map.wrapT=THREE.MirroredRepeatWrapping;
   map.repeat.set(2,2);map.anisotropy=4;
  }
  textures.set(name,texture);tones.set(name,tone);
 })).catch(error=>{pending=null;throw error;});
 return pending;
}
// Molded rubber has a continuous pigment and a soft, broad reflection.
const duckRubber=new Map();
function moldedDuckRubber(name){
 if(!duckRubber.has(name)){
  const wing=name==='Duck wing lacquer';
  duckRubber.set(name,new THREE.MeshPhysicalMaterial({
   name,color:wing?'#ffcc24':'#ffdb30',metalness:0,roughness:.34,
   clearcoat:.32,clearcoatRoughness:.24,emissive:'#ffbd25',emissiveIntensity:.085,
  }));
 }
 return duckRubber.get(name);
}
function surface(original,kind,atlas){
 if(original.map?.image?.dataset?.printedInk==='1')return original;
 if(kind.startsWith('duck ')&&(original.name==='Duck lacquer'||original.name==='Duck wing lacquer'))return moldedDuckRubber(original.name);
 if(!original.color||original.opacity===0||original.visible===false)return original;
 const named=finishes.find(r=>r[1].test(original.name));
 const recipe=named??(original.metalness>.48?finishes[0]:finishes.find(r=>r[1].test(kind)))??defaultFinish;
 let variants=materials.get(original);
 if(!variants)materials.set(original,variants=new Map());
 let byAtlas=variants.get(recipe);
 if(!byAtlas){byAtlas=new WeakMap();variants.set(recipe,byAtlas);}
 const key=atlas??original;
 if(byAtlas.has(key))return byAtlas.get(key);
 const [family,,roughness,metalness,coat,grain]=recipe;
 const m=new THREE.MeshPhysicalMaterial();
 if(original.isMeshStandardMaterial){
  THREE.MeshStandardMaterial.prototype.copy.call(m,original);
  m.defines.PHYSICAL='';
  if(original.isMeshPhysicalMaterial)m.copy(original);
 }else{
  THREE.Material.prototype.copy.call(m,original);
  m.color.copy(original.color);
  for(const key of ['map','alphaMap','vertexColors','aoMap','emissiveMap'])if(original[key]!=null)m[key]=original[key];
 }
 m.roughness=original.roughnessMap?Math.max(.42,original.roughness):roughness;
 m.metalness=original.metalnessMap?original.metalness:metalness;
 m.clearcoat=coat;m.clearcoatRoughness=Math.max(.13,.65*roughness);
 if(!m.normalMap&&!m.bumpMap){m.bumpMap=textures.get(family);m.bumpScale=grain;}
 if(!m.roughnessMap)m.roughnessMap=textures.get(family);
 if(!m.map){
  m.map=tones.get(family);
  m.color.multiplyScalar(family==='wood'||family==='crust'?1.13:1.035);
 }
 m.name=original.name||family;
 if(atlas)bindIndividualFinish(m,atlas,family,grain);
 byAtlas.set(key,m);return m;
}
export function realFinish(root,kind,lookId){
 const atlas=individualAtlas(lookId);
 root.traverse(o=>{
  if(!o.isMesh||o.userData.pickAssist)return;
  const coat=m=>surface(m,kind,atlas);
  o.material=Array.isArray(o.material)?o.material.map(coat):coat(o.material);
 });
 return root;
}
