const finished=new WeakSet();

function polish(material){
 if(!material?.isMeshStandardMaterial||finished.has(material))return;
 finished.add(material);

 // Keep the authored texture and roughness of paper, woven surfaces and food.
 // A roughness map can also describe a mix of matte and glossy regions.
 if(material.transparent||material.alphaTest>0||material.roughnessMap||material.roughness>=.61)return;
 if(material.isMeshPhysicalMaterial&&(material.transmission>0||material.sheen>0))return;

 if(material.metalness>=.35){
  material.roughness=Math.max(.17,material.roughness*.79);
  return;
 }

 if(material.isMeshPhysicalMaterial&&material.clearcoat>=.12){
  material.roughness=Math.max(.23,material.roughness*.74);
  material.clearcoat=Math.min(.80,Math.max(.48,material.clearcoat*1.36));
  material.clearcoatRoughness=Math.min(.13,material.clearcoatRoughness*.48);
  material.needsUpdate=true;
 }else if(material.roughness<=.43){
  // Smooth opaque Standard materials, including some imported glazed models.
  material.roughness=Math.max(.21,material.roughness*.80);
 }
}

export function applyGlazedFinish(root){
 root.traverse(object=>{
  if(!object.isMesh)return;
  if(Array.isArray(object.material))object.material.forEach(polish);
  else polish(object.material);
 });
 return root;
}
