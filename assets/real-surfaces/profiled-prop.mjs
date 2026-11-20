import * as THREE from 'three';

export function profiledProp(kind,thickness){
 let model,pending;
 async function load(){
  const url=name=>new URL('./'+kind+name,import.meta.url).href;
  const [map,shape]=await Promise.all([
   new THREE.TextureLoader().loadAsync(url('.webp')),
   fetch(url('-shape.json')).then(r=>{if(!r.ok)throw Error(r.statusText);return r.json();}),
  ]);
  map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
  const {aspect,size,depth}=shape,positions=[],uv=[],indices=[],count=size*size;
  const width=Math.min(1,aspect),height=width/aspect;
  for(const sign of [1,-1]){
   for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/(size-1),v=1-y/(size-1);
    positions.push((u-.5)*width,(v-.5)*height,sign*depth[y*size+x]*thickness/510);
    uv.push(u,v);
   }
  }
  // The two relief surfaces meet at zero thickness around the alpha contour.
  for(let y=0;y<size-1;y++)for(let x=0;x<size-1;x++){
   const a=y*size+x,b=a+1,c=a+size,d=c+1;
   for(const tri of [[a,c,b],[c,d,b]]){
    if(tri.every(i=>depth[i]===0))continue;
    indices.push(...tri,tri[2]+count,tri[1]+count,tri[0]+count);
   }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map,alphaTest:.50,toneMapped:false}));
  mesh.castShadow=true;mesh.userData.sharedGeometry=true;
  model=new THREE.Group();model.add(mesh);
  model.userData={solid:true,assetKind:kind,panelNormal:new THREE.Vector3(0,0,1)};
 }
 function make(){
  if(!model)return;
  const result=model.clone(true);result.userData.panelNormal=model.userData.panelNormal.clone();
  return result;
 }
 return {make,prepare:()=>pending??=(load().catch(err=>{pending=null;throw err;}))};
}
