import * as THREE from 'three';

const frames=new WeakMap();
const front=new THREE.Vector3(0,0,1);

// Reconstruct the orthographic shot used for this object's material study.
// Normal geometry still supplies the silhouette, collision and moving shadows.
export function projectionFor(root,id,kind){
 let first;
 root.traverse(o=>{if(!first&&o.isMesh)first=o.geometry;});
 if(!first)return null;
 let variants=frames.get(first);
 if(!variants)frames.set(first,variants=new Map());
 const key=id+':'+kind;
 let frame=variants.get(key);
 if(!frame){
  const rotation=root.quaternion.clone(),panel=root.userData.panelNormal;
  if(panel?.isVector3)root.quaternion.setFromUnitVectors(panel.clone().normalize(),front);
  root.rotateY(-.15);root.rotateX(.15);root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(root,true);
  const size=bounds.getSize(new THREE.Vector3()),mid=bounds.getCenter(new THREE.Vector3());
  const scale=1.62/(1.84*Math.max(size.x,size.y,.01));
  frame=new THREE.Matrix4().makeScale(scale,scale,scale);
  frame.setPosition(.5-mid.x*scale,.5-mid.y*scale,-mid.z*scale);
  frame.multiply(root.matrixWorld);
  variants.set(key,frame);
  root.quaternion.copy(rotation);
 }
 root.updateMatrixWorld(true);
 const local=frame.clone().multiply(root.matrixWorld.clone().invert());
 return mesh=>local.clone().multiply(mesh.matrixWorld);
}
