import * as THREE from 'three';
export function profiledFruit(profile,textureWidthPerUnit,textureUrl,assetKind,alphaTest=0){
 let template,loading;
function prepare(){
 if(!loading)loading=new THREE.TextureLoader().loadAsync(textureUrl).then(map=>{
  map.colorSpace=THREE.SRGBColorSpace;
  map.anisotropy=4;
  const sides=96;
  const geometry=new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),sides);
  const pos=geometry.attributes.position,uv=geometry.attributes.uv;
  for(let i=0;i<pos.count;i++){
   const [, ,u,v]=profile[i%profile.length];
   uv.setXY(i,u+pos.getX(i)*textureWidthPerUnit,v);
   if(assetKind==='strawberry'){
    // Leaf tips occupy separate parts of the texture. Keep their authored
    // horizontal positions and flatten their depth near the leafy crown.
    const crown=THREE.MathUtils.smoothstep(v,.81,.94);
    pos.setX(i,pos.getX(i)+(u-.5)/textureWidthPerUnit);
    pos.setZ(i,pos.getZ(i)*(1-.94*crown));
   }
  }
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map,toneMapped:false,alphaTest}));
  mesh.userData.sharedGeometry=true;
  mesh.castShadow=true;
  template=new THREE.Group();
  template.userData={solid:true,assetKind};
  template.add(mesh);
 }).catch(error=>{loading=null;throw error;});
 return loading;
}
return {prepare,make:()=>template?.clone(true)};
}
