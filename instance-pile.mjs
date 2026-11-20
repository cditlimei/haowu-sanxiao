import * as THREE from './node_modules/three/build/three.module.js';

// Keep original objects for exact mesh/alpha hit testing; instance their render geometry.
export function createPileInstances(scene){
 let batches=[];const inverse=new THREE.Matrix4(),matrix=new THREE.Matrix4(),shade=new THREE.Color();
 function clear(){for(const {mesh} of batches){scene.remove(mesh);mesh.dispose();}batches=[];}
 function rebuild(roots){
  clear();const geometries=new Map();
  for(const root of roots){root.visible=false;if(root.userData.returning)continue;root.updateMatrixWorld(true);root.traverse(object=>{
   if(!object.isMesh||Array.isArray(object.material)||object.material.opacity===0)return;
   if(!geometries.has(object.geometry))geometries.set(object.geometry,new Map());
   const materials=geometries.get(object.geometry);
   if(!materials.has(object.material))materials.set(object.material,[]);materials.get(object.material).push({object,root});
  });}
  for(const [geometry,materials] of geometries)for(const [material,objects] of materials){
   const mesh=new THREE.InstancedMesh(geometry,material,objects.length);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
   mesh.layers.mask=objects[0].object.layers.mask;mesh.castShadow=objects[0].object.castShadow;mesh.receiveShadow=objects[0].object.receiveShadow;mesh.frustumCulled=false;scene.add(mesh);batches.push({mesh,objects,shaded:objects.some(({root})=>root.userData.ambientOcclusion!==undefined)});
  }
  sync();
 }
 function sync(){
  scene.updateWorldMatrix(true,false);
  inverse.copy(scene.matrixWorld).invert();
  for(const {mesh,objects,shaded} of batches){
   objects.forEach(({object,root},i)=>{
    object.updateWorldMatrix(true,false);
    mesh.setMatrixAt(i,matrix.multiplyMatrices(inverse,object.matrixWorld));
    if(shaded){
     const aboveContact=Math.max(0,root.position.z-root.userData.target.z);
     const amount=(1-(root.userData.ambientOcclusion??1))*Math.max(0,1-aboveContact/1.25);
     shade.setRGB(1-amount,1-amount,1-amount);
     mesh.setColorAt(i,shade);
    }
   });
   mesh.instanceMatrix.needsUpdate=true;
   if(shaded)mesh.instanceColor.needsUpdate=true;
  }
 }
 return {rebuild,sync,clear};
}
