// Object-space grain. Channels store pigment variation, microsurface roughness and height.
import * as THREE from 'three';
export const families=['metal','wood','fabric','leather','paper','ceramic','crust','peel','polymer'];
const tileSize=48;
const clamp=value=>Math.max(0,Math.min(255,Math.round(value)));
function texture(bytes,w,h){
 const map=new THREE.DataTexture(bytes,w,h);
 map.magFilter=THREE.LinearFilter;
 map.minFilter=THREE.LinearMipmapLinearFilter;
 map.generateMipmaps=true;
 map.needsUpdate=true;
 return map;
}
function noise(x,y,seed){
 let n=Math.imul(x+1,374761393)^Math.imul(y+1,668265263)^seed;
 n=Math.imul(n^(n>>>13),1274126177);
 return ((n^(n>>>16))>>>0)/4294967296;
}
function pattern(family,x,y,seed){
 const fine=noise(x,y,seed)-.5;
 const wave=Math.sin;
 switch(family){
 case 'metal':return .53*wave(y*2+seed%13)+.18*fine;
 case 'wood':return .54*wave(x*.82+1.2*wave(y*.17)+seed%7)+.27*wave(x*.28+y*.06)+.18*fine;
 case 'fabric':return .56*wave(x*1.6)*wave(y*1.6)+.31*wave(y*1.6)+.18*fine;
 case 'leather':return .48*wave(x*.59+wave(y*.50))*wave(y*.73)+.58*fine;
 case 'paper':return .39*wave(y*.72+x*.23)*fine+.53*fine;
 case 'ceramic':return .13*wave(x*.20+y*.17)+.15*fine;
 case 'crust':return .37*wave(x*.6+y*.28)*wave(y*.47)-.72*Math.max(0,-fine*2)+.23*fine;
 case 'peel':return .25*wave(x*.55)*wave(y*.57)-.75*Math.max(0,(fine-.24)*3);
 default:return .24*fine+.09*wave(x*.25+y*.11);
 }
}
export function originalAtlas(id){
 const size=tileSize*3,bytes=new Uint8Array(size*size*4);
 const seed=Math.imul(Number(id)+1,2654435761);
 for(const [slot,family] of families.entries()){
  const left=(slot%3)*tileSize,bottom=(2-Math.floor(slot/3))*tileSize;
  for(let y=0;y<tileSize;y++)for(let x=0;x<tileSize;x++){
   const g=pattern(family,x,y,seed),i=((bottom+y)*size+left+x)*4;
   bytes.set([clamp(128+22*g),clamp(145+38*g),clamp(128+62*g),255],i);
  }
 }
 const map=texture(bytes,size,size);map.name='original-grain-'+id;return map;
}
export function originalFamilyMaps(family){
 const size=tileSize*2,rough=new Uint8Array(size*size*4),color=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const g=pattern(family,x,y,917),i=(y*size+x)*4;
  const h=clamp(144+50*g),tone=clamp(243+16*g);
  rough.set([h,clamp(208+34*g),h,255],i);color.set([tone,tone,tone,255],i);
 }
 return [texture(rough,size,size),texture(color,size,size)];
}
