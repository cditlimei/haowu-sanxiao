import {originalAtlas,families} from './original-grain.mjs';

const loaded=new Map();
export function individualAtlas(id){return loaded.get(id)?.texture;}
export function prepareIndividualAtlas(lookId){
 if(!loaded.has(lookId))loaded.set(lookId,{texture:originalAtlas(lookId)});
 return loaded.get(lookId).texture;
}
export function releaseIndividualAtlases(ids){
 for(const [id,entry] of loaded){
  if(entry.texture&&!ids.has(id)){entry.texture.dispose();loaded.delete(id);}
 }
}

// Triplanar sampling also covers imported meshes with missing, overlapping or
// constant UVs. Using undeformed object coordinates keeps the grain attached
// during pile movement. The original UV maps still carry labels and graphics.
const varyings='varying vec3 vSurfacePoint; varying vec3 vSurfaceAxis;\n';
export function bindIndividualFinish(material,atlas,family,grain){
 const slot=families.indexOf(family);
 const tile=[slot%3,Math.floor(slot/3)];
 const prior=material.onBeforeCompile;
 material.onBeforeCompile=function(shader,renderer){
  prior.call(this,shader,renderer);
  shader.uniforms.objectSurface={value:atlas};

  shader.uniforms.surfaceTile={value:tile};
  shader.uniforms.reliefDepth={value:grain};
  shader.vertexShader=varyings+shader.vertexShader.replace('#include <begin_vertex>',
   '#include <begin_vertex>\n vSurfacePoint=position; vSurfaceAxis=normal;');
  shader.fragmentShader=varyings+`
uniform sampler2D objectSurface;
uniform vec2 surfaceTile;
uniform float reliefDepth;
vec3 inspectSurface(vec2 coord){
 // Mirror each tile locally, keep bilinear samples inside its gutter.
 vec2 folded=1.-abs(mod(coord,2.)-1.);
 vec2 uv=(vec2(surfaceTile.x,2.-surfaceTile.y)+mix(vec2(.016),vec2(.984),folded))/3.;
 return texture2D(objectSurface,uv).rgb;
}
`+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 vec3 weights=pow(abs(normalize(vSurfaceAxis+vec3(.00001))),vec3(4.));
 weights/=max(.00001,dot(weights,vec3(1.)));
 vec3 st=vSurfacePoint*3.3;
 vec3 specimen=inspectSurface(st.yz)*weights.x+inspectSurface(st.xz)*weights.y+inspectSurface(st.xy)*weights.z;
 diffuseColor.rgb*=exp2((specimen.r-.5)*1.6);
 `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 roughnessFactor=clamp(roughnessFactor*(.60+.80*specimen.g),.09,.96);
 `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 vec3 surfaceDx=dFdx(-vViewPosition),surfaceDy=dFdy(-vViewPosition);
 vec3 gradX=cross(surfaceDy,normal),gradY=cross(normal,surfaceDx);
 float det=dot(surfaceDx,gradX);
 if(abs(det)>.0000001){
  vec3 grad=sign(det)*(dFdx(specimen.b)*gradX+dFdy(specimen.b)*gradY);
  normal=normalize(abs(det)*normal-reliefDepth*grad);
 }
 `);
 };
 material.customProgramCacheKey=()=> 'original-grain-v1';
 material.userData.individualAtlas=atlas.name;

 if(family==='fabric'){material.sheen=.72;material.sheenColor.copy(material.color);material.sheenRoughness=.84;}
 if(family==='leather'){material.sheen=.22;material.sheenColor.copy(material.color);material.sheenRoughness=.60;}
}
